# masonry-blade

![GitHub License](https://img.shields.io/github/license/steelWinds/masonry-blade)
[![Module type: ESM](https://img.shields.io/badge/module%20type-esm-brightgreen)](https://github.com/voxpelli/badges-cjs-esm)
[![build-validate](https://github.com/steelWinds/masonry-blade/actions/workflows/build-validate.yml/badge.svg)](https://github.com/steelWinds/masonry-blade/actions/workflows/build-validate.yml)
[![CodeQL](https://github.com/steelWinds/masonry-blade/actions/workflows/github-code-scanning/codeql/badge.svg)](https://github.com/steelWinds/masonry-blade/actions/workflows/codeql.yml)
![NPM Version](https://img.shields.io/npm/v/masonry-blade)
![NPM Unpacked Size](https://img.shields.io/npm/unpacked-size/masonry-blade)
![npm package minimized gzipped size](https://img.shields.io/bundlejs/size/masonry-blade)
[![codecov](https://codecov.io/gh/steelWinds/masonry-blade/graph/badge.svg?token=48NKR93X2A)](https://codecov.io/gh/steelWinds/masonry-blade)

## [Русская версия](./README.ru.md)

<p>
  <img align="right" width="150" height="150" src="./.github/logo.webp" alt="masonry-blade logo">
</p>

**masonry-blade** is a small, fast, dependency-free engine for masonry grid layout calculation.

- **🪶 Very small.** It solves one problem and does not grow into a framework.
- **⚡ Fast.** Greedy balancing, mutable state, and minimal overhead.
- **⚖️ Balanced.** Each new item is placed into the shortest column.
- **📦 Dependency-free.** Only calculation, coordinates, and types.
- **🎨 UI-agnostic.** Works with `React`, `Vue`, `Svelte`, `Canvas`, and `Vanilla JS`.
- **🏷️ Metadata-friendly.** Grid items can carry any extra data you need for rendering.
- **💤 Lazy-load friendly.** Append items in batches without losing the current layout.
- **🔄 Rebuildable.** Accepted items can be laid out again for a new width, column count, or `gap`.
- **🧵 `Web Worker` support.** If a worker is unavailable or disabled, calculations fall back to sync mode.

> You pass in source item sizes, and it returns ready-to-render `x`, `y`, `width`, and `height` for any UI. No DOM, no framework coupling, no bloated API.

## Installation

```bash
npm i masonry-blade
```

```bash
yarn add masonry-blade
```

```bash
pnpm add masonry-blade
```

## Public API

The package exports:

- `MasonryMatrix` - the main runtime facade
- `MasonryMatrixError` and `MASONRY_MATRIX_ERROR_MESSAGES` - facade errors and constants
- `MatrixEngineError` and `MATRIX_ENGINE_ERRORS` - low-level engine errors and constants
- TypeScript contracts: `Meta`, `SourceItem`, `MatrixItem`, `WithMeta`, `MasonryMatrixState`

```ts
import {
	MasonryMatrix,
	MasonryMatrixError,
	MASONRY_MATRIX_ERROR_MESSAGES,
	MatrixEngineError,
	MATRIX_ENGINE_ERRORS,
	type MatrixItem,
	type MasonryMatrixState,
	type Meta,
	type SourceItem,
	type WithMeta,
} from 'masonry-blade';
```

### Constructor

```ts
new MasonryMatrix<TMeta = never>(rootWidth: number, columnCount = 1, gap = 0)
```

- `rootWidth` - container width
- `columnCount` - number of columns
- `gap` - horizontal space between columns and vertical space between items

### Methods

```ts
await matrix.appendItems(items);
```

Appends a new batch of items to the current matrix and returns the columns.

```ts
await matrix.recreateMatrix(rootWidth, columnCount?, gap?)
```

Rebuilds the matrix from scratch using **all previously accepted items** stored inside the instance.
Items filtered out during `appendItems()` are not accumulated and do not take part in later rebuilds.
If `columnCount` and `gap` are omitted, the last stored values are reused. At first these are the constructor values, then the values from the last successful `recreateMatrix(...)`.

```ts
matrix.terminateWorker();
```

Stops the current `Worker`, if one was created. If a worker calculation is still running, the current `Promise` is rejected.

```ts
matrix.disableWorker();
```

Stops the current `Worker` and forces all following calculations into sync mode.

```ts
matrix.enableWorker();
```

Re-enables worker mode and immediately tries to create a new `Worker`. If the environment does not support it or creation fails, the library stays in sync mode.

```ts
const state = matrix.getState();
```

Returns a snapshot of the current facade state: `columnCount`, `columnWidth`, `gap`, `workerCreated`, `workerDisabled`, and copies of `columnsHeights` and `order`.
This is the safe way to inspect internal service state without touching live internal columns.

## Expected input and output

Input items use the exported `SourceItem` contract:

```ts
type SourceItem = {
	id: string | number;
	width: number;
	height: number;
};
```

Output items use the exported `MatrixItem` contract:

```ts
type MatrixItem = {
  id: string | number;
  width: number;
  height: number;
  x: number;
  y: number;
};

readonly (readonly WithMeta<MatrixItem, TMeta>[])[]
```

If you create `new MasonryMatrix<TMeta>(...)`, every input item must include `meta: TMeta`, and every output item will keep the same `meta`.

Important: output `width` and `height` are already scaled to the column width. They are not the original dimensions.

## Quick start

```ts
import { MasonryMatrix } from 'masonry-blade';

const matrix = new MasonryMatrix(1200, 3, 16);

const columns = await matrix.appendItems([
	{ id: '1', width: 1600, height: 900 },
	{ id: '2', width: 800, height: 1200 },
	{ id: '3', width: 1000, height: 1000 },
]);

console.log(columns);
```

`appendItems()` and `recreateMatrix()` are always async. Even without a `Worker`, you still use `await`.

## How it works

Internally, the flow is simple:

1. First, the column width is calculated:

```ts
columnWidth = Math.max(0, (rootWidth - gap * (columnCount - 1)) / columnCount);
```

2. Item height is scaled by the original aspect ratio.
3. The next item is placed into the shortest column.
4. The library calculates `x` and `y` for a virtual canvas.

This gives you a fast and visually even layout without complex heuristics.

## Example with `meta`

`meta` does not affect layout calculation, but it travels through the matrix together with the item.
If you create `MasonryMatrix<TMeta>`, every item passed to `appendItems(...)` must include `meta: TMeta`.

```ts
import { MasonryMatrix } from 'masonry-blade';

type PhotoMeta = {
	src: string;
	alt: string;
	author: string;
};

const matrix = new MasonryMatrix<PhotoMeta>(960, 2, 12);

const columns = await matrix.appendItems([
	{
		id: 'photo-1',
		width: 1600,
		height: 900,
		meta: {
			src: '/images/1.jpg',
			alt: 'Mountain lake',
			author: 'Kate',
		},
	},
]);

console.log(columns[0][0].meta.src);
```

## Example with coordinates

Below is a self-contained Vanilla JS example with absolute positioning:

```js
import { MasonryMatrix } from 'masonry-blade';

const container = document.createElement('div');

container.style.position = 'relative';

window.document.body.append(container);

const initialItems = [
	{
		id: 'photo-1',
		width: 1600,
		height: 900,
		meta: {
			title: 'Mountain lake',
		},
	},
	{
		id: 'photo-2',
		width: 900,
		height: 1350,
		meta: {
			title: 'Pine forest',
		},
	},
	{
		id: 'photo-3',
		width: 1200,
		height: 800,
		meta: {
			title: 'Green Apple',
		},
	},
	{
		id: 'photo-4',
		width: 900,
		height: 900,
		meta: {
			title: 'Red Apple',
		},
	},
];

const render = (columns) => {
	const placedItems = columns.flat();

	container.innerHTML = '';

	for (const item of placedItems) {
		const node = document.createElement('div');

		node.style.position = 'absolute';
		node.style.left = `0px`;
		node.style.top = `0px`;
		node.style.transform = `translate(${item.x}px, ${item.y}px)`;
		node.style.width = `${item.width}px`;
		node.style.height = `${item.height}px`;
		node.style.background = 'red';

		container.appendChild(node);
	}
};

async function main() {
	const matrix = new MasonryMatrix(container.clientWidth, 4, 16);

	render(await matrix.appendItems(initialItems));
}

main();
```

## Example: rebuild on resize

`recreateMatrix()` takes all already accepted items and recalculates the grid.

```js
import { MasonryMatrix } from 'masonry-blade';

const container = document.createElement('div');

container.style.position = 'relative';

window.document.body.append(container);

const initialItems = [
	{
		id: 'photo-1',
		width: 1600,
		height: 900,
		meta: {
			title: 'Mountain lake',
		},
	},
	{
		id: 'photo-2',
		width: 900,
		height: 1350,
		meta: {
			title: 'Pine forest',
		},
	},
	{
		id: 'photo-3',
		width: 1200,
		height: 800,
		meta: {
			title: 'Green Apple',
		},
	},
	{
		id: 'photo-4',
		width: 900,
		height: 900,
		meta: {
			title: 'Red Apple',
		},
	},
];

const render = (columns) => {
	const placedItems = columns.flat();

	container.innerHTML = '';

	for (const item of placedItems) {
		const node = document.createElement('div');

		node.style.position = 'absolute';
		node.style.left = `0px`;
		node.style.top = `0px`;
		node.style.transform = `translate(${item.x}px, ${item.y}px)`;
		node.style.width = `${item.width}px`;
		node.style.height = `${item.height}px`;
		node.style.background = 'red';

		container.appendChild(node);
	}
};

async function main() {
	const matrix = new MasonryMatrix(container.clientWidth, 4, 16);

	render(await matrix.appendItems(initialItems));

	window.addEventListener('resize', async () => {
		const width = container.clientWidth;
		const columns = width < 768 ? 2 : width < 1200 ? 3 : 4;

		const rebuilt = await matrix.recreateMatrix(width, columns);

		render(rebuilt);
	});
}

main();
```

If you call only `recreateMatrix(newWidth)`, the library does **not** reset the grid to `1` column and `gap = 0`. It reuses the last stored `columnCount` and `gap`.

## Example: `Worker` control

```ts
import { MasonryMatrix } from 'masonry-blade';

const matrix = new MasonryMatrix(1200, 3, 16);

let columns;

matrix.disableWorker();

columns = await matrix.appendItems([{ id: 1, width: 1, height: 1 }]); // guaranteed sync calculation

matrix.enableWorker();

columns = await matrix.recreateMatrix(1200); // the library tries to use Worker again

console.log(columns);
```

## Important notes

### Mutation source:

- Do not mutate the columns or items returned by `appendItems()` and `recreateMatrix()`. The library keeps its internal state in the same structures. If you need a safe snapshot of service state, use `getState()`.
- Do not mutate input items after passing them to `appendItems()`. Accepted raw items are stored internally and later reused by `recreateMatrix()`. Treat passed items and nested `meta` values as immutable, regardless of whether calculation ran synchronously or through a `Worker`.
- In worker mode, the payload sent to the worker goes through structured clone, but raw items stored inside the instance still remain the original accepted objects.

### Work with invalid items:

- `appendItems()` silently skips items whose `width` or `height` is not a positive finite number. Such items do not enter the current layout and are not accumulated for future `recreateMatrix()` calls.

### Concurrent:

- A single `MasonryMatrix` instance does not allow concurrent calls. `await` one call before starting the next.

### Work with Web-Worker:

- `terminateWorker()`, `disableWorker()`, and `enableWorker()` can interrupt a running worker calculation.
- If `Worker` is unavailable or creation fails, the library automatically falls back to sync mode and stays there until you explicitly call `enableWorker()`.
- After `disableWorker()`, sync mode stays active until you explicitly call `enableWorker()`.
- If calculation runs through a `Worker`, `meta` data must support structured clone. Functions, DOM nodes, and similar values may fail on `postMessage(...)`.

### Get current MasonryMatrix state:

- `getState()` returns a snapshot of internal service state. Its `columnsHeights` and `order` fields are cloned, so they can be read without risking damage to the instance state.

### Limitations:

- The library has no API for removing, updating, or selectively reordering individual items.
- The library does not work with the DOM directly. Container measurement, breakpoint choice, and rendering are up to you.
- If `gap` consumes the full container width, column width becomes `0` rather than going negative.

## Errors and validation

The library validates matrix parameters and filters item batches.

Invalid matrix parameters:

- `rootWidth < 0` or `rootWidth` is not a finite number
- `columnCount <= 0` or `columnCount` is not an integer
- `gap < 0` or `gap` is not a finite number

Invalid items passed to `appendItems()` do not throw. They are skipped instead. An item is skipped if its `width` or `height` is not a positive finite number.
Skipped items do not enter the current layout and are not stored for future `recreateMatrix()` calls.

Top-level errors are exposed as `MasonryMatrixError`. The `cause` may contain the original reason, including a `Worker` error, a structured clone / `postMessage(...)` error, or an engine validation error. A payload send failure usually appears as the original cause inside a `cause` chain wrapped by `Failed to update internal state`.

Typical top-level messages:

- `Failed to append items to the matrix`
- `Failed to recreate the matrix`
- `Concurrent call is not allowed`

Typical internal causes in `cause`:

- `Failed to update internal state`
- `Failed to receive a message from the worker`
- `Worker execution failed`
- `Worker was terminated`

## Benchmark

```bash
pnpm benchmark
```

Latest results: [benchmark/benchmark-results.md](benchmark/benchmark-results.md)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md)

## Security

See [SECURITY.md](SECURITY.md)

## License

This project is licensed under MPL 2.0.

## Links

- Author: [@steelWinds](https://github.com/steelWinds)
- Issues: [Open an issue](https://github.com/steelWinds/masonry-blade/issues)
- Telegram: @plutograde
- Email: [Send an email](mailto:kirillsurov0@gmail.com)
