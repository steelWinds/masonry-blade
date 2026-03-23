import { MASONRY_MATRIX_ERROR_MESSAGES, MasonryMatrixError } from '../errors';
import type { MasonryMatrixState, RecreateOptions } from '../contract';
import {
	Matrix,
	type MatrixComputedUnit,
	type MatrixSnapshot,
	type MatrixSourceUnit,
	type ReadonlyMatrix,
	WebWorker,
} from 'src/core/LayoutCalculationEngine';

export class MasonryMatrix<T = undefined> {
	private readonly _engine: WebWorker<
		ReadonlyMatrix<T>,
		MatrixSnapshot<T>,
		MatrixComputedUnit<T>
	>;
	constructor(...args: ConstructorParameters<typeof Matrix<T>>) {
		this._engine = new WebWorker<
			ReadonlyMatrix<T>,
			MatrixSnapshot<T>,
			MatrixComputedUnit<T>
		>(
			new Matrix(...args),
			new URL(import.meta.env.MATRIX_ENGINE_WORKER, import.meta.url).href,
		);
	}

	private _restoreMatrix(snapshot: Readonly<MatrixSnapshot<T>>): Matrix<T> {
		const matrix = new Matrix<T>(
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
		items: readonly Readonly<MatrixSourceUnit<T>>[],
	): Promise<Readonly<ReadonlyMatrix<T>>> {
		try {
			const snapshot = await this._engine.append(items);

			return snapshot.internalState;
		} catch (error: unknown) {
			throw new MasonryMatrixError(MASONRY_MATRIX_ERROR_MESSAGES.APPEND_ITEMS, {
				cause: error,
			});
		}
	}

	public async recreate(
		options: RecreateOptions<T>,
	): Promise<Readonly<ReadonlyMatrix<T>>> {
		const previousSnapshot = this._engine.snapshot();

		const { rootWidth, columnCount, gap, items } = options;

		const newColumnCount = columnCount ?? previousSnapshot.columnCount;
		const newGap = gap ?? previousSnapshot.gap;

		try {
			this._engine.setEngine(new Matrix<T>(rootWidth, newColumnCount, newGap));
			const snapshot = await this._engine.append(items ?? []);

			return snapshot.internalState;
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
