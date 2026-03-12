import type { ImageItem, MasonryState } from 'src/utils/MasonryMatrix/lib/masonryEngine/types.ts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FAKER_SEED } from 'lib/constants.ts'
import { faker } from '@faker-js/faker';

const mocks = vi.hoisted(() => ({
  appendItemsMock: vi.fn(),
  createMasonryStateMock: vi.fn(),
}));

vi.mock('src/utils/MasonryMatrix/lib/masonryEngine/index.ts', () => ({
  appendItems: mocks.appendItemsMock,
  createMasonryState: mocks.createMasonryStateMock,
}));

import { MasonryMatrix } from 'src/utils/MasonryMatrix/index.ts';

type WorkerRequest = {
  state: Readonly<MasonryState>;
  batchItems: readonly ImageItem[];
};

const createImageItem = (overrides: Partial<ImageItem> = {}): ImageItem => ({
  height: faker.number.int({ max: 500, min: 50 }),
  id: faker.string.uuid(),
  src: faker.internet.url(),
  width: faker.number.int({ max: 500, min: 50 }),
  ...overrides,
});

const createState = (overrides: Partial<MasonryState> = {}): MasonryState => ({
  columns: [[], []],
  count: 2,
  heights: [0, 0],
  order: [0, 1],
  width: 100,
  ...overrides,
});

class WorkerMock {
  static instances: WorkerMock[] = [];
  static nextResponse: MasonryState | null = null;
  static nextFailure: 'messageerror' | 'error' | null = null;
  public url: URL;
  public options?: WorkerOptions;

  static reset() {
    WorkerMock.instances = [];
    WorkerMock.nextResponse = null;
    WorkerMock.nextFailure = null;
  }

  readonly requests: WorkerRequest[] = [];

  onmessage: ((event: MessageEvent<MasonryState>) => void) | null = null;
  onmessageerror: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;

  readonly postMessage = vi.fn((payload: WorkerRequest) => {
    this.requests.push(payload);

    if (WorkerMock.nextFailure === 'messageerror') {
      this.onmessageerror?.({} as MessageEvent);
      return;
    }

    if (WorkerMock.nextFailure === 'error') {
      this.onerror?.({ message: 'worker failed' } as ErrorEvent);
      return;
    }

    if (WorkerMock.nextResponse == null) {
      throw new Error('Worker response was not configured');
    }

    this.onmessage?.({ data: WorkerMock.nextResponse } as MessageEvent<MasonryState>);
  });

  constructor(url: URL, options?: WorkerOptions) {
    this.url = url
    this.options = options

    WorkerMock.instances.push(this);
  }
}

