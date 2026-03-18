export interface Meta<T> {
	meta: T;
}

export interface BaseItem {
	id: number | string;
	src: string;
	width: number;
	height: number;
}

export interface SourceBaseItem extends BaseItem {}
export interface MatrixBaseItem extends BaseItem {}

type WithMeta<Base extends BaseItem, T = never> = [T] extends [never]
	? Base
	: Base & Meta<T>;

export type ImageItem<T = never> = WithMeta<SourceBaseItem, T>;
export type MatrixItem<T = never> = WithMeta<MatrixBaseItem, T>;

export interface MatrixState<T = never> {
	count: number;
	width: number;
	columns: readonly MatrixItem<T>[][];
	heights: Float64Array;
	order: Int16Array;
}
