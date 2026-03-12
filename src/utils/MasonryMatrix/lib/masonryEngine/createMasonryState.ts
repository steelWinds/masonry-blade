import type { MasonryItem, MasonryState } from './types.ts';

export const createMasonryState = (count: number = 1, rootWidth: number): MasonryState => {
  if (count <= 0) {
    return {
      count: 0,
      width: 0,
      columns: [],
      heights: [],
      order: [],
    };
  }

  const columns: MasonryItem[][] = Array.from({ length: count }, () => []);
  const heights = Array.from({ length: count }, () => 0);
  const order = Array.from({ length: count }, (_, index) => index);
  const width = Math.floor(rootWidth / count);

  return {
    count,
    width,
    columns,
    heights,
    order,
  };
};