describe('MasonryMatrix', () => {
  beforeEach(() => {
    faker.seed(FAKER_SEED);
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    WorkerMock.reset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    WorkerMock.reset();
  });

  it('uses the synchronous engine when Worker is not available', async () => {
    const initialState = createState({
      columns: [[], []],
      heights: [0, 0],
      order: [0, 1],
    });

    const nextState = createState({
      columns: [[{ height: 120, id: 'a', src: 'https://example.com/a.jpg', width: 100 }], []],
      heights: [120, 0],
      order: [1, 0],
    });

    const batchItems = [
      createImageItem({
        height: 240,
        id: 'a',
        src: 'https://example.com/a.jpg',
        width: 200,
      }),
    ];

    mocks.createMasonryStateMock.mockReturnValue(initialState);
    mocks.appendItemsMock.mockReturnValue(nextState);

    vi.stubGlobal('Worker', undefined);

    const matrix = new MasonryMatrix(2, 200);

    const result = await matrix.appendItems(batchItems);

    expect(mocks.createMasonryStateMock).toHaveBeenCalledWith(2, 200);
    expect(mocks.appendItemsMock).toHaveBeenCalledTimes(1);
    expect(mocks.appendItemsMock).toHaveBeenCalledWith(initialState, batchItems);

    expect(WorkerMock.instances).toHaveLength(0);
    expect(result).toStrictEqual(nextState.columns);
  });

  it('uses the worker path when Worker is available', async () => {
    const initialState = createState({
      columns: [[], []],
      heights: [0, 0],
      order: [0, 1],
    });

    const workerState = createState({
      columns: [[{ height: 80, id: 'b', src: 'https://example.com/b.jpg', width: 100 }], []],
      heights: [80, 0],
      order: [1, 0],
    });

    const batchItems = [
      createImageItem({
        height: 200,
        id: 'b',
        src: 'https://example.com/b.jpg',
        width: 250,
      }),
    ];

    vi.stubGlobal('Worker', WorkerMock as unknown as typeof Worker);

    mocks.createMasonryStateMock.mockReturnValue(initialState);
    WorkerMock.nextResponse = workerState;

    const matrix = new MasonryMatrix(2, 200);

    const result = await matrix.appendItems(batchItems);

    expect(mocks.createMasonryStateMock).toHaveBeenCalledWith(2, 200);
    expect(mocks.appendItemsMock).not.toHaveBeenCalled();

    expect(WorkerMock.instances).toHaveLength(1);

    const [worker] = WorkerMock.instances;

    expect(worker.url.pathname.split('/').pop()).toBe('appendItems.worker.ts')
    expect(worker.url).toBeInstanceOf(URL);
    expect(worker.options).toStrictEqual({ type: 'module' });

    expect(worker.postMessage).toHaveBeenCalledTimes(1);
    expect(worker.requests).toStrictEqual([
      {
        batchItems,
        state: initialState,
      },
    ]);

    expect(result).toStrictEqual(workerState.columns);
  });

  it('recreates the matrix from stored raw items', async () => {
    const initialState = createState({
      columns: [[], []],
      count: 2,
      heights: [0, 0],
      order: [0, 1],
      width: 100,
    });

    const recreatedBaseState = createState({
      columns: [[], [], []],
      count: 3,
      heights: [0, 0, 0],
      order: [0, 1, 2],
      width: 80,
    });

    const appendedState = createState({
      columns: [[{ height: 90, id: 'c', src: 'https://example.com/c.jpg', width: 100 }], []],
      count: 2,
      heights: [90, 0],
      order: [1, 0],
      width: 200,
    });

    const recreatedAppendedState = createState({
      columns: [[{ height: 72, id: 'c', src: 'https://example.com/c.jpg', width: 80 }], [], []],
      count: 3,
      heights: [72, 0, 0],
      order: [1, 2, 0],
      width: 80,
    });

    const batchItems = [
      createImageItem({
        height: 180,
        id: 'c',
        src: 'https://example.com/c.jpg',
        width: 200,
      }),
    ];

    vi.stubGlobal('Worker', WorkerMock as unknown as typeof Worker);

    mocks.createMasonryStateMock
    .mockReturnValueOnce(initialState)
    .mockReturnValueOnce(recreatedBaseState);

    WorkerMock.nextResponse = appendedState;

    const matrix = new MasonryMatrix(2, 200);

    await matrix.appendItems(batchItems);

    WorkerMock.nextResponse = recreatedAppendedState;

    const result = await matrix.recreateMatrix(3, 240);

    expect(mocks.createMasonryStateMock).toHaveBeenNthCalledWith(1, 2, 200);
    expect(mocks.createMasonryStateMock).toHaveBeenNthCalledWith(2, 3, 240);

    const [worker] = WorkerMock.instances;

    expect(worker.requests).toStrictEqual([
      {
        batchItems,
        state: initialState,
      },
      {
        batchItems,
        state: recreatedBaseState,
      },
    ]);

    expect(result).toStrictEqual(recreatedAppendedState.columns);
  });

  it('rethrows worker errors and logs them', async () => {
    const initialState = createState();
    const batchItems = [createImageItem()];

    vi.stubGlobal('Worker', WorkerMock as unknown as typeof Worker);

    mocks.createMasonryStateMock.mockReturnValue(initialState);
    WorkerMock.nextFailure = 'error';

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const matrix = new MasonryMatrix(2, 200);

    await expect(matrix.appendItems(batchItems)).rejects.toThrow('Error while worker worker failed');

    expect(consoleErrorSpy).toHaveBeenCalledTimes(2);
    expect(consoleErrorSpy).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('[MasonryMatrix] Error while update internal state:'),
    );
    expect(consoleErrorSpy).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('[MasonryMatrix] Error while append items to matrix:'),
    );

    consoleErrorSpy.mockRestore();
  });
});
