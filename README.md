# masonry-blade

Algo-oriented lib for creating masonry grids with ZERO dependencies😭 and Web Worker-powered😱 calculations.

> Only images are supported for now.

<div align="center">
  <img width="300" src="./.github/logo.png" alt="masonry-blad logo">
  <h3 align="center">masonry-blade</h3>
</div>

![GitHub License](https://img.shields.io/github/license/steelWinds/masonry-blade)
![NPM Unpacked Size](https://img.shields.io/npm/unpacked-size/masonry-blade)
![NPM Version](https://img.shields.io/npm/v/masonry-blade)

## Quick start

`MasonryMatrix` helps you build and rebuild a masonry layout incrementally.
It keeps the original input items internally, so you can append new items over time and fully recreate the matrix when the container width or column count changes.

### Import

```ts
import { MasonryMatrix } from 'masonry-blade';
```

### What the class does

`MasonryMatrix` manages two things for you:

- the current computed masonry state
- the full list of raw input items that were previously appended

This allows two common workflows:

1. **Append mode**: add new items to the existing matrix with `appendItems()`
2. **Rebuild mode**: fully recompute the matrix from all previously appended items with `recreateMatrix()`

### Constructor

```ts
const matrix = new MasonryMatrix(rootWidth, count);
```

#### Parameters

- `rootWidth: number` — the current container width in pixels
- `count?: number` — the number of columns; defaults to `1`

#### Example

```ts
const matrix = new MasonryMatrix(1200, 4);
```

This creates an internal masonry state for a `1200px` wide container with `4` columns.

### Input item type

Your input items must match this shape:

```ts
type ImageItem = {
	id: string;
	src: string;
	width: number;
	height: number;
};
```

- `id` should be stable and unique for each item
- `src` is copied into the computed result
- `width` and `height` are the original item dimensions
- items with non-positive `width` or `height` are ignored by the layout engine

### Output item type

Both `appendItems()` and `recreateMatrix()` return computed masonry columns:

```ts
type MasonryItem = {
	id: string;
	src: string;
	width: number;
	height: number;
};
```

The returned `width` and `height` are **computed layout dimensions**, not the original source dimensions:

- `width` is the target column width
- `height` is the scaled height for that column width

### Important note about returned values

Both public methods return:

```ts
Promise<readonly MasonryItem[][]>;
```

That means:

- the result is an array of columns
- each column is an array of computed masonry items
- the outer result should be treated as **read-only**
- the returned columns are backed by the internal matrix state

You should **not mutate** the returned arrays.
If you need to transform them for rendering, create a copy first.

Example:

```ts
const columns = await matrix.appendItems(items);

const safeColumns = columns.map((column) => [...column]);
```

### `appendItems()`

Use `appendItems()` when you want to add new items to the existing matrix.

```ts
const columns = await matrix.appendItems(items);
```

#### Parameters

- `items: readonly ImageItem[]` — the batch of new items to append

#### Returns

- `Promise<readonly MasonryItem[][]>` — the updated computed matrix columns

#### Behavior

- appends only the provided batch to the current matrix
- stores the raw items internally for future rebuilds
- reuses the current matrix state instead of rebuilding everything from scratch
- may use a worker internally when available
- falls back to synchronous calculation when a worker is not available

#### Example

```ts
const nextItems: ImageItem[] = [
	{
		id: 'img-1',
		src: '/images/1.jpg',
		width: 1600,
		height: 900,
	},
	{
		id: 'img-2',
		src: '/images/2.jpg',
		width: 1200,
		height: 1800,
	},
];

const columns = await matrix.appendItems(nextItems);
```

### `recreateMatrix()`

Use `recreateMatrix()` when the container width or column count changes and the whole matrix must be recalculated.

```ts
const columns = await matrix.recreateMatrix(rootWidth, count);
```

#### Parameters

- `rootWidth: number` — the new container width in pixels
- `count?: number` — the new number of columns

#### Returns

- `Promise<readonly MasonryItem[][]>` — the fully rebuilt computed matrix columns

#### Behavior

- creates a brand new internal masonry state
- replays **all previously appended raw items** into the new state
- is the correct method to call after resize or responsive breakpoint changes
- does **not** require you to pass the original items again

#### Example

```ts
const columns = await matrix.recreateMatrix(1440, 5);
```

### `terminateWorker()`

```ts
matrix.terminateWorker();
```

Use this method if you want to explicitly terminate the internal worker.

#### Behavior

- terminates the current worker if it exists
- rejects any pending worker-backed operation
- clears the internal worker reference
- future calls to `appendItems()` or `recreateMatrix()` may create a new worker again

This is usually useful during cleanup, for example when a view or component is being destroyed.

### Full example

```ts
import { MasonryMatrix } from 'masonry-blade';

type ImageItem = {
	id: string;
	src: string;
	width: number;
	height: number;
};

const items: ImageItem[] = [
	{ id: '1', src: '/img/1.jpg', width: 1600, height: 900 },
	{ id: '2', src: '/img/2.jpg', width: 1200, height: 1600 },
	{ id: '3', src: '/img/3.jpg', width: 800, height: 1200 },
	{ id: '4', src: '/img/4.jpg', width: 1920, height: 1080 },
];

function getColumnCount(width: number): number {
	if (width >= 1440) return 5;
	if (width >= 1024) return 4;
	if (width >= 768) return 3;
	if (width >= 480) return 2;
	return 1;
}

async function main(): Promise<void> {
	const rootWidth = 1200;
	const count = getColumnCount(rootWidth);

	const matrix = new MasonryMatrix(rootWidth, count);

	const initialColumns = await matrix.appendItems(items);

	console.log('Initial columns:', initialColumns);

	const moreItems: ImageItem[] = [
		{ id: '5', src: '/img/5.jpg', width: 1000, height: 1500 },
		{ id: '6', src: '/img/6.jpg', width: 1400, height: 900 },
	];

	const updatedColumns = await matrix.appendItems(moreItems);

	console.log('After append:', updatedColumns);

	const resizedColumns = await matrix.recreateMatrix(
		1440,
		getColumnCount(1440),
	);

	console.log('After recreate:', resizedColumns);

	matrix.terminateWorker();
}

void main();
```

### Responsive example with `window.resize`

The most common responsive pattern is:

1. create the matrix once
2. append your initial data
3. on resize, recompute `rootWidth` and `count`
4. call `recreateMatrix()`
5. re-render using the returned columns

```ts
import { MasonryMatrix } from 'masonry-blade';

type ImageItem = {
	id: string;
	src: string;
	width: number;
	height: number;
};

const container = document.getElementById('gallery');

if (container == null) {
	throw new Error('Missing #gallery container');
}

const items: ImageItem[] = [
	{ id: '1', src: '/img/1.jpg', width: 1600, height: 900 },
	{ id: '2', src: '/img/2.jpg', width: 1200, height: 1600 },
	{ id: '3', src: '/img/3.jpg', width: 800, height: 1200 },
	{ id: '4', src: '/img/4.jpg', width: 1920, height: 1080 },
];

function getColumnCount(width: number): number {
	if (width >= 1024) return 4;

	return 2;
}

function render(
	columns: readonly (readonly {
		id: string;
		src: string;
		width: number;
		height: number;
	})[][],
): void {
	container.innerHTML = '';

	for (const column of columns) {
		const columnEl = document.createElement('div');
		columnEl.className = 'masonry-column';

		for (const item of column) {
			const img = document.createElement('img');
			img.src = item.src;
			img.width = item.width;
			img.height = item.height;
			img.alt = item.id;

			columnEl.appendChild(img);
		}

		container.appendChild(columnEl);
	}
}

let currentWidth = container.clientWidth;
let currentCount = getColumnCount(currentWidth);
let resizeFrame = 0;

const matrix = new MasonryMatrix(currentWidth, currentCount);

async function init(): Promise<void> {
	const columns = await matrix.appendItems(items);
	render(columns);
}

async function handleResize(): Promise<void> {
	const nextWidth = container.clientWidth;
	const nextCount = getColumnCount(nextWidth);

	if (nextWidth === currentWidth && nextCount === currentCount) {
		return;
	}

	currentWidth = nextWidth;
	currentCount = nextCount;

	const columns = await matrix.recreateMatrix(currentWidth, currentCount);
	render(columns);
}

window.addEventListener('resize', () => {
	cancelAnimationFrame(resizeFrame);

	resizeFrame = requestAnimationFrame(() => {
		void handleResize();
	});
});

void init();

window.addEventListener('beforeunload', () => {
	matrix.terminateWorker();
});
```

### Useful notes

- Use `appendItems()` for incremental updates.
- Use `recreateMatrix()` after width or column count changes.
- Do not mutate the returned columns.
- Do not call `appendItems()` and `recreateMatrix()` concurrently.
- Serialize access in your application code.
- Call `terminateWorker()` during cleanup when needed.

### Concurrency note

Concurrent calls are not supported.
The caller must serialize access to:

- `appendItems()`
- `recreateMatrix()`

For example, do not call `appendItems()` while a previous `recreateMatrix()` call is still pending.

## Development

### Environment variables

See the `docs/` directory for example `.env.*` files. **Environment variable files should be located in the project root directory.**

### Setup for Development

```bash
git clone https://github.com/steelWinds/masonry-blade

cd masonry-blade

# Install dependencies
pnpm i

# Run tests
pnpm test:run
```

### Benchmark

```bash
pnpm benchmark
```

Latest benchmark results: [benchmark/benchmark-results.md](benchmark/benchmark-results.md)

## License

This project is licensed under the MPL 2.0 License.

## Links

- Author: [@steelWinds](https://github.com/steelWinds)
- Issues: [New issue](https://github.com/steelWinds/masonry-blade/issues)
- Telegram: @plutograde
- Email: [Send me an email](mailto:kirillsurov0@gmail.com)
