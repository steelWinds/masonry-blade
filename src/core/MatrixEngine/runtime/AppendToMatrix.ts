import { MATRIX_ENGINE_ERRORS, MatrixEngineError } from '../errors';
import type {
	MatrixItem,
	MatrixState,
	SourceItem,
	WithMeta,
} from '../contract';
import { isPositiveFiniteNumber } from 'src/utils/IsFiniteNonZero';

export const appendToMatrix = <T = never>(
	state: MatrixState<T>,
	batchItems: readonly WithMeta<SourceItem, T>[],
): MatrixState<T> => {
	const { columnCount, columnWidth, columnsHeights, order, columns, gap } =
		state;

	if (!Number.isInteger(columnCount) || columnCount <= 0) {
		throw new MatrixEngineError(MATRIX_ENGINE_ERRORS.INVALID_COLUMN_COUNT, {
			cause: state,
		});
	}

	for (let idx = 0; idx < batchItems.length; idx++) {
		const item = batchItems[idx];

		if (
			!isPositiveFiniteNumber(item.width) ||
			!isPositiveFiniteNumber(item.height)
		) {
			continue;
		}

		const [shortest] = order;
		const shortestColumn = columns[shortest];

		const isFirstInColumn = shortestColumn.length === 0;

		const elementHeight = (item.height * columnWidth) / item.width;

		const y = isFirstInColumn ? 0 : columnsHeights[shortest] + gap;
		const x = shortest * (columnWidth + gap);

		const matrixItem = {
			height: elementHeight,
			id: item.id,
			width: columnWidth,
			x,
			y,
			...('meta' in item ? { meta: item.meta } : {}),
		} as WithMeta<MatrixItem, T>;

		columns[shortest].push(matrixItem);

		const newColumnHeight = y + elementHeight;

		columnsHeights[shortest] = newColumnHeight;

		let pos = 1;

		while (pos < columnCount) {
			const next = order[pos];

			if (columnsHeights[next] > newColumnHeight) {
				break;
			}

			order[pos - 1] = next;
			pos++;
		}

		order[pos - 1] = shortest;
	}

	return state;
};
