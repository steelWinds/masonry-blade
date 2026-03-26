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

**masonry-blade** is a tiny, fast, and extensible **engine** for masonry grid calculation with **zero dependencies** 🤤

- **🪶 Lightweight** - It solves exactly one problem, and solves it well.
- **⚡ Fast** - Greedy balancing, k-way merge, and very little overhead.
- **⚖️ Balanced** - Each next item goes into the shortest column.
- **📦 Zero dependencies** - Nothing extra.
- **🎨 UI-agnostic** - Works with `React`, `Vue`, `Svelte`, `Canvas`, and `Vanilla JS`.
- **🏷️ Supports metadata** - Grid items can carry any extra data you need for rendering.
- **💤 Supports lazy-load** - Append items in batches without losing the current layout.
- **🔄 Can rebuild the matrix** - Recalculate the layout for a new width, column count, or `gap`.
- **🧵 Can run through `Web Worker`** - And if it is unavailable or disabled, it falls back to sync calculation.

> You pass in source item sizes, and it returns ready-to-render `x`, `y`, `width`, and `height` for any UI. No DOM, no framework coupling, and no bloated API.

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

- `MasonryMatrix` - the main facade
- `MasonryMatrixError` and `MASONRY_MATRIX_ERROR_MESSAGES` - facade errors and constants
- Masonry TS types: `MasonryMatrixErrorMessage`, `MasonryMatrixState`, and `RecreateOptions`
- Engine TS types: `MatrixSourceUnit`, `MatrixComputedUnit`, `ReadonlySortItems`, `ReadonlyMatrix` and `MatrixSnapshot`

```ts
import {
	MasonryMatrix,
	MasonryMatrixError,
	MASONRY_MATRIX_ERROR_MESSAGES,
	type MatrixSourceUnit,
	type MatrixComputedUnit,
	type ReadonlySortItems,
	type ReadonlyMatrix,
	type MatrixSnapshot,
	type MasonryMatrixErrorMessage,
	type MasonryMatrixState,
	type RecreateOptions,
} from 'masonry-blade';
```

### Constructor

```ts
new MasonryMatrix<Meta = undefined>(rootWidth: number, columnCount: number, gap: number)
```

- `rootWidth` - container width
- `columnCount` - number of columns
- `gap` - horizontal space between columns and vertical space between items

All three constructor arguments are required.

### Methods

```ts
await matrix.append(items);
```

Appends a new batch of items to the current matrix and returns the columns.

```ts
await matrix.sort(source);
```

Transforms `source` into one flat array sorted by visual order: first by `y`, then by `x`.
It does not rebuild the matrix and does not mutate the current facade state.

```ts
await matrix.recreate({
	rootWidth,
	columnCount?,
	gap?,
	items?,
})
```

Rebuilds the matrix from scratch using only the `items` passed in `options`.
If `items` are omitted, the matrix is rebuilt as an empty layout.
If `columnCount` and `gap` are omitted, the last successful values are reused. At first these are the constructor values, then the values from the last successful `recreate(...)`.

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
This is a safe way to inspect service state without touching live internal columns.

## What data the library expects

Input items are plain objects with this shape:

```ts
{
	id: string | number;
	width: number;
	height: number;
	meta?: Meta;
}

// MatrixComputedUnit<Meta>
```

`append()` and `recreate()` return a matrix with this shape:

```ts
readonly (readonly Readonly<{
	id: string | number;
	width: number;
	height: number;
	x: number;
	y: number;
	meta?: Meta;
}>[])[]

// ReadonlyMatrix<Meta>
```

`sort()` returns a flat list with this shape:

```ts
readonly Readonly<{
	id: string | number;
	width: number;
	height: number;
	x: number;
	y: number;
	meta?: Meta;
}>[]

// ReadonlySortItems<Meta>
```

If you create `new MasonryMatrix<Meta>(...)`, any provided `meta` value is typed as `Meta`, and output items keep the same `meta`.

Important: output `width` and `height` are already scaled to the column width. They are not the original dimensions.

## Quick start

```ts
import { MasonryMatrix } from 'masonry-blade';

const matrix = new MasonryMatrix(1200, 3, 16);

const columns = await matrix.append([
	{ id: '1', width: 1600, height: 900 },
	{ id: '2', width: 800, height: 1200 },
	{ id: '3', width: 1000, height: 1000 },
]);

const items = await matrix.sort(columns);

console.log(items);
```

`append()`, `sort()`, and `recreate()` are always async. Even if `Worker` is not used, you still work through `await`.

## How it works

Internally, everything is simple:

1. First, the column width is calculated:

```ts
columnWidth = (rootWidth - gap * (columnCount - 1)) / columnCount;
```

2. Item height is scaled by the original aspect ratio.
3. The next item is placed into the shortest column.
4. The library calculates `x` and `y` for a virtual canvas.

This gives you a fast and visually even layout without complex heuristics.

## Example with `meta`

`meta` does not participate in the calculation, but it travels through the whole matrix together with the item.
If you create `MasonryMatrix<Meta>`, any provided `meta` value is typed as `Meta`.

```ts
import { MasonryMatrix } from 'masonry-blade';

type PhotoMeta = {
	src: string;
	alt: string;
	author: string;
};

const matrix = new MasonryMatrix<PhotoMeta>(960, 2, 12);

const columns = await matrix.append([
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

## Example: get flat render order

`append()` and `recreate()` return columns. If you need one flat list for rendering from top to bottom and then from left to right, call `sort(...)`.

```ts
import { MasonryMatrix } from 'masonry-blade';

