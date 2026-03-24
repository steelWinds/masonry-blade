import * as fc from 'fast-check';
import {
	Matrix,
	type MatrixSourceUnit,
} from 'src/core/LayoutCalculationEngine';
import { bench, describe } from 'vitest';

type TestMeta = {
	label: string;
	nested?: {
		version: number;
	};
};

const BENCH_SEED = 13_371;

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
			nested: fc.option(
				fc.record({
					version: fc.integer(),
				}),
				{ nil: undefined },
			),
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

type BenchCase = {
	name: string;
	rootWidth: number;
	columnCount: number;
	gap: number;
	items: readonly Readonly<MatrixSourceUnit<TestMeta>>[];
};

type BenchCaseConfig = {
	columnCount?: number;
	columnWidth?: number;
	gap?: number;
};

const createBenchCase = (
	name: string,
	itemCount: number,
	seedOffset: number,
	config: BenchCaseConfig = {},
): BenchCase => {
	const columnCount = config.columnCount ?? 8;
	const gap = config.gap ?? 12;
	const columnWidth = config.columnWidth ?? 220;
	const rootWidth = columnWidth * columnCount + gap * (columnCount - 1);

	const [items] = fc.sample(
		fc.array(sourceUnitArbitrary, {
			maxLength: itemCount,
			minLength: itemCount,
		}),
		{
			numRuns: 1,
			seed: BENCH_SEED + seedOffset,
		},
	);

	return {
		columnCount,
		gap,
		items,
		name,
		rootWidth,
	};
};

const runBenchCases = (benchCases: readonly BenchCase[]) => {
	for (const benchCase of benchCases) {
		bench(
			benchCase.name,
			() => {
				const matrix = new Matrix<TestMeta>(
					benchCase.rootWidth,
					benchCase.columnCount,
					benchCase.gap,
				);

				matrix.append(benchCase.items);
			},
			{
				iterations: 25,
				time: 1_500,
			},
		);
	}
};

describe('Matrix.append benchmark', () => {
	describe('scale', () => {
		runBenchCases([
			createBenchCase('append 100 items · 8 cols · gap 12', 100, 1),
			createBenchCase('append 1,000 items · 8 cols · gap 12', 1_000, 2),
			createBenchCase('append 10,000 items · 8 cols · gap 12', 10_000, 3),
			createBenchCase('append 100,000 items · 8 cols · gap 12', 100_000, 4),
			createBenchCase('append 1,000,000 items · 8 cols · gap 12', 1_000_000, 5),
		]);
	});

	describe('column count sensitivity', () => {
		runBenchCases([
			createBenchCase('append 10,000 items · 2 cols · gap 12', 10_000, 11, {
				columnCount: 2,
			}),
			createBenchCase('append 10,000 items · 4 cols · gap 12', 10_000, 12, {
				columnCount: 4,
			}),
			createBenchCase('append 10,000 items · 8 cols · gap 12', 10_000, 13, {
				columnCount: 8,
			}),
			createBenchCase('append 10,000 items · 16 cols · gap 12', 10_000, 14, {
				columnCount: 16,
			}),
			createBenchCase('append 10,000 items · 32 cols · gap 12', 10_000, 15, {
				columnCount: 32,
			}),
		]);
	});

	describe('gap sensitivity', () => {
		runBenchCases([
			createBenchCase('append 10,000 items · 8 cols · gap 0', 10_000, 21, {
				gap: 0,
			}),
			createBenchCase('append 10,000 items · 8 cols · gap 12', 10_000, 22, {
				gap: 12,
			}),
			createBenchCase('append 10,000 items · 8 cols · gap 24', 10_000, 23, {
				gap: 24,
			}),
			createBenchCase('append 10,000 items · 8 cols · gap 48', 10_000, 24, {
				gap: 48,
			}),
		]);
	});

	describe('column width sensitivity', () => {
		runBenchCases([
			createBenchCase(
				'append 10,000 items · 8 cols · 120px width',
				10_000,
				31,
				{
					columnCount: 8,
					columnWidth: 120,
					gap: 12,
				},
			),
			createBenchCase(
				'append 10,000 items · 8 cols · 220px width',
				10_000,
				32,
				{
					columnCount: 8,
					columnWidth: 220,
					gap: 12,
				},
			),
			createBenchCase(
				'append 10,000 items · 8 cols · 360px width',
				10_000,
				33,
				{
					columnCount: 8,
					columnWidth: 360,
					gap: 12,
				},
			),
		]);
	});

	describe('large layout variants', () => {
		runBenchCases([
			createBenchCase('append 100,000 items · 4 cols · gap 12', 100_000, 41, {
				columnCount: 4,
			}),
			createBenchCase('append 100,000 items · 8 cols · gap 12', 100_000, 42, {
				columnCount: 8,
			}),
			createBenchCase('append 100,000 items · 16 cols · gap 12', 100_000, 43, {
				columnCount: 16,
			}),
		]);
	});
});
