import {
	MATRIX_ENGINE_ERRORS,
	MatrixEngineError,
} from 'src/core/MatrixEngine/errors';
import type {
	MatrixItem,
	MatrixState,
	SourceItem,
	WithMeta,
} from 'src/core/MatrixEngine/contract';
import { beforeEach, describe, expect, test } from 'vitest';
import { FAKER_SEED } from 'tests/constants.ts';
import { appendToMatrix } from 'src/core/MatrixEngine';
import { faker } from '@faker-js/faker';

interface Meta {
	name: string;
}

type BatchItem<T = never> = WithMeta<SourceItem, T>;

interface MakeStateParams<T = never> {
	columnCount: number;
	rootWidth: number;
	gap?: number;
	columns?: WithMeta<MatrixItem, T>[][];
	columnsHeights?: readonly number[] | Float64Array;
	order?: readonly number[] | Uint32Array;
}

const makeState = <T = never>({
	columnCount,
	rootWidth,
	gap = 0,
	columns,
	columnsHeights,
	order,
}: MakeStateParams<T>): MatrixState<T> => {
	const normalizedOrder = new Uint32Array(columnCount);

	if (order) {
		for (let i = 0; i < columnCount; i++) {
			normalizedOrder[i] = order[i] ?? 0;
		}
	} else {
		for (let i = 0; i < columnCount; i++) {
			normalizedOrder[i] = i;
		}
	}

	const normalizedHeights = new Float64Array(columnCount);

	if (columnsHeights) {
		for (let i = 0; i < columnCount; i++) {
			normalizedHeights[i] = columnsHeights[i] ?? 0;
		}
	}

	return {
		columnCount,
		columnWidth:
			columnCount === 0
				? 0
				: (rootWidth - gap * (columnCount - 1)) / columnCount,
		columns:
			columns ??
			Array.from(
				{ length: columnCount },
				() => [] as WithMeta<MatrixItem, T>[],
			),
		columnsHeights: normalizedHeights,
		gap,
		order: normalizedOrder,
	};
};

