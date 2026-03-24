import type {
	LayoutComputedUnit,
	LayoutSnapshot,
	LayoutSourceUnit,
} from './layout';

export interface MatrixSourceUnit<Meta = undefined> extends LayoutSourceUnit {
	meta?: Meta;
}

export interface MatrixComputedUnit<
	Meta = undefined,
> extends LayoutComputedUnit {
	readonly meta?: Meta;
}

export type ReadonlySortItems<Meta = undefined> = readonly Readonly<
	MatrixComputedUnit<Meta>
>[];
export type ReadonlyMatrix<Meta = undefined> =
	readonly ReadonlySortItems<Meta>[];

export interface MatrixSnapshot<Meta = undefined> extends LayoutSnapshot<
	ReadonlyMatrix<Meta>
> {
	readonly columnHeights: Readonly<Float64Array>;
	readonly columnWidth: number;
	readonly order: Readonly<Uint32Array>;
	readonly realWidth: number;
}
