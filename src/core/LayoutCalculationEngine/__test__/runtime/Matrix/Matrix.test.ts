import {
	MATRIX_ERRORS,
	Matrix,
	type MatrixComputedUnit,
	MatrixError,
	type MatrixSnapshot,
	type MatrixSourceUnit,
} from 'src/core/LayoutCalculationEngine';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { FAKER_SEED } from 'tests/constants';
import { faker } from '@faker-js/faker';

const utilsMocks = vi.hoisted(() => ({
	isPositiveFiniteNumberMock: vi.fn(),
	kWayMergeMock: vi.fn(),
}));

vi.mock('src/utils/IsFiniteNonZero', () => ({
	isPositiveFiniteNumber: utilsMocks.isPositiveFiniteNumberMock,
}));

vi.mock('src/utils/kWayMerge', () => ({
	kWayMerge: utilsMocks.kWayMergeMock,
}));

type TestMeta = {
	label: string;
	nested?: {
		version: number;
	};
};

const { isPositiveFiniteNumberMock, kWayMergeMock } = utilsMocks;

const createSourceUnit = (
	overrides: Partial<MatrixSourceUnit<TestMeta>> = {},
): Readonly<MatrixSourceUnit<TestMeta>> => ({
	height:
		overrides.height ??
		faker.number.float({ fractionDigits: 3, max: 10_000, min: 1 }),
	id:
		overrides.id ??
		faker.helpers.arrayElement([
			faker.string.alphanumeric(10),
			faker.number.int({ max: 10_000, min: 1 }),
		]),
	meta: overrides.meta ?? {
		label: faker.word.noun(),
		nested: {
			version: faker.number.int({ max: 10, min: 1 }),
		},
	},
	width:
		overrides.width ??
		faker.number.float({ fractionDigits: 3, max: 10_000, min: 1 }),
});

const serializeMatrix = (
	matrix: readonly (readonly Readonly<MatrixComputedUnit<TestMeta>>[])[],
) =>
	matrix.map((column) =>
		column.map((unit) => ({
			height: unit.height,
			id: unit.id,
			meta: unit.meta,
			width: unit.width,
			x: unit.x,
			y: unit.y,
		})),
	);

const serializeSnapshot = (snapshot: Readonly<MatrixSnapshot<TestMeta>>) => ({
	columnCount: snapshot.columnCount,
	columnHeights: Array.from(snapshot.columnHeights),
	columnWidth: snapshot.columnWidth,
	gap: snapshot.gap,
	matrix: serializeMatrix(snapshot.internalState),
	order: Array.from(snapshot.order),
	realWidth: snapshot.realWidth,
	rootWidth: snapshot.rootWidth,
});

