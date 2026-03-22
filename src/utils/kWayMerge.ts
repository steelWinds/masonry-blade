type HeapNode<T> = {
	columnIndex: number;
	itemIndex: number;
	value: T;
};

const heapPush = <T>(
	heap: HeapNode<T>[],
	node: HeapNode<T>,
	compare: (a: T, b: T) => number,
): void => {
	heap.push(node);

	let index = heap.length - 1;

	while (index > 0) {
		const parentIndex = (index - 1) >> 1;

		if (compare(heap[parentIndex].value, heap[index].value) <= 0) {
			break;
		}

		[heap[parentIndex], heap[index]] = [heap[index], heap[parentIndex]];
		index = parentIndex;
	}
};

const heapPop = <T>(
	heap: HeapNode<T>[],
	compare: (a: T, b: T) => number,
): HeapNode<T> | undefined => {
	const [first] = heap;
	const last = heap.pop();

	if (last == null) {
		return undefined;
	}

	if (heap.length === 0) {
		return last;
	}

	heap[0] = last;

	let index = 0;

	while (true) {
		const left = index * 2 + 1;
		const right = left + 1;
		let smallest = index;

		if (
			left < heap.length &&
			compare(heap[left].value, heap[smallest].value) < 0
		) {
			smallest = left;
		}

		if (
			right < heap.length &&
			compare(heap[right].value, heap[smallest].value) < 0
		) {
			smallest = right;
		}

		if (smallest === index) {
			break;
		}

		[heap[index], heap[smallest]] = [heap[smallest], heap[index]];
		index = smallest;
	}

	return first;
};

export const kWayMerge = <T>(
	columns: readonly (readonly T[])[],
	compare: (a: T, b: T) => number,
): T[] => {
	let total = 0;

	for (let col = 0; col < columns.length; col++) {
		total += columns[col].length;
	}

	const result = new Array<T>(total);
	const heap: HeapNode<T>[] = [];

	for (let col = 0; col < columns.length; col++) {
		const [firstValue] = columns[col];

		if (firstValue !== undefined) {
			heapPush(
				heap,
				{
					columnIndex: col,
					itemIndex: 0,
					value: firstValue,
				},
				compare,
			);
		}
	}

	let out = 0;

	while (heap.length > 0) {
		const node = heapPop(heap, compare)!;
		result[out++] = node.value;

		const nextItemIndex = node.itemIndex + 1;
		const nextValue = columns[node.columnIndex][nextItemIndex];

		if (nextValue !== undefined) {
			heapPush(
				heap,
				{
					columnIndex: node.columnIndex,
					itemIndex: nextItemIndex,
					value: nextValue,
				},
				compare,
			);
		}
	}

	return result;
};
