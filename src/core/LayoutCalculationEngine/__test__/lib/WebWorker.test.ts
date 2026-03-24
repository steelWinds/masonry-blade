import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { FAKER_SEED } from 'tests/constants';
import { bindLayoutWorker } from 'src/core/LayoutCalculationEngine';
import { faker } from '@faker-js/faker';

type TestSourceUnit = Readonly<{
	id: string | number;
	width: number;
	height: number;
}>;

type TestComputedUnit = Readonly<
	TestSourceUnit & {
		x: number;
		y: number;
	}
>;

type TestState = Readonly<{
	checksum: string;
	size: number;
}>;

type TestSnapshot = Readonly<{
	columnCount: number;
	gap: number;
	internalState: TestState;
	rootWidth: number;
}>;

type TestEngine = {
	append: (items: readonly TestSourceUnit[]) => TestState | Promise<TestState>;
	sort: (
		source: TestState,
	) => readonly TestComputedUnit[] | Promise<readonly TestComputedUnit[]>;
	snapshot: () => Readonly<TestSnapshot>;
	fromSnapshot: (snapshot: TestSnapshot) => void;
};

type WorkerGlobalLike = {
	onmessage?: (event: MessageEvent<unknown>) => Promise<void>;
	postMessage: ReturnType<typeof vi.fn>;
};

const createSourceItems = (
	count = faker.number.int({ max: 5, min: 1 }),
): readonly TestSourceUnit[] =>
	Object.freeze(
		Array.from({ length: count }, () => ({
			height: faker.number.int({ max: 512, min: 64 }),
			id: faker.string.uuid(),
			width: faker.number.int({ max: 512, min: 64 }),
		})),
	);

const createComputedItems = (
	count = faker.number.int({ max: 5, min: 1 }),
): readonly TestComputedUnit[] =>
	Object.freeze(
		Array.from({ length: count }, () => ({
			height: faker.number.int({ max: 512, min: 64 }),
			id: faker.string.uuid(),
			width: faker.number.int({ max: 512, min: 64 }),
			x: faker.number.int({ max: 1024, min: 0 }),
			y: faker.number.int({ max: 1024, min: 0 }),
		})),
	);

const createState = (): TestState => ({
	checksum: faker.string.alphanumeric(16),
	size: faker.number.int({ max: 1000, min: 1 }),
});

const createSnapshot = (): TestSnapshot => ({
	columnCount: faker.number.int({ max: 6, min: 1 }),
	gap: faker.number.int({ max: 32, min: 0 }),
	internalState: createState(),
	rootWidth: faker.number.int({ max: 2000, min: 100 }),
});

