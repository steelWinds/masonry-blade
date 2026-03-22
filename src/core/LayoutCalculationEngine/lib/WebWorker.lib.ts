/// <reference lib="webworker" />

import type {
	LayoutCalculationEngine,
	LayoutComputedUnit,
	LayoutSnapshot,
	LayoutWorkerAdapter,
	LayoutWorkerErrorResponse,
	LayoutWorkerRequest,
	LayoutWorkerSuccessResponse,
} from '../contract';

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
	Engine extends LayoutCalculationEngine<Return, Snapshot, Unit>,
	Unit extends LayoutComputedUnit,
>(
	adapter: LayoutWorkerAdapter<Return, Snapshot, Engine, Unit>,
): void => {
	self.onmessage = (
		event: MessageEvent<LayoutWorkerRequest<Return, Snapshot>>,
	): void => {
		const message = event.data;

		try {
			switch (message.type) {
				case 'append': {
					const engine = adapter.restore(message.payload.snapshot);

					engine.append(message.payload.items);

					const snapshot = engine.snapshot() as Readonly<Snapshot>;

					const response: LayoutWorkerSuccessResponse<Return, Snapshot, Unit> =
						{
							id: message.id,
							ok: true,
							payload: {
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

					const response: LayoutWorkerSuccessResponse<Return, Snapshot, Unit> =
						{
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
