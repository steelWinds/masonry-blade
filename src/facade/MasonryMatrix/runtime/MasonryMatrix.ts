import { MASONRY_MATRIX_ERROR_MESSAGES, MasonryMatrixError } from '../errors';
import type { MasonryMatrixState, RecreateOptions } from '../contract';
import type {
	MatrixState,
	SourceItem,
	WithMeta,
} from 'src/core/MatrixEngine/contract';
import { appendToMatrix, createMatrixState } from 'src/core/MatrixEngine';

/**
 * A small facade over the matrix engine that builds and rebuilds masonry layouts
 * from source item sizes.
 *
 * Features:
 * - appends items incrementally without losing the current layout
 * - recreates the whole matrix from explicitly provided source items
 * - optionally offloads calculations to a Web Worker when available
 * - falls back to synchronous calculation when Worker is unavailable or disabled
 *
 * Important:
 * - internal state is mutable
 * - returned columns must be treated as read-only by the caller
 * - append() and recreate() must not be called concurrently
 * - recreate() does not reuse or replay previously appended source items
 * - when Worker mode is used, payload data must be structured-cloneable
 * - terminateWorker(), disableWorker(), and enableWorker() may interrupt
 *   an in-flight worker-based calculation
 *
 * @template T Type of optional meta attached to every source and matrix item.
 */

export class MasonryMatrix<T = never> {
	private _worker?: Worker;
	private _workerTerminatedSignal?: (reason?: unknown) => void;
	private _workerDisabled: boolean;
	private _state: MatrixState<T>;
	private _inFlight: boolean;

	constructor(rootWidth: number, columnCount: number = 1, gap: number = 0) {
		this._inFlight = false;
		this._workerDisabled = false;
		this._state = createMatrixState<T>(rootWidth, columnCount, gap);
	}

	private _createWorker() {
		if (globalThis && !('Worker' in globalThis)) {
			this.disableWorker();
			return;
		}

		try {
			this._worker = new Worker(
				new URL(import.meta.env.MATRIX_ENGINE_WORKER, import.meta.url),
				{ type: 'module' },
			);
		} catch {
			this.disableWorker();
		}
	}

	private _workerTerminateCleanup() {
		this._workerTerminatedSignal = undefined;
	}

	private _disposeWorker() {
		this._worker?.terminate();
		this._workerTerminateCleanup();
		this._worker = undefined;
	}

	private async _updateState(
		state: MatrixState<T>,
		batchItems: readonly WithMeta<SourceItem, T>[],
	) {
		try {
			if (this._worker == null && !this._workerDisabled) {
				this._createWorker();
			}

			if (this._worker == null) {
				return appendToMatrix(state, batchItems);
			}

			return await new Promise<MatrixState<T>>((resolve, reject) => {
				this._workerTerminatedSignal = reject;

				this._worker!.onmessage = (e: MessageEvent<MatrixState<T>>) => {
					this._workerTerminateCleanup();
					resolve(e.data);
				};

				this._worker!.onmessageerror = () => {
					reject(
						new MasonryMatrixError(
							MASONRY_MATRIX_ERROR_MESSAGES.RECEIVE_FROM_WORKER,
						),
					);
				};

				this._worker!.onerror = (e: ErrorEvent) => {
					reject(
						new MasonryMatrixError(MASONRY_MATRIX_ERROR_MESSAGES.WORKER_ERROR, {
							cause: e,
						}),
					);
				};

				this._worker!.postMessage({ batchItems, state });
			});
		} catch (e: unknown) {
			this._disposeWorker();

			throw new MasonryMatrixError(
				MASONRY_MATRIX_ERROR_MESSAGES.UPDATE_INTERNAL_STATE,
				{
					cause: e,
				},
			);
		}
	}

	terminateWorker() {
		this._workerTerminatedSignal?.(
			new MasonryMatrixError(MASONRY_MATRIX_ERROR_MESSAGES.WORKER_TERMINATED),
		);
		this._disposeWorker();
	}

	disableWorker() {
		this.terminateWorker();

		this._workerDisabled = true;
	}

	enableWorker() {
		this.terminateWorker();

		this._workerDisabled = false;

		this._createWorker();
	}

	getState(): MasonryMatrixState {
		return {
			columnCount: this._state.columnCount,
			columnWidth: this._state.columnWidth,
			columnsHeights: new Float64Array(this._state.columnsHeights),
			gap: this._state.gap,
			order: new Uint32Array(this._state.order),
			workerCreated: this._worker != null,
			workerDisabled: this._workerDisabled,
		};
	}

	async append(items: readonly WithMeta<SourceItem, T>[]) {
		if (this._inFlight) {
			throw new MasonryMatrixError(
				MASONRY_MATRIX_ERROR_MESSAGES.CONCURRENT_CALL,
			);
		}

		this._inFlight = true;

		try {
			this._state = await this._updateState(this._state, items);

			return this._state.columns;
		} catch (e: unknown) {
			throw new MasonryMatrixError(MASONRY_MATRIX_ERROR_MESSAGES.APPEND_ITEMS, {
				cause: e,
			});
		} finally {
			this._inFlight = false;
		}
	}

	async recreate(options: RecreateOptions<T>) {
		if (this._inFlight) {
			throw new MasonryMatrixError(
				MASONRY_MATRIX_ERROR_MESSAGES.CONCURRENT_CALL,
			);
		}

		this._inFlight = true;

		try {
			const { items, rootWidth, columnCount, gap } = options;

			this._state = await this._updateState(
				createMatrixState<T>(
					rootWidth,
					columnCount ?? this._state.columnCount,
					gap ?? this._state.gap,
				),
				items,
			);

			return this._state.columns;
		} catch (e: unknown) {
			throw new MasonryMatrixError(
				MASONRY_MATRIX_ERROR_MESSAGES.RECREATE_MATRIX,
				{
					cause: e,
				},
			);
		} finally {
			this._inFlight = false;
		}
	}
}
