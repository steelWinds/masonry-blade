import { performance } from 'node:perf_hooks';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { mkdir, writeFile } from 'node:fs/promises';

import { faker } from '@faker-js/faker';
import { FAKER_SEED } from 'lib/constants.ts';
import { MasonryMatrix } from '../playground/build/index.js';

type ImageItem = {
	id: string;
	src: string;
	width: number;
	height: number;
};

type Operation = 'recreateMatrix' | 'appendItems';

type BenchmarkRow = {
	operation: Operation;
	columns: number;
	baseItems: number;
	deltaItems: number;
	timedItems: number;
	warmupIterations: number;
	sampleCount: number;
	minMs: number;
	medianMs: number;
	meanMs: number;
	p95Ms: number;
	maxMs: number;
	stdDevMs: number;
	medianOpsPerSec: number;
	medianItemsPerSec: number;
};

type MachineInfo = {
	hostname: string;
	platform: NodeJS.Platform;
	release: string;
	arch: string;
	node: string;
	v8: string;
	cpuCount: number;
	cpuModel: string;
	totalMemoryBytes: number;
	totalMemoryGiB: string;
	freeMemoryBytes: number;
	freeMemoryGiB: string;
	rssBytes: number;
	rssGiB: string;
	heapUsedBytes: number;
	heapUsedGiB: string;
	heapTotalBytes: number;
	heapTotalGiB: string;
	loadAverage1m: string;
	loadAverage5m: string;
	loadAverage15m: string;
};

type CliOptions = {
	out?: string;
	recreateSamples: number;
	appendSamples: number;
	warmupIterations: number;
};

const ROOT_WIDTH = 3840;
const RECREATE_COLUMNS = [8, 16, 32] as const;
const RECREATE_ITEM_COUNTS = [1_000, 100_000, 1_000_000] as const;
const APPEND_COLUMNS = [8, 16, 32] as const;
const APPEND_DELTA_COUNTS = [100, 1_000, 10_000] as const;
const APPEND_BASE_ITEMS = 1_000_000;
const DEFAULT_REPORT_NAME = 'benchmark-results.md';
const DEFAULT_RECREATE_SAMPLES = 7;
const DEFAULT_APPEND_SAMPLES = 3;
const DEFAULT_WARMUP_ITERATIONS = 1;

function getMachineInfo(): MachineInfo {
	const cpus = os.cpus();
	const cpuModel = cpus[0]?.model ?? 'Unknown';
	const totalMemoryBytes = os.totalmem();
	const freeMemoryBytes = os.freemem();
	const memoryUsage = process.memoryUsage();
	const [load1, load5, load15] = os.loadavg();

	return {
		hostname: os.hostname(),
		platform: process.platform,
		release: os.release(),
		arch: process.arch,
		node: process.version,
		v8: process.versions.v8,
		cpuCount: cpus.length,
		cpuModel,
		totalMemoryBytes,
		totalMemoryGiB: formatGiB(totalMemoryBytes),
		freeMemoryBytes,
		freeMemoryGiB: formatGiB(freeMemoryBytes),
		rssBytes: memoryUsage.rss,
		rssGiB: formatGiB(memoryUsage.rss),
		heapUsedBytes: memoryUsage.heapUsed,
		heapUsedGiB: formatGiB(memoryUsage.heapUsed),
		heapTotalBytes: memoryUsage.heapTotal,
		heapTotalGiB: formatGiB(memoryUsage.heapTotal),
		loadAverage1m: load1.toFixed(2),
		loadAverage5m: load5.toFixed(2),
		loadAverage15m: load15.toFixed(2),
	};
}

function buildImageItems(
	count: number,
	startIndex = 0,
	seed = FAKER_SEED,
): ImageItem[] {
	faker.seed(seed);

	const items = new Array<ImageItem>(count);

	for (let i = 0; i < count; i++) {
		const index = startIndex + i;

		items[i] = {
			id: `i${index}`,
			src: `s${index}`,
			width: faker.number.int({ min: 240, max: 2560 }),
			height: faker.number.int({ min: 240, max: 2560 }),
		};
	}

	return items;
}

