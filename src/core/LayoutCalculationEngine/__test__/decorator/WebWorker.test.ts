import * as fc from 'fast-check';
import {
	type LayoutCalculationEngine,
	type LayoutComputedUnit,
	type LayoutSnapshot,
	type LayoutSourceUnit,
	WebWorker,
	WebWorkerError,
} from 'src/core/LayoutCalculationEngine';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { FAKER_SEED } from 'tests/constants';
import { faker } from '@faker-js/faker';

type TestReturn = unknown;
type TestSnapshot = LayoutSnapshot<TestReturn>;
type TestUnit = LayoutComputedUnit;

type EngineMock = LayoutCalculationEngine<
	TestReturn,
	TestSnapshot,
	TestUnit
> & {
	append: ReturnType<typeof vi.fn>;
	sort: ReturnType<typeof vi.fn>;
	snapshot: ReturnType<typeof vi.fn>;
	fromSnapshot: ReturnType<typeof vi.fn>;
};

class FakeWorker {
	public url: URL;
	public options?: WorkerOptions;

	public static instances: FakeWorker[] = [];
	public static constructionAttempts = 0;
	public static constructShouldThrow = false;
	public static onPostMessage?:
		| ((worker: FakeWorker, message: unknown) => void)
		| undefined;

	public onmessage: ((event: MessageEvent<unknown>) => void) | null = null;

	public onmessageerror: ((event: MessageEvent<unknown>) => void) | null = null;

	public onerror: ((event: ErrorEvent) => void) | null = null;

	public readonly terminate = vi.fn();
	public readonly postMessage = vi.fn((message: unknown) => {
		this.lastMessage = message;
		FakeWorker.onPostMessage?.(this, message);
	});

	public lastMessage?: unknown;

	constructor(url: URL, options?: WorkerOptions) {
		FakeWorker.constructionAttempts += 1;
		this.url = url;
		this.options = options;

		if (FakeWorker.constructShouldThrow) {
			throw new Error('Worker constructor failed');
		}

		FakeWorker.instances.push(this);
	}

	public emitMessage(data: unknown): void {
		this.onmessage?.({ data } as MessageEvent<unknown>);
	}

	public emitMessageError(): void {
		this.onmessageerror?.({} as MessageEvent<unknown>);
	}

	public emitError(error: unknown = new Error('Worker error')): void {
		this.onerror?.({ error } as ErrorEvent);
	}

	public static reset(): void {
		FakeWorker.instances = [];
		FakeWorker.constructionAttempts = 0;
		FakeWorker.constructShouldThrow = false;
		FakeWorker.onPostMessage = undefined;
	}
}

const WORKER_PATH = './layout.worker.ts';

const createSourceUnit = (
	overrides: Partial<LayoutSourceUnit> = {},
): Readonly<LayoutSourceUnit> => ({
	height:
		overrides.height ??
		faker.number.float({
			fractionDigits: 3,
			max: 2_000,
			min: 1,
		}),
	id: overrides.id ?? faker.string.alphanumeric(10),
	width:
		overrides.width ??
		faker.number.float({
			fractionDigits: 3,
			max: 2_000,
			min: 1,
		}),
});

const createComputedUnit = (
	overrides: Partial<TestUnit> = {},
): Readonly<TestUnit> =>
	({
		height:
			(overrides as { height?: number }).height ??
			faker.number.float({
				fractionDigits: 3,
				max: 2_000,
				min: 1,
			}),
		id: (overrides as { id?: string | number }).id ?? faker.string.nanoid(),
		width:
			(overrides as { width?: number }).width ??
			faker.number.float({
				fractionDigits: 3,
				max: 2_000,
				min: 1,
			}),
		x:
			(overrides as { x?: number }).x ??
			faker.number.float({
				fractionDigits: 3,
				max: 2_000,
				min: 0,
			}),
		y:
			(overrides as { y?: number }).y ??
			faker.number.float({
				fractionDigits: 3,
				max: 2_000,
				min: 0,
			}),
	}) as TestUnit;

const createSnapshot = (): TestSnapshot =>
	({
		order: Array.from({ length: faker.number.int({ max: 8, min: 0 }) }, () =>
			faker.string.nanoid(),
		),
		token: faker.string.uuid(),
		version: faker.number.int({ max: 10_000, min: 0 }),
	}) as unknown as TestSnapshot;

