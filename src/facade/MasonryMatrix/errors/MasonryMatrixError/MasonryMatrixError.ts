import type { MASONRY_MATRIX_ERROR_MESSAGES } from './MasonryMatrixError.constants';

export type MasonryMatrixErrorMessage =
	(typeof MASONRY_MATRIX_ERROR_MESSAGES)[keyof typeof MASONRY_MATRIX_ERROR_MESSAGES];

export class MasonryMatrixError extends Error {
	readonly cause?: unknown;

	constructor(
		message: MasonryMatrixErrorMessage,
		options?: { cause?: unknown },
	) {
		super(message);

		this.name = 'MasonryMatrixError';
		this.cause = options?.cause;

		Object.setPrototypeOf(this, MasonryMatrixError.prototype);
	}
}
