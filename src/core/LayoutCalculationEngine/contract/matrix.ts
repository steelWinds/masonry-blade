import type {
	LayoutComputedUnit,
	LayoutSnapshot,
	LayoutSourceUnit,
} from './layout';

export interface MatrixSourceUnit<T = undefined> extends LayoutSourceUnit {
	meta?: T;
}

export interface MatrixComputedUnit<T = undefined> extends LayoutComputedUnit {
	readonly meta?: T;
}

export type ReadonlyMatrix<T = undefined> = readonly (readonly Readonly<
	MatrixComputedUnit<T>
>[])[];

export interface MatrixSnapshot<T> extends LayoutSnapshot<ReadonlyMatrix<T>> {
	readonly columnHeights: Readonly<Float64Array>;
	readonly columnWidth: number;
	readonly order: Readonly<Uint32Array>;
	readonly realWidth: number;
}
