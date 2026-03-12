import type { ImageItem, MasonryState } from './types.ts';

export const appendItems = (
  state: Readonly<MasonryState>,
  items: readonly ImageItem[],
): MasonryState => {
  const { count, width } = state;

  if (count <= 0 || items.length === 0) return state;

  const columns = state.columns.map(column => [...column]);
  const heights = [...state.heights];
  const order = [...state.order];

  if (count === 1) {
    const column = columns[0];

    for (let i = 0, len = items.length; i < len; i++) {
      const item = items[i];

      if (item.width <= 0) continue;

      const height = Math.floor((item.height * width) / item.width);

      column.push({
        id: item.id,
        src: item.src,
        height,
        width,
      });

      heights[0] += height;
    }

    return { count, width, columns, heights, order };
  }

  for (let i = 0, len = items.length; i < len; i++) {
    const item = items[i];

    if (item.width <= 0) continue;

    const shortest = order[0];
    const height = Math.floor((item.height * width) / item.width);

    columns[shortest].push({
      id: item.id,
      src: item.src,
      height,
      width
    });

    const newHeight = heights[shortest] + height;

    heights[shortest] = newHeight;

    let pos = 1;

    while (pos < count) {
      const next = order[pos];

      if (heights[next] > newHeight) break;

      order[pos - 1] = next;
      pos++;
    }

    order[pos - 1] = shortest;
  }

  return { count, width, columns, heights, order };
};
