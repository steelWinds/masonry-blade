import * as fc from 'fast-check';
import {
	Matrix,
	type MatrixComputedUnit,
	type MatrixSnapshot,
	type MatrixSourceUnit,
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
	_rootWidth: number;
	_realWidth: number;
	_columnCount: number;
	_columnWidth: number;
	_gap: number;
};

type TestMeta = {
	label: string;
	version?: number;
};

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
	internalState: serializeMatrix(snapshot.internalState),
	order: Array.from(snapshot.order),
	realWidth: snapshot.realWidth,
	rootWidth: snapshot.rootWidth,
});

const validIdArbitrary = fc.oneof(
	fc.string({ minLength: 1 }),
	fc.integer({
		max: Number.MAX_SAFE_INTEGER,
		min: Number.MIN_SAFE_INTEGER,
	}),
);

const metaArbitrary: fc.Arbitrary<TestMeta | undefined> = fc.option(
	fc.record(
		{
			label: fc.string(),
			version: fc.option(fc.integer(), { nil: undefined }),
		},
		{
			requiredKeys: ['label'],
		},
	),
	{ nil: undefined },
);

const sourceUnitArbitrary: fc.Arbitrary<Readonly<MatrixSourceUnit<TestMeta>>> =
	fc
		.record({
			height: fc.double({
				max: 10_000,
				min: Number.EPSILON,
				noDefaultInfinity: true,
				noNaN: true,
			}),
			id: validIdArbitrary,
			meta: metaArbitrary,
			width: fc.double({
				max: 10_000,
				min: Number.EPSILON,
				noDefaultInfinity: true,
				noNaN: true,
			}),
		})
		.map((item) => item as Readonly<MatrixSourceUnit<TestMeta>>);

const layoutConfigArbitrary = fc
	.record({
		columnCount: fc.integer({ max: 8, min: 1 }),
		columnWidth: fc.integer({ max: 500, min: 1 }),
		gap: fc.integer({ max: 32, min: 0 }),
	})
	.map(({ columnCount, columnWidth, gap }) => ({
		columnCount,
		gap,
		rootWidth: columnWidth * columnCount + gap * (columnCount - 1),
	}));

const snapshotArbitrary: fc.Arbitrary<Readonly<MatrixSnapshot<TestMeta>>> = fc
	.tuple(
		layoutConfigArbitrary,
		fc.array(sourceUnitArbitrary, { maxLength: 40 }),
	)
	.map(([{ columnCount, gap, rootWidth }, items]) => {
		const matrix = new Matrix<TestMeta>(rootWidth, columnCount, gap);

		matrix.append(items);

		return matrix.snapshot();
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
		const module = await import(WORKER_MODULE_PATH);

		expect(bindLayoutWorkerMock).toHaveBeenCalledTimes(1);
		expect(bindLayoutWorkerMock).toHaveBeenCalledWith({
			restore: module.restoreMatrixFromSnapshot,
		});
	});

	test('restoreMatrixFromSnapshot recreates matrix snapshots for arbitrary valid inputs', async () => {
		const { restoreMatrixFromSnapshot } = await import(WORKER_MODULE_PATH);
		const { Matrix: CurrentMatrix } =
			await import('src/core/LayoutCalculationEngine');

		fc.assert(
			fc.property(snapshotArbitrary, (snapshot) => {
				const matrix = restoreMatrixFromSnapshot(snapshot);

				expect(matrix).toBeInstanceOf(CurrentMatrix);
				expect(serializeSnapshot(matrix.snapshot())).toStrictEqual(
					serializeSnapshot(snapshot),
				);
			}),
			{
				numRuns: 200,
				seed: FAKER_SEED,
			},
		);
	});

	test('restoreMatrixFromSnapshot copies typed arrays and column containers from the snapshot', async () => {
		const { restoreMatrixFromSnapshot } = await import(WORKER_MODULE_PATH);

		fc.assert(
			fc.property(snapshotArbitrary, (snapshot) => {
				const matrix = restoreMatrixFromSnapshot(snapshot);
				const internal = matrix as unknown as MatrixInternal<TestMeta>;

				expect(internal._rootWidth).toBe(snapshot.rootWidth);
				expect(internal._realWidth).toBe(snapshot.realWidth);
				expect(internal._columnCount).toBe(snapshot.columnCount);
				expect(internal._columnWidth).toBe(snapshot.columnWidth);
				expect(internal._gap).toBe(snapshot.gap);

				expect(Array.from(internal._order)).toStrictEqual(
					Array.from(snapshot.order),
				);
				expect(internal._order).not.toBe(snapshot.order);

				expect(Array.from(internal._columnHeights)).toStrictEqual(
					Array.from(snapshot.columnHeights),
				);
				expect(internal._columnHeights).not.toBe(snapshot.columnHeights);

				expect(internal._matrix).toStrictEqual(snapshot.internalState);
				expect(internal._matrix).not.toBe(snapshot.internalState);
				expect(internal._matrix).toHaveLength(snapshot.columnCount);

				for (let index = 0; index < snapshot.columnCount; index++) {
					expect(internal._matrix[index]).toStrictEqual(
						snapshot.internalState[index],
					);
					expect(internal._matrix[index]).not.toBe(
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
