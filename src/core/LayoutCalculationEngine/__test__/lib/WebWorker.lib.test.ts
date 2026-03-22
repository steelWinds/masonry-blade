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
	revision: number;
	internalState: TestState;
}>;

type TestEngine = {
	append: (items: readonly TestSourceUnit[]) => TestState;
	sort: (source: TestState) => readonly TestComputedUnit[];
	snapshot: () => Readonly<TestSnapshot>;
};

type WorkerGlobalLike = {
	onmessage: ((event: MessageEvent<unknown>) => void) | null;
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
	internalState: createState(),
	revision: faker.number.int({ max: 1000, min: 1 }),
});

describe('bindLayoutWorker', () => {
	let workerGlobal: WorkerGlobalLike;

	beforeEach(() => {
		faker.seed(FAKER_SEED);

		workerGlobal = {
			onmessage: null,
			postMessage: vi.fn(),
		};

		vi.stubGlobal('self', workerGlobal);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	test('binds message handler to self.onmessage', () => {
		const restore = vi.fn(
			(): TestEngine => ({
				append: vi.fn(),
				snapshot: vi.fn(),
				sort: vi.fn(),
			}),
		) as any;

		bindLayoutWorker({ restore });

		expect(workerGlobal.onmessage).toBeTypeOf('function');
	});

	test('restores engine, appends items and posts append success response', () => {
		const requestId = faker.number.int({ max: 10_000, min: 1 });
		const snapshotBefore = createSnapshot();
		const snapshotAfter = createSnapshot();
		const items = createSourceItems();
		const appendResult = createState();

		const append = vi.fn(() => appendResult);
		const sort = vi.fn(() => createComputedItems());
		const snapshot = vi.fn(() => snapshotAfter);

		const engine: TestEngine = {
			append,
			snapshot,
			sort,
		};

		const restore = vi.fn(() => engine) as any;

		bindLayoutWorker({ restore });

		workerGlobal.onmessage?.({
			data: {
				id: requestId,
				payload: {
					items,
					snapshot: snapshotBefore,
				},
				type: 'append',
			},
		} as MessageEvent);

		expect(restore).toHaveBeenCalledTimes(1);
		expect(restore).toHaveBeenCalledWith(snapshotBefore);

		expect(append).toHaveBeenCalledTimes(1);
		expect(append).toHaveBeenCalledWith(items);

		expect(snapshot).toHaveBeenCalledTimes(1);

		expect(workerGlobal.postMessage).toHaveBeenCalledTimes(1);
		expect(workerGlobal.postMessage).toHaveBeenCalledWith({
			id: requestId,
			ok: true,
			payload: {
				result: appendResult,
				snapshot: snapshotAfter,
			},
			type: 'append',
		});
	});

	test('sorts with explicit source and posts sort success response', () => {
		const requestId = faker.number.int({ max: 10_000, min: 1 });
		const snapshotBefore = createSnapshot();
		const explicitSource = createState();
		const sortedItems = createComputedItems();

		const append = vi.fn(() => createState());
		const sort = vi.fn(() => sortedItems);
		const snapshot = vi.fn(() => createSnapshot());

		const engine: TestEngine = {
			append,
			snapshot,
			sort,
		};

		const restore = vi.fn(() => engine) as any;

		bindLayoutWorker({ restore });

		workerGlobal.onmessage?.({
			data: {
				id: requestId,
				payload: {
					snapshot: snapshotBefore,
					source: explicitSource,
				},
				type: 'sort',
			},
		} as MessageEvent);

		expect(restore).toHaveBeenCalledTimes(1);
		expect(restore).toHaveBeenCalledWith(snapshotBefore);

		expect(sort).toHaveBeenCalledTimes(1);
		expect(sort).toHaveBeenCalledWith(explicitSource);

		expect(workerGlobal.postMessage).toHaveBeenCalledTimes(1);
		expect(workerGlobal.postMessage).toHaveBeenCalledWith({
			id: requestId,
			ok: true,
			payload: {
				items: sortedItems,
			},
			type: 'sort',
		});
	});

	test('uses snapshot.internalState when sort source is not provided', () => {
		const requestId = faker.number.int({ max: 10_000, min: 1 });
		const snapshotBefore = createSnapshot();
		const sortedItems = createComputedItems();

		const append = vi.fn(() => createState());
		const sort = vi.fn(() => sortedItems);
		const snapshot = vi.fn(() => createSnapshot());

		const engine: TestEngine = {
			append,
			snapshot,
			sort,
		};

		const restore = vi.fn(() => engine) as any;

		bindLayoutWorker({ restore });

		workerGlobal.onmessage?.({
			data: {
				id: requestId,
				payload: {
					snapshot: snapshotBefore,
				},
				type: 'sort',
			},
		} as MessageEvent);

		expect(sort).toHaveBeenCalledTimes(1);
		expect(sort).toHaveBeenCalledWith(snapshotBefore.internalState);

		expect(workerGlobal.postMessage).toHaveBeenCalledWith({
			id: requestId,
			ok: true,
			payload: {
				items: sortedItems,
			},
			type: 'sort',
		});
	});

	test('posts serialized error response when append throws an Error instance', () => {
		const requestId = faker.number.int({ max: 10_000, min: 1 });
		const snapshotBefore = createSnapshot();
		const items = createSourceItems();

		const thrownError = new TypeError(faker.lorem.sentence());
		thrownError.stack = faker.lorem.paragraph();

		const append = vi.fn(() => {
			throw thrownError;
		});

		const engine: TestEngine = {
			append,
			snapshot: vi.fn(() => createSnapshot()),
			sort: vi.fn(() => createComputedItems()),
		};

		const restore = vi.fn(() => engine) as any;

		bindLayoutWorker({ restore });

		workerGlobal.onmessage?.({
			data: {
				id: requestId,
				payload: {
					items,
					snapshot: snapshotBefore,
				},
				type: 'append',
			},
		} as MessageEvent);

		expect(workerGlobal.postMessage).toHaveBeenCalledTimes(1);
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

	test('posts UnknownError payload when sort throws a non-Error value', () => {
		const requestId = faker.number.int({ max: 10_000, min: 1 });
		const snapshotBefore = createSnapshot();
		const thrownValue = faker.number.int({ max: 99_999, min: 10_000 });

		const sort = vi.fn(() => {
			throw thrownValue;
		});

		const engine: TestEngine = {
			append: vi.fn(() => createState()),
			snapshot: vi.fn(() => createSnapshot()),
			sort,
		};

		const restore = vi.fn(() => engine) as any;

		bindLayoutWorker({ restore });

		workerGlobal.onmessage?.({
			data: {
				id: requestId,
				payload: {
					snapshot: snapshotBefore,
				},
				type: 'sort',
			},
		} as MessageEvent);

		expect(workerGlobal.postMessage).toHaveBeenCalledTimes(1);
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
