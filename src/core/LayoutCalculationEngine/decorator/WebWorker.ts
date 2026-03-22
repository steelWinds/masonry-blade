import type {
	LayoutCalculationEngine,
	LayoutComputedUnit,
	LayoutSnapshot,
	LayoutSourceUnit,
	LayoutWorkerSuccessResponse,
} from '../contract';
import { WEB_WORKER_ERRORS, WebWorkerError } from '../errors/WebWorkerError';

export class WebWorker<
	Return,
	Snapshot extends LayoutSnapshot<Return>,
	Unit extends LayoutComputedUnit,
> {
	private readonly _engine: LayoutCalculationEngine<Return, Snapshot, Unit>;
	private readonly _path: string;

	private _worker?: Worker;
	private _pendingReject?: (reason?: unknown) => void;
	private _workerDisabled = false;

	constructor(
		engine: LayoutCalculationEngine<Return, Snapshot, Unit>,
		path: string,
	) {
		this._engine = engine;
		this._path = path;
	}

	private _ensureWorker(): void {
		if (this._workerDisabled || this._worker != null) {
			return;
		}

		if (typeof Worker === 'undefined') {
			this._workerDisabled = true;
			return;
		}

		try {
			this._worker = new Worker(new URL(this._path, import.meta.url), {
				type: 'module',
			});
		} catch {
			this._workerDisabled = true;
		}
	}

	private _cleanupWorkerHandlers(worker = this._worker): void {
		if (worker != null) {
			worker.onmessage = null;
			worker.onmessageerror = null;
			worker.onerror = null;
		}

		this._pendingReject = undefined;
	}

	private _dispose(): void {
		this._cleanupWorkerHandlers();
		this._worker?.terminate();
		this._worker = undefined;
	}

	private _wrapWorkerError(error: unknown): never {
		if (error instanceof WebWorkerError) {
			throw error;
		}

		throw new WebWorkerError(WEB_WORKER_ERRORS.WORKER_ERROR, {
			cause: error,
		});
	}

	private async _requestWorker<Result>(
		message: unknown,
		pickResult: (
			data: LayoutWorkerSuccessResponse<Return, Snapshot, Unit>,
		) => Result | undefined,
	): Promise<Result> {
		const worker = this._worker;

		if (worker == null) {
			throw new WebWorkerError(WEB_WORKER_ERRORS.WORKER_ERROR, {
				cause: 'Worker is not initialized',
			});
		}

		if (this._pendingReject != null) {
			throw new WebWorkerError(WEB_WORKER_ERRORS.WORKER_ERROR, {
				cause: 'Concurrent worker requests are not supported',
			});
		}

		return await new Promise<Result>((resolve, reject) => {
			const cleanup = () => this._cleanupWorkerHandlers(worker);

			this._pendingReject = (reason?: unknown) => {
				cleanup();
				reject(reason);
			};

			worker.onmessage = (
				event: MessageEvent<
					LayoutWorkerSuccessResponse<Return, Snapshot, Unit>
				>,
			) => {
				cleanup();

				const result = pickResult(event.data);

				if (result !== undefined) {
					resolve(result);
					return;
				}

				reject(
					new WebWorkerError(WEB_WORKER_ERRORS.WORKER_ERROR, {
						cause: `Unexpected worker response type: ${String(event.data?.type)}`,
					}),
				);
			};

			worker.onmessageerror = () => {
				cleanup();
				reject(new WebWorkerError(WEB_WORKER_ERRORS.RECEIVE_FROM_WORKER));
			};

			worker.onerror = (event: ErrorEvent) => {
				cleanup();
				reject(
					new WebWorkerError(WEB_WORKER_ERRORS.WORKER_ERROR, {
						cause: event,
					}),
				);
			};

			try {
				worker.postMessage(message);
			} catch (error) {
				cleanup();
				reject(error);
			}
		});
	}

	public terminate(): void {
		this._pendingReject?.(
			new WebWorkerError(WEB_WORKER_ERRORS.WORKER_TERMINATED),
		);

		this._dispose();
	}

	public disable(): void {
		this.terminate();
		this._workerDisabled = true;
	}

	public enable(): void {
		this.terminate();
		this._workerDisabled = false;
		this._ensureWorker();
	}

	public async append(arr: readonly LayoutSourceUnit[]): Promise<Snapshot> {
		this._ensureWorker();

		if (this._worker == null) {
			this._engine.append(arr);
			return this._engine.snapshot();
		}

		try {
			const snapshot = await this._requestWorker(
				{
					payload: {
						items: arr,
						snapshot: this._engine.snapshot(),
					},
					type: 'append',
				},
				(data) => (data.type === 'append' ? data.payload.snapshot : undefined),
			);

			this._engine.fromSnapshot(snapshot);

			return snapshot;
		} catch (error: unknown) {
			this._dispose();
			this._wrapWorkerError(error);
		}
	}

	public async sort(source: Return): Promise<readonly Unit[]> {
		this._ensureWorker();

		if (this._worker == null) {
			return this._engine.sort(source);
		}

		try {
			return await this._requestWorker(
				{
					payload: {
						snapshot: this._engine.snapshot(),
						source,
					},
					type: 'sort',
				},
				(data) => (data.type === 'sort' ? data.payload.items : undefined),
			);
		} catch (error: unknown) {
			this._dispose();
			this._wrapWorkerError(error);
		}
	}

	public snapshot(): Snapshot {
		return this._engine.snapshot();
	}
}