describe('bindLayoutWorker', () => {
	let workerGlobal: WorkerGlobalLike;

	beforeEach(() => {
		faker.seed(FAKER_SEED);

		workerGlobal = {
			onmessage: undefined,
			postMessage: vi.fn(),
		};

		vi.stubGlobal('self', workerGlobal);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	test('binds async message handler to self.onmessage', () => {
		const restore = vi.fn(
			(): TestEngine => ({
				append: vi.fn(),
				fromSnapshot: vi.fn(),
				snapshot: vi.fn(),
				sort: vi.fn(),
			}),
		);

		bindLayoutWorker({ restore });

		expect(workerGlobal.onmessage).toBeTypeOf('function');
	});

	test('restores engine, appends items and posts append success response', async () => {
		const requestId = faker.number.int({ max: 10_000, min: 1 });
		const snapshotBefore = createSnapshot();
		const snapshotAfter = createSnapshot();
		const items = createSourceItems();

		const engine: TestEngine = {
			append: vi.fn(() => snapshotAfter.internalState),
			fromSnapshot: vi.fn(),
			snapshot: vi.fn(() => snapshotAfter),
			sort: vi.fn(() => createComputedItems()),
		};

		const restore = vi.fn(() => engine) as unknown as (
			snapshot: Readonly<TestSnapshot>,
		) => TestEngine;

		bindLayoutWorker({ restore });

		await workerGlobal.onmessage?.({
			data: {
				id: requestId,
				payload: {
					items,
					snapshot: snapshotBefore,
				},
				type: 'append',
			},
		} as MessageEvent);

		expect(restore).toHaveBeenCalledOnce();
		expect(restore).toHaveBeenCalledWith(snapshotBefore);
		expect(engine.append).toHaveBeenCalledOnce();
		expect(engine.append).toHaveBeenCalledWith(items);
		expect(engine.snapshot).toHaveBeenCalledOnce();
		expect(workerGlobal.postMessage).toHaveBeenCalledWith({
			id: requestId,
			ok: true,
			payload: {
				snapshot: snapshotAfter,
			},
			type: 'append',
		});
	});

	test('sorts with explicit source and posts sort success response', async () => {
		const requestId = faker.number.int({ max: 10_000, min: 1 });
		const snapshotBefore = createSnapshot();
		const explicitSource = createState();
		const sortedItems = createComputedItems();

		const engine: TestEngine = {
			append: vi.fn(() => createState()),
			fromSnapshot: vi.fn(),
			snapshot: vi.fn(() => createSnapshot()),
			sort: vi.fn(() => sortedItems),
		};

		const restore = vi.fn(() => engine) as unknown as (
			snapshot: Readonly<TestSnapshot>,
		) => TestEngine;

		bindLayoutWorker({ restore });

		await workerGlobal.onmessage?.({
			data: {
				id: requestId,
				payload: {
					snapshot: snapshotBefore,
					source: explicitSource,
				},
				type: 'sort',
			},
		} as MessageEvent);

		expect(restore).toHaveBeenCalledWith(snapshotBefore);
		expect(engine.sort).toHaveBeenCalledWith(explicitSource);
		expect(workerGlobal.postMessage).toHaveBeenCalledWith({
			id: requestId,
			ok: true,
			payload: {
				items: sortedItems,
			},
			type: 'sort',
		});
	});

	test('uses snapshot.internalState when sort source is omitted', async () => {
		const requestId = faker.number.int({ max: 10_000, min: 1 });
		const snapshotBefore = createSnapshot();
		const sortedItems = createComputedItems();

		const engine: TestEngine = {
			append: vi.fn(() => createState()),
			fromSnapshot: vi.fn(),
			snapshot: vi.fn(() => createSnapshot()),
			sort: vi.fn(() => sortedItems),
		};

		const restore = vi.fn(() => engine) as unknown as (
			snapshot: Readonly<TestSnapshot>,
		) => TestEngine;

		bindLayoutWorker({ restore });

		await workerGlobal.onmessage?.({
			data: {
				id: requestId,
				payload: {
					snapshot: snapshotBefore,
				},
				type: 'sort',
			},
		} as MessageEvent);

		expect(engine.sort).toHaveBeenCalledWith(snapshotBefore.internalState);
		expect(workerGlobal.postMessage).toHaveBeenCalledWith({
			id: requestId,
			ok: true,
			payload: {
				items: sortedItems,
			},
			type: 'sort',
		});
	});

	test('awaits async sort results before posting success response', async () => {
		const requestId = faker.number.int({ max: 10_000, min: 1 });
		const snapshotBefore = createSnapshot();
		const sortedItems = createComputedItems();

		let resolveSort: ((items: readonly TestComputedUnit[]) => void) | undefined;

		const engine: TestEngine = {
			append: vi.fn(() => createState()),
			fromSnapshot: vi.fn(),
			snapshot: vi.fn(() => createSnapshot()),
			sort: vi.fn(
				() =>
					new Promise<readonly TestComputedUnit[]>((resolve) => {
						resolveSort = resolve;
					}),
			),
		};

		const restore = vi.fn(() => engine) as unknown as (
			snapshot: Readonly<TestSnapshot>,
		) => TestEngine;

		bindLayoutWorker({ restore });

		const pending = workerGlobal.onmessage?.({
			data: {
				id: requestId,
				payload: {
					snapshot: snapshotBefore,
				},
				type: 'sort',
			},
		} as MessageEvent);

		expect(workerGlobal.postMessage).not.toHaveBeenCalled();

		resolveSort?.(sortedItems);
		await pending;

		expect(workerGlobal.postMessage).toHaveBeenCalledWith({
			id: requestId,
			ok: true,
			payload: {
				items: sortedItems,
			},
			type: 'sort',
		});
	});

	test('serializes Error instances for append failures', async () => {
		const requestId = faker.number.int({ max: 10_000, min: 1 });
		const snapshotBefore = createSnapshot();
		const items = createSourceItems();
		const thrownError = new TypeError(faker.lorem.sentence());

		thrownError.stack = faker.lorem.paragraph();

		const engine: TestEngine = {
			append: vi.fn(() => {
				throw thrownError;
			}),
			fromSnapshot: vi.fn(),
			snapshot: vi.fn(() => createSnapshot()),
			sort: vi.fn(() => createComputedItems()),
		};

		const restore = vi.fn(() => engine) as unknown as (
			snapshot: Readonly<TestSnapshot>,
		) => TestEngine;

		bindLayoutWorker({ restore });

		await workerGlobal.onmessage?.({
			data: {
				id: requestId,
				payload: {
					items,
					snapshot: snapshotBefore,
				},
				type: 'append',
			},
		} as MessageEvent);

		expect(workerGlobal.postMessage).toHaveBeenCalledWith({
			error: {
				message: thrownError.message,
				name: thrownError.name,
				stack: thrownError.stack,
			},
			id: requestId,
			ok: false,
			type: 'append',
		});
	});

	test('serializes rejected async sort values as UnknownError payload', async () => {
		const requestId = faker.number.int({ max: 10_000, min: 1 });
		const snapshotBefore = createSnapshot();
		const thrownValue = faker.number.int({ max: 99_999, min: 10_000 });

		const engine: TestEngine = {
			append: vi.fn(() => createState()),
			fromSnapshot: vi.fn(),
			snapshot: vi.fn(() => createSnapshot()),
			sort: vi.fn(async () => {
				throw thrownValue;
			}),
		};

		const restore = vi.fn(() => engine) as unknown as (
			snapshot: Readonly<TestSnapshot>,
		) => TestEngine;

		bindLayoutWorker({ restore });

		await workerGlobal.onmessage?.({
			data: {
				id: requestId,
				payload: {
					snapshot: snapshotBefore,
				},
				type: 'sort',
			},
		} as MessageEvent);

		expect(workerGlobal.postMessage).toHaveBeenCalledWith({
			error: {
				message: String(thrownValue),
				name: 'UnknownError',
			},
			id: requestId,
			ok: false,
			type: 'sort',
		});
	});
});
