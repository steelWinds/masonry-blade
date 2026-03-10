import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { Bench } from 'tinybench';
import { faker } from '@faker-js/faker';

import { MasonryMatrix } from '../build/masonry-blade.mjs';
import type { ImageItem } from '../src/utils/MasonryMatrix/lib/masonryEngine/index.ts';

const TOTALS = [1_000, 10_000, 100_000, 1_000_000] as const;
const COLUMNS = [4, 8, 16, 32] as const;

const WIDTH = 320;
const APPEND_PARTS = 10;

type Columns = Awaited<ReturnType<InstanceType<typeof MasonryMatrix>['appendItems']>>;

type MemStats = {
  runId: number;
  heapUsedBefore: number;
  heapUsedAfter: number;
  heapUsedDelta: number;
  rssBefore: number;
  rssAfter: number;
  rssDelta: number;
};

function generateItems(total: number): ImageItem[] {
  faker.seed(42 + total);

  const items = new Array<ImageItem>(total);

  for (let i = 0; i < total; i++) {
    items[i] = {
      id: `i${i}`,
      src: `s${i}`,
      width: faker.number.int({ min: 200, max: 2400 }),
      height: faker.number.int({ min: 200, max: 3200 }),
    };
  }

  return items;
}

function splitIntoParts<T>(items: readonly T[], parts: number): T[][] {
  if (items.length === 0) return [];

  const chunkSize = Math.ceil(items.length / parts);
  const result: T[][] = [];

  for (let i = 0; i < items.length; i += chunkSize) {
    result.push(items.slice(i, i + chunkSize));
  }

  return result;
}

function getBenchOptions(total: number) {
  if (total <= 1_000) {
    return {
      time: 300,
      warmupTime: 100,
      warmupIterations: 5,
      throws: true,
      timestampProvider: 'hrtimeNow',
    } as const;
  }

  if (total <= 10_000) {
    return {
      time: 200,
      warmupTime: 75,
      warmupIterations: 3,
      throws: true,
      timestampProvider: 'hrtimeNow',
    } as const;
  }

  if (total <= 100_000) {
    return {
      iterations: 8,
      warmupIterations: 1,
      warmupTime: 0,
      throws: true,
      timestampProvider: 'hrtimeNow',
    } as const;
  }

  return {
    iterations: 3,
    warmupIterations: 0,
    warmupTime: 0,
    throws: true,
    timestampProvider: 'hrtimeNow',
  } as const;
}

function taskRow(task: any) {
  const result = task.result;
  const state = result?.state;

  if (!result || (state !== 'completed' && state !== 'aborted-with-statistics')) {
    return {
      Task: task.name,
      State: state ?? 'unknown',
    };
  }

  return {
    Task: task.name,
    'Mean (ms)': result.latency.mean.toFixed(3),
    'P50 (ms)': result.latency.p50.toFixed(3),
    'Min (ms)': result.latency.min.toFixed(3),
    'Ops/s': Math.round(result.throughput.mean),
    Samples: result.latency.samplesCount,
    RME: `${result.latency.rme.toFixed(2)}%`,
  };
}

