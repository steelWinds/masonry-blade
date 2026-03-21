import type { SourceItem, WithMeta } from 'src/core/MatrixEngine';

export interface MasonryMatrixState {
	columnCount: number;
	columnWidth: number;
	columnsHeights: Float64Array<ArrayBuffer>;
	gap: number;
	workerCreated: boolean;
	order: Uint32Array<ArrayBuffer>;
	workerDisabled: boolean;
}

export interface RecreateOptions<T> {
	items: readonly WithMeta<SourceItem, T>[];
	rootWidth: number;
	columnCount?: number;
	gap?: number;
}
