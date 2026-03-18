import type {
	ImageItem,
	MatrixItem,
	MatrixState,
} from 'src/core/MasonryMatrix/internal/matrixEngine/types.ts';
import { beforeEach, describe, expect, test } from 'vitest';
import { FAKER_SEED } from 'tests/constants.ts';
import { appendToMatrix } from 'src/core/MasonryMatrix/internal/matrixEngine/appendToMatrix.ts';
import { faker } from '@faker-js/faker';

interface Meta {
	name: string;
}

const makeState = <T = never>(
	count: number,
	rootWidth: number,
	columns?: MatrixItem<T>[][],
): MatrixState<T> => {
	const order = new Int16Array(count);

	for (let i = 0; i < count; i++) {
		order[i] = i;
	}

	return {
		columns:
			columns ?? Array.from({ length: count }, () => [] as MatrixItem<T>[]),
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
): ImageItem<Meta>[] => {
	const {
		minWidth = 120,
		maxWidth = 1600,
		minHeight = 120,
		maxHeight = 1600,
	} = options ?? {};

	return Array.from({ length: count }, () => ({
		height: faker.number.int({ max: maxHeight, min: minHeight }),
		id: faker.string.uuid(),
		meta: {
			name: faker.person.fullName(),
		},
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
		expect(Array.from(result.heights)).toStrictEqual([]);
		expect(Array.from(result.order)).toStrictEqual([]);
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
		expect(result.columns).toStrictEqual([[], [], []]);
		expect(Array.from(result.heights)).toStrictEqual([0, 0, 0]);
		expect(Array.from(result.order)).toStrictEqual([0, 1, 2]);
	});

	test('create meta property if source items does contain it', () => {
		let state;
		let result;

		const item = {
			height: 200,
			id: faker.string.uuid(),
			src: faker.image.url(),
			width: 400,
		};

		const itemsWithMeta: ImageItem<Meta>[] = [
			{
				...item,
				meta: {
					name: faker.person.fullName(),
				},
			},
		];

		const itemsWithoutMeta: ImageItem[] = [item];

		state = makeState(2, 400);

		result = appendToMatrix(state, itemsWithMeta);

		expect(result.columns[0][0]).toHaveProperty('meta');

		state = makeState(2, 400);

		result = appendToMatrix(state, itemsWithoutMeta);

		expect(result.columns[0][0]).not.toHaveProperty('meta');
	});

	test('mutates the original state in place and returns the same reference', () => {
		const url = faker.image.url();
		const uuid = faker.string.uuid();

		const state = makeState(2, 400);

		const originalColumns = state.columns;
		const originalHeights = state.heights;
		const originalOrder = state.order;
		const originalMeta = {
			name: faker.person.fullName(),
		};

		const items: ImageItem<Meta>[] = [
			{
				height: 200,
				id: uuid,
				meta: originalMeta,
				src: url,
				width: 400,
			},
		];

		const result = appendToMatrix(state, items);

		expect(result).toBe(state);
		expect(result.columns).toBe(originalColumns);
		expect(result.heights).toBe(originalHeights);
		expect(result.order).toBe(originalOrder);

		// For meta object does not create copy
		expect(result.columns[0][0].meta).toBe(originalMeta);

		expect(result.columns[0]).toStrictEqual([
			{
				height: 100,
				id: uuid,
				meta: originalMeta,
				src: url,
				width: 200,
			},
		]);
		expect(Array.from(result.heights)).toStrictEqual([100, 0]);
		expect(Array.from(result.order)).toStrictEqual([1, 0]);
	});

	test('skips items with non-positive width or height', () => {
		const names = faker.helpers.uniqueArray(faker.person.firstName, 3);
		const urls = faker.helpers.uniqueArray(faker.image.url, 3);
		const uuids = faker.helpers.uniqueArray(faker.string.uuid, 3);

		const state = makeState(2, 400);

		const items: ImageItem<Meta>[] = [
			{
				height: 200,
				id: uuids[0],
				meta: {
					name: names[0],
				},
				src: urls[0],
				width: 0,
			},
			{
				height: -10,
				id: uuids[1],
				meta: {
					name: names[1],
				},
				src: urls[1],
				width: 200,
			},
			{
				height: 200,
				id: uuids[2],
				meta: {
					name: names[2],
				},
				src: urls[2],
				width: 400,
			},
		];

		const result = appendToMatrix(state, items);

		expect(result.columns).toStrictEqual([
			[
				{
					height: 100,
					id: uuids[2],
					meta: {
						name: names[2],
					},
					src: urls[2],
					width: 200,
				},
			],
			[],
		]);
		expect(Array.from(result.heights)).toStrictEqual([100, 0]);
		expect(Array.from(result.order)).toStrictEqual([1, 0]);
	});

	test('places each item into the current shortest column and updates order', () => {
		const names = faker.helpers.uniqueArray(faker.person.firstName, 3);
		const urls = faker.helpers.uniqueArray(faker.image.url, 3);
		const uuids = faker.helpers.uniqueArray(faker.string.uuid, 3);

		const state = makeState(2, 400);

		const items: ImageItem<Meta>[] = [
			{
				height: 200,
				id: uuids[0],
				meta: {
					name: names[0],
				},
				src: urls[0],
				width: 400,
			},
			{
				height: 200,
				id: uuids[1],
				meta: {
					name: names[1],
				},
				src: urls[1],
				width: 200,
			},
			{
				height: 300,
				id: uuids[2],
				meta: {
					name: names[2],
				},
				src: urls[2],
				width: 400,
			},
		];

		const result = appendToMatrix(state, items);

		expect(result.columns).toStrictEqual([
			[
				{
					height: 100,
					id: uuids[0],
					meta: {
						name: names[0],
					},
					src: urls[0],
					width: 200,
				},
				{
					height: 150,
					id: uuids[2],
					meta: {
						name: names[2],
					},
					src: urls[2],
					width: 200,
				},
			],
			[
				{
					height: 200,
					id: uuids[1],
					meta: {
						name: names[1],
					},
					src: urls[1],
					width: 200,
				},
			],
		]);

		expect(Array.from(result.heights)).toStrictEqual([250, 200]);
		expect(Array.from(result.order)).toStrictEqual([1, 0]);
	});

	test('continues appending correctly for a pre-populated state', () => {
		const names = faker.helpers.uniqueArray(faker.person.firstName, 4);
		const urls = faker.helpers.uniqueArray(faker.image.url, 4);
		const uuids = faker.helpers.uniqueArray(faker.string.uuid, 4);

		const state = makeState(3, 900, [
			[
				{
					height: 300,
					id: uuids[0],
					meta: {
						name: names[0],
					},
					src: urls[0],
					width: 300,
				},
			],
			[
				{
					height: 100,
					id: uuids[1],
					meta: {
						name: names[1],
					},
					src: urls[1],
					width: 300,
				},
			],
			[
				{
					height: 200,
					id: uuids[2],
					meta: {
						name: names[2],
					},
					src: urls[2],
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

		const items: ImageItem<Meta>[] = [
			{
				height: 300,
				id: uuids[3],
				meta: {
					name: names[3],
				},
				src: urls[3],
				width: 600,
			},
		];

		const result = appendToMatrix(state, items);

		expect(result.columns[1]).toStrictEqual([
			{
				height: 100,
				id: uuids[1],
				meta: {
					name: names[1],
				},
				src: urls[1],
				width: 300,
			},
			{
				height: 150,
				id: uuids[3],
				meta: {
					name: names[3],
				},
				src: urls[3],
				width: 300,
			},
		]);

		expect(Array.from(result.heights)).toStrictEqual([300, 250, 200]);
		expect(Array.from(result.order)).toStrictEqual([2, 1, 0]);
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
		expect(new Set(placedIds)).toStrictEqual(new Set(validIds));
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

		expect(Array.from(result.heights)).toStrictEqual(calculatedHeights);
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
