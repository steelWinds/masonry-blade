/// <reference lib="webworker" />

import {
	Matrix,
	type MatrixComputedUnit,
	type MatrixSnapshot,
	type ReadonlyMatrix,
	bindLayoutWorker,
} from 'src/core/LayoutCalculationEngine';

type MatrixInternal<T = undefined> = {
	_order: Uint32Array;
	_columnHeights: Float64Array;
	_matrix: MatrixComputedUnit<T>[][];
};

const restoreMatrixFromSnapshot = <T = undefined>(
	snapshot: Readonly<MatrixSnapshot<T>>,
): Matrix<T> => {
	const matrix = new Matrix<T>(
		snapshot.rootWidth,
		snapshot.columnCount,
		snapshot.gap,
	);

	const internal = matrix as unknown as MatrixInternal<T>;

	internal._order = new Uint32Array(snapshot.order);
	internal._columnHeights = new Float64Array(snapshot.columnHeights);
	internal._matrix = Object.freeze(
		snapshot.internalState,
	) as MatrixComputedUnit<T>[][];

	return matrix;
};

bindLayoutWorker<
	ReadonlyMatrix<unknown>,
	MatrixSnapshot<unknown>,
	Matrix<unknown>
>({
	restore: restoreMatrixFromSnapshot,
});
