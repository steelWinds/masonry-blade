import {
	type ImageItem,
	type MatrixItem,
	type MatrixState,
	appendToMatrix,
	createMatrixState,
} from './internal/matrixEngine/index.ts';
import { MATRIX_ERROR_MESSAGES, MatrixError } from './errors/index.ts';

/**
 * Concurrent calls to appendItems/recreateMatrix are not allowed.
 * The caller must serialize access.
 *
 * appendItems mutates the current matrix state.
 * Returned columns must be treated as read-only by the caller.
 */

export class MasonryMatrix<T = never> {
	private _worker?: Worker;
	private _workerTerminatedSignal?: (reason?: unknown) => void;
	private _state: MatrixState<T>;
	private _rawItems: ImageItem<T>[];
	private _inFlight: boolean;

	constructor(rootWidth: number, count?: number) {
		this._state = createMatrixState<T>(rootWidth, count);
		this._rawItems = [];
		this._inFlight = false;
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

				const cleanup = () => {
					this._workerTerminatedSignal = undefined;
				};

				this._worker!.onmessage = (e: MessageEvent<MatrixState<T>>) => {
					cleanup();
					resolve(e.data);
				};

				this._worker!.onmessageerror = () => {
					cleanup();
					reject(new MatrixError(MATRIX_ERROR_MESSAGES.RECEIVE_FROM_WORKER));
				};

				this._worker!.onerror = (e: ErrorEvent) => {
					cleanup();
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
			this._worker = new Worker(
				new URL(import.meta.env.APPEND_TO_MATRIX_WORKER, import.meta.url),
				{ type: 'module' },
			);
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
		if (this._inFlight) {
			throw new MatrixError(MATRIX_ERROR_MESSAGES.CONCURRENT_CALL);
		}

		this._inFlight = true;

		try {
			this._state = await this._updateState(this._state, items);

			this._appendToRawItems(items);

			return this._state.columns;
		} catch (e: unknown) {
			throw new MatrixError(MATRIX_ERROR_MESSAGES.APPEND_ITEMS, { cause: e });
		} finally {
			this._inFlight = false;
		}
	}

	async recreateMatrix(
		rootWidth: number,
		count?: number,
	): Promise<readonly MatrixItem<T>[][]> {
		if (this._inFlight) {
			throw new MatrixError(MATRIX_ERROR_MESSAGES.CONCURRENT_CALL);
		}

		this._inFlight = true;

		try {
			const newState = await this._updateState(
				createMatrixState<T>(rootWidth, count),
				this._rawItems,
			);

			this._state = newState;

			return this._state.columns as readonly MatrixItem<T>[][];
		} catch (e: unknown) {
			throw new MatrixError(MATRIX_ERROR_MESSAGES.RECREATE_MATRIX, {
				cause: e,
			});
		} finally {
			this._inFlight = false;
		}
	}
}
