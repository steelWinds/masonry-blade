# masonry-blade

## [English version](./README.md)

<p>
  <img align="right" width="30%" src="./.github/logo.png" alt="masonry-blade logo">
</p>

Библиотека для расчёта masonry-сетки без зависимостей 🧱 Если в среде доступен Web Worker, вычисления выполняются через него.

> Внутри матрица балансируется жадной стратегией: каждый следующий элемент помещается в текущую самую короткую колонку. Это не формальная гарантия фиксированного разрыва по высоте, но на практике даёт почти идеальный компромисс между качеством и скоростью для движка такого типа.

> Это вычислительный движок для построения матрицы в стиле _masonry_ без вмешательства в UI-слой.

> Made with love. ❤️

![GitHub License](https://img.shields.io/github/license/steelWinds/masonry-blade)

[![build-validate](https://github.com/steelWinds/masonry-blade/actions/workflows/build-validate.yml/badge.svg)](https://github.com/steelWinds/masonry-blade/actions/workflows/build-validate.yml)
[![CodeQL](https://github.com/steelWinds/masonry-blade/actions/workflows/github-code-scanning/codeql/badge.svg)](https://github.com/steelWinds/masonry-blade/actions/workflows/codeql.yml)

![NPM Version](https://img.shields.io/npm/v/masonry-blade)
![NPM Unpacked Size](https://img.shields.io/npm/unpacked-size/masonry-blade)
![npm package minimized gzipped size](https://img.shields.io/bundlejs/size/masonry-blade)

[![codecov](https://codecov.io/gh/steelWinds/masonry-blade/graph/badge.svg?token=48NKR93X2A)](https://codecov.io/gh/steelWinds/masonry-blade)

## Быстрый старт

`masonry-blade` — это движок для расчёта masonry-матрицы.

Библиотека **не рендерит UI**. Она только распределяет изображения по колонкам и возвращает структуру данных, которую вы можете отрисовать в собственном интерфейсе.

### Установка

```bash
npm i masonry-blade
```

```bash
yarn add masonry-blade
```

```bash
pnpm add masonry-blade
```

### Публичный API

```ts
import {
	MasonryMatrix,
	MatrixError,
	MATRIX_ERROR_MESSAGES,
	type ImageItem,
	type MatrixItem,
} from 'masonry-blade';
```

Публичные экспорты:

- `MasonryMatrix` — основной класс для построения матрицы.
- `MatrixError` — пользовательский тип ошибки библиотеки.
- `MATRIX_ERROR_MESSAGES` — экспортируемые константы с текстами ошибок.
- `ImageItem<T>` — входной тип элемента.
- `MatrixItem<T>` — тип элемента после размещения в матрице.

### Как это работает

1. Создайте экземпляр `MasonryMatrix`, передав ширину контейнера и количество колонок.
2. Передайте изображения через `appendItems(...)`.
3. Получите массив колонок.
4. Когда ширина контейнера меняется, вызовите `recreateMatrix(...)`, чтобы пересобрать раскладку из уже добавленных элементов.

> `recreateMatrix(...)` не требует повторно передавать элементы. Библиотека пересобирает матрицу из внутреннего списка уже добавленных исходных элементов.

> Каждый результирующий элемент всегда получает ширину колонки, а его высота пересчитывается пропорционально исходному aspect ratio.

### Входные и выходные типы

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

> `meta` удобно использовать для любых связанных данных: `alt`, `title`, `author`, `href`, внутренних id, флагов и так далее.

> Внутри библиотека опирается на идею `Meta<T>`, то есть «элемент + пользовательские данные». Отдельно как публичный тип он не экспортируется, но с точки зрения публичного API поведение такое: как только вы задаёте generic `T`, и `ImageItem<T>`, и `MatrixItem<T>` включают `meta: T`.

### Пример: минимальное использование

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

### Пример: использование с `meta`

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

### Пример: пересборка при изменении размера

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

Создаёт новый экземпляр матрицы.

| Параметр    | Тип      | Обязателен | Описание                               |
| ----------- | -------- | ---------- | -------------------------------------- |
| `rootWidth` | `number` | да         | Ширина контейнера                      |
| `count`     | `number` | нет        | Количество колонок, по умолчанию — `1` |

### `await appendItems(items)`

Добавляет новую пачку элементов в текущую матрицу и возвращает колонки.

```ts
appendItems(items: readonly ImageItem<T>[]): Promise<readonly MatrixItem<T>[][]>
```

> Полезно для первой загрузки, бесконечной прокрутки и постепенной подгрузки изображений.

### `await recreateMatrix(rootWidth, count?)`

Полностью пересоздаёт матрицу с новой шириной контейнера и/или новым количеством колонок, используя **все ранее добавленные** элементы.

```ts
recreateMatrix(rootWidth: number, count?: number): Promise<readonly MatrixItem<T>[][]>
```

> Обычно вызывается при изменении размера контейнера, смене breakpoint или переключении режима раскладки.

### `terminateWorker()`

Принудительно завершает внутренний worker, если он был создан. Следующий вызов `appendItems(...)` или `recreateMatrix(...)` автоматически создаст новый worker.

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

Доступные тексты ошибок:

- `MATRIX_ERROR_MESSAGES.APPEND_ITEMS`
- `MATRIX_ERROR_MESSAGES.CONCURRENT_CALL`
- `MATRIX_ERROR_MESSAGES.RECREATE_MATRIX`
- `MATRIX_ERROR_MESSAGES.UPDATE_INTERNAL_STATE`
- `MATRIX_ERROR_MESSAGES.RECEIVE_FROM_WORKER`
- `MATRIX_ERROR_MESSAGES.WORKER_ERROR`
- `MATRIX_ERROR_MESSAGES.WORKER_TERMINATED`

## Конкурентные вызовы и structured clone

`MasonryMatrix` не поддерживает конкурентные вызовы для одного и того же экземпляра.

Не вызывайте `appendItems(...)` и/или `recreateMatrix(...)` параллельно на одном и том же `MasonryMatrix`. Эти операции должны выполняться последовательно на стороне вызывающего кода.

Если конкурентный вызов происходит, пока предыдущее обновление матрицы ещё выполняется, библиотека выбрасывает `MatrixError`.

На практике это означает следующее:

- не запускайте второй `appendItems(...)`, пока не завершился предыдущий;
- не вызывайте `recreateMatrix(...)`, пока ещё выполняется `appendItems(...)`;
- не вызывайте `appendItems(...)`, пока ещё выполняется `recreateMatrix(...)`.

### Требование structured clone для режима Worker

Если в среде доступен `Worker`, библиотека отправляет данные матрицы в worker через `postMessage(...)`.

Из-за этого все передаваемые данные должны быть совместимы с алгоритмом **structured clone** браузера.

Это особенно важно для `meta`, если вы используете `ImageItem<T>` / `MatrixItem<T>` с generic-типом.

Не кладите в `meta` значения, которые нельзя клонировать, например:

- функции;
- DOM-узлы;
- экземпляры классов с несериализуемым внутренним состоянием;
- неподдерживаемые пользовательские объекты для вашей целевой среды выполнения.

Если payload для worker не удаётся клонировать, библиотека выбрасывает `MatrixError`.

Типичные примеры:

- `appendItems(...)` выбросит ошибку, если переданную пачку нельзя клонировать для передачи в worker;
- `recreateMatrix(...)` выбросит ошибку, если ранее накопленные исходные элементы нельзя клонировать для передачи в worker.

### Практическая рекомендация

Храните `meta` как простые структурированные данные:

- строки;
- числа;
- булевы значения;
- `null`;
- массивы;
- обычные объекты;
- другие значения, которые безопасно поддерживаются алгоритмом structured clone в вашей целевой среде выполнения.

Хорошее практическое правило: если ваш `meta` выглядит как прикладные данные в духе JSON, обычно это хороший вариант для режима worker.

## Важные замечания

- Элементы с `width <= 0` или `height <= 0` тихо пропускаются.
- `count = 0` допустим, но это означает режим пустой матрицы: ширина колонки становится `0`, а `appendItems(...)` ничего не размещает.
- Библиотека поддерживает только изображения: `width` и `height` должны быть известны заранее.
- Если в текущей среде `Worker` недоступен, библиотека всё равно работает — вычисления просто выполняются в основном потоке.
- Возвращаемые колонки следует считать read-only, даже если на runtime это обычные массивы.
- Не полагайтесь на referential identity для `meta` при работе через worker: в режиме Worker данные передаются через structured clone.
- См. раздел `Конкурентные вызовы и structured clone` выше: там описаны важные runtime-ограничения.

> `masonry-blade` ничего не знает о DOM, React, Vue, карточках, lazy loading или стилизации. Библиотека только возвращает данные раскладки, которые можно отрисовать в любом UI-слое.

> Состояние матрицы внутри изменяемое, а возвращаемые колонки — это ссылки на это состояние. Не мутируйте их вручную через `push`, `splice`, прямое присваивание и так далее.

## Contributing

См. файл [CONTRIBUTING.md](CONTRIBUTING.md)

### Benchmark

```bash
pnpm benchmark
```

Последние результаты benchmark: [benchmark/benchmark-results.md](benchmark/benchmark-results.md)

## License

Проект распространяется по лицензии MPL 2.0.

## Security

См. файл [SECURITY.md](SECURITY.md)

## Ссылки

- Author: [@steelWinds](https://github.com/steelWinds)
- Issues: [New issue](https://github.com/steelWinds/masonry-blade/issues)
- Telegram: @plutograde
- Email: [Send me an email](mailto:kirillsurov0@gmail.com)
