import * as fc from 'fast-check';
import {
	Matrix,
	type MatrixComputedUnit,
	type MatrixSnapshot,
} from 'src/core/LayoutCalculationEngine';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { FAKER_SEED } from 'tests/constants';

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

type TestMeta = {
	label: string;
	version?: number;
};

const computedUnitArbitrary: fc.Arbitrary<MatrixComputedUnit<TestMeta>> =
	fc.record({
		height: fc.double({
			max: 10_000,
			min: 1,
			noDefaultInfinity: true,
			noNaN: true,
		}),
		id: fc.oneof(
			fc.string({ minLength: 1 }),
			fc.integer({
				max: Number.MAX_SAFE_INTEGER,
				min: Number.MIN_SAFE_INTEGER,
			}),
		),
		meta: fc.option(
			fc.record({
				label: fc.string(),
				version: fc.option(fc.integer(), { nil: undefined }),
			}),
			{ nil: undefined },
		),
		width: fc.double({
			max: 10_000,
			min: 1,
			noDefaultInfinity: true,
			noNaN: true,
		}),
		x: fc.double({
			max: 100_000,
			min: 0,
			noDefaultInfinity: true,
			noNaN: true,
		}),
		y: fc.double({
			max: 100_000,
			min: 0,
			noDefaultInfinity: true,
			noNaN: true,
		}),
	}) as fc.Arbitrary<MatrixComputedUnit<TestMeta>>;

const snapshotArbitrary: fc.Arbitrary<Readonly<MatrixSnapshot<TestMeta>>> = fc
	.integer({ max: 8, min: 1 })
	.chain((columnCount) =>
		fc.integer({ max: 64, min: 0 }).chain((gap) => {
			const minRootWidth = gap * (columnCount - 1) + 1;

			return fc.record({
				columnCount: fc.constant(columnCount),
				columnHeights: fc.array(
					fc.double({
						max: 100_000,
						min: 0,
						noDefaultInfinity: true,
						noNaN: true,
					}),
					{ maxLength: columnCount, minLength: columnCount },
				),
				gap: fc.constant(gap),
				internalState: fc.array(
					fc.array(computedUnitArbitrary, { maxLength: 10 }),
					{ maxLength: columnCount, minLength: columnCount },
				),
				rootWidth: fc.integer({
					max: minRootWidth + 10_000,
					min: minRootWidth,
				}),
			});
		}),
	)
	.map((raw) => {
		const order = Uint32Array.from(
			Array.from({ length: raw.columnCount }, (_, index) => index).sort(
				(a, b) => raw.columnHeights[a] - raw.columnHeights[b],
			),
		);

		return Object.freeze({
			columnCount: raw.columnCount,
			columnHeights: Float64Array.from(raw.columnHeights),
			gap: raw.gap,
			internalState: Object.freeze(raw.internalState),
			order,
			rootWidth: raw.rootWidth,
		}) as unknown as Readonly<MatrixSnapshot<TestMeta>>;
	});

describe('matrix worker entry', () => {
	beforeEach(() => {
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

	test('restore recreates Matrix and preserves snapshot invariants for arbitrary snapshots', async () => {
		await import(WORKER_MODULE_PATH);

		expect(bindLayoutWorkerMock).toHaveBeenCalledTimes(1);

		const [{ restore }] = bindLayoutWorkerMock.mock.calls[0] as [
			{
				restore: (
					snapshot: Readonly<MatrixSnapshot<TestMeta>>,
				) => Matrix<TestMeta>;
			},
		];

		fc.assert(
			fc.property(snapshotArbitrary, (snapshot) => {
				const matrix = restore(snapshot);
				const internal = matrix as unknown as MatrixInternal<TestMeta>;

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

				expect(internal._matrix).toStrictEqual(snapshot.internalState);
				expect(internal._matrix).toHaveLength(snapshot.columnCount);
			}),
			{
				numRuns: 200,
				seed: FAKER_SEED,
			},
		);
	});

	test('restore preserves per-column matrix data as-is for arbitrary snapshots', async () => {
		await import(WORKER_MODULE_PATH);

		const [{ restore }] = bindLayoutWorkerMock.mock.calls[0] as [
			{
				restore: (
					snapshot: Readonly<MatrixSnapshot<TestMeta>>,
				) => Matrix<TestMeta>;
			},
		];

		fc.assert(
			fc.property(snapshotArbitrary, (snapshot) => {
				const matrix = restore(snapshot);
				const internal = matrix as unknown as MatrixInternal<TestMeta>;

				expect(internal._matrix).toHaveLength(snapshot.columnCount);

				for (let index = 0; index < snapshot.columnCount; index++) {
					expect(internal._matrix[index]).toStrictEqual(
						snapshot.internalState[index],
					);
				}
			}),
			{
				numRuns: 200,
				seed: FAKER_SEED,
			},
		);
	});
});
