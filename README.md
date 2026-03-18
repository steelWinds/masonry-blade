# masonry-blade

## [Русская версия](./README.ru.md)

<p>
  <img align="right" width="30%" src="./.github/logo.png" alt="masonry-blade logo">
</p>

Zero-dependency engine for calculating masonry-style image grids.
If `Web Worker` is available in the current environment, calculations are offloaded to it.

![GitHub License](https://img.shields.io/github/license/steelWinds/masonry-blade)
[![Module type: ESM](https://img.shields.io/badge/module%20type-esm-brightgreen)](https://github.com/voxpelli/badges-cjs-esm)
[![build-validate](https://github.com/steelWinds/masonry-blade/actions/workflows/build-validate.yml/badge.svg)](https://github.com/steelWinds/masonry-blade/actions/workflows/build-validate.yml)
[![CodeQL](https://github.com/steelWinds/masonry-blade/actions/workflows/github-code-scanning/codeql/badge.svg)](https://github.com/steelWinds/masonry-blade/actions/workflows/codeql.yml)
![NPM Version](https://img.shields.io/npm/v/masonry-blade)
![NPM Unpacked Size](https://img.shields.io/npm/unpacked-size/masonry-blade)
![npm package minimized gzipped size](https://img.shields.io/bundlejs/size/masonry-blade)
[![codecov](https://codecov.io/gh/steelWinds/masonry-blade/graph/badge.svg?token=48NKR93X2A)](https://codecov.io/gh/steelWinds/masonry-blade)

## What it does

`masonry-blade` calculates a masonry matrix for image data.

It does not render UI.
It only distributes items across equal-width columns and returns a structure that you can render in any interface.

## Why use it

- Zero dependencies.
- UI-agnostic.
- Optional `Web Worker` offloading.
- Incremental appends for infinite scroll and progressive loading.
- Full matrix rebuild on resize without re-passing the original items.
- Generic `meta` support for app-specific data.

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

```ts
import {
	MasonryMatrix,
	MatrixError,
	MATRIX_ERROR_MESSAGES,
	type ImageItem,
	type MatrixItem,
} from 'masonry-blade';
```

Exports:

- `MasonryMatrix` — main class for building the matrix.
- `MatrixError` — custom library error.
- `MATRIX_ERROR_MESSAGES` — exported error message constants.
- `ImageItem<T>` — input item type.
- `MatrixItem<T>` — output item type after placement.

## Quick start

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

## How it works

1. Create a `MasonryMatrix` with container width and column count.
2. Pass items to `appendItems(...)`.
3. Render the returned columns in your UI.
4. Call `recreateMatrix(...)` when width or column count changes.

`recreateMatrix(...)` rebuilds the layout from the internal list of already appended raw items.
You do not need to pass the same items again.

Each output item always gets the current column width.
Its height is recalculated proportionally from the original aspect ratio.

## Layout strategy

Each next item is placed into the current shortest column.

This is a greedy balancing strategy.
It does not provide a formal guarantee of a fixed maximum height gap between columns, but it is fast and gives a strong quality/speed trade-off for this kind of engine.

The library supports images only.
`width` and `height` must be known in advance.

## Types

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

Use `meta` for any related data such as `alt`, `title`, `author`, `href`, internal IDs, flags, and so on.

If you provide a generic `T`, both `ImageItem<T>` and `MatrixItem<T>` include `meta: T`.

## Example with `meta`

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

## Example: rebuild on resize

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

| Parameter   | Type     | Required | Description                    |
| ----------- | -------- | -------- | ------------------------------ |
| `rootWidth` | `number` | yes      | Container width                |
| `count`     | `number` | no       | Number of columns, default `1` |

### `await appendItems(items)`

Adds a new batch of items to the current matrix and returns the columns.

```ts
appendItems(items: readonly ImageItem<T>[]): Promise<readonly MatrixItem<T>[][]>
```

Useful for initial load, infinite scroll, and progressive image loading.

### `await recreateMatrix(rootWidth, count?)`

Completely rebuilds the matrix with a new container width and/or a new column count, using all previously appended items.

```ts
recreateMatrix(rootWidth: number, count?: number): Promise<readonly MatrixItem<T>[][]>
```

Useful on resize, breakpoint changes, or layout mode switches.

### `terminateWorker()`

Forcefully terminates the internal worker if it has been created.
The next call to `appendItems(...)` or `recreateMatrix(...)` creates a new worker automatically.

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
- `MATRIX_ERROR_MESSAGES.CONCURRENT_CALL`
- `MATRIX_ERROR_MESSAGES.RECREATE_MATRIX`
- `MATRIX_ERROR_MESSAGES.UPDATE_INTERNAL_STATE`
- `MATRIX_ERROR_MESSAGES.RECEIVE_FROM_WORKER`
- `MATRIX_ERROR_MESSAGES.WORKER_ERROR`
- `MATRIX_ERROR_MESSAGES.WORKER_TERMINATED`

## Runtime constraints

### Concurrent calls are not supported

Do not call `appendItems(...)` and/or `recreateMatrix(...)` in parallel on the same `MasonryMatrix` instance.

These operations must be serialized by the caller.

If a second call starts while the previous matrix update is still in flight, the library throws a `MatrixError`.

In practice:

- do not start a second `appendItems(...)` before the previous one finishes;
- do not call `recreateMatrix(...)` while `appendItems(...)` is running;
- do not call `appendItems(...)` while `recreateMatrix(...)` is running.

### Worker mode uses structured clone

If `Worker` is available in the current environment, matrix data is sent through `postMessage(...)`.

Because of that, transferred data must be compatible with the structured clone algorithm.

This matters most for `meta` when you use `ImageItem<T>` / `MatrixItem<T>` with a generic type.

Do not put non-cloneable values into `meta`, for example:

- functions;
- DOM nodes;
- class instances with non-serializable internal state;
- unsupported custom objects for your target runtime.

If the payload cannot be cloned for worker transfer, the library throws a `MatrixError`.

Typical cases:

- `appendItems(...)` throws if the provided batch cannot be cloned;
- `recreateMatrix(...)` throws if previously accumulated raw items cannot be cloned.

A good rule of thumb: keep `meta` close to JSON-like application data.

### Returned columns are internal state references

Treat returned columns as read-only.

Do not mutate them manually with `push`, `splice`, direct assignment, and so on.

In worker mode, do not rely on referential identity for `meta`, because data is transferred through structured clone.

## Important notes

- Items with `width <= 0` or `height <= 0` are silently skipped.
- `count = 0` is allowed, but it produces an empty matrix mode.
- If `Worker` is not available, calculations run on the main thread.
- The library knows nothing about the DOM, React, Vue, lazy loading, card rendering, or styling. It only returns layout data.

## Benchmark

```bash
pnpm benchmark
```

Latest benchmark results: [benchmark/benchmark-results.md](benchmark/benchmark-results.md)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md)

## Security

See [SECURITY.md](SECURITY.md)

## License

This project is licensed under MPL 2.0.

## Links

- Author: [@steelWinds](https://github.com/steelWinds)
- Issues: [New issue](https://github.com/steelWinds/masonry-blade/issues)
- Telegram: @plutograde
- Email: [Send me an email](mailto:kirillsurov0@gmail.com)
