# masonry-blade

Algo-oriented lib for create masonry grid

> Only images are supported for now.

<div align="center">
  <img width="300" src="./.github/logo.png" alt="masonry-blad logo">
  <h3 align="center">masonry-blade</h3>
</div>

![GitHub License](https://img.shields.io/github/license/steelWinds/masonry-blade)
![NPM Unpacked Size](https://img.shields.io/npm/unpacked-size/masonry-blade)
![NPM Version](https://img.shields.io/npm/v/masonry-blade)

## Quick Start

### Installation

```bash
pnpm i masonry-blade
```

### Basic Usage

```MasonryMatrix``` is a stateful helper for building and updating a masonry layout incrementally.

It works with two main operations:

```appendItems(...)``` — append a new batch of items to the existing layout

```recreateMatrix(...)``` — rebuild the entire layout with a new column count or container width

> Important: the constructor and ```recreateMatrix(...)``` accept the root container width, not the width of a single column. The actual column width is calculated internally as ```Math.floor(rootWidth / count)```.

#### Create a matrix
```ts
import { MasonryMatrix } from 'masonry-blade';

const matrix = new MasonryMatrix(4, 1280);
```

Arguments:

- ```4``` — number of columns

- ```1280``` — root/container width in pixels

In this example, the internal column width will be:

```Math.floor(1280 / 4) // 320```

#### Append items

```ts
const items = [
  { id: '1', src: '/images/1.jpg', width: 1200, height: 1800 },
  { id: '2', src: '/images/2.jpg', width: 1600, height: 900 },
  { id: '3', src: '/images/3.jpg', width: 1000, height: 1500 },
];

const columns = await matrix.appendItems(items);
```

> ```appendItems(...)``` appends a new batch to the current matrix and returns the updated column structure.

**Each item must include:**

- ```id```
- ```src```
- ```width```
- ```height```

#### Append more items later

```ts
const nextBatch = [
  { id: '4', src: '/images/4.jpg', width: 1400, height: 2100 },
  { id: '5', src: '/images/5.jpg', width: 1200, height: 1200 },
];

const updatedColumns = await matrix.appendItems(nextBatch);
```

This is useful for:

- infinite scroll
- lazy loading
- paginated feeds

> All previously appended items are stored internally, so new batches are > placed on top of the existing masonry state.

#### Rebuild the matrix

If the container width or number of columns changes, rebuild the matrix:

```ts
const rebuiltColumns = await matrix.recreateMatrix(6, 1440);
```

In this example:

- column count becomes 6
- root width becomes 1440
- internal column width becomes Math.floor(1440 / 6)

> ```recreateMatrix(...)``` rebuilds the layout from all previously appended items.

#### Full example

```ts
import { MasonryMatrix } from 'masonry-blade';

const matrix = new MasonryMatrix(4, 1280);

await matrix.appendItems([
  { id: '1', src: '/images/1.jpg', width: 1200, height: 1800 },
  { id: '2', src: '/images/2.jpg', width: 1600, height: 900 },
]);

await matrix.appendItems([
  { id: '3', src: '/images/3.jpg', width: 1000, height: 1500 },
  { id: '4', src: '/images/4.jpg', width: 1400, height: 2100 },
]);

const columns = await matrix.recreateMatrix(5, 1500);

console.log(columns);
```

#### Notes

- ```appendItems(...)``` **and** ```recreateMatrix(...)``` **are asynchronous**.
- **Do not call them in parallel on the same instance.**
- ```recreateMatrix(...)``` **rebuilds the layout using all previously appended items.**
- **The matrix uses rootWidth, not column width. Column width is derived internally from count and rootWidth.**

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
