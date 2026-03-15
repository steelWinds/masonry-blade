import type {
	ImageItem,
	MasonryItem,
	MasonryState,
} from 'src/utils/MasonryMatrix/lib/masonryEngine/types.ts';
import { beforeEach, describe, expect, test } from 'vitest';
import { FAKER_SEED } from 'lib/constants.ts';
import { appendToMatrix } from 'src/utils/MasonryMatrix/lib/masonryEngine/appendToMatrix.ts';
import { faker } from '@faker-js/faker';

const makeState = (
	count: number,
	rootWidth: number,
	columns?: MasonryItem[][],
): MasonryState => {
	const order = new Int16Array(count);

	for (let i = 0; i < count; i++) {
		order[i] = i;
	}

	return {
		columns:
			columns ?? Array.from({ length: count }, () => [] as MasonryItem[]),
		count,
		heights: new Float64Array(count),
		order,
		width: count === 0 ? 0 : rootWidth / count,
	};
};

const makeImageItems = (
	count: number,
	options?: {
		minWidth?: number;
		maxWidth?: number;
		minHeight?: number;
		maxHeight?: number;
	},
): ImageItem[] => {
	const {
		minWidth = 120,
		maxWidth = 1600,
		minHeight = 120,
		maxHeight = 1600,
	} = options ?? {};

	return Array.from({ length: count }, () => ({
		height: faker.number.int({ max: maxHeight, min: minHeight }),
		id: faker.string.uuid(),
		src: faker.internet.url(),
		width: faker.number.int({ max: maxWidth, min: minWidth }),
	}));
};

