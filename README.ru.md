# masonry-blade

## [English version](./README.md)

<p>
  <img align="right" width="30%" src="./.github/logo.png" alt="masonry-blade logo">
</p>

Библиотека без зависимостей для расчета masonry-сетки изображений.
Если в текущем окружении доступен `Web Worker`, вычисления выносятся в него.

![GitHub License](https://img.shields.io/github/license/steelWinds/masonry-blade)
[![Module type: ESM](https://img.shields.io/badge/module%20type-esm-brightgreen)](https://github.com/voxpelli/badges-cjs-esm)
[![build-validate](https://github.com/steelWinds/masonry-blade/actions/workflows/build-validate.yml/badge.svg)](https://github.com/steelWinds/masonry-blade/actions/workflows/build-validate.yml)
[![CodeQL](https://github.com/steelWinds/masonry-blade/actions/workflows/github-code-scanning/codeql/badge.svg)](https://github.com/steelWinds/masonry-blade/actions/workflows/codeql.yml)
![NPM Version](https://img.shields.io/npm/v/masonry-blade)
![NPM Unpacked Size](https://img.shields.io/npm/unpacked-size/masonry-blade)
![npm package minimized gzipped size](https://img.shields.io/bundlejs/size/masonry-blade)
[![codecov](https://codecov.io/gh/steelWinds/masonry-blade/graph/badge.svg?token=48NKR93X2A)](https://codecov.io/gh/steelWinds/masonry-blade)

## Что делает библиотека

`masonry-blade` рассчитывает masonry-матрицу для изображений.

Она не рендерит UI.
Библиотека только раскладывает элементы по колонкам одинаковой ширины и возвращает структуру данных, которую можно отрисовать в любом интерфейсе.

## Зачем использовать

- Ноль зависимостей.
- Не привязана к UI-фреймворку.
- Может выносить вычисления в `Web Worker`.
- Поддерживает дозагрузку новых элементов.
- Может полностью пересобрать матрицу при ресайзе без повторной передачи исходных данных.
- Поддерживает типизированное поле `meta` для пользовательских данных.

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

```ts
import {
	MasonryMatrix,
	MatrixError,
	MATRIX_ERROR_MESSAGES,
	type ImageItem,
	type MatrixItem,
} from 'masonry-blade';
```

Экспортируется:

- `MasonryMatrix` — основной класс для построения матрицы.
- `MatrixError` — кастомная ошибка библиотеки.
- `MATRIX_ERROR_MESSAGES` — экспортируемые константы с текстами ошибок.
- `ImageItem<T>` — тип входного элемента.
- `MatrixItem<T>` — тип элемента после размещения в матрице.

## Быстрый старт

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

## Как это работает

1. Создайте `MasonryMatrix`, передав ширину контейнера и число колонок.
2. Передайте элементы в `appendItems(...)`.
3. Отрисуйте возвращенные колонки в своем UI.
4. Вызывайте `recreateMatrix(...)`, когда меняется ширина или число колонок.

`recreateMatrix(...)` пересобирает раскладку на основе внутреннего списка уже добавленных исходных элементов.
Повторно передавать те же данные не нужно.

Каждый элемент на выходе всегда получает текущую ширину колонки.
Высота пересчитывается пропорционально на основе исходного соотношения сторон.

## Стратегия раскладки

Каждый следующий элемент кладется в самую низкую на текущий момент колонку.

Это жадная стратегия балансировки.
Она не дает формальной гарантии фиксированного максимального разрыва по высоте между колонками, но для такого типа движка дает хороший баланс между качеством и скоростью.

Библиотека работает только с изображениями.
`width` и `height` должны быть известны заранее.

## Типы

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

Поле `meta` удобно для любых связанных данных: `alt`, `title`, `author`, `href`, внутренних ID, флагов и так далее.

Если вы передаете generic `T`, и `ImageItem<T>`, и `MatrixItem<T>` будут содержать `meta: T`.

## Пример с `meta`

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

## Пример: пересборка при ресайзе

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

## Справка по API

### `new MasonryMatrix(rootWidth, count?)`

Создает новый экземпляр матрицы.

| Параметр    | Тип      | Обязателен | Описание                             |
| ----------- | -------- | ---------- | ------------------------------------ |
| `rootWidth` | `number` | да         | Ширина контейнера                    |
| `count`     | `number` | нет        | Количество колонок, по умолчанию `1` |

### `await appendItems(items)`

Добавляет новую пачку элементов в текущую матрицу и возвращает колонки.

```ts
appendItems(items: readonly ImageItem<T>[]): Promise<readonly MatrixItem<T>[][]>
```

Подходит для первой загрузки, infinite scroll и поэтапной подгрузки изображений.

### `await recreateMatrix(rootWidth, count?)`

Полностью пересобирает матрицу с новой шириной контейнера и/или новым числом колонок, используя все ранее добавленные элементы.

```ts
recreateMatrix(rootWidth: number, count?: number): Promise<readonly MatrixItem<T>[][]>
```

Обычно используется при ресайзе, смене брейкпоинта или режима раскладки.

### `terminateWorker()`

Принудительно завершает внутренний worker, если он был создан.
Следующий вызов `appendItems(...)` или `recreateMatrix(...)` автоматически создаст новый worker.

## Ошибки

Все ошибки библиотеки выбрасываются как `MatrixError`.

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

Доступные сообщения ошибок:

- `MATRIX_ERROR_MESSAGES.APPEND_ITEMS`
- `MATRIX_ERROR_MESSAGES.CONCURRENT_CALL`
- `MATRIX_ERROR_MESSAGES.RECREATE_MATRIX`
- `MATRIX_ERROR_MESSAGES.UPDATE_INTERNAL_STATE`
- `MATRIX_ERROR_MESSAGES.RECEIVE_FROM_WORKER`
- `MATRIX_ERROR_MESSAGES.WORKER_ERROR`
- `MATRIX_ERROR_MESSAGES.WORKER_TERMINATED`

## Ограничения во время выполнения

### Параллельные вызовы не поддерживаются

Не вызывайте `appendItems(...)` и/или `recreateMatrix(...)` параллельно на одном и том же экземпляре `MasonryMatrix`.

Эти операции должен сериализовать вызывающий код.

Если второй вызов начинается до завершения предыдущего обновления матрицы, библиотека выбросит `MatrixError`.

На практике это значит:

- не запускайте второй `appendItems(...)`, пока не завершился первый;
- не вызывайте `recreateMatrix(...)`, пока выполняется `appendItems(...)`;
- не вызывайте `appendItems(...)`, пока выполняется `recreateMatrix(...)`.

### В режиме Worker используется structured clone

Если в текущем окружении доступен `Worker`, данные матрицы отправляются через `postMessage(...)`.

Поэтому передаваемые данные должны быть совместимы с алгоритмом structured clone.

В первую очередь это важно для `meta`, если вы используете `ImageItem<T>` / `MatrixItem<T>` с generic-типом.

Не помещайте в `meta` значения, которые нельзя клонировать, например:

- функции;
- DOM-узлы;
- экземпляры классов с несериализуемым внутренним состоянием;
- неподдерживаемые кастомные объекты для вашей целевой среды.

Если payload нельзя клонировать для передачи в worker, библиотека выбросит `MatrixError`.

Типичные случаи:

- `appendItems(...)` выбросит ошибку, если переданную пачку нельзя клонировать;
- `recreateMatrix(...)` выбросит ошибку, если нельзя клонировать уже накопленные исходные элементы.

Хорошее практическое правило: держать `meta` близким к JSON-подобным данным приложения.

### Возвращаемые колонки — это ссылки на внутреннее состояние

Относитесь к возвращаемым колонкам как к read-only данным.

Не изменяйте их вручную через `push`, `splice`, прямое присваивание и так далее.

В режиме worker не стоит полагаться на ссылочную идентичность `meta`, потому что данные передаются через structured clone.

## Важные замечания

- Элементы с `width <= 0` или `height <= 0` молча пропускаются.
- `count = 0` допустим, но в этом режиме матрица будет пустой.
- Если `Worker` недоступен, вычисления выполняются в основном потоке.
- Библиотека ничего не знает о DOM, React, Vue, lazy loading, рендеринге карточек или стилях. Она только возвращает данные раскладки.

## Benchmark

```bash
pnpm benchmark
```

Актуальные результаты: [benchmark/benchmark-results.md](benchmark/benchmark-results.md)

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