const makeBatchItems = (
	count: number,
	options?: {
		minWidth?: number;
		maxWidth?: number;
		minHeight?: number;
		maxHeight?: number;
	},
): BatchItem<Meta>[] => {
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

	test('throws when column count is zero', () => {
		const state = makeState({
			columnCount: 0,
			rootWidth: 240,
		});
		const items = makeBatchItems(3);

		expect(() => appendToMatrix(state, items)).toThrowError(MatrixEngineError);
		expect(() => appendToMatrix(state, items)).toThrowError(
			MATRIX_ENGINE_ERRORS.INVALID_COLUMN_COUNT,
		);

		expect(state.columns).toHaveLength(0);
		expect(Array.from(state.columnsHeights)).toStrictEqual([]);
		expect(Array.from(state.order)).toStrictEqual([]);
	});

	test('skips item with non-finite or non-positive width or height', () => {
		const invalidValues = [
			'100',
			-1,
			0,
			Number.NaN,
			Number.POSITIVE_INFINITY,
			Number.NEGATIVE_INFINITY,
		];

		for (const value of invalidValues) {
			for (const dimension of ['width', 'height'] as const) {
				const state = makeState<Meta>({
					columnCount: 2,
					rootWidth: 400,
				});

				const validItem: BatchItem<Meta> = {
					height: 200,
					id: faker.string.uuid(),
					meta: {
						name: faker.person.fullName(),
					},
					width: 400,
				};

				const invalidItem: BatchItem<Meta> = {
					height: 200,
					id: faker.string.uuid(),
					meta: {
						name: faker.person.fullName(),
					},
					width: 400,
					[dimension]: value,
				};

				appendToMatrix(state, [validItem, invalidItem]);

				expect(state.columns).toStrictEqual([
					[
						{
							height: 100,
							id: validItem.id,
							meta: validItem.meta,
							width: 200,
							x: 0,
							y: 0,
						},
					],
					[],
				]);

				expect(Array.from(state.columnsHeights)).toStrictEqual([100, 0]);
				expect(Array.from(state.order)).toStrictEqual([1, 0]);
			}
		}
	});

	test('returns the same state unchanged when items are empty', () => {
		const state = makeState({
			columnCount: 3,
			rootWidth: 600,
		});

		const originalColumns = state.columns;
		const originalHeights = state.columnsHeights;
		const originalOrder = state.order;

		const result = appendToMatrix(state, []);

		expect(result).toBe(state);
		expect(result.columns).toBe(originalColumns);
		expect(result.columnsHeights).toBe(originalHeights);
		expect(result.order).toBe(originalOrder);
		expect(result.columns).toStrictEqual([[], [], []]);
		expect(Array.from(result.columnsHeights)).toStrictEqual([0, 0, 0]);
		expect(Array.from(result.order)).toStrictEqual([0, 1, 2]);
	});

	test('creates meta property only when source item contains it', () => {
		const item = {
			height: 200,
			id: faker.string.uuid(),
			src: faker.internet.url(),
			width: 400,
		};

		const itemsWithMeta: BatchItem<Meta>[] = [
			{
				...item,
				meta: {
					name: faker.person.fullName(),
				},
			},
		];

		const itemsWithoutMeta: BatchItem[] = [item];

		let state = makeState({
			columnCount: 2,
			rootWidth: 400,
		});

		let result = appendToMatrix(state, itemsWithMeta);

		expect(result.columns[0][0]).toHaveProperty('meta');
		expect(result.columns[0][0]).toStrictEqual({
			height: 100,
			id: item.id,
			meta: itemsWithMeta[0].meta,
			width: 200,
			x: 0,
			y: 0,
		});

		state = makeState({
			columnCount: 2,
			rootWidth: 400,
		});

		result = appendToMatrix(state, itemsWithoutMeta);

		expect(result.columns[0][0]).not.toHaveProperty('meta');
		expect(result.columns[0][0]).toStrictEqual({
			height: 100,
			id: item.id,
			width: 200,
			x: 0,
			y: 0,
		});
	});

	test('mutates the original state in place and returns the same reference', () => {
		const uuid = faker.string.uuid();

		const state = makeState<Meta>({
			columnCount: 2,
			rootWidth: 400,
		});

		const originalColumns = state.columns;
		const originalHeights = state.columnsHeights;
		const originalOrder = state.order;
		const originalMeta = {
			name: faker.person.fullName(),
		};

		const items: BatchItem<Meta>[] = [
			{
				height: 200,
				id: uuid,
				meta: originalMeta,
				width: 400,
			},
		];

		const result = appendToMatrix(state, items);

		expect(result).toBe(state);
		expect(result.columns).toBe(originalColumns);
		expect(result.columnsHeights).toBe(originalHeights);
		expect(result.order).toBe(originalOrder);

		expect(result.columns[0][0].meta).toBe(originalMeta);

		expect(result.columns[0]).toStrictEqual([
			{
				height: 100,
				id: uuid,
				meta: originalMeta,
				width: 200,
				x: 0,
				y: 0,
			},
		]);
		expect(Array.from(result.columnsHeights)).toStrictEqual([100, 0]);
		expect(Array.from(result.order)).toStrictEqual([1, 0]);
	});

	test('places each item into the current shortest column and computes x/y with gap', () => {
		const names = faker.helpers.uniqueArray(faker.person.firstName, 3);
		const uuids = faker.helpers.uniqueArray(faker.string.uuid, 3);

		const state = makeState<Meta>({
			columnCount: 2,
			gap: 12,
			rootWidth: 412, // => columnWidth = 200
		});

		const items: BatchItem<Meta>[] = [
			{
				height: 200,
				id: uuids[0],
				meta: {
					name: names[0],
				},
				width: 400,
			},
			{
				height: 200,
				id: uuids[1],
				meta: {
					name: names[1],
				},
				width: 200,
			},
			{
				height: 300,
				id: uuids[2],
				meta: {
					name: names[2],
				},
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
					width: 200,
					x: 0,
					y: 0,
				},
				{
					height: 150,
					id: uuids[2],
					meta: {
						name: names[2],
					},
					width: 200,
					x: 0,
					y: 112,
				},
			],
			[
				{
					height: 200,
					id: uuids[1],
					meta: {
						name: names[1],
					},
					width: 200,
					x: 212,
					y: 0,
				},
			],
		]);

		expect(Array.from(result.columnsHeights)).toStrictEqual([262, 200]);
		expect(Array.from(result.order)).toStrictEqual([1, 0]);
	});

	test('continues appending correctly for a pre-populated state', () => {
		const names = faker.helpers.uniqueArray(faker.person.firstName, 4);
		const uuids = faker.helpers.uniqueArray(faker.string.uuid, 4);

		const state = makeState<Meta>({
			columnCount: 3,
			columns: [
				[
					{
						height: 300,
						id: uuids[0],
						meta: {
							name: names[0],
						},
						width: 300,
						x: 0,
						y: 0,
					},
				],
				[
					{
						height: 100,
						id: uuids[1],
						meta: {
							name: names[1],
						},
						width: 300,
						x: 310,
						y: 0,
					},
				],
				[
					{
						height: 200,
						id: uuids[2],
						meta: {
							name: names[2],
						},
						width: 300,
						x: 620,
						y: 0,
					},
				],
			],
			columnsHeights: [300, 100, 200],
			gap: 10,
			order: [1, 2, 0],
			rootWidth: 920,
		});

		const items: BatchItem<Meta>[] = [
			{
				height: 300,
				id: uuids[3],
				meta: {
					name: names[3],
				},
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
				width: 300,
				x: 310,
				y: 0,
			},
			{
				height: 150,
				id: uuids[3],
				meta: {
					name: names[3],
				},
				width: 300,
				x: 310,
				y: 110,
			},
		]);

		expect(Array.from(result.columnsHeights)).toStrictEqual([300, 260, 200]);
		expect(Array.from(result.order)).toStrictEqual([2, 1, 0]);
	});

	test('does not create duplicate placements for unique valid items', () => {
		const state = makeState({
			columnCount: 4,
			gap: 8,
			rootWidth: 264,
		});
		const items = makeBatchItems(120, {
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

	test('keeps internal columnsHeights consistent with actual column contents including gaps', () => {
		const state = makeState({
			columnCount: 3,
			gap: 8,
			rootWidth: 316, // => columnWidth = 100
		});
		const items = makeBatchItems(80, {
			maxHeight: 900,
			maxWidth: 900,
			minHeight: 250,
			minWidth: 250,
		});

		const result = appendToMatrix(state, items);

		const calculatedHeights = result.columns.map((column) => {
			if (column.length === 0) {
				return 0;
			}

			const itemsHeight = column.reduce((sum, item) => sum + item.height, 0);

			return itemsHeight + result.gap * (column.length - 1);
		});

		expect(Array.from(result.columnsHeights)).toStrictEqual(calculatedHeights);
	});

	test('keeps order sorted by ascending current column heights after a large batch', () => {
		const state = makeState({
			columnCount: 4,
			gap: 6,
			rootWidth: 418, // => columnWidth = 100
		});
		const items = makeBatchItems(400, {
			maxHeight: 900,
			maxWidth: 900,
			minHeight: 400,
			minWidth: 400,
		});

		const result = appendToMatrix(state, items);

		const orderedHeights = Array.from(result.order).map(
			(columnIndex) => result.columnsHeights[columnIndex],
		);

		expect(orderedHeights).toStrictEqual(
			[...orderedHeights].sort((a, b) => a - b),
		);
	});
});
