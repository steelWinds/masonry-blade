/// <reference lib="webworker" />

import type {
	LayoutCalculationEngine,
	LayoutComputedUnit,
	LayoutSnapshot,
	LayoutSourceUnit,
} from '../contract';

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
> =
	| {
			id: number;
			ok: true;
			type: 'append';
			payload: {
				result: Return;
				snapshot: Readonly<Snapshot>;
			};
	  }
	| {
			id: number;
			ok: true;
			type: 'sort';
			payload: {
				items: readonly Readonly<LayoutComputedUnit>[];
			};
	  };

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
> = LayoutWorkerSuccessResponse<Return, Snapshot> | LayoutWorkerErrorResponse;

export interface LayoutWorkerAdapter<
	Return,
	Snapshot extends LayoutSnapshot<Return>,
	Engine extends LayoutCalculationEngine<Return>,
> {
	restore(snapshot: Readonly<Snapshot>): Engine;
}

const toErrorPayload = (error: unknown): LayoutWorkerErrorResponse['error'] => {
	if (error instanceof Error) {
		return {
			message: error.message,
			name: error.name,
			stack: error.stack,
		};
	}

	return {
		message: String(error),
		name: 'UnknownError',
	};
};

export const bindLayoutWorker = <
	Return,
	Snapshot extends LayoutSnapshot<Return>,
	Engine extends LayoutCalculationEngine<Return>,
>(
	adapter: LayoutWorkerAdapter<Return, Snapshot, Engine>,
): void => {
	self.onmessage = (
		event: MessageEvent<LayoutWorkerRequest<Return, Snapshot>>,
	): void => {
		const message = event.data;

		try {
			switch (message.type) {
				case 'append': {
					const engine = adapter.restore(message.payload.snapshot);
					const result = engine.append(message.payload.items);
					const snapshot = engine.snapshot() as Readonly<Snapshot>;

					const response: LayoutWorkerSuccessResponse<Return, Snapshot> = {
						id: message.id,
						ok: true,
						payload: {
							result,
							snapshot,
						},
						type: 'append',
					};

					self.postMessage(response);
					return;
				}

				case 'sort': {
					const engine = adapter.restore(message.payload.snapshot);
					const source =
						message.payload.source ?? message.payload.snapshot.internalState;
					const items = engine.sort(source);

					const response: LayoutWorkerSuccessResponse<Return, Snapshot> = {
						id: message.id,
						ok: true,
						payload: {
							items,
						},
						type: 'sort',
					};

					self.postMessage(response);
					return;
				}

				default: {
					const exhaustiveCheck: never = message;

					throw new Error(
						`Unsupported worker message: ${JSON.stringify(exhaustiveCheck)}`,
					);
				}
			}
		} catch (error) {
			const response: LayoutWorkerErrorResponse = {
				error: toErrorPayload(error),
				id: message.id,
				ok: false,
				type: message.type,
			};

			self.postMessage(response);
		}
	};
};