const createEngineMock = (
	snapshot: TestSnapshot = createSnapshot(),
): EngineMock =>
	({
		append: vi.fn(),
		fromSnapshot: vi.fn(),
		snapshot: vi.fn().mockReturnValue(snapshot),
		sort: vi.fn(),
	}) as unknown as EngineMock;

const idArbitrary = fc.oneof(
	fc.integer({
		max: Number.MAX_SAFE_INTEGER,
		min: Number.MIN_SAFE_INTEGER,
	}),
	fc.string({ maxLength: 32, minLength: 1 }),
);

const sourceUnitArbitrary: fc.Arbitrary<LayoutSourceUnit> = fc.record({
	height: fc.double({
		max: 50_000,
		min: 0.001,
		noDefaultInfinity: true,
		noNaN: true,
	}),
	id: idArbitrary,
	width: fc.double({
		max: 50_000,
		min: 0.001,
		noDefaultInfinity: true,
		noNaN: true,
	}),
}) as fc.Arbitrary<LayoutSourceUnit>;

const computedUnitArbitrary: fc.Arbitrary<TestUnit> = fc.record({
	height: fc.double({
		max: 50_000,
		min: 0.001,
		noDefaultInfinity: true,
		noNaN: true,
	}),
	id: idArbitrary,
	width: fc.double({
		max: 50_000,
		min: 0.001,
		noDefaultInfinity: true,
		noNaN: true,
	}),
	x: fc.double({
		max: 50_000,
		min: -50_000,
		noDefaultInfinity: true,
		noNaN: true,
	}),
	y: fc.double({
		max: 50_000,
		min: -50_000,
		noDefaultInfinity: true,
		noNaN: true,
	}),
}) as fc.Arbitrary<TestUnit>;

