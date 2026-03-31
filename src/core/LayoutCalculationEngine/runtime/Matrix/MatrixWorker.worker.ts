import {
	Matrix,
	type MatrixComputedUnit,
	type MatrixSnapshot,
	type ReadonlyMatrix,
	bindLayoutWorker,
} from 'src/core/LayoutCalculationEngine';

const INLINE_MATRIX_WORKER_QUERY_PARAM = 'masonry-blade-worker';
const INLINE_MATRIX_WORKER_QUERY_VALUE = '1';

export const restoreMatrixFromSnapshot = <Meta = undefined>(
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

const bindMatrixWorker = (): void => {
	bindLayoutWorker<
		ReadonlyMatrix<unknown>,
		MatrixSnapshot<unknown>,
		Matrix<unknown>,
		MatrixComputedUnit<unknown>
	>({
		restore: restoreMatrixFromSnapshot,
	});
};

const isInlineMatrixWorkerContext = (): boolean => {
	if (
		typeof WorkerGlobalScope === 'undefined' ||
		!(self instanceof WorkerGlobalScope)
	) {
		return false;
	}

	return (
		new URL(import.meta.url).searchParams.get(
			INLINE_MATRIX_WORKER_QUERY_PARAM,
		) === INLINE_MATRIX_WORKER_QUERY_VALUE
	);
};

export const getInlineMatrixWorkerURL = (): string => {
	const workerUrl = new URL(import.meta.url);

	workerUrl.searchParams.set(
		INLINE_MATRIX_WORKER_QUERY_PARAM,
		INLINE_MATRIX_WORKER_QUERY_VALUE,
	);

	return workerUrl.href;
};

if (isInlineMatrixWorkerContext()) {
	bindMatrixWorker();
}
