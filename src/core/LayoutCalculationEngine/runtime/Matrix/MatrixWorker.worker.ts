/// <reference lib="webworker" />

import {
	Matrix,
	type MatrixComputedUnit,
	type MatrixSnapshot,
	type ReadonlyMatrix,
	bindLayoutWorker,
} from 'src/core/LayoutCalculationEngine';

const restoreMatrixFromSnapshot = <Meta = undefined>(
	snapshot: Readonly<MatrixSnapshot<Meta>>,
): Matrix<Meta> => {
	const matrix = new Matrix<Meta>(
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
