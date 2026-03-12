import type { ImageItem, MasonryState } from 'src/utils/MasonryMatrix/lib/masonryEngine/types.ts';
import { beforeEach, describe, expect, it } from 'vitest';
import { faker } from '@faker-js/faker';
import { FAKER_SEED } from 'lib/constants.ts'
import { appendItems } from 'src/utils/MasonryMatrix/lib/masonryEngine/appendItems.ts';

const DEFAULT_COLUMN_WIDTH = 100;

const createImageItem = (overrides: Partial<ImageItem> = {}): ImageItem => ({
  id: faker.string.uuid(),
  src: faker.internet.url(),
  width: faker.number.int({ min: 50, max: 500 }),
  height: faker.number.int({ min: 50, max: 500 }),
  ...overrides,
});

const createState = (overrides: Partial<MasonryState> = {}): MasonryState => ({
  count: 2,
  width: DEFAULT_COLUMN_WIDTH,
  columns: [[], []],
  heights: [0, 0],
  order: [0, 1],
  ...overrides,
});

const deepFreeze = <T>(value: T): Readonly<T> => {
  if (value !== null && typeof value === 'object') {
    Object.freeze(value);

    if (Array.isArray(value)) {
      for (const item of value) {
        deepFreeze(item);
      }
    } else {
      for (const nestedValue of Object.values(value as Record<string, unknown>)) {
        deepFreeze(nestedValue);
      }
    }
  }

  return value as Readonly<T>;
};

describe('appendItems', () => {
  beforeEach(() => {
    faker.seed(FAKER_SEED);
  });

  it('appends a valid item to the shortest column and updates heights and order', () => {
    const state = createState({
      columns: [[], []],
      heights: [0, 50],
      order: [0, 1],
      width: 100,
    });

    const items = [
      createImageItem({
        id: 'image-1',
        src: 'https://example.com/image-1.jpg',
        width: 200,
        height: 300,
      }),
    ];

    const result = appendItems(state, items);

    expect(result).toStrictEqual({
      ...state,
      columns: [
        [
          {
            id: 'image-1',
            src: 'https://example.com/image-1.jpg',
            width: 100,
            height: 150,
          },
        ],
        [],
      ],
      heights: [150, 50],
      order: [1, 0],
    });

    expect(result).not.toBe(state);
  });

  it('ignores items with non-positive width', () => {
    const state = createState({
      columns: [[], []],
      heights: [10, 20],
      order: [0, 1],
    });

    const items = [
      createImageItem({ width: 0, height: 300 }),
      createImageItem({ width: -100, height: 400 }),
    ];

    const result = appendItems(state, items);

    expect(result).toStrictEqual(state);
  });

  it.each([
    {
      testName: 'returns the original state when count is zero',
      state: createState({ count: 0 }),
      items: [createImageItem()],
    },
    {
      testName: 'returns the original state when items are empty',
      state: createState(),
      items: [],
    },
  ])('$testName', ({ state, items }) => {
    const result = appendItems(state, items);

    expect(result).toStrictEqual(state);
  });

  it('appends all valid items to the single column when count is one', () => {
    const state = createState({
      count: 1,
      width: 120,
      columns: [[]],
      heights: [0],
      order: [0],
    });

    const items = [
      createImageItem({
        id: 'image-a',
        src: 'https://example.com/image-a.jpg',
        width: 200,
        height: 300,
      }),
      createImageItem({
        id: 'image-invalid',
        src: 'https://example.com/image-invalid.jpg',
        width: 0,
        height: 999,
      }),
      createImageItem({
        id: 'image-b',
        src: 'https://example.com/image-b.jpg',
        width: 60,
        height: 120,
      }),
    ];

    const result = appendItems(state, items);

    expect(result).toStrictEqual({
      ...state,
      columns: [
        [
          {
            id: 'image-a',
            src: 'https://example.com/image-a.jpg',
            width: 120,
            height: 180,
          },
          {
            id: 'image-b',
            src: 'https://example.com/image-b.jpg',
            width: 120,
            height: 240,
          },
        ],
      ],
      heights: [420],
      order: [0],
    });

    expect(result).not.toBe(state);
  });

  it('preserves immutability of the input state and items', () => {
    const state = createState({
      columns: [
        [
          {
            id: 'existing-image',
            src: 'https://example.com/existing-image.jpg',
            width: 100,
            height: 25,
          },
        ],
        [],
      ],
      heights: [25, 0],
      order: [1, 0],
      width: 100,
    });

    const items = [
      createImageItem({
        id: 'new-image',
        src: 'https://example.com/new-image.jpg',
        width: 50,
        height: 100,
      }),
    ];

    const frozenState = deepFreeze(structuredClone(state));
    const frozenItems = deepFreeze(structuredClone(items));

    expect(() => appendItems(frozenState, frozenItems)).not.toThrow();

    const result = appendItems(frozenState, frozenItems);

    expect(frozenState).toStrictEqual(state);
    expect(frozenItems).toStrictEqual(items);

    expect(result).not.toBe(frozenState);
    expect(result.columns).not.toBe(frozenState.columns);
    expect(result.heights).not.toBe(frozenState.heights);
    expect(result.order).not.toBe(frozenState.order);

    expect(result.columns[0]).not.toBe(frozenState.columns[0]);
    expect(result.columns[1]).not.toBe(frozenState.columns[1]);
  });
});
