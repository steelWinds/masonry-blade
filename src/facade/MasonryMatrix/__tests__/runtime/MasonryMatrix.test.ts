import type {
	MatrixItem,
	MatrixState,
	SourceItem,
	WithMeta,
} from 'src/core/MatrixEngine/contract';
import {
	afterAll,
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	test,
	vi,
} from 'vitest';
import { FAKER_SEED } from 'tests/constants.ts';
import { MASONRY_MATRIX_ERROR_MESSAGES } from 'src/facade/MasonryMatrix/errors';
import { MasonryMatrix } from 'src/facade/MasonryMatrix';
import { faker } from '@faker-js/faker';

const engineMocks = vi.hoisted(() => ({
	appendToMatrixMock: vi.fn(),
	createMatrixStateMock: vi.fn(),
}));

vi.mock(import('src/core/MatrixEngine'), () => ({
	appendToMatrix: engineMocks.appendToMatrixMock,
	createMatrixState: engineMocks.createMatrixStateMock,
}));

const { createMatrixStateMock, appendToMatrixMock } = engineMocks;

type WorkerPayload<T = never> = {
	state: MatrixState<T>;
	batchItems: readonly WithMeta<SourceItem, T>[];
};

class FakeWorker<T = never> {
	public scriptURL: URL;
	public options?: WorkerOptions;
	public onmessage: ((event: MessageEvent<MatrixState<T>>) => void) | null =
		null;
	public onmessageerror: ((event: MessageEvent<unknown>) => void) | null = null;
	public onerror: ((event: ErrorEvent) => void) | null = null;

	public messages: WorkerPayload<T>[] = [];

	public terminate = vi.fn();

	public postMessage = vi.fn((payload: WorkerPayload<T>) => {
		this.messages.push(payload);
	});

	public emitMessage = vi.fn((state: MatrixState<T>) => {
		this.onmessage?.({ data: state } as MessageEvent<MatrixState<T>>);
	});

	public emitMessageError = vi.fn(() => {
		this.onmessageerror?.({} as MessageEvent<unknown>);
	});

	public emitError = vi.fn((message = 'boom') => {
		this.onerror?.({ message } as ErrorEvent);
	});

	constructor(scriptURL: URL, options?: WorkerOptions) {
		this.scriptURL = scriptURL;
		this.options = options;
	}
}

const makeSourceItems = <T = never>(
	count: number,
	metaFactory?: () => T,
): WithMeta<SourceItem, T>[] =>
	Array.from({ length: count }, () => {
		const item = {
			height: faker.number.int({ max: 1600, min: 120 }),
			id: faker.string.uuid(),
			width: faker.number.int({ max: 1600, min: 120 }),
		} as WithMeta<SourceItem, T>;

		if (metaFactory) {
			// @ts-expect-error test helper
			item.meta = metaFactory();
		}

		return item;
	});

const makePlacedItem = <T = never>(
	width: number,
	meta?: T,
): WithMeta<MatrixItem, T> => {
	const item = {
		height: faker.number.int({ max: 1000, min: 100 }),
		id: faker.string.uuid(),
		width,
		x: 0,
		y: 0,
	} as WithMeta<MatrixItem, T>;

	if (meta !== undefined) {
		// @ts-expect-error test helper
		item.meta = meta;
	}

	return item;
};

type MakeStateParams<T = never> = {
	count: number;
	rootWidth: number;
	columns?: WithMeta<MatrixItem, T>[][];
	gap?: number;
};

const makeState = <T = never>({
	count,
	rootWidth,
	columns,
	gap = 0,
}: MakeStateParams<T>): MatrixState<T> =>
	({
		columnCount: count,
		columnWidth: count === 0 ? 0 : (rootWidth - gap * (count - 1)) / count,
		columns:
			columns ??
			Array.from({ length: count }, () => [] as WithMeta<MatrixItem, T>[]),
		columnsHeights: new Float64Array(count),
		gap,
		order: new Uint32Array(count),
	}) as MatrixState<T>;

const installWorkerMock = <T = never>(options?: {
	postMessageImpl?: (this: FakeWorker<T>, payload: WorkerPayload<T>) => void;
}) => {
	const instances: FakeWorker<T>[] = [];

	const WorkerMock = vi.fn(
		class extends FakeWorker<T> {
			constructor(scriptURL: URL, optionsArg?: WorkerOptions) {
				super(scriptURL, optionsArg);

				if (options?.postMessageImpl) {
					this.postMessage.mockImplementation(options.postMessageImpl);
				}

				instances.push(this);
			}
		},
	);

	vi.stubGlobal('Worker', WorkerMock as unknown as typeof Worker);

	return { WorkerMock, instances };
};

