import type { MATRIX_ERROR_MESSAGES } from './MatrixError.constants.ts';

export type MatrixErrorMessage =
	(typeof MATRIX_ERROR_MESSAGES)[keyof typeof MATRIX_ERROR_MESSAGES];

export class MatrixError extends Error {
	readonly cause?: unknown;

	constructor(message: MatrixErrorMessage, options?: { cause?: unknown }) {
		super(message);

		this.name = 'MatrixError';
		this.cause = options?.cause;

		Object.setPrototypeOf(this, MatrixError.prototype);
	}
}
