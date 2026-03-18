# masonry-blade

## [Русская версия](./README.ru.md)

<p>
  <img align="right" width="30%" src="./.github/logo.png" alt="masonry-blade logo">
</p>

Algorithm-oriented library for calculating a masonry grid with zero dependencies 🧱 If a Web Worker is available in the current environment, computations are offloaded to it.

> Internally, the matrix is balanced with a greedy strategy: each next item is placed into the current shortest column. This is not a formal guarantee of a fixed height gap, but in practice it delivers an almost ideal compromise between quality and speed for an engine of this type.

> This is an **engine** for building a _masonry-style_ matrix without touching the UI layer.

> Made with love. ❤️

![GitHub License](https://img.shields.io/github/license/steelWinds/masonry-blade)

[![build-validate](https://github.com/steelWinds/masonry-blade/actions/workflows/build-validate.yml/badge.svg)](https://github.com/steelWinds/masonry-blade/actions/workflows/build-validate.yml)
[![CodeQL](https://github.com/steelWinds/masonry-blade/actions/workflows/github-code-scanning/codeql/badge.svg)](https://github.com/steelWinds/masonry-blade/actions/workflows/codeql.yml)

![NPM Version](https://img.shields.io/npm/v/masonry-blade)
![NPM Unpacked Size](https://img.shields.io/npm/unpacked-size/masonry-blade)
![npm package minimized gzipped size](https://img.shields.io/bundlejs/size/masonry-blade)

[![codecov](https://codecov.io/gh/steelWinds/masonry-blade/graph/badge.svg?token=48NKR93X2A)](https://codecov.io/gh/steelWinds/masonry-blade)

## Quick start

`masonry-blade` is an engine for calculating a masonry matrix.

The library **does not render UI**. It only distributes images across columns and returns a data structure that you can render in your own interface.

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
- `MATRIX_ERROR_MESSAGES` — exported constants with error message strings.
- `ImageItem<T>` — the input item type.
- `MatrixItem<T>` — the item type after placement in the matrix.

### How it works

1. Create a `MasonryMatrix` instance by passing the container width and the number of columns.
2. Pass images through `appendItems(...)`.
3. Get the array of columns.
4. When the container width changes, call `recreateMatrix(...)` to rebuild the layout from already appended items.

> `recreateMatrix(...)` does not require you to pass the items again. The library rebuilds the matrix from its internal list of previously appended raw items.

> Each resulting item always gets the column width, and its height is recalculated proportionally based on the original aspect ratio.

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

> `meta` is convenient for any related data: `alt`, `title`, `author`, `href`, internal IDs, flags, and so on.

> Internally, the library relies on the `Meta<T>` concept, meaning “item + user data”. It is not exported as a separate public type, but from the public API perspective the behavior is straightforward: as soon as you provide a generic `T`, both `ImageItem<T>` and `MatrixItem<T>` include `meta: T`.

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

### Example: rebuilding on resize

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

> Useful for initial load, infinite scroll, and progressive image loading.

### `await recreateMatrix(rootWidth, count?)`

Completely rebuilds the matrix with a new container width and/or a new column count, using **all previously appended** items.

```ts
recreateMatrix(rootWidth: number, count?: number): Promise<readonly MatrixItem<T>[][]>
```

> Usually called on resize, breakpoint changes, or layout mode switches.

### `terminateWorker()`

Forcefully terminates the internal worker if it has been created. The next call to `appendItems(...)` or `recreateMatrix(...)` automatically creates a new worker.

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

## Concurrent calls and structured clone

`MasonryMatrix` does not support concurrent calls on the same instance.

Do not call `appendItems(...)` and/or `recreateMatrix(...)` in parallel on the same `MasonryMatrix`. These operations must be serialized by the caller.

If a concurrent call happens while a previous matrix update is still in flight, the library throws a `MatrixError`.

In practice, this means:

- do not start a second `appendItems(...)` before the previous one has finished;
- do not call `recreateMatrix(...)` while `appendItems(...)` is still running;
- do not call `appendItems(...)` while `recreateMatrix(...)` is still running.

### Structured clone requirement for Worker mode

If `Worker` is available in the current environment, the library sends matrix data to the worker via `postMessage(...)`.

Because of that, all transferred data must be compatible with the browser's **structured clone algorithm**.

This is especially important for `meta` when you use `ImageItem<T>` / `MatrixItem<T>` with a generic type.

Do not put non-cloneable values into `meta`, for example:

- functions;
- DOM nodes;
- class instances with non-serializable internal state;
- unsupported custom objects for your target runtime.

If the payload for the worker cannot be cloned, the library throws a `MatrixError`.

Typical examples:

- `appendItems(...)` throws if the provided batch cannot be cloned for worker transfer;
- `recreateMatrix(...)` throws if previously accumulated raw items cannot be cloned for worker transfer.

### Practical recommendation

Keep `meta` as simple structured data:

- strings;
- numbers;
- booleans;
- `null`;
- arrays;
- plain objects;
- other values that are safely supported by structured clone in your target runtime.

A good rule of thumb is: if your `meta` looks like JSON-like application data, it is usually a good fit for Worker mode.

## Important notes

- Items with `width <= 0` or `height <= 0` are silently skipped.
- `count = 0` is allowed, but it means an empty matrix mode: column width becomes `0`, and `appendItems(...)` places nothing.
- The library supports images only: `width` and `height` must be known in advance.
- If `Worker` is not available in the current environment, the library still works — computations are simply performed on the main thread.
- Returned columns should be treated as read-only, even though they are regular arrays at runtime.
- Do not rely on referential identity for `meta` when using Worker mode: data is transferred via structured clone.
- See the `Concurrent calls and structured clone` section above for important runtime constraints.

> `masonry-blade` knows nothing about the DOM, React, Vue, card rendering, lazy loading, or styling. The library only returns layout data that can be rendered in any UI layer.

> The matrix state is mutable internally, and the returned columns are references to that state. Do not mutate them manually with `push`, `splice`, direct assignment, and so on.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md)

### Benchmark

```bash
pnpm benchmark
```

Latest benchmark results: [benchmark/benchmark-results.md](benchmark/benchmark-results.md)

## License

This project is licensed under MPL 2.0.

## Security

See [SECURITY.md](SECURITY.md)

## Links

- Author: [@steelWinds](https://github.com/steelWinds)
- Issues: [New issue](https://github.com/steelWinds/masonry-blade/issues)
- Telegram: @plutograde
- Email: [Send me an email](mailto:kirillsurov0@gmail.com)
