import {
	type ImageItem,
	type MatrixItem,
	type MatrixState,
	appendToMatrix,
	createMatrixState,
} from './internal/matrixEngine/index.ts';
import { MATRIX_ERROR_MESSAGES, MatrixError } from './errors/index.ts';
import AppendToMatrixWorker from './internal/matrixEngine/appendToMatrix.worker.ts?worker&inline';

/**
 * Concurrent calls to appendItems/recreateMatrix are not allowed.
 * The caller must serialize access.
 *
 * appendItems mutates the passed state.
 * Returned columns must be treated as read-only by the caller.
 */

export class MasonryMatrix<T = never> {
	private _worker?: Worker;
	private _workerTerminatedSignal?: (reason?: unknown) => void;
	private _state: MatrixState<T>;
	private _rawItems: ImageItem<T>[];

	constructor(rootWidth: number, count?: number) {
		this._state = createMatrixState<T>(rootWidth, count);
		this._rawItems = [];
	}

	private async _updateState(
		state: MatrixState<T>,
		batchItems: readonly ImageItem<T>[],
	): Promise<MatrixState<T>> {
		try {
			if (this._worker == null) {
				this._createWorker();
			}

			if (this._worker == null) {
				return appendToMatrix(state, batchItems);
			}

			return await new Promise<MatrixState<T>>((resolve, reject) => {
				this._workerTerminatedSignal = reject;

				this._worker!.onmessage = (e: MessageEvent<MatrixState<T>>) => {
					this._workerTerminatedSignal = undefined;

					resolve(e.data);
				};

				this._worker!.onmessageerror = () => {
					this._workerTerminatedSignal = undefined;

					reject(new MatrixError(MATRIX_ERROR_MESSAGES.RECEIVE_FROM_WORKER));
				};

				this._worker!.onerror = (e: ErrorEvent) => {
					this._workerTerminatedSignal = undefined;

					reject(
						new MatrixError(MATRIX_ERROR_MESSAGES.WORKER_ERROR, { cause: e }),
					);
				};

				this._worker!.postMessage({ batchItems, state });
			});
		} catch (e: unknown) {
			throw new MatrixError(MATRIX_ERROR_MESSAGES.UPDATE_INTERNAL_STATE, {
				cause: e,
			});
		}
	}

	private _appendToRawItems(batchItems: readonly ImageItem<T>[]): void {
		const start = this._rawItems.length;
		const len = batchItems.length;

		this._rawItems.length = start + len;

		for (let i = 0; i < len; i++) {
			this._rawItems[start + i] = batchItems[i];
		}
	}

	private _createWorker(): void {
		if (globalThis && 'Worker' in globalThis) {
			this._worker = new AppendToMatrixWorker();
		}
	}

	terminateWorker(): void {
		this._workerTerminatedSignal?.(
			new MatrixError(MATRIX_ERROR_MESSAGES.WORKER_TERMINATED),
		);
		this._worker?.terminate();

		this._workerTerminatedSignal = undefined;
		this._worker = undefined;
	}

	async appendItems(
		items: readonly ImageItem<T>[],
	): Promise<readonly MatrixItem<T>[][]> {
		try {
			this._state = await this._updateState(this._state, items);

			this._appendToRawItems(items);

			return this._state.columns;
		} catch (e: unknown) {
			throw new MatrixError(MATRIX_ERROR_MESSAGES.APPEND_ITEMS, { cause: e });
		}
	}

	async recreateMatrix(
		rootWidth: number,
		count?: number,
	): Promise<readonly MatrixItem<T>[][]> {
		try {
			this._state = createMatrixState<T>(rootWidth, count);

			this._state = await this._updateState(this._state, this._rawItems);

			return this._state.columns as readonly MatrixItem<T>[][];
		} catch (e: unknown) {
			throw new MatrixError(MATRIX_ERROR_MESSAGES.RECREATE_MATRIX, {
				cause: e,
			});
		}
	}
}
