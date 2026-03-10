import {
	type ImageItem,
	type MasonryState,
	appendItems as _appendItems,
	createMasonryState as _createMasonryState,
} from './lib/masonryEngine/index.ts';

/**
 * Concurrent calls to appendItems/recreateMatrix are not allowed.
 * The caller must serialize access.
*/

export class MasonryMatrix {
	private _worker?: Worker;
	private _state: Readonly<MasonryState>;
	private _rawItems: ImageItem[];

	constructor(count: number, rootWidth: number) {
		if (typeof Worker !== 'undefined') {
			this._worker = new Worker(
				new URL('./lib/masonryEngine/appendItems.worker.ts', import.meta.url),
				{ type: 'module' },
			);
		}

		this._state = _createMasonryState(count, rootWidth);
		this._rawItems = [];
	}

  private async _updateState(state: Readonly<MasonryState>, batchItems: readonly ImageItem[]) {
    try {
      let newState: Readonly<MasonryState>

			if (this._worker == null) {
				newState = _appendItems(state, batchItems);
			}
      else {
        newState = await new Promise((resolve, reject) => {
          this._worker!.onmessage = (e: MessageEvent<MasonryState>) => resolve(e.data);
          this._worker!.onmessageerror = () => reject(new Error('Error receiving message from worker'))
          this._worker!.onerror = (e: ErrorEvent) => reject(new Error(`Error while worker ${e.message}`))

          this._worker!.postMessage({ batchItems, state });
        });
      }

      return newState
		}
    catch (e: unknown) {
			console.error(`[MasonryMatrix] Error while update internal state: ${e}`);

      throw e;
		}
  }

  private _extendArray(items: ImageItem[], batchItems: readonly ImageItem[]) {
    const start = items.length;
    const len = batchItems.length;

    items.length = start + len;

    for (let i = 0; i < len; i++) {
      items[start + i] = batchItems[i];
    }

    return items
  }

	async appendItems(items: readonly ImageItem[]) {
    try {
      const newState = await this._updateState(this._state, items)

      this._state = newState
      this._rawItems = this._extendArray([...this._rawItems], items);

      return this._state.columns
    }
    catch (e: unknown) {
			console.error(`[MasonryMatrix] Error while append items to matrix: ${e}`);

      throw e;
		}
	}

	async recreateMatrix(count: number, rootWidth: number) {
		try {
      let newState = _createMasonryState(count, rootWidth);

		  newState = await this._updateState(newState, this._rawItems);

      this._state = newState

      return this._state.columns
    }
    catch (e: unknown) {
			console.error(`[MasonryMatrix] Error while recreate matrix: ${e}`);

      throw e;
		}
	}
}
