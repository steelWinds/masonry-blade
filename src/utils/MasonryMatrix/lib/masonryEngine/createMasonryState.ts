import type { MasonryItem, MasonryState } from './types.ts';

export const createMasonryState = (
	rootWidth: number,
	count: number = 1,
): MasonryState => {
	const heights = new Float64Array(count);
	const order = new Int16Array(count);
	const columns: MasonryItem[][] = Array.from({ length: count }, () => []);

	for (let i = 0; i < count; i++) {
		order[i] = i;
	}

	return {
		columns,
		count,
		heights,
		order,
		width: count === 0 ? 0 : rootWidth / count,
	};
};
