import type { MatrixItem, MatrixState } from './types.ts';

export const createMatrixState = <T = never>(
	rootWidth: number,
	count: number = 1,
): MatrixState<T> => {
	const heights = new Float64Array(count);
	const order = new Int16Array(count);
	const columns: MatrixItem<T>[][] = Array.from({ length: count }, () => []);

	for (let i = 0; i < count; i++) {
		order[i] = i;
	}

	return {
		columns,
		count,
		heights,
		order,
		width: count === 0 ? 0 : rootWidth / count,
	};
};
