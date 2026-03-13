import type {
	ImageItem,
	MasonryItem,
	MasonryState,
} from 'src/utils/MasonryMatrix/lib/masonryEngine/index.ts';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { FAKER_SEED } from 'lib/constants.ts';
import { MasonryMatrix } from 'src/utils/MasonryMatrix/index.ts';
import { faker } from '@faker-js/faker';

const engineMocks = vi.hoisted(() => ({
	appendToMatrixMock: vi.fn(),
	createMasonryStateMock: vi.fn(),
}));

vi.mock(import('src/utils/MasonryMatrix/lib/masonryEngine/index.ts'), () => ({
	appendToMatrix: engineMocks.appendToMatrixMock,
	createMasonryState: engineMocks.createMasonryStateMock,
}));

const { createMasonryStateMock, appendToMatrixMock } = engineMocks;

type WorkerPayload = {
	state: MasonryState;
	batchItems: readonly ImageItem[];
};

class FakeWorker {
	public scriptPath: string;
	public options?: WorkerOptions;
	public onmessage: ((event: MessageEvent<MasonryState>) => void) | null = null;
	public onmessageerror: ((event: MessageEvent<unknown>) => void) | null = null;
	public onerror: ((event: ErrorEvent) => void) | null = null;

	messages: WorkerPayload[] = [];

	terminate = vi.fn();

	postMessage = vi.fn((payload: WorkerPayload) => {
		this.messages.push(payload);
	});

	emitMessage = vi.fn((state: MasonryState) => {
		this.onmessage?.({ data: state } as MessageEvent<MasonryState>);
	});

	emitMessageError = vi.fn(() => {
		this.onmessageerror?.({} as MessageEvent<unknown>);
	});

	emitError = vi.fn((message = 'boom') => {
		this.onerror?.({ message } as ErrorEvent);
	});

