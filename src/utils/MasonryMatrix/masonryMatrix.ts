import {
	type ImageItem,
	type MasonryItem,
	type MasonryState,
	appendToMatrix,
	createMasonryState,
} from './lib/masonryEngine/index.ts';
import AppendToMatrixWorker from './lib/masonryEngine/appendToMatrix.worker.ts?worker';

/**
 * Concurrent calls to appendItems/recreateMatrix are not allowed.
 * The caller must serialize access.
 *
 * appendToMatrix mutates the passed state.
 * Returned columns must be treated as read-only by the caller.
 */

export class MasonryMatrix {
	private _worker?: Worker;
	private _workerTerminatedSignal?: (reason?: unknown) => void;
	private _state: MasonryState;
	private _rawItems: ImageItem[];

	constructor(rootWidth: number, count?: number) {
		this._state = createMasonryState(rootWidth, count);
		this._rawItems = [];
	}

	private async _updateState(
		state: MasonryState,
		batchItems: readonly ImageItem[],
	): Promise<MasonryState> {
		try {
			if (this._worker == null) {
				this._createWorker();
			}

			if (this._worker == null) {
				return appendToMatrix(state, batchItems);
			}

			return await new Promise<MasonryState>((resolve, reject) => {
				this._workerTerminatedSignal = reject;

				this._worker!.onmessage = (e: MessageEvent<MasonryState>) => {
					this._workerTerminatedSignal = undefined;

					resolve(e.data);
				};

				this._worker!.onmessageerror = () => {
					this._workerTerminatedSignal = undefined;

					reject(
						new Error(`[MasonryMatrix] Error receiving message from worker`),
					);
				};

				this._worker!.onerror = (e: ErrorEvent) => {
					this._workerTerminatedSignal = undefined;

					reject(new Error(`[MasonryMatrix] Error while worker: ${e.message}`));
				};

				this._worker!.postMessage({ batchItems, state });
			});
		} catch (e: unknown) {
			console.error(`[MasonryMatrix] Error while update internal state: ${e}`);

			throw e;
		}
	}

	private _appendToRawItems(batchItems: readonly ImageItem[]): void {
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
			new Error('[MasonryMatrix] Worker terminated'),
		);
		this._worker?.terminate();

		this._workerTerminatedSignal = undefined;
		this._worker = undefined;
	}

	async appendItems(
		items: readonly ImageItem[],
	): Promise<readonly MasonryItem[][]> {
		try {
			this._state = await this._updateState(this._state, items);

			this._appendToRawItems(items);

			return this._state.columns;
		} catch (e: unknown) {
			console.error(`[MasonryMatrix] Error while append items to matrix: ${e}`);

			throw e;
		}
	}

	async recreateMatrix(
		rootWidth: number,
		count?: number,
	): Promise<readonly MasonryItem[][]> {
		try {
			this._state = createMasonryState(rootWidth, count);

			this._state = await this._updateState(this._state, this._rawItems);

			return this._state.columns;
		} catch (e: unknown) {
			console.error(`[MasonryMatrix] Error while recreate matrix: ${e}`);

			throw e;
		}
	}
}