const matrix = new MasonryMatrix(1200, 3, 16);

const columns = await matrix.append([
	{ id: '1', width: 1600, height: 900 },
	{ id: '2', width: 800, height: 1200 },
	{ id: '3', width: 1000, height: 1000 },
]);

const orderedItems = await matrix.sort(columns);

console.log(orderedItems.map((item) => item.id));
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

const render = (placedItems) => {
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
	const columns = await matrix.append(initialItems);
	const placedItems = await matrix.sort(columns);

	render(placedItems);
}

main();
```

## Example: rebuild on resize

`recreate()` recalculates the grid from the explicit list of items you pass in.

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

const render = (placedItems) => {
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
	const initialColumns = await matrix.append(initialItems);
	const initialPlacedItems = await matrix.sort(initialColumns);

	render(initialPlacedItems);

	window.addEventListener('resize', async () => {
		const width = container.clientWidth;
		const columns = width < 768 ? 2 : width < 1200 ? 3 : 4;

		const rebuilt = await matrix.recreate({
			rootWidth: width,
			columnCount: columns,
			items: initialItems,
		});
		const rebuiltItems = await matrix.sort(rebuilt);

		render(rebuiltItems);
	});
}

main();
```

If you call only `recreate({ rootWidth: newWidth })`, the library uses the last successful `columnCount` and `gap`, but because `items` are not passed, the rebuilt layout will be empty.

## Example: `Worker` control

```ts
import { MasonryMatrix } from 'masonry-blade';

const matrix = new MasonryMatrix(1200, 3, 16);

let columns;

matrix.disableWorker();

columns = await matrix.append([{ id: 1, width: 1, height: 1 }]); // guaranteed sync calculation

matrix.enableWorker();

columns = await matrix.recreate({
	rootWidth: 1200,
	items: [{ id: 1, width: 1, height: 1 }],
}); // the library tries to use Worker again

console.log(columns);
```

## Important notes

### Mutation of returned data

- Treat the returned layout as read-only. Container arrays are safe to read, but mutating item objects themselves is not part of the public contract.
- Treat input items as immutable while a call is running.
- In worker mode, the payload goes through structured clone, so values inside `meta` must also be cloneable.
- `sort()` only reads the `source` you pass in and does not modify the stored matrix state.

### Working with invalid objects

- `append()` and `recreate({ items })` silently skip items whose `id` is neither a finite number nor a non-empty string, or whose `width` or `height` is not a positive finite number.

### Working with `Web Worker`

- `terminateWorker()`, `disableWorker()`, and `enableWorker()` can interrupt a running worker calculation.
- If `Worker` is unavailable or creation fails, the library automatically falls back to the synchronous path and stays there until you explicitly call `enableWorker()`.
- After `disableWorker()`, sync mode stays active until you explicitly call `enableWorker()`.
- If calculation runs through a `Worker`, data inside `meta` must support structured clone. Functions, DOM nodes, and similar values may fail on `postMessage(...)`.

### Getting the current `MasonryMatrix` state

- `getState()` returns a snapshot of service state. Its `columnsHeights` and `order` fields are cloned, so you can read them without risking damage to the internal state.

### Limitations

- The library has no API for removing, updating, or selectively reordering individual items.
- The library does not work with the DOM by itself. Measuring the container, choosing breakpoints, and rendering are your responsibility.
- `recreate()` does not automatically reuse previous items from `append()`. If you need a rebuild from source data, pass `items` explicitly.

## Errors and validation

The library validates matrix parameters and filters items.

Invalid matrix parameters:

- `rootWidth <= 0` or `rootWidth` is not a finite number
- `columnCount <= 0` or `columnCount` is not an integer
- `gap < 0` or `gap` is not a finite number
- `gap` leaves no positive space for columns

Invalid items in `append()` or `recreate({ items })` do not throw. They are skipped instead. An item is skipped if its `id` is neither a finite number nor a non-empty string, or if its `width` or `height` is not a positive finite number.

Top-level errors come as `MasonryMatrixError`. The original reason may appear inside `cause`, including a `Worker` error, a structured clone / `postMessage(...)` error, or an engine validation error.

Typical top-level messages:

- `Failed to append items to the matrix`
- `Failed to sort source matrix`
- `Failed to recreate the matrix`

Typical internal causes in `cause`:

- `Failed to receive a message from the worker`
- `Worker execution failed`
- `Worker was terminated`

## Benchmark

```bash
pnpm test:bench
```

Current benchmark suites live in:

- [`src/core/LayoutCalculationEngine/__test__/runtime/Matrix/Matrix.bench.ts`](src/core/LayoutCalculationEngine/__test__/runtime/Matrix/Matrix.bench.ts)
- [`src/utils/__tests__/kWayMerge.bench.ts`](src/utils/__tests__/kWayMerge.bench.ts)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md)

## Security

See [SECURITY.md](SECURITY.md)

## License

The project is distributed under the MPL 2.0 license.

## Links

- Author: [@steelWinds](https://github.com/steelWinds)
- Issues: [Open an issue](https://github.com/steelWinds/masonry-blade/issues)
- Telegram: @plutograde
- Email: [Send an email](mailto:kirillsurov0@gmail.com)
