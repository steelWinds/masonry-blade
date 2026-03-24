import type { MatrixSourceUnit } from 'src/core/LayoutCalculationEngine';

export interface MasonryMatrixState {
	readonly columnCount: number;
	readonly columnWidth: number;
	readonly columnsHeights: Readonly<Float64Array>;
	readonly gap: number;
	readonly order: Readonly<Uint32Array>;
	readonly workerCreated: boolean;
	readonly workerDisabled: boolean;
}

export interface RecreateOptions<Meta = undefined> {
	readonly rootWidth: number;
	readonly columnCount?: number;
	readonly gap?: number;
	readonly items?: readonly Readonly<MatrixSourceUnit<Meta>>[];
}
