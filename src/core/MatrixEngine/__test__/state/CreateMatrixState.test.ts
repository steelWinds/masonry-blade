import {
	MATRIX_ENGINE_ERRORS,
	MatrixEngineError,
} from 'src/core/MatrixEngine/errors';
import { describe, expect, test } from 'vitest';
import { createMatrixState } from 'src/core/MatrixEngine';
import { faker } from '@faker-js/faker';

describe('createMatrixState', () => {
	test('creates state with default columnCount = 1 and gap = 0', () => {
		const result = createMatrixState(960);

		expect(result.columnCount).toBe(1);
		expect(result.columnWidth).toBe(960);
		expect(result.gap).toBe(0);
		expect(result.columns).toStrictEqual([[]]);
		expect(Array.from(result.columnsHeights)).toStrictEqual([0]);
		expect(Array.from(result.order)).toStrictEqual([0]);

		expect(result.columnsHeights).toBeInstanceOf(Float64Array);
		expect(result.order).toBeInstanceOf(Uint32Array);
	});

	test('creates state with the requested column count', () => {
		const result = createMatrixState(900, 3);

		expect(result.columnCount).toBe(3);
		expect(result.columnWidth).toBe(300);
		expect(result.gap).toBe(0);
		expect(result.columns).toHaveLength(3);
		expect(result.columns).toStrictEqual([[], [], []]);
		expect(Array.from(result.columnsHeights)).toStrictEqual([0, 0, 0]);
		expect(Array.from(result.order)).toStrictEqual([0, 1, 2]);
	});

	test('applies gap when calculating columnWidth', () => {
		const result = createMatrixState(1000, 4, 10);

		expect(result.columnCount).toBe(4);
		expect(result.gap).toBe(10);
		expect(result.columnWidth).toBe((1000 - 10 * 3) / 4);
		expect(result.columnWidth).toBe(242.5);
	});

	test('does not use rounded division when rootWidth is not divisible by columnCount', () => {
		const result = createMatrixState(1000, 3);

		expect(result.columnWidth).toBe(1000 / 3);
		expect(result.columnWidth).toBe(333.3333333333333);
	});

	test('returns columnWidth = 0 when total gaps exceed rootWidth', () => {
		const result = createMatrixState(10, 3, 20);

		expect(result.columnCount).toBe(3);
		expect(result.gap).toBe(20);
		expect(result.columnWidth).toBe(0);
		expect(result.columns).toStrictEqual([[], [], []]);
		expect(Array.from(result.columnsHeights)).toStrictEqual([0, 0, 0]);
		expect(Array.from(result.order)).toStrictEqual([0, 1, 2]);
	});

	test('initializes order as a sequence from 0 to columnCount - 1', () => {
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
			width: 400,
			x: 0,
			y: 0,
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
		expect(first.columnsHeights).not.toBe(second.columnsHeights);
		expect(first.order).not.toBe(second.order);

		first.columns[0].push({
			height: 200,
			id: faker.string.uuid(),
			width: 400,
			x: 0,
			y: 0,
		});
		first.columnsHeights[0] = 123;
		first.order[0] = 1;

		expect(second.columns).toStrictEqual([[], []]);
		expect(Array.from(second.columnsHeights)).toStrictEqual([0, 0]);
		expect(Array.from(second.order)).toStrictEqual([0, 1]);
	});

	test('creates typed arrays with lengths equal to columnCount', () => {
		const result = createMatrixState(1400, 4);

		expect(result.columnsHeights).toBeInstanceOf(Float64Array);
		expect(result.order).toBeInstanceOf(Uint32Array);
		expect(result.columnsHeights.length).toBe(4);
		expect(result.order.length).toBe(4);
	});

	test('throws when rootWidth is negative', () => {
		expect(() => createMatrixState(-1)).toThrow(
			new MatrixEngineError(MATRIX_ENGINE_ERRORS.INVALID_ROOT_WIDTH),
		);
	});

	test('throws when rootWidth is not finite', () => {
		expect(() => createMatrixState(Number.NaN)).toThrow(
			new MatrixEngineError(MATRIX_ENGINE_ERRORS.INVALID_ROOT_WIDTH),
		);
		expect(() => createMatrixState(Number.POSITIVE_INFINITY)).toThrow(
			new MatrixEngineError(MATRIX_ENGINE_ERRORS.INVALID_ROOT_WIDTH),
		);
		expect(() => createMatrixState(Number.NEGATIVE_INFINITY)).toThrow(
			new MatrixEngineError(MATRIX_ENGINE_ERRORS.INVALID_ROOT_WIDTH),
		);
		// @ts-expect-error
		expect(() => createMatrixState('100')).toThrow(
			new MatrixEngineError(MATRIX_ENGINE_ERRORS.INVALID_ROOT_WIDTH),
		);
	});

	test('throws when columnCount is 0 or negative', () => {
		expect(() => createMatrixState(1000, 0)).toThrow(
			new MatrixEngineError(MATRIX_ENGINE_ERRORS.INVALID_COLUMN_COUNT),
		);
		expect(() => createMatrixState(1000, -2)).toThrow(
			new MatrixEngineError(MATRIX_ENGINE_ERRORS.INVALID_COLUMN_COUNT),
		);
	});

	test('throws when columnCount is not an integer', () => {
		expect(() => createMatrixState(1000, 2.5)).toThrow(
			new MatrixEngineError(MATRIX_ENGINE_ERRORS.INVALID_COLUMN_COUNT),
		);
		expect(() => createMatrixState(1000, Number.POSITIVE_INFINITY)).toThrow(
			new MatrixEngineError(MATRIX_ENGINE_ERRORS.INVALID_COLUMN_COUNT),
		);
		expect(() => createMatrixState(1000, Number.NEGATIVE_INFINITY)).toThrow(
			new MatrixEngineError(MATRIX_ENGINE_ERRORS.INVALID_COLUMN_COUNT),
		);
		// @ts-expect-error
		expect(() => createMatrixState(1000, '100')).toThrow(
			new MatrixEngineError(MATRIX_ENGINE_ERRORS.INVALID_COLUMN_COUNT),
		);
	});

	test('throws when gap is negative', () => {
		expect(() => createMatrixState(1000, 3, -1)).toThrow(
			new MatrixEngineError(MATRIX_ENGINE_ERRORS.INVALID_GAP),
		);
	});

	test('throws when gap is not finite', () => {
		expect(() => createMatrixState(1000, 3, Number.NaN)).toThrow(
			new MatrixEngineError(MATRIX_ENGINE_ERRORS.INVALID_GAP),
		);
		expect(() => createMatrixState(1000, 3, Number.POSITIVE_INFINITY)).toThrow(
			new MatrixEngineError(MATRIX_ENGINE_ERRORS.INVALID_GAP),
		);
		expect(() => createMatrixState(1000, 3, Number.NEGATIVE_INFINITY)).toThrow(
			new MatrixEngineError(MATRIX_ENGINE_ERRORS.INVALID_GAP),
		);
		// @ts-expect-error
		expect(() => createMatrixState(1000, 3, '100')).toThrow(
			new MatrixEngineError(MATRIX_ENGINE_ERRORS.INVALID_GAP),
		);
	});
});
