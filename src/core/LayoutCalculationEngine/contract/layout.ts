type MaybePromise<T> = T | Promise<T>;

export interface LayoutSourceUnit {
	readonly id: string | number;
	readonly width: number;
	readonly height: number;
}

export interface LayoutComputedUnit {
	readonly id: string | number;
	readonly width: number;
	readonly height: number;
	readonly x: number;
	readonly y: number;
}

export interface LayoutSnapshot<Return> {
	readonly columnCount: number;
	readonly gap: number;
	readonly internalState: Return;
	readonly rootWidth: number;
}

export interface LayoutCalculationEngine<
	Return,
	Snapshot extends LayoutSnapshot<Return>,
	Unit extends Readonly<LayoutComputedUnit>,
> {
	append(arr: readonly Readonly<LayoutSourceUnit>[]): MaybePromise<Return>;
	sort(source: Return): MaybePromise<readonly Readonly<Unit>[]>;
	snapshot(): Readonly<Snapshot>;
	fromSnapshot(snapshot: Snapshot): void;
}
