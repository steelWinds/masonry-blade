export interface Meta<T> {
	meta: T;
}

export interface SourceItem {
	id: number | string;
	width: number;
	height: number;
}

export interface MatrixItem extends SourceItem {
	x: number;
	y: number;
}

export type WithMeta<Base, T = never> = [T] extends [never]
	? Base
	: Base & Meta<T>;

export interface MatrixState<T = never> {
	columnCount: number;
	columnWidth: number;
	columnsHeights: Float64Array;
	columns: readonly WithMeta<MatrixItem, T>[][];
	gap: number;
	order: Uint32Array;
}
