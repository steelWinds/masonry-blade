import { appendToMatrix } from './appendToMatrix.ts';

self.onmessage = (event) => {
	const { state, batchItems } = event.data;

	const result = appendToMatrix(state, batchItems);

	self.postMessage(result);
};
