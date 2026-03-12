import { appendItems } from './appendItems.ts';

self.onmessage = (event) => {
  const { state, batchItems } = event.data;

  const result = appendItems(state, batchItems);

  self.postMessage(result);
};
