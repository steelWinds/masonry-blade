import type {
	LayoutCalculationEngine,
	LayoutComputedUnit,
	LayoutSnapshot,
	LayoutSourceUnit,
} from './layout';

export interface LayoutWorkerAppendResponse<
	Return,
	Snapshot extends LayoutSnapshot<Return>,
> {
	id: number;
	ok: true;
	type: 'append';
	payload: {
		snapshot: Readonly<Snapshot>;
	};
}

export interface LayoutWorkerSortResponse<T extends LayoutComputedUnit> {
	id: number;
	ok: true;
	type: 'sort';
	payload: {
		items: readonly Readonly<T>[];
	};
}

export type LayoutWorkerRequest<
	Return,
	Snapshot extends LayoutSnapshot<Return>,
> =
	| {
			id: number;
			type: 'append';
			payload: {
				snapshot: Readonly<Snapshot>;
				items: readonly Readonly<LayoutSourceUnit>[];
			};
	  }
	| {
			id: number;
			type: 'sort';
			payload: {
				snapshot: Readonly<Snapshot>;
				source?: Return;
			};
	  };

export type LayoutWorkerSuccessResponse<
	Return,
	Snapshot extends LayoutSnapshot<Return>,
	Unit extends LayoutComputedUnit,
> =
	| LayoutWorkerAppendResponse<Return, Snapshot>
	| LayoutWorkerSortResponse<Unit>;

export type LayoutWorkerErrorResponse = {
	id: number;
	ok: false;
	type: 'append' | 'sort';
	error: {
		name: string;
		message: string;
		stack?: string;
	};
};

export type LayoutWorkerResponse<
	Return,
	Snapshot extends LayoutSnapshot<Return>,
	Unit extends LayoutComputedUnit,
> =
	| LayoutWorkerSuccessResponse<Return, Snapshot, Unit>
	| LayoutWorkerErrorResponse;

export interface LayoutWorkerAdapter<
	Return,
	Snapshot extends LayoutSnapshot<Return>,
	Engine extends LayoutCalculationEngine<Return, Snapshot, Unit>,
	Unit extends LayoutComputedUnit,
> {
	restore(snapshot: Readonly<Snapshot>): Engine;
}
