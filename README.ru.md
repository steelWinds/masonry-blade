# masonry-blade

![GitHub License](https://img.shields.io/github/license/steelWinds/masonry-blade)
[![Module type: ESM](https://img.shields.io/badge/module%20type-esm-brightgreen)](https://github.com/voxpelli/badges-cjs-esm)
[![build-validate](https://github.com/steelWinds/masonry-blade/actions/workflows/build-validate.yml/badge.svg)](https://github.com/steelWinds/masonry-blade/actions/workflows/build-validate.yml)
[![CodeQL](https://github.com/steelWinds/masonry-blade/actions/workflows/github-code-scanning/codeql/badge.svg)](https://github.com/steelWinds/masonry-blade/actions/workflows/codeql.yml)
![NPM Version](https://img.shields.io/npm/v/masonry-blade)
![NPM Unpacked Size](https://img.shields.io/npm/unpacked-size/masonry-blade)
![npm package minimized gzipped size](https://img.shields.io/bundlejs/size/masonry-blade)
[![codecov](https://codecov.io/gh/steelWinds/masonry-blade/graph/badge.svg?token=48NKR93X2A)](https://codecov.io/gh/steelWinds/masonry-blade)

## [English version](./README.md)

<p>
  <img align="right" width="150" height="150" src="./.github/logo.webp" alt="masonry-blade logo">
</p>

**masonry-blade** - маленький и быстрый движок для расчёта masonry-сеток без зависимостей.

- **🪶 Очень маленький.** Решает одну задачу и не разрастается во фреймворк.
- **⚡ Быстрый.** Жадная балансировка, мутируемое состояние и минимум лишней работы.
- **⚖️ Сбалансированный.** Каждый новый элемент попадает в самую короткую колонку.
- **📦 Без зависимостей.** Только расчёт, координаты и типы.
- **🎨 Не привязан к UI.** Подходит для `React`, `Vue`, `Svelte`, `Canvas` и `Vanilla JS`.
- **🏷️ Поддерживает метаданные.** В элементах сетки могут быть любые дополнительные данные для их последующей отрисовки.
- **💤 Поддерживает lazy-load.** Добавляй элементы порциями без потери текущей раскладки.
- **🔄 Умеет пересобирать матрицу.** Раскладку можно пересчитать под новую ширину, число колонок и `gap` из явно переданного батча элементов.
- **🧵 Умеет работать через `Web Worker`.** А при его отсутствии или отключении спокойно считает синхронно.

> Вы даёте ему исходные размеры элементов, а он возвращает готовые `x`, `y`, `width`, `height` для рендера в любом UI. Без DOM, без привязки к фреймворку и без раздутого API.

## Установка

```bash
npm i masonry-blade
```

```bash
yarn add masonry-blade
```

```bash
pnpm add masonry-blade
```

## Публичное API

У пакета только одна публичная точка входа: `masonry-blade`.

Из неё экспортируются:

- `MasonryMatrix` - основной runtime-фасад
- `MasonryMatrixError` и `MASONRY_MATRIX_ERROR_MESSAGES` - ошибки и константы фасада
- TypeScript-контракты: `MasonryMatrixErrorMessage`, `MasonryMatrixState` и `RecreateOptions`

```ts
import {
	MasonryMatrix,
	MasonryMatrixError,
	MASONRY_MATRIX_ERROR_MESSAGES,
	type MasonryMatrixErrorMessage,
	type MasonryMatrixState,
	type RecreateOptions,
} from 'masonry-blade';
```

### Конструктор

```ts
new MasonryMatrix<TMeta = undefined>(rootWidth: number, columnCount: number, gap: number)
```

- `rootWidth` - ширина контейнера
- `columnCount` - число колонок
- `gap` - расстояние между колонками по горизонтали и между элементами по вертикали

Все три аргумента конструктора обязательны.

### Методы

```ts
await matrix.append(items);
```

Добавляет новую пачку элементов в текущую матрицу и возвращает колонки.

```ts
await matrix.sort(source);
```

Преобразует matrix-source в один плоский массив, отсортированный по визуальному порядку: сначала по `y`, затем по `x`.
Матрицу заново не пересобирает и текущее состояние фасада не мутирует.

```ts
await matrix.recreate({
	rootWidth,
	columnCount?,
	gap?,
	items?,
})
```

Пересобирает матрицу с нуля только по `items`, переданным в `options`.
Если `items` не переданы, матрица пересобирается как пустая раскладка.
Если `columnCount` и `gap` не переданы, используются последние успешные значения. Сначала это значения из конструктора, потом - значения последнего успешного `recreate(...)`.

```ts
matrix.terminateWorker();
```

Останавливает текущий `Worker`, если он был создан. Если в этот момент worker-расчёт ещё выполнялся, текущий `Promise` будет отклонён.

```ts
matrix.disableWorker();
```

Останавливает текущий `Worker` и переводит все следующие расчёты в синхронный режим.

```ts
matrix.enableWorker();
```

Снова разрешает worker-режим и сразу пытается создать новый `Worker`. Если среда его не поддерживает или создание не удалось, библиотека снова остаётся в синхронном режиме.

```ts
const state = matrix.getState();
```

Возвращает снимок текущего состояния фасада: `columnCount`, `columnWidth`, `gap`, `workerCreated`, `workerDisabled`, а также копии `columnsHeights` и `order`.
Это безопасный способ прочитать служебное состояние без доступа к живым внутренним колонкам.

## Какие данные ждёт библиотека

Во входных элементах ожидаются обычные объекты такой формы:

```ts
{
	id: string | number;
	width: number;
	height: number;
	meta?: TMeta;
}
```

`append()` и `recreate()` возвращают матрицу такой формы:

```ts
readonly (readonly {
	id: string | number;
	width: number;
	height: number;
	x: number;
	y: number;
	meta?: TMeta;
}[])[]
```

`sort()` возвращает плоский список такой формы:

```ts
readonly Readonly<{
	id: string | number;
	width: number;
	height: number;
	x: number;
	y: number;
	meta?: TMeta;
}>[]
```

Если вы создаёте `new MasonryMatrix<TMeta>(...)`, любое переданное `meta` будет типизировано как `TMeta`, а выходные элементы сохранят то же `meta`.

Важно: `width` и `height` на выходе уже пересчитаны под ширину колонки. Это не исходные размеры.

## Быстрый старт

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

`append()`, `sort()` и `recreate()` всегда асинхронные. Даже если `Worker` не используется, вы всё равно работаете через `await`.

## Как это работает

Внутри всё очень просто:

1. Сначала считается ширина колонки:

```ts
columnWidth = (rootWidth - gap * (columnCount - 1)) / columnCount;
```

2. Высота элемента масштабируется по исходному соотношению сторон.
3. Следующий элемент кладётся в самую короткую колонку.
4. Библиотека считает `x` и `y` для виртуального холста.

Это даёт быструю и визуально ровную раскладку без сложных эвристик.

## Пример с `meta`

`meta` не участвует в расчётах, но проходит через всю матрицу вместе с элементом.
Если вы создаёте `MasonryMatrix<TMeta>`, любое переданное `meta` будет типизировано как `TMeta`.

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

## Пример: получить плоский порядок для рендера

`append()` и `recreate()` возвращают колонки. Если нужен один плоский список для рендера сверху вниз и затем слева направо, вызывайте `sort(...)`.

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

## Пример с координатами

Ниже самодостаточный пример на Vanilla JS с абсолютным позиционированием:

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

	render(await matrix.append(initialItems));
}

main();
```

## Пример: пересборка при resize

`recreate()` заново считает сетку по явно переданному списку элементов.

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

	render(await matrix.append(initialItems));

	window.addEventListener('resize', async () => {
		const width = container.clientWidth;
		const columns = width < 768 ? 2 : width < 1200 ? 3 : 4;

		const rebuilt = await matrix.recreate({
			rootWidth: width,
			columnCount: columns,
			items: initialItems,
		});

		render(rebuilt);
	});
}

main();
```

Если вызвать только `recreate({ rootWidth: newWidth })`, библиотека использует последние успешные `columnCount` и `gap`, но так как `items` не переданы, пересобранная раскладка будет пустой.

## Пример: управление `Worker`

```ts
import { MasonryMatrix } from 'masonry-blade';

const matrix = new MasonryMatrix(1200, 3, 16);

let columns;

matrix.disableWorker();

columns = await matrix.append([{ id: 1, width: 1, height: 1 }]); // гарантированно синхронный расчёт

matrix.enableWorker();

columns = await matrix.recreate({
	rootWidth: 1200,
	items: [{ id: 1, width: 1, height: 1 }],
}); // библиотека снова пытается использовать Worker

console.log(columns);
```

## Важные замечания

### Мутация выходных данных:

- Считайте возвращённую раскладку read-only. Контейнерные массивы безопасны для чтения, но мутация самих item-объектов не входит в публичный контракт.
- Считайте входные элементы неизменяемыми, пока выполняется вызов.
- В worker-режиме payload проходит через structured clone, поэтому значения в `meta` тоже должны быть cloneable.
- `sort()` читает только переданный `source` и не модифицирует сохранённое состояние матрицы.

### Работа с невалидными объектами:

- `append()` и `recreate({ items })` молча пропускают элементы, у которых невалидный `id`, либо `width` или `height` не являются положительными конечными числами.

### Работа с Web-Worker:

- `terminateWorker()`, `disableWorker()` и `enableWorker()` могут прервать текущий worker-расчёт.
- Если `Worker` недоступен или создание не удалось, библиотека автоматически переключается на синхронный путь и остаётся в нём, пока вы явно не вызовете `enableWorker()`.
- После `disableWorker()` синхронный режим сохраняется до явного `enableWorker()`.
- Если расчёт идёт через `Worker`, данные в `meta` должны поддерживать structured clone. Функции, DOM-узлы и похожие значения могут вызвать ошибку на `postMessage(...)`.

### Получение текущего состояния MasonryMatrix:

- `getState()` возвращает снимок служебного состояния. Поля `columnsHeights` и `order` в нём клонируются, поэтому их можно читать без риска повредить внутренний state экземпляра.

### Ограничения

- У библиотеки нет API для удаления, обновления или точечной перестановки отдельных элементов.
- Библиотека не работает с DOM сама. Измерение контейнера, выбор breakpoints и рендер - на вашей стороне.
- `recreate()` не переиспользует предыдущие батчи из `append()` автоматически. Если нужна пересборка по исходным данным, передавайте `items` явно.

## Ошибки и валидация

Библиотека валидирует параметры матрицы и фильтрует батчи элементов.

Невалидные параметры матрицы:

- `rootWidth <= 0` или `rootWidth` не является конечным числом
- `columnCount <= 0` или `columnCount` не является целым числом
- `gap < 0` или `gap` не является конечным числом
- `gap` не оставляет положительного места под колонки

Невалидные элементы в `append()` или `recreate({ items })` не выбрасывают ошибку, а пропускаются. Элемент пропускается, если у него невалидный `id`, либо `width` или `height` не являются положительными конечными числами.

Ошибки верхнего уровня приходят как `MasonryMatrixError`. Внутри `cause` может лежать исходная причина, в том числе ошибка `Worker`, ошибка structured clone / `postMessage(...)` или ошибка валидации движка.

Типичные сообщения верхнего уровня:

- `Failed to append items to the matrix`
- `Failed to sort source matrix`
- `Failed to recreate the matrix`

Типичные внутренние причины в `cause`:

- `Failed to receive a message from the worker`
- `Worker execution failed`
- `Worker was terminated`

## Бенчмарк

```bash
pnpm test:bench
```

Текущие benchmark-наборы лежат в:

- [src/core/LayoutCalculationEngine/**test**/runtime/Matrix/Matrix.bench.ts](src/core/LayoutCalculationEngine/__test__/runtime/Matrix/Matrix.bench.ts)
- [src/utils/**tests**/kWayMerge.bench.ts](src/utils/__tests__/kWayMerge.bench.ts)

## Участие в разработке

См. [CONTRIBUTING.md](CONTRIBUTING.md)

## Безопасность

См. [SECURITY.md](SECURITY.md)

## Лицензия

Проект распространяется по лицензии MPL 2.0.

## Ссылки

- Автор: [@steelWinds](https://github.com/steelWinds)
- Issues: [Создать issue](https://github.com/steelWinds/masonry-blade/issues)
- Telegram: @plutograde
- Email: [Написать на почту](mailto:kirillsurov0@gmail.com)
