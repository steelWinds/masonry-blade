import type {
	LayoutCalculationEngine,
	MatrixComputedUnit,
	MatrixSnapshot,
	MatrixSourceUnit,
	ReadonlyMatrix,
} from '../../contract';
import { MATRIX_ERRORS, MatrixError } from '../../errors';
import { MatrixUnit } from './MatrixUnit';
import { isPositiveFiniteNumber } from 'src/utils/IsFiniteNonZero';
import { kWayMerge } from 'src/utils/kWayMerge';

export class Matrix<T = undefined> implements LayoutCalculationEngine<
	ReadonlyMatrix<T>
> {
	private readonly _order: Uint32Array;
	private readonly _columnHeights: Float64Array;
	private readonly _matrix: MatrixComputedUnit<T>[][];
	private readonly _rootWidth: number;
	private readonly _realWidth: number;
	private readonly _columnCount: number;
	private readonly _columnWidth: number;
	private readonly _gap: number;

	constructor(rootWidth: number, columnCount: number, gap: number) {
		this._validateLayout(rootWidth, columnCount, gap);

		this._rootWidth = rootWidth;
		this._columnCount = columnCount;
		this._gap = gap;
		this._realWidth = this._getRealWidth(
			this._rootWidth,
			this._columnCount,
			this._gap,
		);

		this._columnWidth = this._getColumnWidth(
			this._realWidth,
			this._columnCount,
		);

		this._order = new Uint32Array(this._columnCount);
		this._columnHeights = new Float64Array(this._columnCount);
		this._matrix = Object.freeze(
			Array.from({ length: this._columnCount }, () => []),
		) as unknown as MatrixComputedUnit<T>[][];

		for (let i = 0; i < this._columnCount; i++) {
			this._order[i] = i;
		}
	}

	private _getRealWidth(rootWidth: number, columnCount: number, gap: number) {
		return rootWidth - gap * (columnCount - 1);
	}

	private _getColumnWidth(realWidth: number, columnCount: number) {
		return realWidth / columnCount;
	}

	private _isValidRootWidth(rootWidth: number) {
		return Number.isFinite(rootWidth) && rootWidth > 0;
	}

	private _isValidColumnCount(columnCount: number) {
		return Number.isInteger(columnCount) && columnCount > 0;
	}

	private _isValidGap(rootWidth: number, columnCount: number, gap: number) {
		return (
			Number.isFinite(gap) &&
			gap >= 0 &&
			this._getRealWidth(rootWidth, columnCount, gap) > 0
		);
	}

	private _isValidItemId(id: string | number) {
		return (typeof id === 'string' && id.length > 0) || Number.isFinite(id);
	}

	private _isValidSourceItem(sourceItem: Readonly<MatrixSourceUnit<T>>) {
		return (
			isPositiveFiniteNumber(sourceItem.width) &&
			isPositiveFiniteNumber(sourceItem.height) &&
			this._isValidItemId(sourceItem.id)
		);
	}

	private _validateLayout(rootWidth: number, columnCount: number, gap: number) {
		if (!this._isValidRootWidth(rootWidth)) {
			throw new MatrixError(MATRIX_ERRORS.INVALID_ROOT_WIDTH);
		} else if (!this._isValidColumnCount(columnCount)) {
			throw new MatrixError(MATRIX_ERRORS.INVALID_COLUMN_COUNT);
		} else if (!this._isValidGap(rootWidth, columnCount, gap)) {
			throw new MatrixError(MATRIX_ERRORS.INVALID_GAP);
		}
	}

	append(arr: readonly Readonly<MatrixSourceUnit<T>>[]): ReadonlyMatrix<T> {
		for (let idx = 0; idx < arr.length; idx++) {
			const item = arr[idx];

			if (!this._isValidSourceItem(item)) {
				continue;
			}

			const [shortest] = this._order;
			const shortestColumn = this._matrix[shortest];
			const isFirstInColumn = shortestColumn.length === 0;

			const width = this._columnWidth;
			const height = (item.height * width) / item.width;

			const y = isFirstInColumn ? 0 : this._columnHeights[shortest] + this._gap;
			const x = shortest * (width + this._gap);

			shortestColumn.push(
				Object.freeze(
					new MatrixUnit<T>(item.id, height, width, x, y, item.meta),
				),
			);

			const newColumnHeight = y + height;

			this._columnHeights[shortest] = newColumnHeight;

			let pos = 1;

			while (pos < this._columnCount) {
				const next = this._order[pos];

				if (this._columnHeights[next] > newColumnHeight) {
					break;
				}

				this._order[pos - 1] = next;
				pos++;
			}

			this._order[pos - 1] = shortest;
		}

		return this._matrix.map((column) => [...column]);
	}

	snapshot(): Readonly<MatrixSnapshot<T>> {
		return {
			columnCount: this._columnCount,
			columnHeights: new Float64Array(this._columnHeights),
			columnWidth: this._columnWidth,
			gap: this._gap,
			internalState: this._matrix.map((column) => [...column]),
			order: new Uint32Array(this._order),
			realWidth: this._realWidth,
			rootWidth: this._rootWidth,
		};
	}

	sort(
		source: readonly (readonly Readonly<MatrixUnit<T>>[])[],
	): readonly Readonly<MatrixComputedUnit<T>>[] {
		return kWayMerge(source, (a, b) => a.y - b.y || a.x - b.x);
	}
}
