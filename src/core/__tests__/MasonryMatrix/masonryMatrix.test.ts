import type {
	ImageItem,
	MatrixItem,
	MatrixState,
} from 'src/core/MasonryMatrix/internal/matrixEngine/index.ts';
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
import { MATRIX_ERROR_MESSAGES } from 'src/core/MasonryMatrix/errors/index.ts';
import { MasonryMatrix } from 'src/core/MasonryMatrix/index.ts';
import { faker } from '@faker-js/faker';

const engineMocks = vi.hoisted(() => ({
	appendToMatrixMock: vi.fn(),
	createMatrixStateMock: vi.fn(),
}));

vi.mock(
	import('src/core/MasonryMatrix/internal/matrixEngine/index.ts'),
	() => ({
		appendToMatrix: engineMocks.appendToMatrixMock,
		createMatrixState: engineMocks.createMatrixStateMock,
	}),
);

const { createMatrixStateMock, appendToMatrixMock } = engineMocks;

type WorkerPayload = {
	state: MatrixState;
	batchItems: readonly ImageItem[];
};

class FakeWorker {
	public scriptURL: URL;
	public options?: WorkerOptions;
	public onmessage: ((event: MessageEvent<MatrixState>) => void) | null = null;
	public onmessageerror: ((event: MessageEvent<unknown>) => void) | null = null;
	public onerror: ((event: ErrorEvent) => void) | null = null;

	messages: WorkerPayload[] = [];

	terminate = vi.fn();

	postMessage = vi.fn((payload: WorkerPayload) => {
		this.messages.push(payload);
	});

	emitMessage = vi.fn((state: MatrixState) => {
		this.onmessage?.({ data: state } as MessageEvent<MatrixState>);
	});

	emitMessageError = vi.fn(() => {
		this.onmessageerror?.({} as MessageEvent<unknown>);
	});

	emitError = vi.fn((message = 'boom') => {
		this.onerror?.({ message } as ErrorEvent);
	});

	constructor(scriptURL: URL, options?: WorkerOptions) {
		this.scriptURL = scriptURL;
		this.options = options;
	}
}

const makeImageItems = (count: number): ImageItem[] =>
	Array.from({ length: count }, () => ({
		height: faker.number.int({ max: 1600, min: 120 }),
		id: faker.string.uuid(),
		src: faker.internet.url(),
		width: faker.number.int({ max: 1600, min: 120 }),
	}));

const makePlacedItem = (width: number): MatrixItem => ({
	height: faker.number.int({ max: 1000, min: 100 }),
	id: faker.string.uuid(),
	src: faker.internet.url(),
	width,
});

const makeState = (
	count: number,
	rootWidth: number,
	columns?: MatrixItem[][],
): MatrixState => ({
	columns: columns ?? Array.from({ length: count }, () => [] as MatrixItem[]),
	count,
	heights: new Float64Array(count),
	order: new Int16Array(count),
	width: rootWidth / count,
});