const installThrowingWorkerMock = (error?: unknown) => {
	const workerError = error ?? new Error('worker constructor failed');

	const WorkerMock = vi.fn(
		class {
			constructor() {
				throw workerError;
			}
		},
	);

	vi.stubGlobal('Worker', WorkerMock as unknown as typeof Worker);

	return { WorkerMock, workerError };
};

describe('MasonryMatrix', () => {
	const WORKER_FILE_PATH = faker.system.fileName();

	beforeAll(() => {
		vi.stubEnv('MATRIX_ENGINE_WORKER', WORKER_FILE_PATH);
	});

	afterAll(() => {
		vi.unstubAllEnvs();
	});

	beforeEach(() => {
		faker.seed(FAKER_SEED);

		createMatrixStateMock.mockReset();
		appendToMatrixMock.mockReset();

		vi.unstubAllGlobals();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	describe('constructor', () => {
		test('creates initial state with default gap = 0', () => {
			const initialState = makeState({ count: 3, rootWidth: 960 });

			createMatrixStateMock.mockReturnValue(initialState);

			// oxlint-disable-next-line no-new
			new MasonryMatrix(960, 3);

			expect(createMatrixStateMock).toHaveBeenCalledOnce();
			expect(createMatrixStateMock).toHaveBeenCalledWith(960, 3, 0);
		});

		test('passes explicit gap to createMatrixState', () => {
			const initialState = makeState({ count: 3, gap: 16, rootWidth: 960 });

			createMatrixStateMock.mockReturnValue(initialState);

			// oxlint-disable-next-line no-new
			new MasonryMatrix(960, 3, 16);

			expect(createMatrixStateMock).toHaveBeenCalledOnce();
			expect(createMatrixStateMock).toHaveBeenCalledWith(960, 3, 16);
		});
	});

	describe('getState', () => {
		test('returns a snapshot of internal state and worker flags without leaking mutable typed arrays', async () => {
			const initialState = makeState({ count: 2, gap: 16, rootWidth: 420 });

			initialState.columnsHeights.set([120, 340]);
			initialState.order.set([1, 0]);

			createMatrixStateMock.mockReturnValue(initialState);

			const matrix = new MasonryMatrix(420, 2, 16);

			const firstState = matrix.getState();

			expect(firstState).toStrictEqual({
				columnCount: 2,
				columnWidth: initialState.columnWidth,
				columnsHeights: new Float64Array([120, 340]),
				gap: 16,
				order: new Uint32Array([1, 0]),
				workerCreated: false,
				workerDisabled: false,
			});

			expect(firstState.columnsHeights).toBeInstanceOf(Float64Array);
			expect(firstState.order).toBeInstanceOf(Uint32Array);

			expect(firstState.columnsHeights).not.toBe(initialState.columnsHeights);
			expect(firstState.order).not.toBe(initialState.order);

			firstState.columnsHeights[0] = 999;
			firstState.order[0] = 0;

			const secondState = matrix.getState();

			expect(Array.from(secondState.columnsHeights)).toStrictEqual([120, 340]);
			expect(Array.from(secondState.order)).toStrictEqual([1, 0]);

			const { WorkerMock } = installWorkerMock();

			matrix.enableWorker();

			const withWorkerState = matrix.getState();

			expect(WorkerMock).toHaveBeenCalledOnce();
			expect(withWorkerState.workerCreated).toBe(true);
			expect(withWorkerState.workerDisabled).toBe(false);

			matrix.disableWorker();

			const disabledState = matrix.getState();

			expect(disabledState.workerCreated).toBe(false);
			expect(disabledState.workerDisabled).toBe(true);
		});
	});

	describe('appendItems', () => {
		test('falls back to appendToMatrix when Worker is not available', async () => {
			const initialState = makeState({ count: 2, rootWidth: 480 });
			const updatedState = makeState({
				columns: [[makePlacedItem(240)], []],
				count: 2,
				rootWidth: 480,
			});
			const batch = makeSourceItems(3);

			createMatrixStateMock.mockReturnValue(initialState);
			appendToMatrixMock.mockReturnValue(updatedState);

			const matrix = new MasonryMatrix(480, 2);
			const columns = await matrix.appendItems(batch);

			expect(appendToMatrixMock).toHaveBeenCalledOnce();
			expect(appendToMatrixMock).toHaveBeenCalledWith(initialState, batch);
			expect(columns).toBe(updatedState.columns);
		});

		test('disables worker mode after Worker constructor throws and stops retrying creation', async () => {
			const initialState = makeState({ count: 2, rootWidth: 500 });
			const stateAfterFirstAppend = makeState({
				columns: [[makePlacedItem(250)], []],
				count: 2,
				rootWidth: 500,
			});
			const stateAfterSecondAppend = makeState({
				columns: [[makePlacedItem(250)], [makePlacedItem(250)]],
				count: 2,
				rootWidth: 500,
			});

			const firstBatch = makeSourceItems(2);
			const secondBatch = makeSourceItems(2);

			createMatrixStateMock.mockReturnValue(initialState);
			appendToMatrixMock
				.mockReturnValueOnce(stateAfterFirstAppend)
				.mockReturnValueOnce(stateAfterSecondAppend);

			const { WorkerMock } = installThrowingWorkerMock();
			const matrix = new MasonryMatrix(500, 2);

			await expect(matrix.appendItems(firstBatch)).resolves.toBe(
				stateAfterFirstAppend.columns,
			);

			await expect(matrix.appendItems(secondBatch)).resolves.toBe(
				stateAfterSecondAppend.columns,
			);

			expect(WorkerMock).toHaveBeenCalledTimes(1);
			expect(appendToMatrixMock).toHaveBeenCalledTimes(2);
		});

		test('creates a Worker and uses it when Worker is available', async () => {
			const initialState = makeState({ count: 3, rootWidth: 900 });
			const resolvedState = makeState({
				columns: [[makePlacedItem(300)], [makePlacedItem(300)], []],
				count: 3,
				rootWidth: 900,
			});
			const batch = makeSourceItems(4);

			createMatrixStateMock.mockReturnValue(initialState);

			const { WorkerMock, instances } = installWorkerMock();
			const matrix = new MasonryMatrix(900, 3);

			const pending = matrix.appendItems(batch);

			expect(WorkerMock).toHaveBeenCalledOnce();

			const [worker] = instances;
			expect(worker).toBeDefined();
			expect(worker.scriptURL).toBeInstanceOf(URL);
			expect(worker.scriptURL.href).toContain(WORKER_FILE_PATH);
			expect(worker.options).toStrictEqual({ type: 'module' });

			expect(worker.postMessage).toHaveBeenCalledOnce();
			expect(worker.postMessage).toHaveBeenCalledWith({
				batchItems: batch,
				state: initialState,
			});

			expect(appendToMatrixMock).not.toHaveBeenCalled();

			worker.emitMessage(resolvedState);

			await expect(pending).resolves.toBe(resolvedState.columns);
		});

		test('reuses the same Worker for subsequent append operations', async () => {
			const initialState = makeState({ count: 2, rootWidth: 500 });
			const stateAfterFirstAppend = makeState({
				columns: [[makePlacedItem(250)], []],
				count: 2,
				rootWidth: 500,
			});
			const stateAfterSecondAppend = makeState({
				columns: [[makePlacedItem(250)], [makePlacedItem(250)]],
				count: 2,
				rootWidth: 500,
			});

			const firstBatch = makeSourceItems(2);
			const secondBatch = makeSourceItems(2);

			createMatrixStateMock.mockReturnValue(initialState);

			const { WorkerMock, instances } = installWorkerMock();
			const matrix = new MasonryMatrix(500, 2);

			const firstPending = matrix.appendItems(firstBatch);
			const [worker] = instances;

			worker.emitMessage(stateAfterFirstAppend);
			await expect(firstPending).resolves.toBe(stateAfterFirstAppend.columns);

			const secondPending = matrix.appendItems(secondBatch);

			expect(WorkerMock).toHaveBeenCalledTimes(1);
			expect(worker.postMessage).toHaveBeenNthCalledWith(2, {
				batchItems: secondBatch,
				state: stateAfterFirstAppend,
			});

			worker.emitMessage(stateAfterSecondAppend);
			await expect(secondPending).resolves.toBe(stateAfterSecondAppend.columns);
		});

		test('rejects pending work when terminateWorker is called and creates a fresh Worker on the next append', async () => {
			const initialState = makeState({ count: 2, rootWidth: 400 });
			const stateAfterRestart = makeState({
				columns: [[makePlacedItem(200)], []],
				count: 2,
				rootWidth: 400,
			});

			const firstBatch = makeSourceItems(2);
			const secondBatch = makeSourceItems(1);

			createMatrixStateMock.mockReturnValue(initialState);

			const { WorkerMock, instances } = installWorkerMock();
			const matrix = new MasonryMatrix(400, 2);

			const firstPending = matrix.appendItems(firstBatch);
			const [firstWorker] = instances;

			matrix.terminateWorker();

			await expect(firstPending).rejects.toMatchObject({
				cause: {
					cause: {
						message: MASONRY_MATRIX_ERROR_MESSAGES.WORKER_TERMINATED,
					},
					message: MASONRY_MATRIX_ERROR_MESSAGES.UPDATE_INTERNAL_STATE,
				},
				message: MASONRY_MATRIX_ERROR_MESSAGES.APPEND_ITEMS,
			});

			expect(firstWorker.terminate).toHaveBeenCalledOnce();

			const secondPending = matrix.appendItems(secondBatch);

			expect(WorkerMock).toHaveBeenCalledTimes(2);

			const [, secondWorker] = instances;
			expect(secondWorker).not.toBe(firstWorker);

			secondWorker.emitMessage(stateAfterRestart);

			await expect(secondPending).resolves.toBe(stateAfterRestart.columns);
		});

		test('disableWorker forces sync fallback even when Worker is available', async () => {
			const initialState = makeState({ count: 2, rootWidth: 420 });
			const updatedState = makeState({
				columns: [[makePlacedItem(210)], []],
				count: 2,
				rootWidth: 420,
			});
			const batch = makeSourceItems(2);

			createMatrixStateMock.mockReturnValue(initialState);
			appendToMatrixMock.mockReturnValue(updatedState);

			const { WorkerMock } = installWorkerMock();
			const matrix = new MasonryMatrix(420, 2);

			matrix.disableWorker();

			const columns = await matrix.appendItems(batch);

			expect(WorkerMock).not.toHaveBeenCalled();
			expect(appendToMatrixMock).toHaveBeenCalledOnce();
			expect(columns).toBe(updatedState.columns);
		});

		test('enableWorker re-enables worker mode and creates the worker eagerly', async () => {
			const initialState = makeState({ count: 2, rootWidth: 420 });
			const resolvedState = makeState({
				columns: [[makePlacedItem(210)], []],
				count: 2,
				rootWidth: 420,
			});
			const batch = makeSourceItems(2);

			createMatrixStateMock.mockReturnValue(initialState);

			const { WorkerMock, instances } = installWorkerMock();
			const matrix = new MasonryMatrix(420, 2);

			matrix.disableWorker();
			matrix.enableWorker();

			expect(WorkerMock).toHaveBeenCalledOnce();

			const pending = matrix.appendItems(batch);

			expect(instances[0].postMessage).toHaveBeenCalledOnce();
			expect(appendToMatrixMock).not.toHaveBeenCalled();

			instances[0].emitMessage(resolvedState);

			await expect(pending).resolves.toBe(resolvedState.columns);
		});

		test('enableWorker keeps sync fallback when Worker is unavailable', async () => {
			const initialState = makeState({ count: 2, rootWidth: 420 });
			const updatedState = makeState({
				columns: [[makePlacedItem(210)], []],
				count: 2,
				rootWidth: 420,
			});
			const batch = makeSourceItems(2);

			createMatrixStateMock.mockReturnValue(initialState);
			appendToMatrixMock.mockReturnValue(updatedState);

			const matrix = new MasonryMatrix(420, 2);

			expect(() => matrix.enableWorker()).not.toThrow();

			const columns = await matrix.appendItems(batch);

			expect(appendToMatrixMock).toHaveBeenCalledOnce();
			expect(columns).toBe(updatedState.columns);
		});

		test('does not throw when terminateWorker is called without an active worker', () => {
			createMatrixStateMock.mockReturnValue(
				makeState({ count: 2, rootWidth: 400 }),
			);

			const matrix = new MasonryMatrix(400, 2);

			expect(() => matrix.terminateWorker()).not.toThrow();
		});

		test('rejects when Worker emits messageerror', async () => {
			const initialState = makeState({ count: 2, rootWidth: 480 });
			const batch = makeSourceItems(2);

			createMatrixStateMock.mockReturnValue(initialState);

			const { instances } = installWorkerMock();
			const matrix = new MasonryMatrix(480, 2);

			const pending = matrix.appendItems(batch);

			instances[0].emitMessageError();

			await expect(pending).rejects.toMatchObject({
				cause: {
					cause: {
						message: MASONRY_MATRIX_ERROR_MESSAGES.RECEIVE_FROM_WORKER,
					},
					message: MASONRY_MATRIX_ERROR_MESSAGES.UPDATE_INTERNAL_STATE,
				},
				message: MASONRY_MATRIX_ERROR_MESSAGES.APPEND_ITEMS,
			});
		});

		test('propagates Worker runtime errors', async () => {
			const errorMessage = faker.string.uuid();

			const initialState = makeState({ count: 1, rootWidth: 320 });
			const batch = makeSourceItems(2);

			createMatrixStateMock.mockReturnValue(initialState);

			const { instances } = installWorkerMock();
			const matrix = new MasonryMatrix(320, 1);

			const pending = matrix.appendItems(batch);

			instances[0].emitError(errorMessage);

			await expect(pending).rejects.toMatchObject({
				cause: {
					cause: {
						cause: {
							message: errorMessage,
						},
						message: MASONRY_MATRIX_ERROR_MESSAGES.WORKER_ERROR,
					},
					message: MASONRY_MATRIX_ERROR_MESSAGES.UPDATE_INTERNAL_STATE,
				},
				message: MASONRY_MATRIX_ERROR_MESSAGES.APPEND_ITEMS,
			});
		});

		test('rejects when worker.postMessage throws DataCloneError for a non-cloneable payload', async () => {
			const initialState = makeState<{ callback: () => void }>({
				count: 2,
				rootWidth: 480,
			});

			createMatrixStateMock.mockReturnValue(initialState);

			const dataCloneError =
				typeof DOMException !== 'undefined'
					? new DOMException(
							'Failed to execute postMessage on Worker: value could not be cloned.',
							'DataCloneError',
						)
					: Object.assign(new Error('Value could not be cloned.'), {
							name: 'DataCloneError',
						});

			installWorkerMock<{ callback: () => void }>({
				postMessageImpl() {
					throw dataCloneError;
				},
			});

			const matrix = new MasonryMatrix<{ callback: () => void }>(480, 2);

			const batch = makeSourceItems<{ callback: () => void }>(1, () => ({
				callback: () => {},
			}));

			await expect(matrix.appendItems(batch)).rejects.toMatchObject({
				cause: {
					cause: dataCloneError,
					message: MASONRY_MATRIX_ERROR_MESSAGES.UPDATE_INTERNAL_STATE,
				},
				message: MASONRY_MATRIX_ERROR_MESSAGES.APPEND_ITEMS,
			});
		});

		test('rejects a concurrent appendItems call and does not start a second worker job', async () => {
			const initialState = makeState({ count: 2, rootWidth: 500 });
			const resolvedState = makeState({
				columns: [[makePlacedItem(250)], []],
				count: 2,
				rootWidth: 500,
			});

			const firstBatch = makeSourceItems(2);
			const secondBatch = makeSourceItems(3);

			createMatrixStateMock.mockReturnValue(initialState);

			const { WorkerMock, instances } = installWorkerMock();
			const matrix = new MasonryMatrix(500, 2);

			const firstPending = matrix.appendItems(firstBatch);

			expect(WorkerMock).toHaveBeenCalledOnce();

			const [worker] = instances;

			expect(worker.postMessage).toHaveBeenCalledOnce();
			expect(worker.postMessage).toHaveBeenCalledWith({
				batchItems: firstBatch,
				state: initialState,
			});

			const secondPending = matrix.appendItems(secondBatch);

			await expect(secondPending).rejects.toMatchObject({
				message: MASONRY_MATRIX_ERROR_MESSAGES.CONCURRENT_CALL,
			});

			expect(worker.postMessage).toHaveBeenCalledTimes(1);

			worker.emitMessage(resolvedState);

			await expect(firstPending).resolves.toBe(resolvedState.columns);
		});
	});

	describe('recreateMatrix', () => {
		test('replays all accumulated raw items in sync mode', async () => {
			const initialState = makeState({ count: 1, rootWidth: 400 });
			const stateAfterBatchA = makeState({
				columns: [[makePlacedItem(400)]],
				count: 1,
				rootWidth: 400,
			});
			const stateAfterBatchB = makeState({
				columns: [[makePlacedItem(400), makePlacedItem(400)]],
				count: 1,
				rootWidth: 400,
			});

			const recreatedBaseState = makeState({
				count: 2,
				gap: 0,
				rootWidth: 400,
			});
			const recreatedFinalState = makeState({
				columns: [[makePlacedItem(200)], [makePlacedItem(200)]],
				count: 2,
				rootWidth: 400,
			});

			const batchA = makeSourceItems(2);
			const batchB = makeSourceItems(3);

			createMatrixStateMock
				.mockReturnValueOnce(initialState)
				.mockReturnValueOnce(recreatedBaseState);

			appendToMatrixMock
				.mockReturnValueOnce(stateAfterBatchA)
				.mockReturnValueOnce(stateAfterBatchB)
				.mockReturnValueOnce(recreatedFinalState);

			const matrix = new MasonryMatrix(400, 1);

			await matrix.appendItems(batchA);
			await matrix.appendItems(batchB);

			const columns = await matrix.recreateMatrix(400, 2);

			expect(createMatrixStateMock).toHaveBeenNthCalledWith(2, 400, 2, 0);
			expect(appendToMatrixMock).toHaveBeenNthCalledWith(
				3,
				recreatedBaseState,
				[...batchA, ...batchB],
			);
			expect(columns).toBe(recreatedFinalState.columns);
		});

		test('does not accumulate invalid raw items and replays only accepted items', async () => {
			const initialState = makeState({ count: 2, rootWidth: 480 });
			const stateAfterAppend = makeState({
				columns: [[makePlacedItem(240)], [makePlacedItem(240)]],
				count: 2,
				rootWidth: 480,
			});
			const recreatedBaseState = makeState({
				count: 3,
				rootWidth: 900,
			});
			const recreatedFinalState = makeState({
				columns: [[makePlacedItem(300)], [makePlacedItem(300)], []],
				count: 3,
				rootWidth: 900,
			});

			const validA = {
				height: 900,
				id: 'valid-a',
				width: 1600,
			} satisfies WithMeta<SourceItem>;
			const invalidWidth = {
				height: 900,
				id: 'invalid-width',
				width: 0,
			} satisfies WithMeta<SourceItem>;
			const invalidHeight = {
				height: Number.NaN,
				id: 'invalid-height',
				width: 1200,
			} satisfies WithMeta<SourceItem>;
			const validB = {
				height: 1200,
				id: 'valid-b',
				width: 900,
			} satisfies WithMeta<SourceItem>;

			const batch = [validA, invalidWidth, invalidHeight, validB];
			const acceptedItems = [validA, validB];

			createMatrixStateMock
				.mockReturnValueOnce(initialState)
				.mockReturnValueOnce(recreatedBaseState);

			appendToMatrixMock
				.mockReturnValueOnce(stateAfterAppend)
				.mockReturnValueOnce(recreatedFinalState);

			const matrix = new MasonryMatrix(480, 2);

			await matrix.appendItems(batch);
			const columns = await matrix.recreateMatrix(900, 3);

			expect(appendToMatrixMock).toHaveBeenNthCalledWith(
				1,
				initialState,
				acceptedItems,
			);
			expect(appendToMatrixMock).toHaveBeenNthCalledWith(
				2,
				recreatedBaseState,
				acceptedItems,
			);
			expect(columns).toBe(recreatedFinalState.columns);
		});

		test('uses constructor columnCount and gap when recreateMatrix omits them', async () => {
			const initialState = makeState({ count: 2, gap: 12, rootWidth: 400 });
			const stateAfterAppend = makeState({
				columns: [[makePlacedItem(194)], []],
				count: 2,
				gap: 12,
				rootWidth: 400,
			});
			const recreatedBaseState = makeState({
				count: 2,
				gap: 12,
				rootWidth: 900,
			});
			const recreatedFinalState = makeState({
				columns: [[makePlacedItem(444)], [makePlacedItem(444)]],
				count: 2,
				gap: 12,
				rootWidth: 900,
			});

			const batch = makeSourceItems(2);

			createMatrixStateMock
				.mockReturnValueOnce(initialState)
				.mockReturnValueOnce(recreatedBaseState);

			appendToMatrixMock
				.mockReturnValueOnce(stateAfterAppend)
				.mockReturnValueOnce(recreatedFinalState);

			const matrix = new MasonryMatrix(400, 2, 12);

			await matrix.appendItems(batch);
			await matrix.recreateMatrix(900);

			expect(createMatrixStateMock).toHaveBeenNthCalledWith(2, 900, 2, 12);
		});

		test('remembers new columnCount and gap for subsequent recreateMatrix calls', async () => {
			const initialState = makeState({ count: 1, rootWidth: 400 });
			const stateAfterAppend = makeState({
				columns: [[makePlacedItem(400)]],
				count: 1,
				rootWidth: 400,
			});

			const recreatedBaseStateA = makeState({
				count: 3,
				gap: 16,
				rootWidth: 900,
			});
			const recreatedStateA = makeState({
				columns: [[makePlacedItem(289)], [makePlacedItem(289)], []],
				count: 3,
				gap: 16,
				rootWidth: 900,
			});

			const recreatedBaseStateB = makeState({
				count: 3,
				gap: 16,
				rootWidth: 1200,
			});
			const recreatedStateB = makeState({
				columns: [
					[makePlacedItem(389)],
					[makePlacedItem(389)],
					[makePlacedItem(389)],
				],
				count: 3,
				gap: 16,
				rootWidth: 1200,
			});

			const batch = makeSourceItems(2);

			createMatrixStateMock
				.mockReturnValueOnce(initialState)
				.mockReturnValueOnce(recreatedBaseStateA)
				.mockReturnValueOnce(recreatedBaseStateB);

			appendToMatrixMock
				.mockReturnValueOnce(stateAfterAppend)
				.mockReturnValueOnce(recreatedStateA)
				.mockReturnValueOnce(recreatedStateB);

			const matrix = new MasonryMatrix(400, 1);

			await matrix.appendItems(batch);
			await matrix.recreateMatrix(900, 3, 16);
			await matrix.recreateMatrix(1200);

			expect(createMatrixStateMock).toHaveBeenNthCalledWith(3, 1200, 3, 16);
		});

		test('uses Worker in recreateMatrix and replays all accumulated raw items after re-enabling worker mode', async () => {
			const initialState = makeState({ count: 2, rootWidth: 400 });
			const stateAfterFirstAppend = makeState({
				columns: [[makePlacedItem(200)], []],
				count: 2,
				rootWidth: 400,
			});

			const recreatedBaseState = makeState({ count: 3, rootWidth: 900 });
			const recreatedFinalState = makeState({
				columns: [[makePlacedItem(300)], [makePlacedItem(300)], []],
				count: 3,
				rootWidth: 900,
			});

			const batch = makeSourceItems(3);

			createMatrixStateMock
				.mockReturnValueOnce(initialState)
				.mockReturnValueOnce(recreatedBaseState);

			appendToMatrixMock.mockReturnValueOnce(stateAfterFirstAppend);

			const matrix = new MasonryMatrix(400, 2);

			await matrix.appendItems(batch);

			const { WorkerMock, instances } = installWorkerMock();

			matrix.enableWorker();

			const pending = matrix.recreateMatrix(900, 3);

			expect(WorkerMock).toHaveBeenCalledOnce();

			const [worker] = instances;

			expect(worker.postMessage).toHaveBeenCalledOnce();
			expect(worker.postMessage).toHaveBeenCalledWith({
				batchItems: batch,
				state: recreatedBaseState,
			});

			worker.emitMessage(recreatedFinalState);

			await expect(pending).resolves.toBe(recreatedFinalState.columns);
		});

		test('reuses existing Worker in recreateMatrix', async () => {
			const initialState = makeState({ count: 2, rootWidth: 400 });
			const stateAfterAppend = makeState({
				columns: [[makePlacedItem(200)], []],
				count: 2,
				rootWidth: 400,
			});

			const recreatedMiddleBaseState = makeState({ count: 2, rootWidth: 600 });
			const recreatedMiddleResolvedState = makeState({
				columns: [[makePlacedItem(300)], [makePlacedItem(300)]],
				count: 2,
				rootWidth: 600,
			});

			const recreatedFinalBaseState = makeState({ count: 2, rootWidth: 1200 });
			const recreatedFinalResolvedState = makeState({
				columns: [[makePlacedItem(600)], [makePlacedItem(600)]],
				count: 2,
				rootWidth: 1200,
			});

			const batch = makeSourceItems(2);

			createMatrixStateMock
				.mockReturnValueOnce(initialState)
				.mockReturnValueOnce(recreatedMiddleBaseState)
				.mockReturnValueOnce(recreatedFinalBaseState);

			const { WorkerMock, instances } = installWorkerMock();
			const matrix = new MasonryMatrix(400, 2);

			const appendPending = matrix.appendItems(batch);
			const [worker] = instances;

			worker.emitMessage(stateAfterAppend);
			await expect(appendPending).resolves.toBe(stateAfterAppend.columns);

			const recreateMiddlePending = matrix.recreateMatrix(600, 2);

			expect(WorkerMock).toHaveBeenCalledTimes(1);
			expect(createMatrixStateMock).toHaveBeenNthCalledWith(2, 600, 2, 0);
			expect(worker.postMessage).toHaveBeenNthCalledWith(2, {
				batchItems: batch,
				state: recreatedMiddleBaseState,
			});

			worker.emitMessage(recreatedMiddleResolvedState);
			await expect(recreateMiddlePending).resolves.toBe(
				recreatedMiddleResolvedState.columns,
			);

			const recreateFinalPending = matrix.recreateMatrix(1200, 2);

			expect(WorkerMock).toHaveBeenCalledTimes(1);
			expect(createMatrixStateMock).toHaveBeenNthCalledWith(3, 1200, 2, 0);
			expect(worker.postMessage).toHaveBeenNthCalledWith(3, {
				batchItems: batch,
				state: recreatedFinalBaseState,
			});

			worker.emitMessage(recreatedFinalResolvedState);
			await expect(recreateFinalPending).resolves.toBe(
				recreatedFinalResolvedState.columns,
			);
		});

		test('rejects a concurrent recreateMatrix call and does not start a new job', async () => {
			const initialState = makeState({ count: 2, rootWidth: 600 });
			const resolvedState = makeState({
				columns: [[makePlacedItem(300)], []],
				count: 2,
				rootWidth: 600,
			});

			const batch = makeSourceItems(2);

			createMatrixStateMock.mockReturnValue(initialState);

			const { WorkerMock, instances } = installWorkerMock();
			const matrix = new MasonryMatrix(600, 2);

			const appendPending = matrix.appendItems(batch);

			expect(WorkerMock).toHaveBeenCalledOnce();

			const [worker] = instances;

			expect(worker.postMessage).toHaveBeenCalledOnce();
			expect(worker.postMessage).toHaveBeenCalledWith({
				batchItems: batch,
				state: initialState,
			});

			const recreatePending = matrix.recreateMatrix(900, 3);

			await expect(recreatePending).rejects.toMatchObject({
				message: MASONRY_MATRIX_ERROR_MESSAGES.CONCURRENT_CALL,
			});

			expect(createMatrixStateMock).toHaveBeenCalledTimes(1);
			expect(worker.postMessage).toHaveBeenCalledTimes(1);

			worker.emitMessage(resolvedState);

			await expect(appendPending).resolves.toBe(resolvedState.columns);
		});

		test('wraps recreateMatrix update errors with RECREATE_MATRIX', async () => {
			const initialState = makeState({ count: 2, rootWidth: 400 });
			const stateAfterAppend = makeState({
				columns: [[makePlacedItem(200)], []],
				count: 2,
				rootWidth: 400,
			});
			const recreatedBaseState = makeState({ count: 3, rootWidth: 900 });
			const batch = makeSourceItems(2);

			createMatrixStateMock
				.mockReturnValueOnce(initialState)
				.mockReturnValueOnce(recreatedBaseState);

			appendToMatrixMock.mockReturnValueOnce(stateAfterAppend);

			const matrix = new MasonryMatrix(400, 2);

			await matrix.appendItems(batch);

			const { instances } = installWorkerMock();

			matrix.enableWorker();

			const pending = matrix.recreateMatrix(900, 3);

			instances[0].emitMessageError();

			await expect(pending).rejects.toMatchObject({
				cause: {
					cause: {
						message: MASONRY_MATRIX_ERROR_MESSAGES.RECEIVE_FROM_WORKER,
					},
					message: MASONRY_MATRIX_ERROR_MESSAGES.UPDATE_INTERNAL_STATE,
				},
				message: MASONRY_MATRIX_ERROR_MESSAGES.RECREATE_MATRIX,
			});
		});
	});
});
