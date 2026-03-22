import type { MATRIX_ERRORS } from './MatrixError.constants';

export type MatrixErrorMessage =
	(typeof MATRIX_ERRORS)[keyof typeof MATRIX_ERRORS];

export class MatrixError extends Error {
	readonly cause?: unknown;

	constructor(message: MatrixErrorMessage, options?: { cause?: unknown }) {
		super(message);

		this.name = 'MatrixError';
		this.cause = options?.cause;

		Object.setPrototypeOf(this, MatrixError.prototype);
	}
}
