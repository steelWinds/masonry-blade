# masonry-blade

Algo-oriented library for calculating masonry grids with zero dependencies 🧱 It uses Web Worker-based computation when a worker is available.

> Internally, the matrix is balanced with a greedy strategy: each next item is placed into the current shortest column. This is not a formal guarantee of a fixed height gap, but in practice it gives an almost ideal quality/speed trade-off for this kind of engine.

> At the moment, only images are supported. This is an **engine** for building a _masonry-style_ matrix without touching the UI layer.

> Made with love. ❤️

[Русская версия](./README.ru.md)

![GitHub License](https://img.shields.io/github/license/steelWinds/masonry-blade)

![NPM Version](https://img.shields.io/npm/v/masonry-blade)
![NPM Unpacked Size](https://img.shields.io/npm/unpacked-size/masonry-blade)
![npm package minimized gzipped size](https://img.shields.io/bundlejs/size/masonry-blade)

[![build-validate](https://github.com/steelWinds/masonry-blade/actions/workflows/build-validate.yml/badge.svg)](https://github.com/steelWinds/masonry-blade/actions/workflows/build-validate.yml)
[![codecov](https://codecov.io/gh/steelWinds/masonry-blade/graph/badge.svg?token=48NKR93X2A)](https://codecov.io/gh/steelWinds/masonry-blade)

<div align="center">
  <img width="300" src="./.github/logo.png" alt="masonry-blade logo">
</div>

## Quick start

`masonry-blade` is an engine for calculating a masonry matrix.

It does **not render UI**. It only distributes images across columns and returns a data structure that you can render in your own interface.

### Installation

```bash
npm i masonry-blade
```

```bash
yarn add masonry-blade
```

```bash
pnpm add masonry-blade
```

### Public API

```ts
import {
	MasonryMatrix,
	MatrixError,
	MATRIX_ERROR_MESSAGES,
	type ImageItem,
	type MatrixItem,
} from 'masonry-blade';
```

Public exports:

- `MasonryMatrix` — the main class for building the matrix.
- `MatrixError` — the library's custom error.
- `MATRIX_ERROR_MESSAGES` — exported error message constants.
- `ImageItem<T>` — the input item type.
- `MatrixItem<T>` — the placed item type returned by the matrix.

### How it works

1. Create a `MasonryMatrix` instance with a container width and column count.
2. Pass images through `appendItems(...)`.
3. Get an array of columns.
4. When the container width changes, call `recreateMatrix(...)` to rebuild the layout from already appended items.

> `recreateMatrix(...)` does not require you to pass items again. The library rebuilds the matrix from the internal list of already appended source items.

> Each resulting item always gets the column width, and its height is recalculated proportionally from the original aspect ratio.

### Input and output types

```ts
type ImageItem<T = never> = {
	id: number | string;
	src: string;
	width: number;
	height: number;
} & (T extends never ? {} : { meta: T });

// conceptual shape

type MatrixItem<T = never> = {
	id: number | string;
	src: string;
	width: number; // column width
	height: number; // scaled height inside the matrix
} & (T extends never ? {} : { meta: T });
```

> `meta` is convenient for any related data: `alt`, `title`, `author`, `href`, internal ids, flags, and so on.

> Internally the library has a `Meta<T>` concept meaning “item + user-defined data”. It is not exported as a separate public type, but this is how the public API behaves: once you provide a generic `T`, both `ImageItem<T>` and `MatrixItem<T>` include `meta: T`.

### Example: minimal usage

```ts
import { MasonryMatrix, type ImageItem, type MatrixItem } from 'masonry-blade';

const matrix = new MasonryMatrix(1200, 3);

const items: ImageItem[] = [
	{
		id: 'photo-1',
		src: 'https://example.com/1.jpg',
		width: 1200,
		height: 900,
	},
	{
		id: 'photo-2',
		src: 'https://example.com/2.jpg',
		width: 1000,
		height: 1500,
	},
	{
		id: 'photo-3',
		src: 'https://example.com/3.jpg',
		width: 1600,
		height: 900,
	},
];

const columns: readonly MatrixItem[][] = await matrix.appendItems(items);

console.log(columns);
// [
//   [ { id, src, width, height }, ... ],
//   [ { id, src, width, height }, ... ],
//   [ { id, src, width, height }, ... ],
// ]
```

### Example: usage with `meta`

```ts
import { MasonryMatrix, type ImageItem, type MatrixItem } from 'masonry-blade';

type PhotoMeta = {
	alt: string;
	author: string;
	href: string;
};

const matrix = new MasonryMatrix<PhotoMeta>(900, 2);

const items: readonly ImageItem<PhotoMeta>[] = [
	{
		id: 'a',
		src: 'https://example.com/a.jpg',
		width: 1200,
		height: 800,
		meta: {
			alt: 'Mountains at sunrise',
			author: 'Kate',
			href: '/photos/a',
		},
	},
	{
		id: 'b',
		src: 'https://example.com/b.jpg',
		width: 800,
		height: 1200,
		meta: {
			alt: 'City lights',
			author: 'Alex',
			href: '/photos/b',
		},
	},
];

const columns: readonly MatrixItem<PhotoMeta>[][] =
	await matrix.appendItems(items);
const firstItem: MatrixItem<PhotoMeta> = columns[0][0];

console.log(firstItem.meta.author);
// Kate
```

### Example: rebuild on resize

```ts
import { MasonryMatrix, type ImageItem, type MatrixItem } from 'masonry-blade';

const matrix = new MasonryMatrix(1200, 4);

const items: readonly ImageItem[] = [
	{ id: 1, src: '/1.jpg', width: 1200, height: 800 },
	{ id: 2, src: '/2.jpg', width: 900, height: 1400 },
	{ id: 3, src: '/3.jpg', width: 1600, height: 900 },
];

const desktopColumns: readonly MatrixItem[][] = await matrix.appendItems(items);
const mobileColumns: readonly MatrixItem[][] = await matrix.recreateMatrix(
	640,
	2,
);

console.log(desktopColumns.length);
// 4

console.log(mobileColumns.length);
// 2
```

## API reference

### `new MasonryMatrix(rootWidth, count?)`

Creates a new matrix instance.

| Param       | Type     | Required | Description                  |
| ----------- | -------- | -------- | ---------------------------- |
| `rootWidth` | `number` | yes      | Container width              |
| `count`     | `number` | no       | Column count, default is `1` |

### `await appendItems(items)`

Appends a new batch of items to the current matrix and returns the columns.

```ts
appendItems(items: readonly ImageItem<T>[]): Promise<readonly MatrixItem<T>[][]>
```

> Useful for initial load, infinite scroll, and progressive image loading.

### `await recreateMatrix(rootWidth, count?)`

Fully recreates the matrix with a new container width and/or a new column count using **all previously appended** items.

```ts
recreateMatrix(rootWidth: number, count?: number): Promise<readonly MatrixItem<T>[][]>
```

> Usually called on resize, breakpoint changes, or layout mode switches.

### `terminateWorker()`

Forcefully terminates the internal worker if one was created. The next call to `appendItems(...)` or `recreateMatrix(...)` will create a new worker automatically.

## Errors

All library errors are thrown as `MatrixError`.

```ts
import {
	MasonryMatrix,
	MatrixError,
	MATRIX_ERROR_MESSAGES,
	type ImageItem,
} from 'masonry-blade';

const matrix = new MasonryMatrix(800, 2);
const items: ImageItem[] = [
	{ id: '1', src: '/1.jpg', width: 1000, height: 700 },
];

try {
	await matrix.appendItems(items);
} catch (error: unknown) {
	if (error instanceof MatrixError) {
		if (error.message === MATRIX_ERROR_MESSAGES.APPEND_ITEMS) {
			console.error('Append failed');
		}

		console.error(error.cause);
	}
}
```

Available error messages:

- `MATRIX_ERROR_MESSAGES.APPEND_ITEMS`
- `MATRIX_ERROR_MESSAGES.RECREATE_MATRIX`
- `MATRIX_ERROR_MESSAGES.UPDATE_INTERNAL_STATE`
- `MATRIX_ERROR_MESSAGES.RECEIVE_FROM_WORKER`
- `MATRIX_ERROR_MESSAGES.WORKER_ERROR`
- `MATRIX_ERROR_MESSAGES.WORKER_TERMINATED`

## Important notes

- Items with `width <= 0` or `height <= 0` are silently skipped.
- `count = 0` is allowed, but it means an empty matrix mode: column width becomes `0`, and `appendItems(...)` places nothing.
- The library supports images only: `width` and `height` must be known in advance.
- If `Worker` is unavailable in the current environment, the library still works — computation simply falls back to the main thread.
- Returned columns should be treated as read-only even though they are regular arrays at runtime.
- `meta` is passed by reference when it is an object.
- Calls to `appendItems(...)` and `recreateMatrix(...)` must be serialized for a single `MasonryMatrix` instance: do not run them in parallel.

> `masonry-blade` knows nothing about the DOM, React, Vue, card rendering, lazy loading, or styling. It only returns layout data that can be rendered in any UI layer.

> The matrix state is mutable internally, and returned columns are references to that state. Do not mutate them manually with `push`, `splice`, direct assignment, and so on.

## Development

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
