import { describe, expect, test } from 'vitest';

import { createMatrixState } from 'src/core/MasonryMatrix/internal/matrixEngine/createMatrixState.ts';
import { faker } from '@faker-js/faker';

describe('createMatrixState', () => {
	test('creates state with default count = 1', () => {
		const result = createMatrixState(960);

		expect(result.count).toBe(1);
		expect(result.width).toBe(960);
		expect(result.columns).toStrictEqual([[]]);
		expect(Array.from(result.heights)).toStrictEqual([0]);
		expect(Array.from(result.order)).toStrictEqual([0]);

		expect(result.heights).toBeInstanceOf(Float64Array);
		expect(result.order).toBeInstanceOf(Int16Array);
	});

	test('creates state with the requested column count', () => {
		const result = createMatrixState(900, 3);

		expect(result.count).toBe(3);
		expect(result.width).toBe(300);
		expect(result.columns).toHaveLength(3);
		expect(result.columns).toStrictEqual([[], [], []]);
		expect(Array.from(result.heights)).toStrictEqual([0, 0, 0]);
		expect(Array.from(result.order)).toStrictEqual([0, 1, 2]);
	});

	test('dont uses round division when rootWidth is not divisible by count', () => {
		const result = createMatrixState(1000, 3);

		expect(result.width).toBe(1000 / 3);
		expect(result.width).toBe(333.3333333333333);
	});

	test('returns width = 0 when count is 0', () => {
		const result = createMatrixState(1000, 0);

		expect(result.count).toBe(0);
		expect(result.width).toBe(0);
		expect(result.columns).toStrictEqual([]);
		expect(Array.from(result.heights)).toStrictEqual([]);
		expect(Array.from(result.order)).toStrictEqual([]);
	});

	test('initializes order as a sequence from 0 to count - 1', () => {
		const result = createMatrixState(1200, 5);

		expect(Array.from(result.order)).toStrictEqual([0, 1, 2, 3, 4]);
	});

	test('creates a separate array for each column', () => {
		const result = createMatrixState(1200, 3);

		expect(result.columns[0]).not.toBe(result.columns[1]);
		expect(result.columns[1]).not.toBe(result.columns[2]);
		expect(result.columns[0]).not.toBe(result.columns[2]);

		result.columns[0].push({
			height: 300,
			id: 'item-1',
			src: faker.image.url(),
			width: 400,
		});

		expect(result.columns[0]).toHaveLength(1);
		expect(result.columns[1]).toHaveLength(0);
		expect(result.columns[2]).toHaveLength(0);
	});

	test('returns fresh independent structures on each call', () => {
		const first = createMatrixState(800, 2);
		const second = createMatrixState(800, 2);

		expect(first).not.toBe(second);
		expect(first.columns).not.toBe(second.columns);
		expect(first.heights).not.toBe(second.heights);
		expect(first.order).not.toBe(second.order);

		first.columns[0].push({
			height: 200,
			id: faker.string.uuid(),
			src: faker.image.url(),
			width: 400,
		});
		first.heights[0] = 123;
		first.order[0] = 1;

		expect(second.columns).toStrictEqual([[], []]);
		expect(Array.from(second.heights)).toStrictEqual([0, 0]);
		expect(Array.from(second.order)).toStrictEqual([0, 1]);
	});

	test('creates typed arrays with lengths equal to count', () => {
		const result = createMatrixState(1400, 4);

		expect(result.heights).toBeInstanceOf(Float64Array);
		expect(result.order).toBeInstanceOf(Int16Array);
		expect(result.heights.length).toBe(4);
		expect(result.order.length).toBe(4);
	});
});
