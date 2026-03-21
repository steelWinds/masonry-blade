import { mkdir, writeFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { faker } from '@faker-js/faker';
import { FAKER_SEED } from 'tests/constants.ts';
import { MasonryMatrix } from '../build/index.js';

type MetaObjectItem = any;

type Mode = 'plain' | 'meta-object';
type Operation = 'append' | 'recreate';

type Scenario = {
	operation: Operation;
	mode: Mode;
	columns: number;
	baseItems: number;
	addedItems: number;
	timedItems: number;
};

type BenchmarkRow = Scenario & {
	samples: number;
	warmup: number;
	medianMs: number;
	meanMs: number;
	p95Ms: number;
	itemsPerSec: number;
};

type CliOptions = {
	out?: string;
	samples: number;
	warmup: number;
};

const ROOT_WIDTH = 3840;
const GAP = 16;
const DEFAULT_SAMPLES = 5;
const DEFAULT_WARMUP = 1;
const DEFAULT_REPORT_NAME = 'benchmark-results.md';

const MODES = ['plain', 'meta-object'] as const satisfies readonly Mode[];
const COLUMNS = [8, 16, 32] as const;
const RECREATE_COUNTS = [100_000, 1_000_000] as const;
const APPEND_BASE = 1_000_000;
const APPEND_ADDS = [1_000, 10_000] as const;

const datasetCache = new Map<string, MetaObjectItem[]>();

function getStringArg(name: string): string | undefined {
	const exactIndex = process.argv.findIndex((arg) => arg === name);

	if (exactIndex !== -1) {
		return process.argv[exactIndex + 1];
	}

	const prefix = `${name}=`;
	const inline = process.argv.find((arg) => arg.startsWith(prefix));

	return inline?.slice(prefix.length);
}

function getPositiveIntArg(name: string, fallback: number): number {
	const raw = getStringArg(name);

	if (raw == null) {
		return fallback;
	}

	const value = Number.parseInt(raw, 10);

	if (!Number.isFinite(value) || value <= 0) {
		throw new Error(`Invalid value for ${name}: ${raw}`);
	}

	return value;
}

function parseCliOptions(): CliOptions {
	return {
		out: getStringArg('--out'),
		samples: getPositiveIntArg('--samples', DEFAULT_SAMPLES),
		warmup: getPositiveIntArg('--warmup', DEFAULT_WARMUP),
	};
}

function formatInt(value: number): string {
	return value.toLocaleString('en-US');
}

function formatMs(value: number): string {
	return `${value.toFixed(3)} ms`;
}

function formatShortMs(value: number): string {
	return value.toFixed(3);
}

function formatItemsPerSec(value: number): string {
	return `${formatInt(Math.round(value))} items/sec`;
}

function percentile(sortedValues: readonly number[], p: number): number {
	if (sortedValues.length === 0) {
		return 0;
	}

	if (sortedValues.length === 1) {
		return sortedValues[0];
	}

	const index = (sortedValues.length - 1) * p;
	const lower = Math.floor(index);
	const upper = Math.ceil(index);

	if (lower === upper) {
		return sortedValues[lower];
	}

	const fraction = index - lower;

	return (
		sortedValues[lower] + (sortedValues[upper] - sortedValues[lower]) * fraction
	);
}

function mean(values: readonly number[]): number {
	if (values.length === 0) {
		return 0;
	}

	let sum = 0;

	for (let i = 0; i < values.length; i++) {
		sum += values[i];
	}

	return sum / values.length;
}

function buildItems(
	mode: Mode,
	count: number,
	startIndex = 0,
	seed = FAKER_SEED,
): MetaObjectItem[] {
	const key = `${mode}:${count}:${startIndex}:${seed}`;
	const cached = datasetCache.get(key);

	if (cached) {
		return cached;
	}

	faker.seed(seed);

	const items = new Array(count);

	for (let i = 0; i < count; i++) {
		const index = startIndex + i;
		const width = faker.number.int({ min: 240, max: 2560 });
		const height = faker.number.int({ min: 240, max: 2560 });

		if (mode === 'meta-object') {
			items[i] = {
				id: `item-${index}`,
				width,
				height,
				meta: {
					index,
					src: `image-${index}.jpg`,
					aspectRatio: width / height,
					bucket: index % 2 === 0 ? 'even' : 'odd',
				},
			};
		} else {
			items[i] = {
				id: `item-${index}`,
				width,
				height,
			};
		}
	}

	datasetCache.set(key, items);

	return items;
}

function countPlaced(columns: readonly (readonly unknown[])[]): number {
	let total = 0;

	for (let i = 0; i < columns.length; i++) {
		total += columns[i].length;
	}

	return total;
}

function assertColumns(
	mode: Mode,
	columns: readonly (readonly Record<string, unknown>[])[],
	expectedItems: number,
): void {
	const total = countPlaced(columns);

	if (total !== expectedItems) {
		throw new Error(`Expected ${expectedItems} placed items, got ${total}`);
	}

	if (mode !== 'meta-object' || total === 0) {
		return;
	}

	for (let i = 0; i < columns.length; i++) {
		if (columns[i].length > 0) {
			if (
				typeof columns[i][0].meta !== 'object' ||
				columns[i][0].meta == null
			) {
				throw new Error('Meta object was not preserved in the result.');
			}
			return;
		}
	}
}

async function maybeGc(): Promise<void> {
	if (typeof globalThis.gc === 'function') {
		globalThis.gc();
		globalThis.gc();
	}

	await new Promise<void>((resolve) => setImmediate(resolve));
}

async function measure<T>(
	operation: () => Promise<T>,
): Promise<{ ms: number; result: T }> {
	const started = performance.now();
	const result = await operation();
	const ended = performance.now();

	return { ms: ended - started, result };
}

function createMatrix(columns: number): MasonryMatrix<any> {
	return new MasonryMatrix<any>(ROOT_WIDTH, columns, GAP);
}

async function preloadMatrix(
	mode: Mode,
	columns: number,
	baseItems: number,
): Promise<MasonryMatrix<any>> {
	const matrix = createMatrix(columns);
	await matrix.append(buildItems(mode, baseItems));
	return matrix;
}

async function runScenario(
	scenario: Scenario,
	options: CliOptions,
): Promise<BenchmarkRow> {
	const samples: number[] = [];
	const delta = buildItems(
		scenario.mode,
		scenario.addedItems,
		scenario.baseItems,
		FAKER_SEED + scenario.columns * 100 + scenario.addedItems,
	);

	for (let i = 0; i < options.warmup; i++) {
		if (scenario.operation === 'append') {
			const matrix = await preloadMatrix(
				scenario.mode,
				scenario.columns,
				scenario.baseItems,
			);
			const result = await matrix.append(delta);
			assertColumns(
				scenario.mode,
				result as any,
				scenario.baseItems + scenario.addedItems,
			);
		} else {
			const matrix = await preloadMatrix(
				scenario.mode,
				scenario.columns,
				scenario.baseItems,
			);
			const result = await matrix.recreate(
				ROOT_WIDTH + scenario.columns,
				scenario.columns,
				GAP,
			);
			assertColumns(scenario.mode, result as any, scenario.baseItems);
		}
	}

	for (let i = 0; i < options.samples; i++) {
		await maybeGc();

		if (scenario.operation === 'append') {
			const matrix = await preloadMatrix(
				scenario.mode,
				scenario.columns,
				scenario.baseItems,
			);
			const { ms, result } = await measure(() => matrix.append(delta));

			assertColumns(
				scenario.mode,
				result as any,
				scenario.baseItems + scenario.addedItems,
			);

			samples.push(ms);
		} else {
			const matrix = await preloadMatrix(
				scenario.mode,
				scenario.columns,
				scenario.baseItems,
			);
			const { ms, result } = await measure(() =>
				matrix.recreate(ROOT_WIDTH + scenario.columns, scenario.columns, GAP),
			);

			assertColumns(scenario.mode, result as any, scenario.baseItems);

			samples.push(ms);
		}
	}

	const sorted = [...samples].sort((a, b) => a - b);
	const medianMs = percentile(sorted, 0.5);
	const meanMs = mean(sorted);
	const p95Ms = percentile(sorted, 0.95);

	return {
		...scenario,
		samples: options.samples,
		warmup: options.warmup,
		medianMs,
		meanMs,
		p95Ms,
		itemsPerSec:
			medianMs === 0
				? Number.POSITIVE_INFINITY
				: (scenario.timedItems * 1000) / medianMs,
	};
}

function buildScenarios(): Scenario[] {
	const scenarios: Scenario[] = [];

	for (const mode of MODES) {
		for (const columns of COLUMNS) {
			for (const baseItems of RECREATE_COUNTS) {
				scenarios.push({
					operation: 'recreate',
					mode,
					columns,
					baseItems,
					addedItems: 0,
					timedItems: baseItems,
				});
			}

			for (const addedItems of APPEND_ADDS) {
				scenarios.push({
					operation: 'append',
					mode,
					columns,
					baseItems: APPEND_BASE,
					addedItems,
					timedItems: addedItems,
				});
			}
		}
	}

	return scenarios;
}

function overheadPercent(base: number, value: number): string {
	if (base === 0) {
		return 'n/a';
	}
	const delta = ((value - base) / base) * 100;
	return `${delta >= 0 ? '+' : ''}${delta.toFixed(1)}%`;
}

function buildModeComparison(rows: readonly BenchmarkRow[]): string[] {
	const plain = new Map<string, BenchmarkRow>();
	const meta = new Map<string, BenchmarkRow>();

	for (const row of rows) {
		const key = `${row.operation}:${row.columns}:${row.baseItems}:${row.addedItems}`;
		if (row.mode === 'plain') {
			plain.set(key, row);
		} else {
			meta.set(key, row);
		}
	}

	const lines = [
		'| Operation | Columns | Base items | Added items | Plain median | Meta median | Meta overhead |',
		'|---|---:|---:|---:|---:|---:|---:|',
	];

	for (const [key, plainRow] of plain.entries()) {
		const metaRow = meta.get(key);
		if (!metaRow) {
			continue;
		}
		lines.push(
			`| ${plainRow.operation} | ${plainRow.columns} | ${formatInt(plainRow.baseItems)} | ${formatInt(plainRow.addedItems)} | ${formatShortMs(plainRow.medianMs)} ms | ${formatShortMs(metaRow.medianMs)} ms | ${overheadPercent(plainRow.medianMs, metaRow.medianMs)} |`,
		);
	}

	return lines;
}

function buildHighlights(rows: readonly BenchmarkRow[]): string[] {
	const lines: string[] = [];
	const recreate1M = rows
		.filter(
			(row) => row.operation === 'recreate' && row.baseItems === 1_000_000,
		)
		.sort((a, b) => a.medianMs - b.medianMs);
	const append10k = rows
		.filter((row) => row.operation === 'append' && row.addedItems === 10_000)
		.sort((a, b) => a.medianMs - b.medianMs);

	if (recreate1M[0]) {
		lines.push(
			`- Fastest rebuild of 1,000,000 items: **${recreate1M[0].mode}**, ${recreate1M[0].columns} columns, **${formatMs(recreate1M[0].medianMs)}** median, ${formatItemsPerSec(recreate1M[0].itemsPerSec)}.`,
		);
	}

	if (append10k[0]) {
		lines.push(
			`- Fastest append of 10,000 items onto a 1,000,000-item matrix: **${append10k[0].mode}**, ${append10k[0].columns} columns, **${formatMs(append10k[0].medianMs)}** median, ${formatItemsPerSec(append10k[0].itemsPerSec)}.`,
		);
	}

	const plain1M = rows.find(
		(row) =>
			row.operation === 'recreate' &&
			row.mode === 'plain' &&
			row.columns === 8 &&
			row.baseItems === 1_000_000,
	);
	const meta1M = rows.find(
		(row) =>
			row.operation === 'recreate' &&
			row.mode === 'meta-object' &&
			row.columns === 8 &&
			row.baseItems === 1_000_000,
	);

	if (plain1M && meta1M) {
		lines.push(
			`- At 8 columns and 1,000,000 items, adding a meta object changes rebuild median from **${formatMs(plain1M.medianMs)}** to **${formatMs(meta1M.medianMs)}** (${overheadPercent(plain1M.medianMs, meta1M.medianMs)}).`,
		);
	}

	return lines;
}

function toHumanTable(rows: readonly BenchmarkRow[]): string {
	const header =
		'| Operation | Mode | Columns | Workload | Median | P95 | Throughput |';
	const separator = '|---|---|---:|---|---:|---:|---:|';
	const body = rows.map((row) => {
		const workload =
			row.operation === 'recreate'
				? `rebuild ${formatInt(row.baseItems)} items`
				: `append ${formatInt(row.addedItems)} items to ${formatInt(row.baseItems)}`;
		return `| ${row.operation} | ${row.mode} | ${row.columns} | ${workload} | ${formatShortMs(row.medianMs)} ms | ${formatShortMs(row.p95Ms)} ms | ${formatInt(Math.round(row.itemsPerSec))} items/sec |`;
	});

	return [header, separator, ...body].join('\n');
}

function toMarkdown(
	rows: readonly BenchmarkRow[],
	options: CliOptions,
): string {
	const sorted = [...rows].sort((a, b) => {
		if (a.operation !== b.operation)
			return a.operation.localeCompare(b.operation);
		if (a.mode !== b.mode) return a.mode.localeCompare(b.mode);
		if (a.columns !== b.columns) return a.columns - b.columns;
		if (a.baseItems !== b.baseItems) return a.baseItems - b.baseItems;
		return a.addedItems - b.addedItems;
	});

	return [
		'# MasonryMatrix Benchmark',
		'',
		'## Setup',
		'',
		`- Seed: ${FAKER_SEED}`,
		`- Root width: ${ROOT_WIDTH}`,
		`- Gap: ${GAP}`,
		`- Samples per scenario: ${options.samples}`,
		`- Warmup iterations per scenario: ${options.warmup}`,
		`- GC exposed: ${typeof globalThis.gc === 'function' ? 'yes' : 'no'}`,
		`- Modes: ${MODES.join(', ')}`,
		'',
		'## How to read it',
		'',
		'- `plain` uses items without `meta`.',
		'- `meta-object` uses the current MasonryMatrix API with an object in `meta`.',
		'- `recreate` measures only the rebuild step after the matrix has already been populated.',
		'- `append` measures only the new batch append step on top of a preloaded matrix.',
		'',
		'## Highlights',
		'',
		...buildHighlights(sorted),
		'',
		'## Results',
		'',
		toHumanTable(sorted),
		'',
		'## Plain vs meta-object overhead',
		'',
		...buildModeComparison(sorted),
	].join('\n');
}

function printReadableSummary(rows: readonly BenchmarkRow[]): void {
	console.log('\nReadable summary\n');

	for (const row of rows) {
		const workload =
			row.operation === 'recreate'
				? `rebuild ${formatInt(row.baseItems)} items`
				: `append ${formatInt(row.addedItems)} items to ${formatInt(row.baseItems)}`;
		console.log(
			`- ${row.operation} | ${row.mode} | ${row.columns} cols | ${workload} -> median ${formatMs(row.medianMs)}, p95 ${formatMs(row.p95Ms)}, ${formatItemsPerSec(row.itemsPerSec)}`,
		);
	}
}

function printCompactTable(rows: readonly BenchmarkRow[]): void {
	console.table(
		rows.map((row) => ({
			operation: row.operation,
			mode: row.mode,
			columns: row.columns,
			workload:
				row.operation === 'recreate'
					? `rebuild ${formatInt(row.baseItems)}`
					: `append ${formatInt(row.addedItems)} to ${formatInt(row.baseItems)}`,
			'   median': formatShortMs(row.medianMs),
			'      p95': formatShortMs(row.p95Ms),
			throughput: formatInt(Math.round(row.itemsPerSec)),
		})),
	);
}

async function writeReport(
	markdown: string,
	explicitOutputPath?: string,
): Promise<string> {
	const __dirname = path.dirname(fileURLToPath(import.meta.url));
	const outputPath = explicitOutputPath
		? path.resolve(process.cwd(), explicitOutputPath)
		: path.join(__dirname, DEFAULT_REPORT_NAME);

	await mkdir(path.dirname(outputPath), { recursive: true });
	await writeFile(outputPath, markdown, 'utf8');

	return outputPath;
}

async function warmup(): Promise<void> {
	const matrix = new MasonryMatrix<any>(ROOT_WIDTH, 8, GAP);
	await matrix.append(buildItems('plain', 10_000, 9_000_000, FAKER_SEED + 1));
	await matrix.recreate(ROOT_WIDTH + 8, 8, GAP);
	await matrix.append(
		buildItems('meta-object', 100, 9_100_000, FAKER_SEED + 2),
	);
}

async function main(): Promise<void> {
	const options = parseCliOptions();
	const scenarios = buildScenarios();
	const rows: BenchmarkRow[] = [];

	console.log('MasonryMatrix benchmark');
	console.log(`Node.js ${process.version}`);
	console.log(`Seed: ${FAKER_SEED}`);
	console.log(`Scenarios: ${scenarios.length}`);
	console.log(`Samples per scenario: ${options.samples}`);
	console.log(`Warmup iterations per scenario: ${options.warmup}`);

	if (typeof globalThis.gc !== 'function') {
		console.warn('[warning] Run with --expose-gc to reduce variance.');
	}

	await warmup();

	for (const scenario of scenarios) {
		console.log(
			`[${scenario.operation}] ${scenario.mode}, ${scenario.columns} cols, base=${formatInt(scenario.baseItems)}, add=${formatInt(scenario.addedItems)}`,
		);

		const row = await runScenario(scenario, options);
		rows.push(row);

		console.log(
			`  -> median ${formatMs(row.medianMs)}, p95 ${formatMs(row.p95Ms)}, ${formatItemsPerSec(row.itemsPerSec)}`,
		);
	}

	printReadableSummary(rows);
	printCompactTable(rows);

	const markdown = toMarkdown(rows, options);
	const reportPath = await writeReport(markdown, options.out);

	console.log(`\nMarkdown report written to: ${reportPath}`);
}

main().catch((error: unknown) => {
	console.error(error);
	process.exitCode = 1;
});
