import { MATRIX_ENGINE_ERRORS, MatrixEngineError } from '../errors';
import type { MatrixItem, MatrixState, WithMeta } from '../contract';

export const createMatrixState = <T = never>(
	rootWidth: number,
	columnCount: number = 1,
	gap: number = 0,
): MatrixState<T> => {
	if (!Number.isFinite(rootWidth) || rootWidth < 0) {
		throw new MatrixEngineError(MATRIX_ENGINE_ERRORS.INVALID_ROOT_WIDTH);
	}

	if (!Number.isInteger(columnCount) || columnCount <= 0) {
		throw new MatrixEngineError(MATRIX_ENGINE_ERRORS.INVALID_COLUMN_COUNT);
	}

	if (!Number.isFinite(gap) || gap < 0) {
		throw new MatrixEngineError(MATRIX_ENGINE_ERRORS.INVALID_GAP);
	}

	const columnsHeights = new Float64Array(columnCount);
	const order = new Uint32Array(columnCount);
	const columns: WithMeta<MatrixItem, T>[][] = Array.from(
		{ length: columnCount },
		() => [],
	);

	const realRootWidth = rootWidth - gap * (columnCount - 1);
	const columnWidth = Math.max(0, realRootWidth / columnCount);

	for (let i = 0; i < columnCount; i++) {
		order[i] = i;
	}

	return {
		columnCount,
		columnWidth,
		columns,
		columnsHeights,
		gap,
		order,
	};
};
