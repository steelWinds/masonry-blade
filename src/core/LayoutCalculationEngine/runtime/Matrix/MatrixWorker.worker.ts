/// <reference lib="webworker" />

import {
	Matrix,
	type MatrixComputedUnit,
	type MatrixSnapshot,
	type ReadonlyMatrix,
	bindLayoutWorker,
} from 'src/core/LayoutCalculationEngine';

const restoreMatrixFromSnapshot = <T = undefined>(
	snapshot: Readonly<MatrixSnapshot<T>>,
): Matrix<T> => {
	const matrix = new Matrix<T>(
		snapshot.rootWidth,
		snapshot.columnCount,
		snapshot.gap,
	);

	matrix.fromSnapshot(snapshot);

	return matrix;
};

bindLayoutWorker<
	ReadonlyMatrix<unknown>,
	MatrixSnapshot<unknown>,
	Matrix<unknown>,
	MatrixComputedUnit<unknown>
>({
	restore: restoreMatrixFromSnapshot,
});
