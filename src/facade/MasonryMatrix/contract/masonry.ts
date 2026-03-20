export interface MasonryMatrixState {
	columnCount: number;
	columnWidth: number;
	columnsHeights: Float64Array<ArrayBuffer>;
	gap: number;
	workerCreated: boolean;
	order: Uint32Array<ArrayBuffer>;
	workerDisabled: boolean;
}
