import {
	Matrix,
	type MatrixComputedUnit,
	type MatrixSnapshot,
	type ReadonlyMatrix,
} from 'src/core/LayoutCalculationEngine';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { FAKER_SEED } from 'tests/constants';
import { faker } from '@faker-js/faker';

const WORKER_MODULE_PATH =
	'src/core/LayoutCalculationEngine/runtime/Matrix/MatrixWorker.worker.ts';

const bindLayoutWorkerMock = vi.hoisted(() => vi.fn());

vi.mock('src/core/LayoutCalculationEngine', async () => {
	const actual = await vi.importActual<
		typeof import('src/core/LayoutCalculationEngine')
	>('src/core/LayoutCalculationEngine');

	return {
		...actual,
		bindLayoutWorker: bindLayoutWorkerMock,
	};
});

type MatrixInternal<T = undefined> = {
	_order: Uint32Array;
	_columnHeights: Float64Array;
	_matrix: MatrixComputedUnit<T>[][];
};

const createComputedUnit = <T = unknown>(
	overrides: Partial<MatrixComputedUnit<T>> = {},
): MatrixComputedUnit<T> =>
	({
		height: faker.number.int({ max: 500, min: 50 }),
		id: faker.string.uuid(),
		width: faker.number.int({ max: 500, min: 50 }),
		x: faker.number.int({ max: 1000, min: 0 }),
		y: faker.number.int({ max: 1000, min: 0 }),
		...overrides,
	}) as MatrixComputedUnit<T>;

const createSnapshot = (): Readonly<MatrixSnapshot<unknown>> => {
	const columnCount = faker.number.int({ max: 6, min: 1 });

	const internalState = Array.from(
		{ length: columnCount },
		(_, columnIndex) => [
			createComputedUnit({
				x: columnIndex * 100,
				y: 0,
			}),
		],
	) as MatrixComputedUnit<unknown>[][];

	return {
		columnCount,
		columnHeights: Float64Array.from(
			Array.from({ length: columnCount }, () =>
				faker.number.float({
					fractionDigits: 3,
					max: 5000,
					min: 0,
				}),
			),
		),
		gap: faker.number.int({ max: 32, min: 0 }),
		internalState,
		order: Uint32Array.from(
			Array.from({ length: columnCount }, (_, index) => index),
		),
		rootWidth: faker.number.int({ max: 1920, min: 320 }),
	} as unknown as Readonly<MatrixSnapshot<unknown>>;
};

describe('matrix worker entry', () => {
	beforeEach(() => {
		faker.seed(FAKER_SEED);
		vi.resetModules();
		bindLayoutWorkerMock.mockReset();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	test('calls bindLayoutWorker once on module evaluation', async () => {
		await import(WORKER_MODULE_PATH);

		expect(bindLayoutWorkerMock).toHaveBeenCalledTimes(1);
		expect(bindLayoutWorkerMock).toHaveBeenCalledWith({
			restore: expect.any(Function),
		});
	});

	test('passes restore adapter that recreates Matrix instance from snapshot', async () => {
		await import(WORKER_MODULE_PATH);

		expect(bindLayoutWorkerMock).toHaveBeenCalledTimes(1);

		const [{ restore }] = bindLayoutWorkerMock.mock.calls[0] as [
			{
				restore: (
					snapshot: Readonly<MatrixSnapshot<unknown>>,
				) => Matrix<unknown>;
			},
		];

		const snapshot = createSnapshot();
		const matrix = restore(snapshot);
		const internal = matrix as unknown as MatrixInternal<unknown>;

		expect(matrix).toBeInstanceOf(Matrix);

		expect(Array.from(internal._order)).toStrictEqual(
			Array.from(snapshot.order),
		);
		expect(internal._order).toBeInstanceOf(Uint32Array);
		expect(internal._order).not.toBe(snapshot.order);

		expect(Array.from(internal._columnHeights)).toStrictEqual(
			Array.from(snapshot.columnHeights),
		);
		expect(internal._columnHeights).toBeInstanceOf(Float64Array);
		expect(internal._columnHeights).not.toBe(snapshot.columnHeights);

		expect(internal._matrix).toBe(snapshot.internalState);
		expect(Object.isFrozen(internal._matrix)).toBe(true);
	});

	test('restore preserves snapshot matrix data as-is', async () => {
		await import(WORKER_MODULE_PATH);

		const [{ restore }] = bindLayoutWorkerMock.mock.calls[0] as [
			{
				restore: (
					snapshot: Readonly<MatrixSnapshot<unknown>>,
				) => ReadonlyMatrix<unknown>;
			},
		];

		const snapshot = createSnapshot();
		const matrix = restore(snapshot);
		const internal = matrix as unknown as MatrixInternal<unknown>;

		expect(internal._matrix).toHaveLength(snapshot.columnCount);

		for (let index = 0; index < snapshot.columnCount; index++) {
			expect(internal._matrix[index]).toStrictEqual(
				snapshot.internalState[index],
			);
		}
	});
});