	constructor(scriptPath: string, options?: WorkerOptions) {
		this.scriptPath = scriptPath;
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

const makePlacedItem = (width: number): MasonryItem => ({
	height: faker.number.int({ max: 1000, min: 100 }),
	id: faker.string.uuid(),
	src: faker.internet.url(),
	width,
});

const makeState = (
	count: number,
	rootWidth: number,
	columns?: MasonryItem[][],
): MasonryState => ({
	columns: columns ?? Array.from({ length: count }, () => [] as MasonryItem[]),
	count,
	heights: new Int32Array(count),
	order: new Int16Array(count),
	width: Math.floor(rootWidth / count),
});

const installWorkerMock = () => {
	const instances: FakeWorker[] = [];

	const WorkerMock = vi.fn(
		class extends FakeWorker {
			constructor(scriptPath: string, options?: WorkerOptions) {
				super(scriptPath, options);

				instances.push(this);
			}
		},
	);

	vi.stubGlobal('Worker', WorkerMock as unknown as typeof Worker);

	return { WorkerMock, instances };
};

describe('MasonryMatrix', () => {
	let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		faker.seed(FAKER_SEED);

		createMasonryStateMock.mockReset();
		appendToMatrixMock.mockReset();

		vi.unstubAllGlobals();

		consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
	});

	afterEach(() => {
		consoleErrorSpy?.mockRestore();

		vi.unstubAllGlobals();
	});

	describe('constructor', () => {
		test('creates the initial masonry state via the engine', () => {
			const initialState = makeState(3, 960);

			createMasonryStateMock.mockReturnValue(initialState);

			// oxlint-disable-next-line no-new
			new MasonryMatrix(960, 3);

			expect(createMasonryStateMock).toHaveBeenCalledOnce();
			expect(createMasonryStateMock).toHaveBeenCalledWith(960, 3);
		});
	});

	describe('appendItems', () => {
		test('falls back to appendToMatrix when Worker is not available', async () => {
			const initialState = makeState(2, 480);
			const updatedState = makeState(2, 480, [[makePlacedItem(240)], []]);
			const batch = makeImageItems(3);

			createMasonryStateMock.mockReturnValue(initialState);
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

			createMasonryStateMock.mockReturnValue(initialState);

			const { WorkerMock, instances } = installWorkerMock();
			const matrix = new MasonryMatrix(900, 3);

			const pending = matrix.appendItems(batch);

			expect(WorkerMock).toHaveBeenCalledOnce();

			const [worker] = instances;

			expect(worker).toBeDefined();
			expect(worker.scriptPath).toBeTypeOf('string');
			expect(worker.scriptPath).toContain('appendToMatrix.worker.ts');
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

			createMasonryStateMock.mockReturnValue(initialState);

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

			createMasonryStateMock.mockReturnValue(initialState);

			const { WorkerMock, instances } = installWorkerMock();
			const matrix = new MasonryMatrix(400, 2);

			const firstPending = matrix.appendItems(firstBatch);
			const [firstWorker] = instances;

			matrix.terminateWorker();

			await expect(firstPending).rejects.toThrow(
				'[MasonryMatrix] Worker terminated',
			);
			expect(firstWorker.terminate).toHaveBeenCalledOnce();

			const secondPending = matrix.appendItems(secondBatch);

			expect(WorkerMock).toHaveBeenCalledTimes(2);

			const [, secondWorker] = instances;
			expect(secondWorker).not.toBe(firstWorker);

			secondWorker.emitMessage(stateAfterRestart);

			await expect(secondPending).resolves.toBe(stateAfterRestart.columns);
		});

		test('does not throw when terminateWorker is called without an active worker', () => {
			createMasonryStateMock.mockReturnValue(makeState(2, 400));

			const matrix = new MasonryMatrix(400, 2);

			expect(() => matrix.terminateWorker()).not.toThrow();
		});

		test('rejects when Worker emits messageerror', async () => {
			const initialState = makeState(2, 480);
			const batch = makeImageItems(2);

			createMasonryStateMock.mockReturnValue(initialState);

			const { instances } = installWorkerMock();
			const matrix = new MasonryMatrix(480, 2);

			const pending = matrix.appendItems(batch);

			instances[0].emitMessageError();

			await expect(pending).rejects.toThrow(
				'[MasonryMatrix] Error receiving message from worker',
			);

			const messages = consoleErrorSpy.mock.calls.map(([message]: any) =>
				String(message),
			);

			expect(messages).toEqual(
				expect.arrayContaining([
					expect.stringContaining(
						'[MasonryMatrix] Error while update internal state: Error: [MasonryMatrix] Error receiving message from worker',
					),
					expect.stringContaining(
						'[MasonryMatrix] Error while append items to matrix: Error: [MasonryMatrix] Error receiving message from worker',
					),
				]),
			);
		});

		test('propagates Worker runtime errors', async () => {
			const initialState = makeState(1, 320);
			const batch = makeImageItems(2);

			createMasonryStateMock.mockReturnValue(initialState);

			const { instances } = installWorkerMock();
			const matrix = new MasonryMatrix(320, 1);

			const pending = matrix.appendItems(batch);

			instances[0].emitError('kaboom');

			await expect(pending).rejects.toThrow(
				'[MasonryMatrix] Error while worker: kaboom',
			);

			const messages = consoleErrorSpy.mock.calls.map(([message]: any) =>
				String(message),
			);

			expect(messages).toEqual(
				expect.arrayContaining([
					expect.stringContaining(
						'[MasonryMatrix] Error while update internal state: Error: [MasonryMatrix] Error while worker: kaboom',
					),
					expect.stringContaining(
						'[MasonryMatrix] Error while append items to matrix: Error: [MasonryMatrix] Error while worker: kaboom',
					),
				]),
			);
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

			createMasonryStateMock
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
			expect(worker.scriptPath).toBeTypeOf('string');
			expect(worker.scriptPath).toContain('appendToMatrix.worker.ts');
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

			createMasonryStateMock
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
			expect(createMasonryStateMock).toHaveBeenNthCalledWith(2, 600, 2);
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
			expect(createMasonryStateMock).toHaveBeenNthCalledWith(3, 1200, 2);
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

			createMasonryStateMock
				.mockReturnValueOnce(initialState)
				.mockReturnValueOnce(recreatedBaseState);

			appendToMatrixMock
				.mockReturnValueOnce(stateAfterBatchA)
				.mockReturnValueOnce(stateAfterBatchB)
				.mockReturnValueOnce(recreatedFinalState);

			const matrix = new MasonryMatrix(400, 1);

			expect(createMasonryStateMock).toHaveBeenNthCalledWith(1, 400, 1);

			await matrix.appendItems(batchA);
			await matrix.appendItems(batchB);

			const columns = await matrix.recreateMatrix(400, 2);

			expect(createMasonryStateMock).toHaveBeenNthCalledWith(2, 400, 2);
			expect(appendToMatrixMock).toHaveBeenNthCalledWith(
				3,
				recreatedBaseState,
				[...batchA, ...batchB],
			);
			expect(columns).toBe(recreatedFinalState.columns);
		});
	});
});