describe('appendToMatrix', () => {
	beforeEach(() => {
		faker.seed(FAKER_SEED);
	});

	test('returns the same state unchanged when column count is zero', () => {
		const state = makeState(0, 240);
		const items = makeImageItems(3);

		const result = appendToMatrix(state, items);

		expect(result).toBe(state);
		expect(result.columns).toHaveLength(0);
		expect(Array.from(result.heights)).toEqual([]);
		expect(Array.from(result.order)).toEqual([]);
	});

	test('returns the same state unchanged when items are empty', () => {
		const state = makeState(3, 600);
		const originalColumns = state.columns;
		const originalHeights = state.heights;
		const originalOrder = state.order;

		const result = appendToMatrix(state, []);

		expect(result).toBe(state);
		expect(result.columns).toBe(originalColumns);
		expect(result.heights).toBe(originalHeights);
		expect(result.order).toBe(originalOrder);
		expect(result.columns).toEqual([[], [], []]);
		expect(Array.from(result.heights)).toEqual([0, 0, 0]);
		expect(Array.from(result.order)).toEqual([0, 1, 2]);
	});

	test('mutates the original state in place and returns the same reference', () => {
		const state = makeState(2, 400);
		const originalColumns = state.columns;
		const originalHeights = state.heights;
		const originalOrder = state.order;

		const items: ImageItem[] = [
			{
				height: 200,
				id: 'img-1',
				src: 'https://example.com/1.jpg',
				width: 400,
			},
		];

		const result = appendToMatrix(state, items);

		expect(result).toBe(state);
		expect(result.columns).toBe(originalColumns);
		expect(result.heights).toBe(originalHeights);
		expect(result.order).toBe(originalOrder);

		expect(result.columns[0]).toEqual([
			{
				height: 100,
				id: 'img-1',
				src: 'https://example.com/1.jpg',
				width: 200,
			},
		]);
		expect(Array.from(result.heights)).toEqual([100, 0]);
		expect(Array.from(result.order)).toEqual([1, 0]);
	});

	test('skips items with non-positive width or height', () => {
		const state = makeState(2, 400);

		const items: ImageItem[] = [
			{
				height: 200,
				id: 'invalid-width',
				src: 'https://example.com/invalid-width.jpg',
				width: 0,
			},
			{
				height: -10,
				id: 'invalid-height',
				src: 'https://example.com/invalid-height.jpg',
				width: 200,
			},
			{
				height: 200,
				id: 'valid',
				src: 'https://example.com/valid.jpg',
				width: 400,
			},
		];

		const result = appendToMatrix(state, items);

		expect(result.columns).toEqual([
			[
				{
					height: 100,
					id: 'valid',
					src: 'https://example.com/valid.jpg',
					width: 200,
				},
			],
			[],
		]);
		expect(Array.from(result.heights)).toEqual([100, 0]);
		expect(Array.from(result.order)).toEqual([1, 0]);
	});

	test('places each item into the current shortest column and updates order', () => {
		const state = makeState(2, 400);

		const items: ImageItem[] = [
			{
				height: 200,
				id: 'a',
				src: 'https://example.com/a.jpg',
				width: 400,
			},
			{
				height: 200,
				id: 'b',
				src: 'https://example.com/b.jpg',
				width: 200,
			},
			{
				height: 300,
				id: 'c',
				src: 'https://example.com/c.jpg',
				width: 400,
			},
		];

		const result = appendToMatrix(state, items);

		expect(result.columns).toEqual([
			[
				{
					height: 100,
					id: 'a',
					src: 'https://example.com/a.jpg',
					width: 200,
				},
				{
					height: 150,
					id: 'c',
					src: 'https://example.com/c.jpg',
					width: 200,
				},
			],
			[
				{
					height: 200,
					id: 'b',
					src: 'https://example.com/b.jpg',
					width: 200,
				},
			],
		]);

		expect(Array.from(result.heights)).toEqual([250, 200]);
		expect(Array.from(result.order)).toEqual([1, 0]);
	});

	test('continues appending correctly for a pre-populated state', () => {
		const state = makeState(3, 900, [
			[
				{
					height: 300,
					id: 'existing-0',
					src: 'https://example.com/existing-0.jpg',
					width: 300,
				},
			],
			[
				{
					height: 100,
					id: 'existing-1',
					src: 'https://example.com/existing-1.jpg',
					width: 300,
				},
			],
			[
				{
					height: 200,
					id: 'existing-2',
					src: 'https://example.com/existing-2.jpg',
					width: 300,
				},
			],
		]);

		state.heights[0] = 300;
		state.heights[1] = 100;
		state.heights[2] = 200;
		state.order[0] = 1;
		state.order[1] = 2;
		state.order[2] = 0;

		const items: ImageItem[] = [
			{
				height: 300,
				id: 'next',
				src: 'https://example.com/next.jpg',
				width: 600,
			},
		];

		const result = appendToMatrix(state, items);

		expect(result.columns[1]).toEqual([
			{
				height: 100,
				id: 'existing-1',
				src: 'https://example.com/existing-1.jpg',
				width: 300,
			},
			{
				height: 150,
				id: 'next',
				src: 'https://example.com/next.jpg',
				width: 300,
			},
		]);

		expect(Array.from(result.heights)).toEqual([300, 250, 200]);
		expect(Array.from(result.order)).toEqual([2, 1, 0]);
	});

	test('does not create duplicate placements for unique valid items', () => {
		const state = makeState(4, 240);
		const items = makeImageItems(120, {
			maxHeight: 1200,
			maxWidth: 1200,
			minHeight: 200,
			minWidth: 200,
		});

		const result = appendToMatrix(state, items);

		const placedIds = result.columns.flat().map((item) => item.id);
		const validIds = items.map((item) => item.id);

		expect(placedIds).toHaveLength(validIds.length);
		expect(new Set(placedIds).size).toBe(validIds.length);
		expect(new Set(placedIds)).toEqual(new Set(validIds));
	});

	test('keeps internal heights consistent with the actual column contents', () => {
		const state = makeState(3, 260);
		const items = makeImageItems(80, {
			maxHeight: 900,
			maxWidth: 900,
			minHeight: 250,
			minWidth: 250,
		});

		const result = appendToMatrix(state, items);

		const calculatedHeights = result.columns.map((column) =>
			column.reduce((sum, item) => sum + item.height, 0),
		);

		expect(Array.from(result.heights)).toEqual(calculatedHeights);
	});

	test('keeps the column height gap below 30% for a large batch of items', () => {
		const state = makeState(4, 320);
		const items = makeImageItems(400, {
			maxHeight: 900,
			maxWidth: 900,
			minHeight: 400,
			minWidth: 400,
		});

		const result = appendToMatrix(state, items);

		const heights = Array.from(result.heights);
		const maxHeight = Math.max(...heights);
		const minHeight = Math.min(...heights);
		const heightGapRatio =
			maxHeight === 0 ? 0 : (maxHeight - minHeight) / maxHeight;

		expect(heightGapRatio).toBeLessThan(0.3);
	});
});
