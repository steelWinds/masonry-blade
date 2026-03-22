import type { MatrixComputedUnit } from '../../contract';

export class MatrixUnit<T = undefined> implements MatrixComputedUnit<T> {
	public readonly id: string | number;
	public readonly height: number;
	public readonly width: number;
	public readonly x: number;
	public readonly y: number;
	public readonly meta?: T;

	constructor(
		id: string | number,
		height: number,
		width: number,
		x: number,
		y: number,
		meta?: T,
	) {
		this.id = id;
		this.height = height;
		this.width = width;
		this.x = x;
		this.y = y;
		this.meta = Object.freeze(meta);
	}
}
