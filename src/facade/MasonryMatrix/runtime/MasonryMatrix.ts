import { MASONRY_MATRIX_ERROR_MESSAGES, MasonryMatrixError } from '../errors';
import type {
	MatrixItem,
	MatrixState,
	SourceItem,
	WithMeta,
} from 'src/core/MatrixEngine/contract';
import { appendToMatrix, createMatrixState } from 'src/core/MatrixEngine';
import type { MasonryMatrixState } from '../contract';
import { isPositiveFiniteNumber } from 'src/utils/IsFiniteNonZero';

/**
 * A small facade over the matrix engine that builds and rebuilds masonry layouts
 * from source item sizes.
 *
 * The class stores all successfully appended raw items internally and can replay
 * them later to recreate the matrix with a different root width, column count,
 * or gap.
 *
 * Features:
 * - appends items incrementally without losing the current layout
 * - recreates the whole matrix from previously appended raw items
 * - optionally offloads calculations to a Web Worker when available
 * - falls back to synchronous calculation when Worker is unavailable or disabled
 *
 * Important:
 * - internal state is mutable
 * - returned columns must be treated as read-only by the caller
 * - appendItems() and recreateMatrix() must not be called concurrently
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
	private _rawItems: WithMeta<SourceItem, T>[];
	private _inFlight: boolean;

	constructor(rootWidth: number, columnCount: number = 1, gap: number = 0) {
		this._rawItems = [];
		this._inFlight = false;
		this._workerDisabled = false;
		this._state = createMatrixState<T>(rootWidth, columnCount, gap);
	}

	private async _updateState(
		state: MatrixState<T>,
		batchItems: readonly WithMeta<SourceItem, T>[],
	): Promise<MatrixState<T>> {
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
					this._workerTerminateCleanup();
					reject(
						new MasonryMatrixError(
							MASONRY_MATRIX_ERROR_MESSAGES.RECEIVE_FROM_WORKER,
						),
					);
				};

				this._worker!.onerror = (e: ErrorEvent) => {
					this._workerTerminateCleanup();
					reject(
						new MasonryMatrixError(MASONRY_MATRIX_ERROR_MESSAGES.WORKER_ERROR, {
							cause: e,
						}),
					);
				};

				this._worker!.postMessage({ batchItems, state });
			});
		} catch (e: unknown) {
			this._workerTerminateCleanup();

			throw new MasonryMatrixError(
				MASONRY_MATRIX_ERROR_MESSAGES.UPDATE_INTERNAL_STATE,
				{
					cause: e,
				},
			);
		}
	}

	private _appendToRawItems(
		batchItems: readonly WithMeta<SourceItem, T>[],
	): void {
		const start = this._rawItems.length;
		const len = batchItems.length;

		this._rawItems.length = start + len;

		for (let i = 0; i < len; i++) {
			this._rawItems[start + i] = batchItems[i];
		}
	}

	private _createWorker(): void {
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

	private _disposeWorker(): void {
		this._worker?.terminate();
		this._workerTerminateCleanup();
		this._worker = undefined;
	}

	terminateWorker(): void {
		this._workerTerminatedSignal?.(
			new MasonryMatrixError(MASONRY_MATRIX_ERROR_MESSAGES.WORKER_TERMINATED),
		);
		this._disposeWorker();
	}

	disableWorker(): void {
		this.terminateWorker();

		this._workerDisabled = true;
	}

	enableWorker(): void {
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

	async appendItems(
		items: readonly WithMeta<SourceItem, T>[],
	): Promise<readonly (readonly WithMeta<MatrixItem, T>[])[]> {
		if (this._inFlight) {
			throw new MasonryMatrixError(
				MASONRY_MATRIX_ERROR_MESSAGES.CONCURRENT_CALL,
			);
		}

		this._inFlight = true;

		try {
			const filteredItems = items.filter(
				(item) =>
					isPositiveFiniteNumber(item.width) &&
					isPositiveFiniteNumber(item.height),
			);

			this._state = await this._updateState(this._state, filteredItems);

			this._appendToRawItems(filteredItems);

			return this._state.columns;
		} catch (e: unknown) {
			throw new MasonryMatrixError(MASONRY_MATRIX_ERROR_MESSAGES.APPEND_ITEMS, {
				cause: e,
			});
		} finally {
			this._inFlight = false;
		}
	}

	async recreateMatrix(
		rootWidth: number,
		columnCount?: number,
		gap?: number,
	): Promise<readonly (readonly WithMeta<MatrixItem, T>[])[]> {
		if (this._inFlight) {
			throw new MasonryMatrixError(
				MASONRY_MATRIX_ERROR_MESSAGES.CONCURRENT_CALL,
			);
		}

		this._inFlight = true;

		try {
			const newColumnCount = columnCount ?? this._state.columnCount;
			const newGap = gap ?? this._state.gap;

			const newState = await this._updateState(
				createMatrixState<T>(rootWidth, newColumnCount, newGap),
				this._rawItems,
			);

			this._state = newState;

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