function countPlacedItems(columns: readonly (readonly unknown[])[]): number {
	let total = 0;

	for (let i = 0; i < columns.length; i++) {
		total += columns[i].length;
	}

	return total;
}

function formatMs(value: number): string {
	return value.toFixed(3);
}

function formatOpsPerSec(value: number): string {
	return Number.isFinite(value) ? value.toFixed(3) : '∞';
}

function formatItemsPerSec(value: number): string {
	return Number.isFinite(value) ? formatInteger(Math.round(value)) : '∞';
}

function formatGiB(bytes: number): string {
	return (bytes / 1024 / 1024 / 1024).toFixed(2);
}

function formatInteger(value: number): string {
	return value.toLocaleString('en-US');
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

function arithmeticMean(values: readonly number[]): number {
	if (values.length === 0) {
		return 0;
	}

	let sum = 0;

	for (let i = 0; i < values.length; i++) {
		sum += values[i];
	}

	return sum / values.length;
}

function standardDeviation(values: readonly number[], mean: number): number {
	if (values.length <= 1) {
		return 0;
	}

	let varianceSum = 0;

	for (let i = 0; i < values.length; i++) {
		const delta = values[i] - mean;
		varianceSum += delta * delta;
	}

	return Math.sqrt(varianceSum / values.length);
}

function summarizeSamples(params: {
	operation: Operation;
	columns: number;
	baseItems: number;
	deltaItems: number;
	timedItems: number;
	warmupIterations: number;
	samples: readonly number[];
}): BenchmarkRow {
	const {
		operation,
		columns,
		baseItems,
		deltaItems,
		timedItems,
		warmupIterations,
		samples,
	} = params;
	const sortedSamples = [...samples].sort((a, b) => a - b);
	const minMs = sortedSamples[0] ?? 0;
	const medianMs = percentile(sortedSamples, 0.5);
	const meanMs = arithmeticMean(sortedSamples);
	const p95Ms = percentile(sortedSamples, 0.95);
	const maxMs = sortedSamples[sortedSamples.length - 1] ?? 0;
	const stdDevMs = standardDeviation(sortedSamples, meanMs);
	const medianOpsPerSec =
		medianMs === 0 ? Number.POSITIVE_INFINITY : 1000 / medianMs;
	const medianItemsPerSec =
		medianMs === 0 ? Number.POSITIVE_INFINITY : (timedItems * 1000) / medianMs;

	return {
		operation,
		columns,
		baseItems,
		deltaItems,
		timedItems,
		warmupIterations,
		sampleCount: samples.length,
		minMs,
		medianMs,
		meanMs,
		p95Ms,
		maxMs,
		stdDevMs,
		medianOpsPerSec,
		medianItemsPerSec,
	};
}

async function maybeGc(): Promise<void> {
	if (typeof globalThis.gc === 'function') {
		globalThis.gc();
		globalThis.gc();
	}

	await new Promise<void>((resolve) => setImmediate(resolve));
}

async function warmup(): Promise<void> {
	const matrix = new MasonryMatrix(ROOT_WIDTH, 8);
	const warmupItems = buildImageItems(10_000, 9_000_000, FAKER_SEED + 99);

	await matrix.appendItems(warmupItems);
	await matrix.recreateMatrix(ROOT_WIDTH, 8);
	await matrix.appendItems(warmupItems.slice(0, 100));
}

async function measureOneOperation<T>(
	operation: () => Promise<T>,
): Promise<{ ms: number; result: T }> {
	const startedAt = performance.now();
	const result = await operation();
	const endedAt = performance.now();

	return {
		ms: endedAt - startedAt,
		result,
	};
}

async function runRecreateBenchmarks(
	allItems: readonly ImageItem[],
	options: CliOptions,
): Promise<BenchmarkRow[]> {
	const rows: BenchmarkRow[] = [];

	console.log('\n[recreateMatrix] Preparing scenarios...');

	for (const itemCount of RECREATE_ITEM_COUNTS) {
		const items =
			itemCount === allItems.length ? allItems : allItems.slice(0, itemCount);

		for (const columns of RECREATE_COLUMNS) {
			await maybeGc();

			const matrix = new MasonryMatrix(ROOT_WIDTH, columns);
			await matrix.appendItems(items);

			for (let i = 0; i < options.warmupIterations; i++) {
				await matrix.recreateMatrix(ROOT_WIDTH, columns);
			}

			const samples: number[] = [];

			for (
				let sampleIndex = 0;
				sampleIndex < options.recreateSamples;
				sampleIndex++
			) {
				await maybeGc();

				const { ms, result } = await measureOneOperation(() =>
					matrix.recreateMatrix(ROOT_WIDTH, columns),
				);

				const placed = countPlacedItems(result);

				if (placed !== itemCount) {
					throw new Error(
						`Invalid recreateMatrix result: expected ${itemCount} items, got ${placed}`,
					);
				}

				samples.push(ms);
			}

			const row = summarizeSamples({
				operation: 'recreateMatrix',
				columns,
				baseItems: itemCount,
				deltaItems: 0,
				timedItems: itemCount,
				warmupIterations: options.warmupIterations,
				samples,
			});

			rows.push(row);

			console.log(
				`  done: items=${formatInteger(itemCount)}, columns=${columns}, median=${formatMs(row.medianMs)} ms, p95=${formatMs(row.p95Ms)} ms`,
			);
		}
	}

	return rows;
}

async function runAppendBenchmarks(
	baseItems: readonly ImageItem[],
	options: CliOptions,
): Promise<BenchmarkRow[]> {
	const rows: BenchmarkRow[] = [];

	console.log('\n[appendItems] Preparing scenarios...');

	for (const columns of APPEND_COLUMNS) {
		for (const delta of APPEND_DELTA_COUNTS) {
			const extraItems = buildImageItems(
				delta,
				APPEND_BASE_ITEMS,
				FAKER_SEED + columns * 100 + delta,
			);

			const samples: number[] = [];

			for (
				let sampleIndex = 0;
				sampleIndex < options.appendSamples;
				sampleIndex++
			) {
				await maybeGc();

				const matrix = new MasonryMatrix(ROOT_WIDTH, columns);
				await matrix.appendItems(baseItems);

				for (let i = 0; i < options.warmupIterations; i++) {
					const warmupMatrix = new MasonryMatrix(ROOT_WIDTH, columns);
					await warmupMatrix.appendItems(baseItems);
					await warmupMatrix.appendItems(extraItems);
				}

				await maybeGc();

				const { ms, result } = await measureOneOperation(() =>
					matrix.appendItems(extraItems),
				);

				const expected = APPEND_BASE_ITEMS + delta;
				const placed = countPlacedItems(result);

				if (placed !== expected) {
					throw new Error(
						`Invalid appendItems result: expected ${expected} items, got ${placed}`,
					);
				}

				samples.push(ms);
			}

			const row = summarizeSamples({
				operation: 'appendItems',
				columns,
				baseItems: APPEND_BASE_ITEMS,
				deltaItems: delta,
				timedItems: delta,
				warmupIterations: options.warmupIterations,
				samples,
			});

			rows.push(row);

			console.log(
				`  done: base=${formatInteger(APPEND_BASE_ITEMS)}, add=${formatInteger(delta)}, columns=${columns}, median=${formatMs(row.medianMs)} ms, p95=${formatMs(row.p95Ms)} ms`,
			);
		}
	}

	return rows;
}

function toMarkdownTable(rows: readonly BenchmarkRow[]): string {
	const header =
		'| Operation | Columns | Base items | Added items | Timed items | Samples | Warmup | Min ms | Median ms | Mean ms | P95 ms | Max ms | StdDev ms | Median ops/sec | Median items/sec |';
	const separator =
		'|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|';
	const body = rows.map((row) => {
		return `| ${row.operation} | ${row.columns} | ${formatInteger(row.baseItems)} | ${formatInteger(row.deltaItems)} | ${formatInteger(row.timedItems)} | ${row.sampleCount} | ${row.warmupIterations} | ${formatMs(row.minMs)} | ${formatMs(row.medianMs)} | ${formatMs(row.meanMs)} | ${formatMs(row.p95Ms)} | ${formatMs(row.maxMs)} | ${formatMs(row.stdDevMs)} | ${formatOpsPerSec(row.medianOpsPerSec)} | ${formatItemsPerSec(row.medianItemsPerSec)} |`;
	});

	return [header, separator, ...body].join('\n');
}

function buildMarkdownReport(params: {
	startedAt: Date;
	finishedAt: Date;
	machineAtStart: MachineInfo;
	machineAtEnd: MachineInfo;
	options: CliOptions;
	recreateRows: readonly BenchmarkRow[];
	appendRows: readonly BenchmarkRow[];
}): string {
	const {
		startedAt,
		finishedAt,
		machineAtStart,
		machineAtEnd,
		options,
		recreateRows,
		appendRows,
	} = params;
	const durationMs = finishedAt.getTime() - startedAt.getTime();

	return [
		'# MasonryMatrix Benchmark Report',
		'',
		`- Benchmark date (start): ${startedAt.toISOString()}`,
		`- Benchmark date (end): ${finishedAt.toISOString()}`,
		`- Total wall-clock duration: ${formatInteger(durationMs)} ms`,
		`- Node.js: ${machineAtStart.node}`,
		`- V8: ${machineAtStart.v8}`,
		`- Seed: ${FAKER_SEED}`,
		`- Root width: ${ROOT_WIDTH}`,
		`- GC exposed: ${typeof globalThis.gc === 'function' ? 'yes' : 'no'}`,
		'',
		'## Benchmark configuration',
		'',
		`- recreateMatrix samples per scenario: ${options.recreateSamples}`,
		`- appendItems samples per scenario: ${options.appendSamples}`,
		`- Warmup iterations per scenario: ${options.warmupIterations}`,
		`- recreateMatrix columns: ${RECREATE_COLUMNS.join(', ')}`,
		`- recreateMatrix item counts: ${RECREATE_ITEM_COUNTS.map(formatInteger).join(', ')}`,
		`- appendItems columns: ${APPEND_COLUMNS.join(', ')}`,
		`- appendItems base items: ${formatInteger(APPEND_BASE_ITEMS)}`,
		`- appendItems delta counts: ${APPEND_DELTA_COUNTS.map(formatInteger).join(', ')}`,
		'',
		'## Machine at start',
		'',
		`- Hostname: ${machineAtStart.hostname}`,
		`- Platform: ${machineAtStart.platform}`,
		`- Release: ${machineAtStart.release}`,
		`- Architecture: ${machineAtStart.arch}`,
		`- CPU count: ${machineAtStart.cpuCount}`,
		`- CPU model: ${machineAtStart.cpuModel}`,
		`- Load average (1m, 5m, 15m): ${machineAtStart.loadAverage1m}, ${machineAtStart.loadAverage5m}, ${machineAtStart.loadAverage15m}`,
		`- Total memory: ${machineAtStart.totalMemoryGiB} GiB (${formatInteger(machineAtStart.totalMemoryBytes)} bytes)`,
		`- Free memory: ${machineAtStart.freeMemoryGiB} GiB (${formatInteger(machineAtStart.freeMemoryBytes)} bytes)`,
		`- RSS: ${machineAtStart.rssGiB} GiB (${formatInteger(machineAtStart.rssBytes)} bytes)`,
		`- Heap used: ${machineAtStart.heapUsedGiB} GiB (${formatInteger(machineAtStart.heapUsedBytes)} bytes)`,
		`- Heap total: ${machineAtStart.heapTotalGiB} GiB (${formatInteger(machineAtStart.heapTotalBytes)} bytes)`,
		'',
		'## Machine at end',
		'',
		`- Free memory: ${machineAtEnd.freeMemoryGiB} GiB (${formatInteger(machineAtEnd.freeMemoryBytes)} bytes)`,
		`- RSS: ${machineAtEnd.rssGiB} GiB (${formatInteger(machineAtEnd.rssBytes)} bytes)`,
		`- Heap used: ${machineAtEnd.heapUsedGiB} GiB (${formatInteger(machineAtEnd.heapUsedBytes)} bytes)`,
		`- Heap total: ${machineAtEnd.heapTotalGiB} GiB (${formatInteger(machineAtEnd.heapTotalBytes)} bytes)`,
		'',
		'## Scenario notes',
		'',
		'- Timed sections exclude synthetic data generation.',
		'- recreateMatrix measurements exclude base dataset generation and the initial matrix fill.',
		'- appendItems measurements exclude synthetic delta dataset generation and the preload of 1,000,000 items.',
		'- recreateMatrix samples reuse the same prepared matrix for repeated rebuilds.',
		'- appendItems samples prepare a fresh preloaded matrix per sample to keep the starting state stable.',
		'',
		'## recreateMatrix',
		'',
		toMarkdownTable(recreateRows),
		'',
		'## appendItems',
		'',
		toMarkdownTable(appendRows),
		'',
	].join('\n');
}

async function writeMarkdownReport(
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

function getStringArg(name: string): string | undefined {
	const exactIndex = process.argv.findIndex((arg) => arg === name);

	if (exactIndex !== -1) {
		return process.argv[exactIndex + 1];
	}

	const inlinePrefix = `${name}=`;
	const inlineArg = process.argv.find((arg) => arg.startsWith(inlinePrefix));

	return inlineArg?.slice(inlinePrefix.length);
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
		recreateSamples: getPositiveIntArg(
			'--recreate-samples',
			DEFAULT_RECREATE_SAMPLES,
		),
		appendSamples: getPositiveIntArg(
			'--append-samples',
			DEFAULT_APPEND_SAMPLES,
		),
		warmupIterations: getPositiveIntArg('--warmup', DEFAULT_WARMUP_ITERATIONS),
	};
}

function printConsoleSummary(rows: readonly BenchmarkRow[]): void {
	console.log('\n=== Summary ===\n');
	console.table(
		rows.map((row) => ({
			operation: row.operation,
			columns: row.columns,
			baseItems: formatInteger(row.baseItems),
			addedItems: formatInteger(row.deltaItems),
			timedItems: formatInteger(row.timedItems),
			samples: row.sampleCount,
			warmup: row.warmupIterations,
			'median ms': formatMs(row.medianMs),
			'p95 ms': formatMs(row.p95Ms),
			'median ops/sec': formatOpsPerSec(row.medianOpsPerSec),
			'median items/sec': formatItemsPerSec(row.medianItemsPerSec),
		})),
	);
}

async function main(): Promise<void> {
	const startedAt = new Date();
	const machineAtStart = getMachineInfo();
	const options = parseCliOptions();

	console.log('MasonryMatrix benchmark');
	console.log(`Node.js ${process.version}`);
	console.log(`Seed: ${FAKER_SEED}`);
	console.log(`Root width: ${ROOT_WIDTH}`);
	console.log(`recreate samples: ${options.recreateSamples}`);
	console.log(`append samples: ${options.appendSamples}`);
	console.log(`warmup iterations per scenario: ${options.warmupIterations}`);

	if (typeof globalThis.gc !== 'function') {
		console.warn(
			'[warning] Run with --expose-gc to reduce variance between scenarios.',
		);
	}

	console.log(
		`\nGenerating base dataset with ${formatInteger(APPEND_BASE_ITEMS)} items...`,
	);
	const allItems = buildImageItems(APPEND_BASE_ITEMS, 0, FAKER_SEED);

	console.log('Running global warmup...');
	await warmup();

	const recreateRows = await runRecreateBenchmarks(allItems, options);
	const appendRows = await runAppendBenchmarks(allItems, options);
	const allRows = [...recreateRows, ...appendRows];

	printConsoleSummary(allRows);

	const finishedAt = new Date();
	const machineAtEnd = getMachineInfo();
	const markdown = buildMarkdownReport({
		startedAt,
		finishedAt,
		machineAtStart,
		machineAtEnd,
		options,
		recreateRows,
		appendRows,
	});
	const reportPath = await writeMarkdownReport(markdown, options.out);

	console.log(`\nMarkdown report written to: ${reportPath}`);
}

main().catch((error: unknown) => {
	console.error(error);
	process.exitCode = 1;
});
