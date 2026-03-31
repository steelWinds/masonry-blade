import {
	MASONRY_MATRIX_ERROR_MESSAGES,
	MasonryMatrix,
} from 'src/facade/MasonryMatrix';
import {
	Matrix,
	type MatrixSnapshot,
	type MatrixSourceUnit,
} from 'src/core/LayoutCalculationEngine';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const workerModule = vi.hoisted(() => {
	class FakeWorker {
		public static instances: FakeWorker[] = [];

		public options?: { name?: string };
		public lastMessage?: unknown;

		public onmessage: ((event: MessageEvent<unknown>) => void) | null = null;
		public onmessageerror: ((event: MessageEvent<unknown>) => void) | null =
			null;
		public onerror: ((event: ErrorEvent) => void) | null = null;

		public readonly postMessage = vi.fn((message: unknown) => {
			this.lastMessage = message;
		});

		public readonly terminate = vi.fn();

		constructor(options?: { name?: string }) {
			this.options = options;
			FakeWorker.instances.push(this);
		}

		private get requestId(): number {
			const id = (this.lastMessage as { id?: unknown } | undefined)?.id;

			if (typeof id !== 'number') {
				throw new Error('FakeWorker expected request id in lastMessage');
			}

			return id;
		}

		public emitAppend(snapshot: Readonly<MatrixSnapshot<unknown>>): void {
			this.onmessage?.({
				data: {
					id: this.requestId,
					ok: true,
					payload: {
						snapshot,
					},
					type: 'append',
				},
			} as MessageEvent<unknown>);
		}

		public emitSort(items: readonly unknown[]): void {
			this.onmessage?.({
				data: {
					id: this.requestId,
					ok: true,
					payload: {
						items,
					},
					type: 'sort',
				},
			} as MessageEvent<unknown>);
		}

		public emitMessageError(): void {
			this.onmessageerror?.({} as MessageEvent<unknown>);
		}

		public static reset(): void {
			FakeWorker.instances = [];
		}
	}

	return { FakeWorker };
});

const { FakeWorker } = workerModule;

vi.mock(
	'src/core/LayoutCalculationEngine/runtime/Matrix/MatrixWorker.worker.ts?worker&inline',
	() => ({
		default: workerModule.FakeWorker,
	}),
);

type TestMeta = {
	readonly label: string;
};

const INITIAL_ITEMS: readonly Readonly<MatrixSourceUnit<TestMeta>>[] = [
	{
		height: 100,
		id: 'a',
		meta: { label: 'first' },
		width: 100,
	},
	{
		height: 100,
		id: '',
		meta: { label: 'invalid-id' },
		width: 100,
	},
	{
		height: 100,
		id: 'b',
		meta: { label: 'second' },
		width: 200,
	},
] as const;

const REPLACEMENT_ITEMS: readonly Readonly<MatrixSourceUnit<TestMeta>>[] = [
	{
		height: 300,
		id: 'c',
		meta: { label: 'third' },
		width: 150,
	},
	{
		height: 120,
		id: 'd',
		meta: { label: 'fourth' },
		width: 80,
	},
] as const;

