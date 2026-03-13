export interface ImageItem {
	id: number | string;
	src: string;
	width: number;
	height: number;
}

export interface MasonryItem {
	id: string | number;
	src: string;
	height: number;
	width: number;
}

export interface MasonryState {
	count: number;
	width: number;
	columns: readonly MasonryItem[][];
	heights: Int32Array;
	order: Int16Array;
}