const installWorkerMock = (options?: {
	postMessageImpl?: (this: FakeWorker, payload: WorkerPayload) => void;
}) => {
	const instances: FakeWorker[] = [];

	const WorkerMock = vi.fn(
		class extends FakeWorker {
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

describe('MasonryMatrix', () => {
	const WORKER_FILE_PATH = faker.system.fileName();

	beforeAll(() => {
		vi.stubEnv('APPEND_TO_MATRIX_WORKER', WORKER_FILE_PATH);
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

	afterEach(() => vi.unstubAllGlobals());

	describe('constructor', () => {
		test('creates the initial masonry state via the engine', () => {
			const initialState = makeState(3, 960);

			createMatrixStateMock.mockReturnValue(initialState);

			// oxlint-disable-next-line no-new
			new MasonryMatrix(960, 3);

			expect(createMatrixStateMock).toHaveBeenCalledOnce();
			expect(createMatrixStateMock).toHaveBeenCalledWith(960, 3);
		});
	});

	describe('appendItems', () => {
		test('falls back to appendToMatrix when Worker is not available', async () => {
			const initialState = makeState(2, 480);
			const updatedState = makeState(2, 480, [[makePlacedItem(240)], []]);
			const batch = makeImageItems(3);

			createMatrixStateMock.mockReturnValue(initialState);
			appendToMatrixMock.mockReturnValue(updatedState);

			const matrix = new MasonryMatrix(480, 2);
			const columns = await matrix.appendItems(batch);

			expect(appendToMatrixMock).toHaveBeenCalledOnce();
			expect(appendToMatrixMock).toHaveBeenCalledWith(initialState, batch);
			expect(columns).toBe(updatedState.columns);
		});

		test('creates a Worker and uses it when Worker is available', async () => {
			const initialState = makeState(3, 900);
			const resolvedState = makeState(3, 900, [
				[makePlacedItem(300)],
				[makePlacedItem(300)],
				[],
			]);
			const batch = makeImageItems(4);

			createMatrixStateMock.mockReturnValue(initialState);

			const { WorkerMock, instances } = installWorkerMock();
			const matrix = new MasonryMatrix(900, 3);

			const pending = matrix.appendItems(batch);

			expect(WorkerMock).toHaveBeenCalledOnce();

			const [worker] = instances;

			expect(worker).toBeDefined();
			expect(worker.scriptURL).toBeInstanceOf(URL);
			expect(worker.scriptURL.href).toContain(WORKER_FILE_PATH);
			expect(worker.options).toEqual({ type: 'module' });

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
			const initialState = makeState(2, 500);
			const stateAfterFirstAppend = makeState(2, 500, [
				[makePlacedItem(250)],
				[],
			]);
			const stateAfterSecondAppend = makeState(2, 500, [
				[makePlacedItem(250)],
				[makePlacedItem(250)],
			]);

			const firstBatch = makeImageItems(2);
			const secondBatch = makeImageItems(2);

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
			const initialState = makeState(2, 400);
			const stateAfterRestart = makeState(2, 400, [[makePlacedItem(200)], []]);

			const firstBatch = makeImageItems(2);
			const secondBatch = makeImageItems(1);

			createMatrixStateMock.mockReturnValue(initialState);

			const { WorkerMock, instances } = installWorkerMock();
			const matrix = new MasonryMatrix(400, 2);

			const firstPending = matrix.appendItems(firstBatch);
			const [firstWorker] = instances;

			matrix.terminateWorker();

			await expect(firstPending).rejects.toMatchObject({
				cause: {
					cause: {
						message: MATRIX_ERROR_MESSAGES.WORKER_TERMINATED,
					},
					message: MATRIX_ERROR_MESSAGES.UPDATE_INTERNAL_STATE,
				},
				message: MATRIX_ERROR_MESSAGES.APPEND_ITEMS,
			});
			expect(firstWorker.terminate).toHaveBeenCalledOnce();

			const secondPending = matrix.appendItems(secondBatch);

			expect(WorkerMock).toHaveBeenCalledTimes(2);

			const [, secondWorker] = instances;
			expect(secondWorker).not.toBe(firstWorker);

			secondWorker.emitMessage(stateAfterRestart);

			await expect(secondPending).resolves.toBe(stateAfterRestart.columns);
		});

		test('does not throw when terminateWorker is called without an active worker', () => {
			createMatrixStateMock.mockReturnValue(makeState(2, 400));

			const matrix = new MasonryMatrix(400, 2);

			expect(() => matrix.terminateWorker()).not.toThrow();
		});

		test('rejects when Worker emits messageerror', async () => {
			const initialState = makeState(2, 480);
			const batch = makeImageItems(2);

			createMatrixStateMock.mockReturnValue(initialState);

			const { instances } = installWorkerMock();
			const matrix = new MasonryMatrix(480, 2);

			const pending = matrix.appendItems(batch);

			instances[0].emitMessageError();

			await expect(pending).rejects.toMatchObject({
				cause: {
					cause: {
						message: MATRIX_ERROR_MESSAGES.RECEIVE_FROM_WORKER,
					},
					message: MATRIX_ERROR_MESSAGES.UPDATE_INTERNAL_STATE,
				},
				message: MATRIX_ERROR_MESSAGES.APPEND_ITEMS,
			});
		});

		test('propagates Worker runtime errors', async () => {
			const errorMessage = faker.string.uuid();

			const initialState = makeState(1, 320);
			const batch = makeImageItems(2);

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
						message: MATRIX_ERROR_MESSAGES.WORKER_ERROR,
					},
					message: MATRIX_ERROR_MESSAGES.UPDATE_INTERNAL_STATE,
				},
				message: MATRIX_ERROR_MESSAGES.APPEND_ITEMS,
			});
		});

		test('returns current columns for a concurrent appendItems call and does not start a second worker job', async () => {
			const initialState = makeState(2, 500);
			const resolvedState = makeState(2, 500, [[makePlacedItem(250)], []]);

			const firstBatch = makeImageItems(2);
			const secondBatch = makeImageItems(3);

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
				message: MATRIX_ERROR_MESSAGES.CONCURRENT_CALL,
			});

			expect(worker.postMessage).toHaveBeenCalledTimes(1);
			expect(worker.postMessage).not.toHaveBeenCalledWith({
				batchItems: secondBatch,
				state: expect.anything(),
			});

			worker.emitMessage(resolvedState);

			await expect(firstPending).resolves.toBe(resolvedState.columns);
		});
	});

	describe('recreateMatrix', () => {
		test('uses Worker in recreateMatrix when it becomes available and replays all accumulated raw items', async () => {
			const initialState = makeState(2, 400);
			const stateAfterFirstAppend = makeState(2, 400, [
				[makePlacedItem(200)],
				[],
			]);

			const recreatedBaseState = makeState(3, 900);
			const recreatedFinalState = makeState(3, 900, [
				[makePlacedItem(300)],
				[makePlacedItem(300)],
				[],
			]);

			const batch = makeImageItems(3);

			createMatrixStateMock
				.mockReturnValueOnce(initialState)
				.mockReturnValueOnce(recreatedBaseState);

			appendToMatrixMock.mockReturnValueOnce(stateAfterFirstAppend);

			const matrix = new MasonryMatrix(400, 2);

			await matrix.appendItems(batch);

			const { WorkerMock, instances } = installWorkerMock();

			const pending = matrix.recreateMatrix(900, 3);

			expect(WorkerMock).toHaveBeenCalledOnce();

			const [worker] = instances;

			expect(worker).toBeDefined();
			expect(worker.scriptURL).toBeInstanceOf(URL);
			expect(worker.scriptURL.href).toContain(WORKER_FILE_PATH);
			expect(worker.options).toEqual({ type: 'module' });

			expect(worker.postMessage).toHaveBeenCalledOnce();
			expect(worker.postMessage).toHaveBeenCalledWith({
				batchItems: batch,
				state: recreatedBaseState,
			});

			worker.emitMessage(recreatedFinalState);

			await expect(pending).resolves.toBe(recreatedFinalState.columns);
		});

		test('reuses existing Worker in recreateMatrix and replays all accumulated raw items', async () => {
			const initialState = makeState(2, 400);
			const stateAfterAppend = makeState(2, 400, [[makePlacedItem(200)], []]);

			const recreatedMiddleBaseState = makeState(2, 600);
			const recreatedMiddleResolvedState = makeState(2, 600, [
				[makePlacedItem(300)],
				[makePlacedItem(300)],
			]);

			const recreatedFinalBaseState = makeState(2, 1200);
			const recreatedFinalResolvedState = makeState(2, 1200, [
				[makePlacedItem(600)],
				[makePlacedItem(600)],
			]);

			const batch = makeImageItems(2);

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
			expect(createMatrixStateMock).toHaveBeenNthCalledWith(2, 600, 2);
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
			expect(createMatrixStateMock).toHaveBeenNthCalledWith(3, 1200, 2);
			expect(worker.postMessage).toHaveBeenNthCalledWith(3, {
				batchItems: batch,
				state: recreatedFinalBaseState,
			});

			worker.emitMessage(recreatedFinalResolvedState);
			await expect(recreateFinalPending).resolves.toBe(
				recreatedFinalResolvedState.columns,
			);
		});

		test('creates a fresh state and replays all previously appended raw items', async () => {
			const initialState = makeState(1, 400);
			const stateAfterBatchA = makeState(1, 400, [[makePlacedItem(400)]]);
			const stateAfterBatchB = makeState(1, 400, [
				[makePlacedItem(400), makePlacedItem(400)],
			]);

			const recreatedBaseState = makeState(2, 400);
			const recreatedFinalState = makeState(2, 400, [
				[makePlacedItem(200)],
				[makePlacedItem(200)],
			]);

			const batchA = makeImageItems(2);
			const batchB = makeImageItems(3);

			createMatrixStateMock
				.mockReturnValueOnce(initialState)
				.mockReturnValueOnce(recreatedBaseState);

			appendToMatrixMock
				.mockReturnValueOnce(stateAfterBatchA)
				.mockReturnValueOnce(stateAfterBatchB)
				.mockReturnValueOnce(recreatedFinalState);

			const matrix = new MasonryMatrix(400, 1);

			expect(createMatrixStateMock).toHaveBeenNthCalledWith(1, 400, 1);

			await matrix.appendItems(batchA);
			await matrix.appendItems(batchB);

			const columns = await matrix.recreateMatrix(400, 2);

			expect(createMatrixStateMock).toHaveBeenNthCalledWith(2, 400, 2);
			expect(appendToMatrixMock).toHaveBeenNthCalledWith(
				3,
				recreatedBaseState,
				[...batchA, ...batchB],
			);
			expect(columns).toBe(recreatedFinalState.columns);
		});

		test('returns current columns for a concurrent recreateMatrix call and does not start a new job', async () => {
			const initialState = makeState(2, 600);
			const resolvedState = makeState(2, 600, [[makePlacedItem(300)], []]);

			const batch = makeImageItems(2);

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
				message: MATRIX_ERROR_MESSAGES.CONCURRENT_CALL,
			});

			expect(createMatrixStateMock).toHaveBeenCalledTimes(1);
			expect(worker.postMessage).toHaveBeenCalledTimes(1);

			worker.emitMessage(resolvedState);

			await expect(appendPending).resolves.toBe(resolvedState.columns);
		});
	});

	describe('Worker', () => {
		test('rejects when worker.postMessage throws DataCloneError for a non-cloneable payload', async () => {
			const initialState = makeState(2, 480);

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

			installWorkerMock({
				postMessageImpl() {
					throw dataCloneError;
				},
			});

			const matrix = new MasonryMatrix<{ callback: () => void }>(480, 2);

			const batch: ImageItem<{ callback: () => void }>[] = [
				{
					height: 200,
					id: faker.string.uuid(),
					meta: {
						callback: () => {},
					},
					src: faker.internet.url(),
					width: 300,
				},
			];

			await expect(matrix.appendItems(batch)).rejects.toMatchObject({
				cause: {
					cause: dataCloneError,
					message: MATRIX_ERROR_MESSAGES.UPDATE_INTERNAL_STATE,
				},
				message: MATRIX_ERROR_MESSAGES.APPEND_ITEMS,
			});
		});
	});
});
