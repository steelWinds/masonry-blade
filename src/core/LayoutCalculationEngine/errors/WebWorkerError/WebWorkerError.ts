import type { WEB_WORKER_ERRORS } from './WebWorkerError.constants';

export type WebWorkerErrorMessage =
	(typeof WEB_WORKER_ERRORS)[keyof typeof WEB_WORKER_ERRORS];

export class WebWorkerError extends Error {
	readonly cause?: unknown;

	constructor(message: WebWorkerErrorMessage, options?: { cause?: unknown }) {
		super(message);

		this.name = 'WebWorkerError';
		this.cause = options?.cause;

		Object.setPrototypeOf(this, WebWorkerError.prototype);
	}
}
