import type { ImageItem, MatrixItem, MatrixState } from './types.ts';

export const appendToMatrix = <T = never>(
	state: MatrixState<T>,
	items: readonly ImageItem<T>[],
): MatrixState<T> => {
	const { count, width, heights, order, columns } = state;

	if (count <= 0 || items.length === 0) {
		return state;
	}

	for (let i = 0, len = items.length; i < len; i++) {
		const item = items[i];

		if (item.width <= 0 || item.height <= 0) {
			continue;
		}

		const [shortest] = order;

		const height = (item.height * width) / item.width;

		const matrixItem = {
			height,
			id: item.id,
			src: item.src,
			width,
			...('meta' in item ? { meta: item.meta } : {}),
		} as MatrixItem<T>;

		columns[shortest].push(matrixItem);

		const newColumnHeight = heights[shortest] + height;

		heights[shortest] = newColumnHeight;

		let pos = 1;

		while (pos < count) {
			const next = order[pos];

			if (heights[next] > newColumnHeight) {
				break;
			}

			order[pos - 1] = next;
			pos++;
		}

		order[pos - 1] = shortest;
	}

	return state;
};