describe('Matrix', () => {
	beforeEach(() => {
		faker.seed(FAKER_SEED);
		vi.clearAllMocks();

		isPositiveFiniteNumberMock.mockImplementation(
			(value: number) => Number.isFinite(value) && value > 0,
		);

		kWayMergeMock.mockImplementation(
			<T>(
				matrix: readonly (readonly T[])[],
				compare: (left: T, right: T) => number,
			) => [...matrix.flat()].sort(compare),
		);
	});

	describe('constructor', () => {
		test('creates empty initialized state', () => {
			const matrix = new Matrix<TestMeta>(980, 3, 10);
			const snapshot = matrix.snapshot();

			expect(serializeSnapshot(snapshot)).toStrictEqual({
				columnCount: 3,
				columnHeights: [0, 0, 0],
				columnWidth: 320,
				gap: 10,
				matrix: [[], [], []],
				order: [0, 1, 2],
				realWidth: 960,
				rootWidth: 980,
			});

			expect(snapshot.columnHeights).toBeInstanceOf(Float64Array);
			expect(snapshot.order).toBeInstanceOf(Uint32Array);
		});

		test.each([
			0,
			-1,
			Number.NaN,
			Number.POSITIVE_INFINITY,
			Number.NEGATIVE_INFINITY,
		])('throws MatrixError for invalid rootWidth = %s', (invalidRootWidth) => {
			expect(() => new Matrix<TestMeta>(invalidRootWidth, 2, 10)).toThrowError(
				MatrixError,
			);

			expect(() => new Matrix<TestMeta>(invalidRootWidth, 2, 10)).toThrowError(
				MATRIX_ERRORS.INVALID_ROOT_WIDTH,
			);
		});

		test.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
			'throws MatrixError for invalid columnCount = %s',
			(invalidColumnCount) => {
				expect(
					() => new Matrix<TestMeta>(100, invalidColumnCount, 10),
				).toThrowError(MatrixError);

				expect(
					() => new Matrix<TestMeta>(100, invalidColumnCount, 10),
				).toThrowError(MATRIX_ERRORS.INVALID_COLUMN_COUNT);
			},
		);

		test.each([-1, Number.NaN, Number.POSITIVE_INFINITY, 100, 1000])(
			'throws MatrixError for invalid gap = %s',
			(invalidGap) => {
				expect(() => new Matrix<TestMeta>(100, 2, invalidGap)).toThrowError(
					MatrixError,
				);

				expect(() => new Matrix<TestMeta>(100, 2, invalidGap)).toThrowError(
					MATRIX_ERRORS.INVALID_GAP,
				);
			},
		);

		test('accepts zero gap when layout still has positive real width', () => {
			const matrix = new Matrix<TestMeta>(300, 2, 0);
			const snapshot = matrix.snapshot();

			expect(snapshot.realWidth).toBe(300);
			expect(snapshot.columnWidth).toBe(150);
			expect(snapshot.gap).toBe(0);
		});
	});

	describe('append', () => {
		test('uses isPositiveFiniteNumber to validate source item dimensions', () => {
			const matrix = new Matrix<TestMeta>(320, 2, 20);
			const item = createSourceUnit({
				height: 456,
				id: 'alpha',
				width: 123,
			});

			matrix.append([item]);

			expect(isPositiveFiniteNumberMock).toHaveBeenCalledTimes(2);
			expect(isPositiveFiniteNumberMock).toHaveBeenNthCalledWith(1, item.width);
			expect(isPositiveFiniteNumberMock).toHaveBeenNthCalledWith(
				2,
				item.height,
			);
		});

		test('calculates coordinates, sizes and keeps meta', () => {
			const matrix = new Matrix<TestMeta>(320, 2, 20);

			const result = matrix.append([
				createSourceUnit({
					height: 100,
					id: 'a',
					meta: { label: 'first' },
					width: 100,
				}),
				createSourceUnit({
					height: 200,
					id: 'b',
					meta: { label: 'second' },
					width: 100,
				}),
				createSourceUnit({
					height: 100,
					id: 'c',
					meta: { label: 'third' },
					width: 200,
				}),
			]);

			expect(serializeMatrix(result)).toStrictEqual([
				[
					{
						height: 150,
						id: 'a',
						meta: { label: 'first' },
						width: 150,
						x: 0,
						y: 0,
					},
					{
						height: 75,
						id: 'c',
						meta: { label: 'third' },
						width: 150,
						x: 0,
						y: 170,
					},
				],
				[
					{
						height: 300,
						id: 'b',
						meta: { label: 'second' },
						width: 150,
						x: 170,
						y: 0,
					},
				],
			]);

			expect(serializeSnapshot(matrix.snapshot())).toStrictEqual({
				columnCount: 2,
				columnHeights: [245, 300],
				columnWidth: 150,
				gap: 20,
				matrix: [
					[
						{
							height: 150,
							id: 'a',
							meta: { label: 'first' },
							width: 150,
							x: 0,
							y: 0,
						},
						{
							height: 75,
							id: 'c',
							meta: { label: 'third' },
							width: 150,
							x: 0,
							y: 170,
						},
					],
					[
						{
							height: 300,
							id: 'b',
							meta: { label: 'second' },
							width: 150,
							x: 170,
							y: 0,
						},
					],
				],
				order: [0, 1],
				realWidth: 300,
				rootWidth: 320,
			});
		});

		test('skips invalid items and keeps only valid ones', () => {
			const matrix = new Matrix<TestMeta>(320, 2, 20);

			matrix.append([
				createSourceUnit({
					height: 100,
					id: 'valid-first',
					width: 100,
				}),
				createSourceUnit({
					height: 100,
					id: '',
					width: 100,
				}),
				createSourceUnit({
					height: 100,
					id: 'invalid-width',
					width: 0,
				}),
				createSourceUnit({
					height: -1,
					id: 'invalid-height',
					width: 100,
				}),
				createSourceUnit({
					height: 100,
					id: Number.NaN,
					width: 100,
				}),
				createSourceUnit({
					height: 100,
					id: 'valid-second',
					width: 200,
				}),
			]);

			expect(serializeSnapshot(matrix.snapshot())).toStrictEqual({
				columnCount: 2,
				columnHeights: [150, 75],
				columnWidth: 150,
				gap: 20,
				matrix: [
					[
						{
							height: 150,
							id: 'valid-first',
							meta: expect.any(Object),
							width: 150,
							x: 0,
							y: 0,
						},
					],
					[
						{
							height: 75,
							id: 'valid-second',
							meta: expect.any(Object),
							width: 150,
							x: 170,
							y: 0,
						},
					],
				],
				order: [1, 0],
				realWidth: 300,
				rootWidth: 320,
			});
		});

		test('returns detached container arrays for an empty batch', () => {
			const matrix = new Matrix<TestMeta>(320, 2, 20);

			const first = matrix.append([]);
			const second = matrix.append([]);

			expect(first).toStrictEqual([[], []]);
			expect(second).toStrictEqual([[], []]);

			expect(first).not.toBe(second);
			expect(first[0]).not.toBe(second[0]);
			expect(first[1]).not.toBe(second[1]);
		});

		test('is deterministic on equal-height ties', () => {
			const matrix = new Matrix<TestMeta>(320, 2, 20);

			matrix.append([
				createSourceUnit({ height: 100, id: 'a', width: 100 }),
				createSourceUnit({ height: 100, id: 'b', width: 100 }),
				createSourceUnit({ height: 100, id: 'c', width: 100 }),
				createSourceUnit({ height: 100, id: 'd', width: 100 }),
			]);

			expect(serializeSnapshot(matrix.snapshot())).toStrictEqual({
				columnCount: 2,
				columnHeights: [320, 320],
				columnWidth: 150,
				gap: 20,
				matrix: [
					[
						{
							height: 150,
							id: 'a',
							meta: expect.any(Object),
							width: 150,
							x: 0,
							y: 0,
						},
						{
							height: 150,
							id: 'c',
							meta: expect.any(Object),
							width: 150,
							x: 0,
							y: 170,
						},
					],
					[
						{
							height: 150,
							id: 'b',
							meta: expect.any(Object),
							width: 150,
							x: 170,
							y: 0,
						},
						{
							height: 150,
							id: 'd',
							meta: expect.any(Object),
							width: 150,
							x: 170,
							y: 170,
						},
					],
				],
				order: [0, 1],
				realWidth: 300,
				rootWidth: 320,
			});
		});

		test('produces the same final layout for single-batch and incremental append', () => {
			const items = [
				createSourceUnit({ height: 100, id: 'a', width: 100 }),
				createSourceUnit({ height: 100, id: 'b', width: 120 }),
				createSourceUnit({ height: 150, id: 'c', width: 100 }),
				createSourceUnit({ height: 100, id: 'd', width: 200 }),
				createSourceUnit({ height: 300, id: 'e', width: 100 }),
			] as const;

			const singleBatchMatrix = new Matrix<TestMeta>(500, 3, 10);
			singleBatchMatrix.append(items);

			const incrementalMatrix = new Matrix<TestMeta>(500, 3, 10);
			incrementalMatrix.append(items.slice(0, 2));
			incrementalMatrix.append(items.slice(2, 4));
			incrementalMatrix.append(items.slice(4));

			expect(serializeSnapshot(incrementalMatrix.snapshot())).toStrictEqual(
				serializeSnapshot(singleBatchMatrix.snapshot()),
			);
		});
	});

	describe('public state mutability', () => {
		test('structural mutations of append result do not affect internal state', () => {
			const matrix = new Matrix<TestMeta>(320, 2, 20);

			const layout = matrix.append([
				createSourceUnit({ height: 100, id: 'a', width: 100 }),
				createSourceUnit({ height: 100, id: 'b', width: 100 }),
			]);

			const expected = serializeSnapshot(matrix.snapshot());
			const mutableLayout = layout as MatrixComputedUnit<TestMeta>[][];

			mutableLayout.push([]);
			mutableLayout[0].length = 0;
			mutableLayout[1].push(layout[0][0]);

			expect(serializeSnapshot(matrix.snapshot())).toStrictEqual(expected);
		});

		test('snapshot returns detached object, typed arrays and matrix arrays', () => {
			const matrix = new Matrix<TestMeta>(320, 2, 20);

			matrix.append([
				createSourceUnit({ height: 100, id: 'a', width: 100 }),
				createSourceUnit({ height: 100, id: 'b', width: 100 }),
			]);

			const snapshot = matrix.snapshot();
			const expected = serializeSnapshot(matrix.snapshot());
			const mutableSnapshot = snapshot as any;

			mutableSnapshot.columnCount = 999;
			mutableSnapshot.realWidth = 777;
			mutableSnapshot.rootWidth = 666;
			mutableSnapshot.order[0] = 123;
			mutableSnapshot.columnHeights[0] = 456;
			mutableSnapshot.internalState.push([]);
			mutableSnapshot.internalState[0].length = 0;

			expect(serializeSnapshot(matrix.snapshot())).toStrictEqual(expected);
		});

		test('returns fresh container arrays on each public read but safely reuses frozen unit references', () => {
			const matrix = new Matrix<TestMeta>(320, 2, 20);

			const appendResult = matrix.append([
				createSourceUnit({ height: 100, id: 'a', width: 100 }),
				createSourceUnit({ height: 100, id: 'b', width: 100 }),
			]);

			const firstSnapshot = matrix.snapshot();
			const secondSnapshot = matrix.snapshot();

			expect(appendResult).not.toBe(firstSnapshot.internalState);
			expect(firstSnapshot.internalState).not.toBe(
				secondSnapshot.internalState,
			);
			expect(appendResult[0]).not.toBe(firstSnapshot.internalState[0]);
			expect(firstSnapshot.internalState[0]).not.toBe(
				secondSnapshot.internalState[0],
			);

			expect(appendResult[0][0]).toBe(firstSnapshot.internalState[0][0]);
			expect(firstSnapshot.internalState[0][0]).toBe(
				secondSnapshot.internalState[0][0],
			);

			expect(Object.isFrozen(appendResult[0][0])).toBe(true);
		});

		test('top-level MatrixUnit fields are runtime-immutable and cannot corrupt internal state', () => {
			const matrix = new Matrix<TestMeta>(320, 2, 20);

			matrix.append([createSourceUnit({ height: 100, id: 'a', width: 100 })]);

			const snapshot = matrix.snapshot();
			const [[unit]] = snapshot.internalState;
			const expected = serializeSnapshot(matrix.snapshot());

			expect(Object.isFrozen(unit)).toBe(true);

			expect(Reflect.set(unit, '_id', 'mutated')).toBe(false);
			expect(Reflect.set(unit, '_height', 1)).toBe(false);
			expect(Reflect.set(unit, '_width', 2)).toBe(false);
			expect(Reflect.set(unit, '_x', 3)).toBe(false);
			expect(Reflect.set(unit, '_y', 4)).toBe(false);

			expect(serializeSnapshot(matrix.snapshot())).toStrictEqual(expected);
		});

		test('nested meta objects are deeply frozen and cant leak mutations into internal state', () => {
			const matrix = new Matrix<TestMeta>(320, 2, 20);

			matrix.append([
				createSourceUnit({
					height: 100,
					id: 'a',
					meta: {
						label: 'initial',
						nested: { version: 1 },
					},
					width: 100,
				}),
			]);

			const snapshot = matrix.snapshot();
			const [[unit]] = snapshot.internalState;

			expect(Object.isFrozen(unit)).toBe(true);
			expect(Object.isFrozen(unit.meta)).toBe(true);
		});

		test('source meta object is kept by reference and external mutation after append dont allow', () => {
			const matrix = new Matrix<TestMeta>(320, 2, 20);

			const sharedMeta: TestMeta = {
				label: 'before',
				nested: { version: 1 },
			};

			const item = createSourceUnit({
				height: 100,
				id: 'a',
				meta: sharedMeta,
				width: 100,
			});

			matrix.append([item]);

			expect(Object.isFrozen(sharedMeta)).toBeTruthy();

			expect(matrix.snapshot().internalState[0][0].meta).toBe(sharedMeta);
		});
	});

	describe('sort', () => {
		test('delegates to kWayMerge with y/x comparator', () => {
			const matrix = new Matrix<TestMeta>(320, 2, 20);

			const source = [
				[{ id: 'a', x: 20, y: 10 }],
				[{ id: 'b', x: 5, y: 30 }],
			] as never;

			const mergedResult = [{ id: 'merged' }] as const;

			kWayMergeMock.mockReturnValueOnce(mergedResult);

			const result = matrix.sort(source);

			expect(result).toBe(mergedResult);
			expect(kWayMergeMock).toHaveBeenCalledTimes(1);
			expect(kWayMergeMock).toHaveBeenCalledWith(source, expect.any(Function));

			const compare = kWayMergeMock.mock.calls[0][1] as (
				left: { y: number; x: number },
				right: { y: number; x: number },
			) => number;

			expect(compare({ x: 10, y: 1 }, { x: 0, y: 2 })).toBeLessThan(0);
			expect(compare({ x: 10, y: 3 }, { x: 0, y: 2 })).toBeGreaterThan(0);
			expect(compare({ x: 10, y: 1 }, { x: 20, y: 1 })).toBeLessThan(0);
			expect(compare({ x: 30, y: 1 }, { x: 20, y: 1 })).toBeGreaterThan(0);
			expect(compare({ x: 20, y: 1 }, { x: 20, y: 1 })).toBe(0);
		});
	});
});
