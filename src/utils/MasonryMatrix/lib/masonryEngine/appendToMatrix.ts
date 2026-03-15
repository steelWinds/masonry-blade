import type { ImageItem, MasonryState } from './types.ts';

export const appendToMatrix = (
	state: MasonryState,
	items: readonly ImageItem[],
): MasonryState => {
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

		columns[shortest].push({
			height,
			id: item.id,
			src: item.src,
			width,
		});

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
