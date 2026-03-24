import * as fc from 'fast-check';
import { bench, describe } from 'vitest';
import { FAKER_SEED } from 'tests/constants';
import { kWayMerge } from 'src/utils';

type Interval = {
	start: number;
	end: number;
};

type BenchType = 'sorted-intervals';
type ColumnCount = 2 | 4 | 8 | 16 | 32;
type Total = 1_000 | 10_000 | 100_000 | 1_000_000;

type BenchScenario = {
	type: BenchType;
	columnCount: ColumnCount;
	total: Total;
};

const BENCH_TYPE: BenchType = 'sorted-intervals';

const COLUMN_COUNTS = [2, 4, 8, 16, 32] as const;
const TOTALS = [1_000, 10_000, 100_000, 1_000_000] as const;

const compareIntervals = (a: Interval, b: Interval): number =>
	a.start - b.start || a.end - b.end;

const formatNumber = (value: number): string => value.toLocaleString('en-US');

const getBenchRunOptions = (total: Total) => {
	switch (total) {
		case 1_000:
			return {
				iterations: 300,
				warmupIterations: 20,
			};

		case 10_000:
			return {
				iterations: 150,
				warmupIterations: 15,
			};

		case 100_000:
			return {
				iterations: 40,
				warmupIterations: 8,
			};

		case 1_000_000:
			return {
				iterations: 10,
				warmupIterations: 3,
			};
	}
};

const createSortedIntervals = (
	total: number,
	seed: number,
): readonly Interval[] => {
	const [raw] = fc.sample(
		fc.array(
			fc.record({
				duration: fc.integer({
					max: 10_000,
					min: 1,
				}),
				start: fc.integer({
					max: 10_000_000,
					min: -10_000_000,
				}),
			}),
			{
				maxLength: total,
				minLength: total,
			},
		),
		{
			numRuns: 1,
			seed,
		},
	);

	return raw
		.map((item) => ({
			end: item.start + item.duration,
			start: item.start,
		}))
		.sort(compareIntervals);
};

const splitSortedIntervalsIntoColumns = (
	intervals: readonly Interval[],
	columnCount: number,
	seed: number,
): readonly (readonly Interval[])[] => {
	const [assignments] = fc.sample(
		fc.array(
			fc.integer({
				max: columnCount - 1,
				min: 0,
			}),
			{
				maxLength: intervals.length,
				minLength: intervals.length,
			},
		),
		{
			numRuns: 1,
			seed,
		},
	);

	const columns = Array.from({ length: columnCount }, () => [] as Interval[]);

	for (let index = 0; index < intervals.length; index++) {
		columns[assignments[index]].push(intervals[index]);
	}

	return columns;
};

const buildScenarioColumns = (
	total: Total,
	columnCount: ColumnCount,
): readonly (readonly Interval[])[] => {
	const intervalsSeed = FAKER_SEED + total * 10 + columnCount;
	const assignmentsSeed = FAKER_SEED + total * 100 + columnCount;

	const intervals = createSortedIntervals(total, intervalsSeed);

	return splitSortedIntervalsIntoColumns(
		intervals,
		columnCount,
		assignmentsSeed,
	);
};

describe('kWayMerge benchmark', () => {
	for (const total of TOTALS) {
		describe(`${formatNumber(total)} elements`, () => {
			for (const columnCount of COLUMN_COUNTS) {
				const scenario: BenchScenario = {
					columnCount,
					total,
					type: BENCH_TYPE,
				};

				let columns: readonly (readonly Interval[])[] | undefined;

				bench(
					[
						scenario.type,
						`merge ${formatNumber(scenario.total)} elements`,
						`from ${scenario.columnCount} columns`,
					].join(' | '),
					() => {
						if (columns == null) {
							throw new Error(
								[
									'Benchmark fixture is not initialized.',
									'Use bench setup() instead of beforeAll() in vitest bench.',
								].join(' '),
							);
						}

						const result = kWayMerge(columns, compareIntervals);

						if (result.length !== scenario.total) {
							throw new Error(
								[
									'Unexpected merged result length.',
									`Expected: ${scenario.total}.`,
									`Received: ${result.length}.`,
								].join(' '),
							);
						}
					},
					{
						...getBenchRunOptions(total),
						setup() {
							columns = buildScenarioColumns(
								scenario.total,
								scenario.columnCount,
							);
						},
						teardown() {
							columns = undefined;
						},
						throws: true,
					},
				);
			}
		});
	}
});
