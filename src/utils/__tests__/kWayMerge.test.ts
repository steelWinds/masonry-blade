import * as fc from 'fast-check';
import { beforeEach, describe, expect, test } from 'vitest';
import { FAKER_SEED } from 'tests/constants';
import { faker } from '@faker-js/faker';
import { kWayMerge } from 'src/utils/kWayMerge';

type Interval = {
	start: number;
	end: number;
	order: number;
	label: string;
};

const compareIntervals = (a: Interval, b: Interval): number =>
	a.start - b.start || a.end - b.end || a.order - b.order;

const createInterval = (
	start: number,
	end: number,
	order: number,
	label: string,
): Interval => ({
	end,
	label,
	order,
	start,
});

const cloneColumns = <T>(columns: readonly (readonly T[])[]): T[][] =>
	columns.map((column) => [...column]);

const createSortedIntervals = (count: number): Interval[] => {
	let cursor = faker.number.int({
		max: 1_000,
		min: -1_000,
	});

	return Array.from({ length: count }, (_, index) => {
		cursor += faker.number.int({
			max: 20,
			min: 0,
		});

		const duration = faker.number.int({
			max: 50,
			min: 1,
		});

		return createInterval(
			cursor,
			cursor + duration,
			index,
			faker.string.alphanumeric(8),
		);
	});
};

describe('kWayMerge', () => {
	beforeEach(() => {
		faker.seed(FAKER_SEED);
	});

	test('returns an empty array for empty input', () => {
		expect(kWayMerge<Interval>([], compareIntervals)).toStrictEqual([]);
	});

	test('returns an empty array when all columns are empty', () => {
		const columns: readonly (readonly Interval[])[] = [[], [], []];

		expect(kWayMerge(columns, compareIntervals)).toStrictEqual([]);
	});

	test('correctly merges sorted interval columns', () => {
		const a = createInterval(0, 5, 0, 'a');
		const b = createInterval(3, 8, 1, 'b');
		const c = createInterval(7, 10, 2, 'c');
		const d = createInterval(12, 16, 3, 'd');
		const e = createInterval(15, 20, 4, 'e');
		const f = createInterval(21, 25, 5, 'f');

		const columns: readonly (readonly Interval[])[] = [
			[a, d],
			[b, e],
			[c, f],
		];

		const result = kWayMerge(columns, compareIntervals);

		expect(result).toStrictEqual([a, b, c, d, e, f]);
	});

	test('skips empty columns and still merges intervals in sorted order', () => {
		const a = createInterval(1, 2, 0, 'a');
		const b = createInterval(4, 6, 1, 'b');
		const c = createInterval(8, 10, 2, 'c');
		const d = createInterval(11, 14, 3, 'd');

		const columns: readonly (readonly Interval[])[] = [
			[],
			[a, c],
			[],
			[b, d],
			[],
		];

		const result = kWayMerge(columns, compareIntervals);

		expect(result).toStrictEqual([a, b, c, d]);
	});

	test('returns a new merged array without mutating source columns', () => {
		const a = createInterval(2, 4, 0, 'a');
		const b = createInterval(5, 7, 1, 'b');
		const c = createInterval(9, 12, 2, 'c');

		const columns: readonly (readonly Interval[])[] = [[a, c], [b], []];
		const snapshot = cloneColumns(columns);

		const result = kWayMerge(columns, compareIntervals);

		expect(result).toStrictEqual([a, b, c]);
		expect(columns).toStrictEqual(snapshot);
		expect(result).not.toBe(columns[0]);
	});

	test('correctly merges faker-generated sorted interval columns', () => {
		const intervals = createSortedIntervals(100);
		const columns = Array.from({ length: 6 }, () => [] as Interval[]);

		for (const interval of intervals) {
			const columnIndex = faker.number.int({
				max: columns.length - 1,
				min: 0,
			});

			columns[columnIndex].push(interval);
		}

		const result = kWayMerge(columns, compareIntervals);

		expect(result).toStrictEqual(intervals);
	});

	test('correctly merges random sorted interval columns (property-based)', () => {
		const intervalColumnsArbitrary = fc
			.integer({ max: 8, min: 1 })
			.chain((columnCount) =>
				fc
					.array(
						fc.record({
							duration: fc.integer({
								max: 500,
								min: 1,
							}),
							start: fc.integer({
								max: 10_000,
								min: -10_000,
							}),
						}),
						{ maxLength: 200 },
					)
					.chain((rawIntervals) => {
						const sortedIntervals = rawIntervals
							.map((item, index) => ({
								end: item.start + item.duration,
								label: `interval-${index}`,
								order: index,
								start: item.start,
							}))
							.sort(compareIntervals)
							.map((item, index) => ({
								...item,
								order: index,
							}));

						return fc
							.array(
								fc.integer({
									max: columnCount - 1,
									min: 0,
								}),
								{
									maxLength: sortedIntervals.length,
									minLength: sortedIntervals.length,
								},
							)
							.map((assignments) => ({
								assignments,
								columnCount,
								sortedIntervals,
							}));
					}),
			);

		fc.assert(
			fc.property(intervalColumnsArbitrary, (fixture) => {
				const columns = Array.from(
					{ length: fixture.columnCount },
					() => [] as Interval[],
				);

				for (let index = 0; index < fixture.sortedIntervals.length; index++) {
					const interval = fixture.sortedIntervals[index];
					const columnIndex = fixture.assignments[index];

					columns[columnIndex].push(interval);
				}

				const snapshot = cloneColumns(columns);
				const result = kWayMerge(columns, compareIntervals);
				const expected = [...fixture.sortedIntervals].sort(compareIntervals);

				expect(result).toStrictEqual(expected);
				expect(columns).toStrictEqual(snapshot);
				expect(result).toHaveLength(expected.length);

				for (let index = 1; index < result.length; index++) {
					expect(
						compareIntervals(result[index - 1], result[index]),
					).toBeLessThanOrEqual(0);
				}
			}),
			{
				numRuns: 300,
				seed: FAKER_SEED,
			},
		);
	});
});