describe('WebWorker', () => {
	beforeEach(() => {
		faker.seed(FAKER_SEED);
		FakeWorker.reset();
		vi.stubGlobal('Worker', FakeWorker);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
		FakeWorker.reset();
	});

	test('snapshot() delegates to engine.snapshot()', () => {
		const snapshot = createSnapshot();
		const engine = createEngineMock(snapshot);
		const worker = new WebWorker(engine, WORKER_PATH);

		expect(worker.snapshot()).toBe(snapshot);
		expect(engine.snapshot).toHaveBeenCalledTimes(1);
	});

	test('append() falls back to engine.append() when Worker is unavailable', async () => {
		vi.stubGlobal('Worker', undefined);

		const snapshot = createSnapshot();
		const items = [createSourceUnit(), createSourceUnit()];
		const engine = createEngineMock(snapshot);
		const worker = new WebWorker(engine, WORKER_PATH);

		const result = await worker.append(items);

		expect(engine.append).toHaveBeenCalledTimes(1);
		expect(engine.append).toHaveBeenCalledWith(items);
		expect(engine.fromSnapshot).not.toHaveBeenCalled();
		expect(result).toBe(snapshot);
	});

	test('sort() falls back to engine.sort() when Worker is unavailable', async () => {
		vi.stubGlobal('Worker', undefined);

		const snapshot = createSnapshot();
		const source = { token: faker.string.uuid() };
		const sorted = [createComputedUnit(), createComputedUnit()];
		const engine = createEngineMock(snapshot);

		engine.sort.mockReturnValue(sorted);

		const worker = new WebWorker(engine, WORKER_PATH);
		const result = await worker.sort(source);

		expect(engine.sort).toHaveBeenCalledTimes(1);
		expect(engine.sort).toHaveBeenCalledWith(source);
		expect(result).toBe(sorted);
	});

	test('append() lazily creates worker, sends append payload, syncs engine from worker snapshot and returns it', async () => {
		const initialSnapshot = createSnapshot();
		const nextSnapshot = createSnapshot();
		const items = [createSourceUnit(), createSourceUnit()];
		const engine = createEngineMock(initialSnapshot);

		FakeWorker.onPostMessage = (instance) => {
			instance.emitMessage({
				payload: {
					snapshot: nextSnapshot,
				},
				type: 'append',
			});
		};

		const worker = new WebWorker(engine, WORKER_PATH);
		const result = await worker.append(items);

		expect(FakeWorker.constructionAttempts).toBe(1);
		expect(FakeWorker.instances).toHaveLength(1);

		const [instance] = FakeWorker.instances;

		expect(instance.options).toEqual({ type: 'module' });
		expect(String(instance.url)).toContain('layout.worker.ts');
		expect(instance.postMessage).toHaveBeenCalledTimes(1);
		expect(instance.postMessage).toHaveBeenCalledWith({
			payload: {
				items,
				snapshot: initialSnapshot,
			},
			type: 'append',
		});

		expect(engine.fromSnapshot).toHaveBeenCalledTimes(1);
		expect(engine.fromSnapshot).toHaveBeenCalledWith(nextSnapshot);
		expect(result).toBe(nextSnapshot);
	});

	test('sort() creates worker, sends sort payload and returns worker items', async () => {
		const snapshot = createSnapshot();
		const source = {
			id: faker.string.uuid(),
			kind: faker.word.noun(),
		};
		const sorted = [createComputedUnit(), createComputedUnit()];
		const engine = createEngineMock(snapshot);

		FakeWorker.onPostMessage = (instance) => {
			instance.emitMessage({
				payload: {
					items: sorted,
				},
				type: 'sort',
			});
		};

		const worker = new WebWorker(engine, WORKER_PATH);
		const result = await worker.sort(source);

		expect(FakeWorker.constructionAttempts).toBe(1);
		expect(FakeWorker.instances).toHaveLength(1);

		const [instance] = FakeWorker.instances;

		expect(instance.postMessage).toHaveBeenCalledTimes(1);
		expect(instance.postMessage).toHaveBeenCalledWith({
			payload: {
				snapshot,
				source,
			},
			type: 'sort',
		});

		expect(engine.fromSnapshot).not.toHaveBeenCalled();
		expect(result).toBe(sorted);
	});

	test('append() rejects with WebWorkerError and disposes worker on messageerror', async () => {
		const snapshot = createSnapshot();
		const items = [createSourceUnit()];
		const engine = createEngineMock(snapshot);
		const worker = new WebWorker(engine, WORKER_PATH);

		FakeWorker.onPostMessage = (instance) => {
			instance.emitMessageError();
		};

		await expect(worker.append(items)).rejects.toBeInstanceOf(WebWorkerError);

		expect(FakeWorker.instances).toHaveLength(1);
		expect(FakeWorker.instances[0].terminate).toHaveBeenCalledTimes(1);
	});

	test('sort() rejects with WebWorkerError and disposes worker on error event', async () => {
		const snapshot = createSnapshot();
		const source = { value: faker.string.uuid() };
		const engine = createEngineMock(snapshot);
		const worker = new WebWorker(engine, WORKER_PATH);

		FakeWorker.onPostMessage = (instance) => {
			instance.emitError(new Error('sort failed'));
		};

		await expect(worker.sort(source)).rejects.toBeInstanceOf(WebWorkerError);

		expect(FakeWorker.instances).toHaveLength(1);
		expect(FakeWorker.instances[0].terminate).toHaveBeenCalledTimes(1);
	});

	test('append() rejects with WebWorkerError on unexpected worker response type and disposes worker', async () => {
		const snapshot = createSnapshot();
		const items = [createSourceUnit()];
		const engine = createEngineMock(snapshot);
		const worker = new WebWorker(engine, WORKER_PATH);

		FakeWorker.onPostMessage = (instance) => {
			instance.emitMessage({
				payload: {
					items: [createComputedUnit()],
				},
				type: 'sort',
			});
		};

		await expect(worker.append(items)).rejects.toBeInstanceOf(WebWorkerError);

		expect(FakeWorker.instances).toHaveLength(1);
		expect(FakeWorker.instances[0].terminate).toHaveBeenCalledTimes(1);
	});

	test('append() rejects pending request when terminate() is called', async () => {
		const snapshot = createSnapshot();
		const items = [createSourceUnit()];
		const engine = createEngineMock(snapshot);
		const worker = new WebWorker(engine, WORKER_PATH);

		FakeWorker.onPostMessage = () => {
			// Intentionally keep request pending
		};

		const promise = worker.append(items);

		await Promise.resolve();
		worker.terminate();

		await expect(promise).rejects.toBeInstanceOf(WebWorkerError);

		expect(FakeWorker.instances).toHaveLength(1);
		expect(FakeWorker.instances[0].terminate).toHaveBeenCalledTimes(1);
	});

	test('disable() terminates active worker and forces sync fallback', async () => {
		const snapshot = createSnapshot();
		const items = [createSourceUnit(), createSourceUnit()];
		const engine = createEngineMock(snapshot);
		const worker = new WebWorker(engine, WORKER_PATH);

		worker.enable();

		expect(FakeWorker.constructionAttempts).toBe(1);
		expect(FakeWorker.instances).toHaveLength(1);

		const [instance] = FakeWorker.instances;

		worker.disable();

		expect(instance.terminate).toHaveBeenCalledTimes(1);

		const result = await worker.append(items);

		expect(FakeWorker.constructionAttempts).toBe(1);
		expect(engine.append).toHaveBeenCalledTimes(1);
		expect(engine.append).toHaveBeenCalledWith(items);
		expect(result).toBe(snapshot);
	});

	test('enable() recreates worker after disable()', () => {
		const engine = createEngineMock();
		const worker = new WebWorker(engine, WORKER_PATH);

		worker.enable();
		expect(FakeWorker.constructionAttempts).toBe(1);

		const [first] = FakeWorker.instances;

		worker.disable();
		expect(first.terminate).toHaveBeenCalledTimes(1);

		worker.enable();
		expect(FakeWorker.constructionAttempts).toBe(2);
		expect(FakeWorker.instances).toHaveLength(2);
	});

	test('worker constructor failure disables worker mode until enable() is called again', async () => {
		const snapshot = createSnapshot();
		const sorted = [createComputedUnit()];
		const items = [createSourceUnit()];
		const source = { sourceId: faker.string.uuid() };
		const engine = createEngineMock(snapshot);

		engine.sort.mockReturnValue(sorted);

		FakeWorker.constructShouldThrow = true;

		const worker = new WebWorker(engine, WORKER_PATH);

		const appendResult = await worker.append(items);
		const sortResult = await worker.sort(source);

		expect(FakeWorker.constructionAttempts).toBe(1);
		expect(engine.append).toHaveBeenCalledWith(items);
		expect(engine.sort).toHaveBeenCalledWith(source);
		expect(appendResult).toBe(snapshot);
		expect(sortResult).toBe(sorted);

		FakeWorker.constructShouldThrow = false;

		worker.enable();

		expect(FakeWorker.constructionAttempts).toBe(2);
		expect(FakeWorker.instances).toHaveLength(1);
	});

	test('append() forwards arbitrary readonly arrays to fallback engine', async () => {
		vi.stubGlobal('Worker', undefined);

		await fc.assert(
			fc.asyncProperty(
				fc.array(sourceUnitArbitrary, {
					maxLength: 20,
				}),
				async (items) => {
					const snapshot = createSnapshot();
					const engine = createEngineMock(snapshot);
					const worker = new WebWorker(engine, WORKER_PATH);

					const result = await worker.append(items);

					expect(engine.append).toHaveBeenCalledTimes(1);
					expect(engine.append).toHaveBeenCalledWith(items);
					expect(result).toBe(snapshot);
				},
			),
			{
				numRuns: 50,
				seed: FAKER_SEED,
			},
		);
	});

	test('sort() returns arbitrary engine results in fallback mode', async () => {
		vi.stubGlobal('Worker', undefined);

		await fc.assert(
			fc.asyncProperty(
				fc.anything({
					maxDepth: 3,
					withBigInt: false,
					withDate: false,
					withMap: false,
					withObjectString: false,
					withSet: false,
					withSparseArray: false,
					withTypedArray: false,
				}),
				fc.array(computedUnitArbitrary, {
					maxLength: 20,
				}),
				async (source, sortedItems) => {
					const engine = createEngineMock();
					engine.sort.mockReturnValue(sortedItems);

					const worker = new WebWorker(engine, WORKER_PATH);
					const result = await worker.sort(source);

					expect(engine.sort).toHaveBeenCalledTimes(1);
					expect(engine.sort).toHaveBeenCalledWith(source);
					expect(result).toBe(sortedItems);
				},
			),
			{
				numRuns: 50,
				seed: FAKER_SEED,
			},
		);
	});
});
