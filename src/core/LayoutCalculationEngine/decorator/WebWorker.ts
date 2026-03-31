import type {
	LayoutCalculationEngine,
	LayoutComputedUnit,
	LayoutSnapshot,
	LayoutSourceUnit,
	LayoutWorkerErrorResponse,
	LayoutWorkerRequest,
	LayoutWorkerResponse,
	LayoutWorkerSuccessResponse,
} from '../contract';
import { WEB_WORKER_ERRORS, WebWorkerError } from '../errors/WebWorkerError';

type WorkerConstructor = {
	new (options?: { name?: string }): Worker;
};

export class WebWorker<
	Return,
	Snapshot extends LayoutSnapshot<Return>,
	Unit extends LayoutComputedUnit,
> implements LayoutCalculationEngine<Return, Snapshot, Unit> {
	private readonly _workerSource: WorkerConstructor;

	private _engine: LayoutCalculationEngine<Return, Snapshot, Unit>;
	private _worker?: Worker;
	private _pendingReject?: (reason?: unknown) => void;
	private _workerDisabled = false;
	private _requestId = 0;

	constructor(
		engine: LayoutCalculationEngine<Return, Snapshot, Unit>,
		workerSource: WorkerConstructor,
	) {
		this._engine = engine;
		this._workerSource = workerSource;
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
			this._worker = new this._workerSource();
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

	private _restoreWorkerError(
		error: LayoutWorkerErrorResponse['error'],
	): Error {
		const restoredError = new Error(error.message);

		restoredError.name = error.name;

		if (error.stack != null) {
			restoredError.stack = error.stack;
		}

		return restoredError;
	}

	private async _requestWorker<Result>(
		message: Omit<LayoutWorkerRequest<Return, Snapshot>, 'id'>,
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

		const request = {
			...message,
			id: ++this._requestId,
		} as LayoutWorkerRequest<Return, Snapshot>;

		return await new Promise<Result>((resolve, reject) => {
			const cleanup = () => this._cleanupWorkerHandlers(worker);

			this._pendingReject = (reason?: unknown) => {
				cleanup();
				reject(reason);
			};

			worker.onmessage = (
				event: MessageEvent<LayoutWorkerResponse<Return, Snapshot, Unit>>,
			) => {
				const response = event.data;

				if (response.id !== request.id) {
					cleanup();
					reject(
						new WebWorkerError(WEB_WORKER_ERRORS.WORKER_ERROR, {
							cause: `Unexpected worker response id: ${String(response.id)}`,
						}),
					);
					return;
				}

				if (!response.ok) {
					cleanup();
					reject(
						new WebWorkerError(WEB_WORKER_ERRORS.WORKER_ERROR, {
							cause: this._restoreWorkerError(response.error),
						}),
					);
					return;
				}

				const result = pickResult(response);

				cleanup();

				if (result != null) {
					resolve(result);
					return;
				}

				reject(
					new WebWorkerError(WEB_WORKER_ERRORS.WORKER_ERROR, {
						cause: `Unexpected worker response type: ${String(response.type)}`,
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
				worker.postMessage(request);
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

	public get workerCreated(): boolean {
		return this._worker != null;
	}

	public get workerDisabled(): boolean {
		return this._workerDisabled;
	}

	public async append(arr: readonly Readonly<LayoutSourceUnit>[]) {
		this._ensureWorker();

		if (this._worker == null) {
			return this._engine.append(arr);
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

			return snapshot.internalState;
		} catch (error: unknown) {
			this._dispose();
			this._wrapWorkerError(error);
		}
	}

	public async sort(source: Return) {
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

	public fromSnapshot(snapshot: Snapshot): void {
		this._engine.fromSnapshot(snapshot);
	}

	public setEngine(engine: LayoutCalculationEngine<Return, Snapshot, Unit>) {
		this._engine = engine;
	}
}