function bytesToMb(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function median(values: number[]): number {
  const copy = values.slice().sort((a, b) => a - b);
  const mid = copy.length >> 1;

  return copy.length % 2 === 0
    ? (copy[mid - 1] + copy[mid]) / 2
    : copy[mid];
}

function representativeMemStats(stats: MemStats[]): MemStats {
  const targetDelta = median(stats.map((s) => s.heapUsedDelta));

  let best = stats[0];
  let bestDistance = Math.abs(stats[0].heapUsedDelta - targetDelta);

  for (let i = 1; i < stats.length; i++) {
    const distance = Math.abs(stats[i].heapUsedDelta - targetDelta);

    if (distance < bestDistance) {
      best = stats[i];
      bestDistance = distance;
    }
  }

  return best;
}

function readMemory() {
  const mem = process.memoryUsage();

  return {
    heapUsed: mem.heapUsed,
    rss: mem.rss,
  };
}

function signatureColumns(
  columns: readonly (readonly { id: string; height: number }[])[],
): string {
  const parts: string[] = [];

  for (let i = 0; i < columns.length; i++) {
    const col = columns[i];
    const first = col[0];
    const last = col[col.length - 1];

    parts.push(
      [
        col.length,
        first ? first.id : '-',
        first ? first.height : '-',
        last ? last.id : '-',
        last ? last.height : '-',
      ].join(':'),
    );
  }

  return parts.join('|');
}

function markdownTable(
  rows: Array<Record<string, string | number>>,
): string {
  if (rows.length === 0) return '';

  const headers = Object.keys(rows[0]);
  const headerRow = `| ${headers.join(' | ')} |`;
  const separatorRow = `| ${headers.map(() => '---').join(' | ')} |`;
  const bodyRows = rows.map((row) => {
    return `| ${headers.map((header) => String(row[header] ?? '')).join(' | ')} |`;
  });

  return [headerRow, separatorRow, ...bodyRows].join('\n');
}

async function validateAppendVsRecreate(
  items: readonly ImageItem[],
  columnCount: number,
  width: number,
) {
  const parts = splitIntoParts(items, APPEND_PARTS);

  const appendMatrix = new MasonryMatrix(columnCount, width);
  let appendColumns: Columns = [];

  for (let i = 0; i < parts.length; i++) {
    appendColumns = await appendMatrix.appendItems(parts[i]);
  }

  const recreateMatrix = new MasonryMatrix(columnCount, width);
  await recreateMatrix.appendItems(items);
  const recreatedColumns = await recreateMatrix.recreateMatrix(columnCount, width);

  const appendSig = signatureColumns(appendColumns);
  const recreateSig = signatureColumns(recreatedColumns);

  if (appendSig !== recreateSig) {
    throw new Error(
      `append/recreate mismatch: items=${items.length}, columns=${columnCount}`,
    );
  }
}

async function measureAppendMemory(
  items: readonly ImageItem[],
  columnCount: number,
  width: number,
  runs: number,
): Promise<MemStats> {
  const parts = splitIntoParts(items, APPEND_PARTS);
  const samples: MemStats[] = [];

  for (let runId = 1; runId <= runs; runId++) {
    globalThis.gc?.();

    const matrix = new MasonryMatrix(columnCount, width);

    globalThis.gc?.();
    const before = readMemory();

    for (let i = 0; i < parts.length; i++) {
      await matrix.appendItems(parts[i]);
    }

    globalThis.gc?.();
    const after = readMemory();

    samples.push({
      runId,
      heapUsedBefore: before.heapUsed,
      heapUsedAfter: after.heapUsed,
      heapUsedDelta: after.heapUsed - before.heapUsed,
      rssBefore: before.rss,
      rssAfter: after.rss,
      rssDelta: after.rss - before.rss,
    });
  }

  return representativeMemStats(samples);
}

async function measureRecreateMemory(
  items: readonly ImageItem[],
  columnCount: number,
  width: number,
  runs: number,
): Promise<MemStats> {
  const samples: MemStats[] = [];

  for (let runId = 1; runId <= runs; runId++) {
    const matrix = new MasonryMatrix(columnCount, width);
    await matrix.appendItems(items);

    globalThis.gc?.();
    const before = readMemory();

    await matrix.recreateMatrix(columnCount, width);

    globalThis.gc?.();
    const after = readMemory();

    samples.push({
      runId,
      heapUsedBefore: before.heapUsed,
      heapUsedAfter: after.heapUsed,
      heapUsedDelta: after.heapUsed - before.heapUsed,
      rssBefore: before.rss,
      rssAfter: after.rss,
      rssDelta: after.rss - before.rss,
    });
  }

  return representativeMemStats(samples);
}

function memoryRows(
  appendMem: MemStats,
  recreateMem: MemStats,
): Array<Record<string, string | number>> {
  return [
    {
      Task: 'append',
      Run: appendMem.runId,
      'Heap before': bytesToMb(appendMem.heapUsedBefore),
      'Heap after': bytesToMb(appendMem.heapUsedAfter),
      'Heap delta': bytesToMb(appendMem.heapUsedDelta),
      'RSS before': bytesToMb(appendMem.rssBefore),
      'RSS after': bytesToMb(appendMem.rssAfter),
      'RSS delta': bytesToMb(appendMem.rssDelta),
    },
    {
      Task: 'recreate',
      Run: recreateMem.runId,
      'Heap before': bytesToMb(recreateMem.heapUsedBefore),
      'Heap after': bytesToMb(recreateMem.heapUsedAfter),
      'Heap delta': bytesToMb(recreateMem.heapUsedDelta),
      'RSS before': bytesToMb(recreateMem.rssBefore),
      'RSS after': bytesToMb(recreateMem.rssAfter),
      'RSS delta': bytesToMb(recreateMem.rssDelta),
    },
  ];
}

async function runScenario(
  items: readonly ImageItem[],
  columnCount: number,
  width: number,
): Promise<string> {
  await validateAppendVsRecreate(items, columnCount, width);

  const parts = splitIntoParts(items, APPEND_PARTS);
  const batchSize = Math.ceil(items.length / APPEND_PARTS);

  let appendMatrix: InstanceType<typeof MasonryMatrix>;
  let recreateMatrix: InstanceType<typeof MasonryMatrix>;

  const bench = new Bench({
    name: `items=${items.length} columns=${columnCount}`,
    ...getBenchOptions(items.length),
  });

  bench.add(
    `append(${APPEND_PARTS}x${batchSize})`,
    async () => {
      for (let i = 0; i < parts.length; i++) {
        await appendMatrix.appendItems(parts[i]);
      }
    },
    {
      beforeEach: async () => {
        globalThis.gc?.();
        appendMatrix = new MasonryMatrix(columnCount, width);
      },
    },
  );

  bench.add(
    'recreate',
    async () => {
      await recreateMatrix.recreateMatrix(columnCount, width);
    },
    {
      beforeEach: async () => {
        globalThis.gc?.();
        recreateMatrix = new MasonryMatrix(columnCount, width);
        await recreateMatrix.appendItems(items);
      },
    },
  );

  await bench.run();

  const memoryRuns = items.length >= 1_000_000 ? 2 : 3;
  const appendMem = await measureAppendMemory(items, columnCount, width, memoryRuns);
  const recreateMem = await measureRecreateMemory(items, columnCount, width, memoryRuns);

  const benchRows = bench.table(taskRow as any) as Array<Record<string, string | number>>;
  const memRows = memoryRows(appendMem, recreateMem);

  console.log(`\n=== items=${items.length} | columns=${columnCount} ===`);
  console.table(benchRows);
  console.log('Memory:');
  console.table(memRows);

  return [
    `## items=${items.length} | columns=${columnCount}`,
    '',
    '### Time',
    '',
    markdownTable(benchRows),
    '',
    '### Memory',
    '',
    markdownTable(memRows),
    '',
  ].join('\n');
}

async function main() {
  const startedAt = new Date();
  const sections: string[] = [];

  sections.push('# Benchmark results');
  sections.push('');
  sections.push(`Started at: ${startedAt.toISOString()}`);
  sections.push('');
  sections.push(`Width: ${WIDTH}`);
  sections.push(`Append parts: ${APPEND_PARTS}`);
  sections.push(`Totals: ${TOTALS.join(', ')}`);
  sections.push(`Columns: ${COLUMNS.join(', ')}`);
  sections.push('');

  for (let i = 0; i < TOTALS.length; i++) {
    const total = TOTALS[i];
    const items = generateItems(total);

    for (let j = 0; j < COLUMNS.length; j++) {
      const section = await runScenario(items, COLUMNS[j], WIDTH);
      sections.push(section);
    }
  }

  sections.push('');
  sections.push('');

  const output = sections.join('\n');
  const benchmarkDir = join(process.cwd(), 'benchmark');

  await mkdir(benchmarkDir, { recursive: true });

  const latestFile = join(benchmarkDir, 'benchmark-results.md');

  await writeFile(latestFile, output, 'utf8');

  console.log(`\nSaved benchmark report to: ${latestFile}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
