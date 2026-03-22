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
import { FAKER_SEED } from 'tests/constants';
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
		test('returns a snapshot of internal state and worker flags without leaking mutable typed arrays', () => {
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

	describe('append', () => {
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
			const columns = await matrix.append(batch);

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

			await expect(matrix.append(firstBatch)).resolves.toBe(
				stateAfterFirstAppend.columns,
			);

			await expect(matrix.append(secondBatch)).resolves.toBe(
				stateAfterSecondAppend.columns,
			);

			expect(WorkerMock).toHaveBeenCalledTimes(1);
			expect(appendToMatrixMock).toHaveBeenCalledTimes(2);
			expect(matrix.getState().workerDisabled).toBe(true);
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

			const pending = matrix.append(batch);

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

			const firstPending = matrix.append(firstBatch);
			const [worker] = instances;

			worker.emitMessage(stateAfterFirstAppend);
			await expect(firstPending).resolves.toBe(stateAfterFirstAppend.columns);

			const secondPending = matrix.append(secondBatch);

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

			const firstPending = matrix.append(firstBatch);
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

			const secondPending = matrix.append(secondBatch);

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

			const columns = await matrix.append(batch);

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

			const pending = matrix.append(batch);

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

			const columns = await matrix.append(batch);

			expect(appendToMatrixMock).toHaveBeenCalledOnce();
			expect(columns).toBe(updatedState.columns);
			expect(matrix.getState().workerDisabled).toBe(true);
		});

		test('does not throw when terminateWorker is called without an active worker', () => {
			createMatrixStateMock.mockReturnValue(
				makeState({ count: 2, rootWidth: 400 }),
			);

			const matrix = new MasonryMatrix(400, 2);

			expect(() => matrix.terminateWorker()).not.toThrow();
		});

		test('rejects when Worker emits messageerror, disposes the worker, and creates a fresh Worker on the next append', async () => {
			const initialState = makeState({ count: 2, rootWidth: 480 });
			const recoveredState = makeState({
				columns: [[makePlacedItem(240)], []],
				count: 2,
				rootWidth: 480,
			});

			const firstBatch = makeSourceItems(2);
			const secondBatch = makeSourceItems(1);

			createMatrixStateMock.mockReturnValue(initialState);

			const { WorkerMock, instances } = installWorkerMock();
			const matrix = new MasonryMatrix(480, 2);

			const firstPending = matrix.append(firstBatch);
			const [firstWorker] = instances;

			firstWorker.emitMessageError();

			await expect(firstPending).rejects.toMatchObject({
				cause: {
					cause: {
						message: MASONRY_MATRIX_ERROR_MESSAGES.RECEIVE_FROM_WORKER,
					},
					message: MASONRY_MATRIX_ERROR_MESSAGES.UPDATE_INTERNAL_STATE,
				},
				message: MASONRY_MATRIX_ERROR_MESSAGES.APPEND_ITEMS,
			});

			expect(firstWorker.terminate).toHaveBeenCalledOnce();

			const secondPending = matrix.append(secondBatch);

			expect(WorkerMock).toHaveBeenCalledTimes(2);

			const [, secondWorker] = instances;
			expect(secondWorker).not.toBe(firstWorker);

			secondWorker.emitMessage(recoveredState);

			await expect(secondPending).resolves.toBe(recoveredState.columns);
		});

		test('propagates Worker runtime errors, disposes the worker, and creates a fresh Worker on the next append', async () => {
			const errorMessage = faker.string.uuid();

			const initialState = makeState({ count: 1, rootWidth: 320 });
			const recoveredState = makeState({
				columns: [[makePlacedItem(320)]],
				count: 1,
				rootWidth: 320,
			});

			const firstBatch = makeSourceItems(2);
			const secondBatch = makeSourceItems(1);

			createMatrixStateMock.mockReturnValue(initialState);

			const { WorkerMock, instances } = installWorkerMock();
			const matrix = new MasonryMatrix(320, 1);

			const firstPending = matrix.append(firstBatch);
			const [firstWorker] = instances;

			firstWorker.emitError(errorMessage);

			await expect(firstPending).rejects.toMatchObject({
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

			expect(firstWorker.terminate).toHaveBeenCalledOnce();

			const secondPending = matrix.append(secondBatch);

			expect(WorkerMock).toHaveBeenCalledTimes(2);

			const [, secondWorker] = instances;
			expect(secondWorker).not.toBe(firstWorker);

			secondWorker.emitMessage(recoveredState);

			await expect(secondPending).resolves.toBe(recoveredState.columns);
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

			const { instances } = installWorkerMock<{ callback: () => void }>({
				postMessageImpl() {
					throw dataCloneError;
				},
			});

			const matrix = new MasonryMatrix<{ callback: () => void }>(480, 2);

			const nonCloneableBatch = makeSourceItems<{ callback: () => void }>(
				1,
				() => ({
					callback: () => {},
				}),
			);

			await expect(matrix.append(nonCloneableBatch)).rejects.toMatchObject({
				cause: {
					cause: dataCloneError,
					message: MASONRY_MATRIX_ERROR_MESSAGES.UPDATE_INTERNAL_STATE,
				},
				message: MASONRY_MATRIX_ERROR_MESSAGES.APPEND_ITEMS,
			});

			expect(instances[0].terminate).toHaveBeenCalledOnce();
		});

		test('rejects a concurrent append call and does not start a second worker job', async () => {
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

			const firstPending = matrix.append(firstBatch);

			expect(WorkerMock).toHaveBeenCalledOnce();

			const [worker] = instances;

			expect(worker.postMessage).toHaveBeenCalledOnce();
			expect(worker.postMessage).toHaveBeenCalledWith({
				batchItems: firstBatch,
				state: initialState,
			});

			const secondPending = matrix.append(secondBatch);

			await expect(secondPending).rejects.toMatchObject({
				message: MASONRY_MATRIX_ERROR_MESSAGES.CONCURRENT_CALL,
			});

			expect(worker.postMessage).toHaveBeenCalledTimes(1);

			worker.emitMessage(resolvedState);

			await expect(firstPending).resolves.toBe(resolvedState.columns);
		});
	});

	describe('recreate', () => {
		test('rebuilds the matrix from explicitly provided items in sync mode', async () => {
			const initialState = makeState({ count: 1, rootWidth: 400 });
			const recreatedBaseState = makeState({
				count: 2,
				gap: 0,
				rootWidth: 900,
			});
			const recreatedFinalState = makeState({
				columns: [[makePlacedItem(450)], [makePlacedItem(450)]],
				count: 2,
				rootWidth: 900,
			});

			const recreateItems = makeSourceItems(4);

			createMatrixStateMock
				.mockReturnValueOnce(initialState)
				.mockReturnValueOnce(recreatedBaseState);

			appendToMatrixMock.mockReturnValueOnce(recreatedFinalState);

			const matrix = new MasonryMatrix(400, 1);

			const columns = await matrix.recreate({
				columnCount: 2,
				items: recreateItems,
				rootWidth: 900,
			});

			expect(createMatrixStateMock).toHaveBeenNthCalledWith(2, 900, 2, 0);
			expect(appendToMatrixMock).toHaveBeenCalledOnce();
			expect(appendToMatrixMock).toHaveBeenCalledWith(
				recreatedBaseState,
				recreateItems,
			);
			expect(columns).toBe(recreatedFinalState.columns);
		});

		test('uses only items passed to recreate and does not replay previously appended batches', async () => {
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

			const appendedBatch = makeSourceItems(2);
			const recreateItems = makeSourceItems(3);

			createMatrixStateMock
				.mockReturnValueOnce(initialState)
				.mockReturnValueOnce(recreatedBaseState);

			appendToMatrixMock
				.mockReturnValueOnce(stateAfterAppend)
				.mockReturnValueOnce(recreatedFinalState);

			const matrix = new MasonryMatrix(480, 2);

			await matrix.append(appendedBatch);

			const columns = await matrix.recreate({
				columnCount: 3,
				items: recreateItems,
				rootWidth: 900,
			});

			expect(appendToMatrixMock).toHaveBeenNthCalledWith(
				1,
				initialState,
				appendedBatch,
			);
			expect(appendToMatrixMock).toHaveBeenNthCalledWith(
				2,
				recreatedBaseState,
				recreateItems,
			);
			expect(columns).toBe(recreatedFinalState.columns);
		});

		test('uses current columnCount and gap when recreate omits them', async () => {
			const initialState = makeState({ count: 2, gap: 12, rootWidth: 400 });
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

			const recreateItems = makeSourceItems(2);

			createMatrixStateMock
				.mockReturnValueOnce(initialState)
				.mockReturnValueOnce(recreatedBaseState);

			appendToMatrixMock.mockReturnValueOnce(recreatedFinalState);

			const matrix = new MasonryMatrix(400, 2, 12);

			await matrix.recreate({
				items: recreateItems,
				rootWidth: 900,
			});

			expect(createMatrixStateMock).toHaveBeenNthCalledWith(2, 900, 2, 12);
		});

		test('remembers new columnCount and gap for subsequent recreate calls', async () => {
			const initialState = makeState({ count: 1, rootWidth: 400 });

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

			const itemsA = makeSourceItems(2);
			const itemsB = makeSourceItems(3);

			createMatrixStateMock
				.mockReturnValueOnce(initialState)
				.mockReturnValueOnce(recreatedBaseStateA)
				.mockReturnValueOnce(recreatedBaseStateB);

			appendToMatrixMock
				.mockReturnValueOnce(recreatedStateA)
				.mockReturnValueOnce(recreatedStateB);

			const matrix = new MasonryMatrix(400, 1);

			await matrix.recreate({
				columnCount: 3,
				gap: 16,
				items: itemsA,
				rootWidth: 900,
			});

			await matrix.recreate({
				items: itemsB,
				rootWidth: 1200,
			});

			expect(createMatrixStateMock).toHaveBeenNthCalledWith(3, 1200, 3, 16);
		});

		test('updates internal state after a successful recreate so subsequent append uses the recreated state', async () => {
			const initialState = makeState({ count: 2, rootWidth: 400 });
			const recreatedBaseState = makeState({
				count: 3,
				gap: 8,
				rootWidth: 900,
			});
			const recreatedResolvedState = makeState({
				columns: [[makePlacedItem(294)], [makePlacedItem(294)], []],
				count: 3,
				gap: 8,
				rootWidth: 900,
			});
			const appendResolvedState = makeState({
				columns: [
					[makePlacedItem(294), makePlacedItem(294)],
					[makePlacedItem(294)],
					[],
				],
				count: 3,
				gap: 8,
				rootWidth: 900,
			});

			const recreateItems = makeSourceItems(2);
			const appendItemsBatch = makeSourceItems(1);

			createMatrixStateMock
				.mockReturnValueOnce(initialState)
				.mockReturnValueOnce(recreatedBaseState);

			appendToMatrixMock
				.mockReturnValueOnce(recreatedResolvedState)
				.mockReturnValueOnce(appendResolvedState);

			const matrix = new MasonryMatrix(400, 2);

			await matrix.recreate({
				columnCount: 3,
				gap: 8,
				items: recreateItems,
				rootWidth: 900,
			});

			const columns = await matrix.append(appendItemsBatch);

			expect(appendToMatrixMock).toHaveBeenNthCalledWith(
				2,
				recreatedResolvedState,
				appendItemsBatch,
			);
			expect(columns).toBe(appendResolvedState.columns);
		});

		test('uses Worker in recreate after enabling worker mode', async () => {
			const initialState = makeState({ count: 2, rootWidth: 400 });
			const recreatedBaseState = makeState({ count: 3, rootWidth: 900 });
			const recreatedFinalState = makeState({
				columns: [[makePlacedItem(300)], [makePlacedItem(300)], []],
				count: 3,
				rootWidth: 900,
			});

			const recreateItems = makeSourceItems(3);

			createMatrixStateMock
				.mockReturnValueOnce(initialState)
				.mockReturnValueOnce(recreatedBaseState);

			const matrix = new MasonryMatrix(400, 2);

			const { WorkerMock, instances } = installWorkerMock();

			matrix.enableWorker();

			const pending = matrix.recreate({
				columnCount: 3,
				items: recreateItems,
				rootWidth: 900,
			});

			expect(WorkerMock).toHaveBeenCalledOnce();

			const [worker] = instances;

			expect(worker.postMessage).toHaveBeenCalledOnce();
			expect(worker.postMessage).toHaveBeenCalledWith({
				batchItems: recreateItems,
				state: recreatedBaseState,
			});

			worker.emitMessage(recreatedFinalState);

			await expect(pending).resolves.toBe(recreatedFinalState.columns);
		});

		test('reuses existing Worker in recreate', async () => {
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

			const appendBatch = makeSourceItems(2);
			const middleItems = makeSourceItems(2);
			const finalItems = makeSourceItems(2);

			createMatrixStateMock
				.mockReturnValueOnce(initialState)
				.mockReturnValueOnce(recreatedMiddleBaseState)
				.mockReturnValueOnce(recreatedFinalBaseState);

			const { WorkerMock, instances } = installWorkerMock();
			const matrix = new MasonryMatrix(400, 2);

			const appendPending = matrix.append(appendBatch);
			const [worker] = instances;

			worker.emitMessage(stateAfterAppend);
			await expect(appendPending).resolves.toBe(stateAfterAppend.columns);

			const recreateMiddlePending = matrix.recreate({
				columnCount: 2,
				items: middleItems,
				rootWidth: 600,
			});

			expect(WorkerMock).toHaveBeenCalledTimes(1);
			expect(createMatrixStateMock).toHaveBeenNthCalledWith(2, 600, 2, 0);
			expect(worker.postMessage).toHaveBeenNthCalledWith(2, {
				batchItems: middleItems,
				state: recreatedMiddleBaseState,
			});

			worker.emitMessage(recreatedMiddleResolvedState);
			await expect(recreateMiddlePending).resolves.toBe(
				recreatedMiddleResolvedState.columns,
			);

			const recreateFinalPending = matrix.recreate({
				columnCount: 2,
				items: finalItems,
				rootWidth: 1200,
			});

			expect(WorkerMock).toHaveBeenCalledTimes(1);
			expect(createMatrixStateMock).toHaveBeenNthCalledWith(3, 1200, 2, 0);
			expect(worker.postMessage).toHaveBeenNthCalledWith(3, {
				batchItems: finalItems,
				state: recreatedFinalBaseState,
			});

			worker.emitMessage(recreatedFinalResolvedState);
			await expect(recreateFinalPending).resolves.toBe(
				recreatedFinalResolvedState.columns,
			);
		});

		test('rejects a concurrent recreate call and does not start a new job', async () => {
			const initialState = makeState({ count: 2, rootWidth: 600 });
			const resolvedState = makeState({
				columns: [[makePlacedItem(300)], []],
				count: 2,
				rootWidth: 600,
			});

			const firstItems = makeSourceItems(2);
			const secondItems = makeSourceItems(3);

			createMatrixStateMock.mockReturnValue(initialState);

			const { WorkerMock, instances } = installWorkerMock();
			const matrix = new MasonryMatrix(600, 2);

			const firstPending = matrix.recreate({
				columnCount: 3,
				items: firstItems,
				rootWidth: 900,
			});

			expect(WorkerMock).toHaveBeenCalledOnce();

			const [worker] = instances;

			expect(worker.postMessage).toHaveBeenCalledOnce();
			expect(worker.postMessage).toHaveBeenCalledWith({
				batchItems: firstItems,
				state: initialState,
			});

			const secondPending = matrix.recreate({
				columnCount: 4,
				items: secondItems,
				rootWidth: 1200,
			});

			await expect(secondPending).rejects.toMatchObject({
				message: MASONRY_MATRIX_ERROR_MESSAGES.CONCURRENT_CALL,
			});

			expect(worker.postMessage).toHaveBeenCalledTimes(1);

			worker.emitMessage(resolvedState);

			await expect(firstPending).resolves.toBe(resolvedState.columns);
		});

		test('rejects append while recreate is in flight and does not start a second job', async () => {
			const initialState = makeState({ count: 2, rootWidth: 600 });
			const resolvedState = makeState({
				columns: [[makePlacedItem(300)], []],
				count: 2,
				rootWidth: 600,
			});

			const recreateItems = makeSourceItems(2);
			const appendBatch = makeSourceItems(3);

			createMatrixStateMock.mockReturnValue(initialState);

			const { WorkerMock, instances } = installWorkerMock();
			const matrix = new MasonryMatrix(600, 2);

			const recreatePending = matrix.recreate({
				columnCount: 3,
				items: recreateItems,
				rootWidth: 900,
			});

			expect(WorkerMock).toHaveBeenCalledOnce();

			const [worker] = instances;

			expect(worker.postMessage).toHaveBeenCalledOnce();
			expect(worker.postMessage).toHaveBeenCalledWith({
				batchItems: recreateItems,
				state: initialState,
			});

			const appendPending = matrix.append(appendBatch);

			await expect(appendPending).rejects.toMatchObject({
				message: MASONRY_MATRIX_ERROR_MESSAGES.CONCURRENT_CALL,
			});

			expect(worker.postMessage).toHaveBeenCalledTimes(1);

			worker.emitMessage(resolvedState);

			await expect(recreatePending).resolves.toBe(resolvedState.columns);
		});

		test('wraps recreate update errors with RECREATE_MATRIX, disposes the worker, and creates a fresh worker on the next recreate', async () => {
			const initialState = makeState({ count: 2, rootWidth: 400 });
			const recreatedBaseStateA = makeState({ count: 3, rootWidth: 900 });
			const recreatedBaseStateB = makeState({ count: 2, rootWidth: 1200 });
			const recreatedResolvedStateB = makeState({
				columns: [[makePlacedItem(600)], [makePlacedItem(600)]],
				count: 2,
				rootWidth: 1200,
			});

			const itemsA = makeSourceItems(2);
			const itemsB = makeSourceItems(3);

			createMatrixStateMock
				.mockReturnValueOnce(initialState)
				.mockReturnValueOnce(recreatedBaseStateA)
				.mockReturnValueOnce(recreatedBaseStateB);

			const { WorkerMock, instances } = installWorkerMock();
			const matrix = new MasonryMatrix(400, 2);

			matrix.enableWorker();

			const firstPending = matrix.recreate({
				columnCount: 3,
				items: itemsA,
				rootWidth: 900,
			});

			const [firstWorker] = instances;

			firstWorker.emitMessageError();

			await expect(firstPending).rejects.toMatchObject({
				cause: {
					cause: {
						message: MASONRY_MATRIX_ERROR_MESSAGES.RECEIVE_FROM_WORKER,
					},
					message: MASONRY_MATRIX_ERROR_MESSAGES.UPDATE_INTERNAL_STATE,
				},
				message: MASONRY_MATRIX_ERROR_MESSAGES.RECREATE_MATRIX,
			});

			expect(firstWorker.terminate).toHaveBeenCalledOnce();

			const secondPending = matrix.recreate({
				columnCount: 2,
				items: itemsB,
				rootWidth: 1200,
			});

			expect(WorkerMock).toHaveBeenCalledTimes(2);

			const [, secondWorker] = instances;
			expect(secondWorker).not.toBe(firstWorker);

			secondWorker.emitMessage(recreatedResolvedStateB);

			await expect(secondPending).resolves.toBe(
				recreatedResolvedStateB.columns,
			);
		});
	});
});
