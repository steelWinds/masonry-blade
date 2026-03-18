# masonry-blade

<p>
  <img align="right" width="30%" src="./.github/logo.png" alt="masonry-blade logo">
</p>

Библиотека для расчёта masonry-сеток без зависимостей 🧱 Если в окружении доступен Web Worker, вычисления будут выполняться через него.

> Внутри используется жадная балансировка: каждый следующий элемент ставится в самую низкую колонку. Это не формальная гарантия фиксированного разрыва по высоте, но на практике даёт почти идеальный баланс по соотношению качество/скорость для такого типа движка.

> Сейчас поддерживаются только изображения. Это именно **движок** для построения masonry-матрицы без работы с интерфейсом.

> Сделано с любовью. ❤️

[English version](./README.md)

![GitHub License](https://img.shields.io/github/license/steelWinds/masonry-blade)

[![build-validate](https://github.com/steelWinds/masonry-blade/actions/workflows/build-validate.yml/badge.svg)](https://github.com/steelWinds/masonry-blade/actions/workflows/build-validate.yml)
[![CodeQL](https://github.com/steelWinds/masonry-blade/actions/workflows/github-code-scanning/codeql/badge.svg)](https://github.com/steelWinds/masonry-blade/actions/workflows/codeql.yml)

![NPM Version](https://img.shields.io/npm/v/masonry-blade)
![NPM Unpacked Size](https://img.shields.io/npm/unpacked-size/masonry-blade)
![npm package minimized gzipped size](https://img.shields.io/bundlejs/size/masonry-blade)

[![codecov](https://codecov.io/gh/steelWinds/masonry-blade/graph/badge.svg?token=48NKR93X2A)](https://codecov.io/gh/steelWinds/masonry-blade)

## Быстрый старт

`masonry-blade` — это движок для расчёта masonry-матрицы.

Он **не рендерит интерфейс**, а только раскладывает изображения по колонкам и возвращает готовую структуру данных для твоего интерфейса.

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

Публично доступны:

- `MasonryMatrix` — основной класс для построения матрицы.
- `MatrixError` — кастомная ошибка библиотеки.
- `MATRIX_ERROR_MESSAGES` — константы сообщений ошибок.
- `ImageItem<T>` — входной элемент.
- `MatrixItem<T>` — элемент после размещения в матрице.

### Как это работает

1. Создаёшь экземпляр `MasonryMatrix` с шириной контейнера и количеством колонок.
2. Передаёшь изображения через `appendItems(...)`.
3. Получаешь массив колонок.
4. При изменении ширины контейнера вызываешь `recreateMatrix(...)`, чтобы пересчитать раскладку из уже добавленных элементов.

> `recreateMatrix(...)` не требует повторно передавать элементы: библиотека пересчитает матрицу из уже накопленного списка исходных элементов.

> Ширина каждого элемента в результате всегда равна ширине колонки, а высота пересчитывается пропорционально исходному соотношению сторон.

### Входные и выходные типы

```ts
type ImageItem<T = never> = {
	id: number | string;
	src: string;
	width: number;
	height: number;
} & (T extends never ? {} : { meta: T });

// концептуальная форма

type MatrixItem<T = never> = {
	id: number | string;
	src: string;
	width: number; // ширина колонки
	height: number; // пересчитанная высота внутри матрицы
} & (T extends never ? {} : { meta: T });
```

> `meta` удобно использовать для любых связанных данных: `alt`, `title`, `author`, `href`, внутренний id, флаги и так далее.

> Внутри библиотеки есть внутренний тип `Meta<T>` как идея “элемент + пользовательские данные”. Он не экспортируется отдельно, но логика публичного API именно такая: если указываешь generic `T`, у `ImageItem<T>` и `MatrixItem<T>` появляется поле `meta: T`.

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

### Пример: пересчёт матрицы при изменении размера

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

| Параметр    | Тип      | Обязателен | Описание                             |
| ----------- | -------- | ---------- | ------------------------------------ |
| `rootWidth` | `number` | да         | Ширина контейнера                    |
| `count`     | `number` | нет        | Количество колонок, по умолчанию `1` |

### `await appendItems(items)`

Добавляет новую пачку элементов в текущую матрицу и возвращает колонки.

```ts
appendItems(items: readonly ImageItem<T>[]): Promise<readonly MatrixItem<T>[][]>
```

> Подходит для первичной загрузки, бесконечной прокрутки и поэтапной дозагрузки изображений.

### `await recreateMatrix(rootWidth, count?)`

Полностью пересоздаёт матрицу с новой шириной контейнера и/или новым числом колонок, используя **все ранее добавленные** элементы.

```ts
recreateMatrix(rootWidth: number, count?: number): Promise<readonly MatrixItem<T>[][]>
```

> Обычно вызывается при изменении размера контейнера, смене брейкпоинта или смене режима раскладки.

### `terminateWorker()`

Принудительно завершает внутренний worker, если он был создан. Следующий вызов `appendItems(...)` или `recreateMatrix(...)` автоматически создаст новый worker заново.

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
- `MATRIX_ERROR_MESSAGES.RECREATE_MATRIX`
- `MATRIX_ERROR_MESSAGES.UPDATE_INTERNAL_STATE`
- `MATRIX_ERROR_MESSAGES.RECEIVE_FROM_WORKER`
- `MATRIX_ERROR_MESSAGES.WORKER_ERROR`
- `MATRIX_ERROR_MESSAGES.WORKER_TERMINATED`

## Важные замечания

- Элементы с `width <= 0` или `height <= 0` игнорируются без ошибки.
- `count = 0` допустим, но это режим пустой матрицы: ширина колонки будет `0`, а `appendItems(...)` ничего не разложит.
- Библиотека поддерживает только изображения: `width` и `height` должны быть известны заранее.
- Если в окружении нет `Worker`, библиотека продолжит работать без него — вычисления просто пойдут в основном потоке.
- Возвращённые колонки нужно считать только для чтения, даже если в рантайме это обычные массивы.
- `meta` передаётся по ссылке, если это объект.
- Вызовы `appendItems(...)` и `recreateMatrix(...)` для одного экземпляра `MasonryMatrix` нужно сериализовать: не запускай их параллельно.

> `masonry-blade` ничего не знает про DOM, React, Vue, рендеринг карточек, ленивую загрузку или стили. На выходе ты получаешь только данные, которые можно отрисовать в любом слое интерфейса.

> Внутреннее состояние матрицы мутируется, а возвращаемые колонки являются ссылками на это состояние. Не изменяй их вручную через `push`, `splice`, прямое присваивание и подобные операции.

## Внести вклад

Для дальнейших инструкции [CONTRIBUTING.md](CONTRIBUTING.md)

### Бенчмарк

```bash
pnpm benchmark
```

Последние результаты бенчмарка: [benchmark/benchmark-results.md](benchmark/benchmark-results.md)

## Лицензия

Проект распространяется по лицензии MPL 2.0.

## Безопасность

Для дальнейших инструкции [SECURITY.md](SECURITY.md)

## Ссылки

- Автор: [@steelWinds](https://github.com/steelWinds)
- Issues: [New issue](https://github.com/steelWinds/masonry-blade/issues)
- Telegram: @plutograde
- Email: [Написать на email](mailto:kirillsurov0@gmail.com)