describe('MasonryMatrix', () => {
	beforeEach(() => {
		FakeWorker.reset();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
		FakeWorker.reset();
	});

	test('getState() returns detached typed arrays and current worker flags', () => {
		const matrix = new MasonryMatrix<TestMeta>(320, 2, 20);

		const firstState = matrix.getState();

		(firstState.columnsHeights as Float64Array)[0] = 999;
		(firstState.order as Uint32Array)[0] = 123;

		const secondState = matrix.getState();

		expect(secondState).toStrictEqual({
			columnCount: 2,
			columnWidth: 150,
			columnsHeights: new Float64Array([0, 0]),
			gap: 20,
			order: new Uint32Array([0, 1]),
			workerCreated: false,
			workerDisabled: false,
		});
	});

	test('append() falls back to sync mode and returns the matrix snapshot internal state', async () => {
		vi.stubGlobal('Worker', undefined);

		const matrix = new MasonryMatrix<TestMeta>(320, 2, 20);
		const expectedMatrix = new Matrix<TestMeta>(320, 2, 20);

		const result = await matrix.append(INITIAL_ITEMS);

		expectedMatrix.append(INITIAL_ITEMS);

		expect(result).toStrictEqual(expectedMatrix.snapshot().internalState);
		expect(matrix.getState()).toStrictEqual({
			columnCount: 2,
			columnWidth: 150,
			columnsHeights: new Float64Array([150, 75]),
			gap: 20,
			order: new Uint32Array([1, 0]),
			workerCreated: false,
			workerDisabled: true,
		});
	});

	test('sort() falls back to sync mode, returns flat items, and does not mutate state', async () => {
		vi.stubGlobal('Worker', undefined);

		const matrix = new MasonryMatrix<TestMeta>(320, 2, 20);
		const expectedMatrix = new Matrix<TestMeta>(320, 2, 20);

		const layout = await matrix.append(INITIAL_ITEMS);
		const previousState = matrix.getState();

		const expectedLayout = expectedMatrix.append(INITIAL_ITEMS);
		const result = await matrix.sort(layout);

		expect(result).toStrictEqual(expectedMatrix.sort(expectedLayout));
		expect(matrix.getState()).toStrictEqual(previousState);
	});

	test('recreate() uses only explicitly passed items and reuses previous columnCount/gap when omitted', async () => {
		vi.stubGlobal('Worker', undefined);

		const matrix = new MasonryMatrix<TestMeta>(320, 2, 20);

		await matrix.append(INITIAL_ITEMS);

		const recreated = await matrix.recreate({
			columnCount: 3,
			gap: 10,
			items: REPLACEMENT_ITEMS,
			rootWidth: 600,
		});
		const recreatedAgain = await matrix.recreate({
			rootWidth: 900,
		});

		const expectedRecreatedMatrix = new Matrix<TestMeta>(600, 3, 10);
		const expectedEmptyMatrix = new Matrix<TestMeta>(900, 3, 10);

		expectedRecreatedMatrix.append(REPLACEMENT_ITEMS);

		expect(recreated).toStrictEqual(
			expectedRecreatedMatrix.snapshot().internalState,
		);
		expect(recreatedAgain).toStrictEqual(
			expectedEmptyMatrix.snapshot().internalState,
		);
		expect(matrix.getState()).toStrictEqual({
			columnCount: 3,
			columnWidth: expectedEmptyMatrix.snapshot().columnWidth,
			columnsHeights: new Float64Array([0, 0, 0]),
			gap: 10,
			order: new Uint32Array([0, 1, 2]),
			workerCreated: false,
			workerDisabled: true,
		});
	});

	test('append() uses worker payloads after enableWorker()', async () => {
		vi.stubGlobal('Worker', FakeWorker as unknown as typeof Worker);

		const matrix = new MasonryMatrix<TestMeta>(400, 2, 10);
		const expectedMatrix = new Matrix<TestMeta>(400, 2, 10);

		expectedMatrix.append(INITIAL_ITEMS);

		const expectedSnapshot = expectedMatrix.snapshot();

		matrix.enableWorker();

		const pending = matrix.append(INITIAL_ITEMS);

		expect(FakeWorker.instances).toHaveLength(1);

		const [worker] = FakeWorker.instances;

		expect(worker.options).toBeUndefined();
		expect(worker.postMessage).toHaveBeenCalledWith({
			id: 1,
			payload: {
				items: INITIAL_ITEMS,
				snapshot: new Matrix<TestMeta>(400, 2, 10).snapshot(),
			},
			type: 'append',
		});

		worker.emitAppend(expectedSnapshot as Readonly<MatrixSnapshot<unknown>>);

		await expect(pending).resolves.toStrictEqual(
			expectedSnapshot.internalState,
		);
		expect(matrix.getState()).toStrictEqual({
			columnCount: expectedSnapshot.columnCount,
			columnWidth: expectedSnapshot.columnWidth,
			columnsHeights: new Float64Array(expectedSnapshot.columnHeights),
			gap: expectedSnapshot.gap,
			order: new Uint32Array(expectedSnapshot.order),
			workerCreated: true,
			workerDisabled: false,
		});
	});

	test('sort() uses worker payloads after enableWorker() and keeps the current state intact', async () => {
		vi.stubGlobal('Worker', FakeWorker as unknown as typeof Worker);

		const matrix = new MasonryMatrix<TestMeta>(400, 2, 10);
		const expectedMatrix = new Matrix<TestMeta>(400, 2, 10);
		const layout = expectedMatrix.append(INITIAL_ITEMS);
		const expectedSnapshot = expectedMatrix.snapshot();
		const expectedSorted = expectedMatrix.sort(layout);

		matrix.disableWorker();
		const source = await matrix.append(INITIAL_ITEMS);
		matrix.enableWorker();

		const pending = matrix.sort(source);

		expect(FakeWorker.instances).toHaveLength(1);

		const [worker] = FakeWorker.instances;

		expect(worker.postMessage).toHaveBeenCalledWith({
			id: 1,
			payload: {
				snapshot: expectedSnapshot,
				source,
			},
			type: 'sort',
		});

		worker.emitSort(expectedSorted);

		await expect(pending).resolves.toStrictEqual(expectedSorted);
		expect(matrix.getState()).toStrictEqual({
			columnCount: expectedSnapshot.columnCount,
			columnWidth: expectedSnapshot.columnWidth,
			columnsHeights: new Float64Array(expectedSnapshot.columnHeights),
			gap: expectedSnapshot.gap,
			order: new Uint32Array(expectedSnapshot.order),
			workerCreated: true,
			workerDisabled: false,
		});
	});

	test('terminateWorker() rejects an in-flight append and wraps the worker error with APPEND_ITEMS', async () => {
		vi.stubGlobal('Worker', FakeWorker as unknown as typeof Worker);

		const matrix = new MasonryMatrix<TestMeta>(400, 2, 10);
		matrix.enableWorker();

		const pending = matrix.append(INITIAL_ITEMS);

		await Promise.resolve();
		matrix.terminateWorker();

		await expect(pending).rejects.toMatchObject({
			message: MASONRY_MATRIX_ERROR_MESSAGES.APPEND_ITEMS,
			name: 'MasonryMatrixError',
		});
	});

	test('sort() wraps worker failures with SORT_MATRIX and keeps the matrix state', async () => {
		vi.stubGlobal('Worker', FakeWorker as unknown as typeof Worker);

		const matrix = new MasonryMatrix<TestMeta>(320, 2, 20);

		matrix.disableWorker();
		const source = await matrix.append(INITIAL_ITEMS);
		matrix.enableWorker();

		const stateBeforeSort = matrix.getState();
		const pending = matrix.sort(source);

		const [worker] = FakeWorker.instances;
		worker.emitMessageError();

		await expect(pending).rejects.toMatchObject({
			message: MASONRY_MATRIX_ERROR_MESSAGES.SORT_MATRIX,
			name: 'MasonryMatrixError',
		});

		expect(matrix.getState()).toStrictEqual({
			...stateBeforeSort,
			workerCreated: false,
			workerDisabled: false,
		});
	});

	test('recreate() restores the previous state when worker execution fails', async () => {
		vi.stubGlobal('Worker', FakeWorker as unknown as typeof Worker);

		const matrix = new MasonryMatrix<TestMeta>(320, 2, 20);

		matrix.disableWorker();
		await matrix.append(INITIAL_ITEMS);
		const previousState = matrix.getState();

		matrix.enableWorker();

		const pending = matrix.recreate({
			columnCount: 3,
			gap: 16,
			items: REPLACEMENT_ITEMS,
			rootWidth: 900,
		});

		const [worker] = FakeWorker.instances;
		worker.emitMessageError();

		await expect(pending).rejects.toMatchObject({
			message: MASONRY_MATRIX_ERROR_MESSAGES.RECREATE_MATRIX,
		});

		expect(matrix.getState()).toStrictEqual({
			...previousState,
			workerCreated: false,
			workerDisabled: false,
		});
	});
});
