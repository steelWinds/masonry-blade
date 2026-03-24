import { MASONRY_MATRIX_ERROR_MESSAGES, MasonryMatrixError } from '../errors';
import type { MasonryMatrixState, RecreateOptions } from '../contract';
import {
	Matrix,
	type MatrixComputedUnit,
	type MatrixSnapshot,
	type MatrixSourceUnit,
	type ReadonlyMatrix,
	type ReadonlySortItems,
	WebWorker,
} from 'src/core/LayoutCalculationEngine';

export class MasonryMatrix<Meta = undefined> {
	private readonly _engine: WebWorker<
		ReadonlyMatrix<Meta>,
		MatrixSnapshot<Meta>,
		MatrixComputedUnit<Meta>
	>;

	constructor(...args: ConstructorParameters<typeof Matrix<Meta>>) {
		this._engine = new WebWorker<
			ReadonlyMatrix<Meta>,
			MatrixSnapshot<Meta>,
			MatrixComputedUnit<Meta>
		>(
			new Matrix(...args),
			new URL(import.meta.env.MATRIX_ENGINE_WORKER, import.meta.url).href,
		);
	}

	private _restoreMatrix(
		snapshot: Readonly<MatrixSnapshot<Meta>>,
	): Matrix<Meta> {
		const matrix = new Matrix<Meta>(
			snapshot.rootWidth,
			snapshot.columnCount,
			snapshot.gap,
		);

		matrix.fromSnapshot(snapshot);

		return matrix;
	}

	public terminateWorker(): void {
		this._engine.terminate();
	}

	public disableWorker(): void {
		this._engine.disable();
	}

	public enableWorker(): void {
		this._engine.enable();
	}

	public getState(): MasonryMatrixState {
		const snapshot = this._engine.snapshot();

		return {
			columnCount: snapshot.columnCount,
			columnWidth: snapshot.columnWidth,
			columnsHeights: new Float64Array(snapshot.columnHeights),
			gap: snapshot.gap,
			order: new Uint32Array(snapshot.order),
			workerCreated: this._engine.workerCreated,
			workerDisabled: this._engine.workerDisabled,
		};
	}

	public async append(
		items: readonly Readonly<MatrixSourceUnit<Meta>>[],
	): Promise<ReadonlyMatrix<Meta>> {
		try {
			return await this._engine.append(items);
		} catch (error: unknown) {
			throw new MasonryMatrixError(MASONRY_MATRIX_ERROR_MESSAGES.APPEND_ITEMS, {
				cause: error,
			});
		}
	}

	public async sort(
		source: ReadonlyMatrix<Meta>,
	): Promise<ReadonlySortItems<Meta>> {
		try {
			return await this._engine.sort(source);
		} catch (error: unknown) {
			throw new MasonryMatrixError(MASONRY_MATRIX_ERROR_MESSAGES.SORT_MATRIX, {
				cause: error,
			});
		}
	}

	public async recreate(
		options: RecreateOptions<Meta>,
	): Promise<ReadonlyMatrix<Meta>> {
		const previousSnapshot = this._engine.snapshot();

		const { rootWidth, columnCount, gap, items } = options;

		const newColumnCount = columnCount ?? previousSnapshot.columnCount;
		const newGap = gap ?? previousSnapshot.gap;

		try {
			this._engine.setEngine(
				new Matrix<Meta>(rootWidth, newColumnCount, newGap),
			);

			return await this._engine.append(items ?? []);
		} catch (error: unknown) {
			this._engine.setEngine(this._restoreMatrix(previousSnapshot));

			throw new MasonryMatrixError(
				MASONRY_MATRIX_ERROR_MESSAGES.RECREATE_MATRIX,
				{
					cause: error,
				},
			);
		}
	}
}
