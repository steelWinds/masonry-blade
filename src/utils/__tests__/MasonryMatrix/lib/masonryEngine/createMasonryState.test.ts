import type { MasonryItem, MasonryState } from 'src/utils/MasonryMatrix/lib/masonryEngine/types.ts';
import { beforeEach, describe, expect, it } from 'vitest';
import { faker } from '@faker-js/faker';
import { FAKER_SEED } from 'lib/constants.ts'
import { createMasonryState } from 'src/utils/MasonryMatrix/lib/masonryEngine/createMasonryState.ts';


const createItem = (): MasonryItem => ({
  id: faker.string.uuid(),
  src: faker.internet.url(),
  width: faker.number.int({ min: 50, max: 500 }),
  height: faker.number.int({ min: 50, max: 500 }),
});

const createEmptyState = (): MasonryState => ({
  count: 0,
  width: 0,
  columns: [],
  heights: [],
  order: [],
});

describe('createMasonryState', () => {
  beforeEach(() => {
    faker.seed(FAKER_SEED);
  });

  it('creates an initialized state for a positive column count', () => {
    const count = 3;
    const rootWidth = 305;

    const result = createMasonryState(count, rootWidth);

    expect(result).toStrictEqual({
      count: 3,
      width: 101,
      columns: [[], [], []],
      heights: [0, 0, 0],
      order: [0, 1, 2],
    });
  });

  it.each([0, -1, -10])('returns an empty state when count is %i', (count) => {
    const rootWidth = faker.number.int({ min: 100, max: 1000 });

    const result = createMasonryState(count, rootWidth);

    expect(result).toStrictEqual(createEmptyState());
  });

  it('uses the default count when count is undefined', () => {
    const rootWidth = faker.number.int({ min: 100, max: 1000 });

    const result = createMasonryState(undefined, rootWidth);

    expect(result).toStrictEqual({
      count: 1,
      width: rootWidth,
      columns: [[]],
      heights: [0],
      order: [0],
    });
  });

  it('floors the column width when rootWidth is not divisible by count', () => {
    const count = 4;
    const rootWidth = 403;

    const result = createMasonryState(count, rootWidth);

    expect(result.width).toBe(100);
  });

  it('returns zero width when rootWidth is smaller than count', () => {
    const count = 5;
    const rootWidth = 3;

    const result = createMasonryState(count, rootWidth);

    expect(result).toStrictEqual({
      count: 5,
      width: 0,
      columns: [[], [], [], [], []],
      heights: [0, 0, 0, 0, 0],
      order: [0, 1, 2, 3, 4],
    });
  });

  it('creates independent column arrays', () => {
    const state = createMasonryState(2, 400);
    const item = createItem();

    state.columns[0].push(item);

    expect(state.columns[0]).toStrictEqual([item]);
    expect(state.columns[1]).toStrictEqual([]);
    expect(state.columns[0]).not.toBe(state.columns[1]);
  });

  it('returns a new independent state for each call', () => {
    const firstState = createMasonryState(2, 400);
    const secondState = createMasonryState(2, 400);

    firstState.columns[0].push(createItem());
    firstState.heights[0] = 123;
    firstState.order[0] = 1;

    expect(secondState).toStrictEqual({
      count: 2,
      width: 200,
      columns: [[], []],
      heights: [0, 0],
      order: [0, 1],
    });

    expect(firstState).not.toBe(secondState);
    expect(firstState.columns).not.toBe(secondState.columns);
    expect(firstState.heights).not.toBe(secondState.heights);
    expect(firstState.order).not.toBe(secondState.order);
  });
});
