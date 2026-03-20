import type { MATRIX_ENGINE_ERRORS } from './MatrixEngineError.constants';

export type MatrixEngineMessage =
	(typeof MATRIX_ENGINE_ERRORS)[keyof typeof MATRIX_ENGINE_ERRORS];

export class MatrixEngineError extends Error {
	readonly cause?: unknown;

	constructor(message: MatrixEngineMessage, options?: { cause?: unknown }) {
		super(message);

		this.name = 'MatrixEngineError';
		this.cause = options?.cause;

		Object.setPrototypeOf(this, MatrixEngineError.prototype);
	}
}
