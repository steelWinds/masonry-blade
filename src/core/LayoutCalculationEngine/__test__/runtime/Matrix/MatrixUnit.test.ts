import { beforeEach, describe, expect, test } from 'vitest';
import { FAKER_SEED } from 'tests/constants';
import { MatrixUnit } from 'src/core/LayoutCalculationEngine';
import { faker } from '@faker-js/faker';

type TestMeta = {
	label: string;
	nested?: {
		version: number;
	};
};

type MatrixUnitFixture = {
	id: string | number;
	height: number;
	width: number;
	x: number;
	y: number;
	meta?: TestMeta;
};

const createFixture = (
	overrides: Partial<MatrixUnitFixture> = {},
): MatrixUnitFixture => ({
	height:
		overrides.height ??
		faker.number.float({ fractionDigits: 3, max: 10_000, min: 1 }),
	id:
		overrides.id ??
		faker.helpers.arrayElement([
			faker.string.alphanumeric(12),
			faker.number.int({ max: 10_000, min: 1 }),
		]),
	meta: overrides.meta,
	width:
		overrides.width ??
		faker.number.float({ fractionDigits: 3, max: 10_000, min: 1 }),
	x:
		overrides.x ??
		faker.number.float({ fractionDigits: 3, max: 10_000, min: 0 }),
	y:
		overrides.y ??
		faker.number.float({ fractionDigits: 3, max: 10_000, min: 0 }),
});

const createMatrixUnit = (
	overrides: Partial<MatrixUnitFixture> = {},
): {
	fixture: MatrixUnitFixture;
	matrixUnit: MatrixUnit<TestMeta>;
} => {
	const fixture = createFixture(overrides);

	const matrixUnit = new MatrixUnit<TestMeta>(
		fixture.id,
		fixture.height,
		fixture.width,
		fixture.x,
		fixture.y,
		fixture.meta,
	);

	return { fixture, matrixUnit };
};

describe('MatrixUnit', () => {
	beforeEach(() => {
		faker.seed(FAKER_SEED);
	});

	describe('constructor', () => {
		test('creates an instance with all scalar fields and meta', () => {
			const { fixture, matrixUnit } = createMatrixUnit();

			expect(matrixUnit).toBeInstanceOf(MatrixUnit);

			expect(matrixUnit.id).toBe(fixture.id);
			expect(matrixUnit.height).toBe(fixture.height);
			expect(matrixUnit.width).toBe(fixture.width);
			expect(matrixUnit.x).toBe(fixture.x);
			expect(matrixUnit.y).toBe(fixture.y);
			expect(matrixUnit.meta).toBe(fixture.meta);
		});

		test('creates an instance without meta when it is not provided', () => {
			const { fixture, matrixUnit } = createMatrixUnit({
				meta: undefined,
			});

			expect(matrixUnit.id).toBe(fixture.id);
			expect(matrixUnit.height).toBe(fixture.height);
			expect(matrixUnit.width).toBe(fixture.width);
			expect(matrixUnit.x).toBe(fixture.x);
			expect(matrixUnit.y).toBe(fixture.y);
			expect(matrixUnit.meta).toBeUndefined();
		});

		test('supports string id', () => {
			const { matrixUnit } = createMatrixUnit({
				id: faker.string.uuid(),
			});

			expect(typeof matrixUnit.id).toBe('string');
		});

		test('supports numeric id', () => {
			const { matrixUnit } = createMatrixUnit({
				id: faker.number.int({ max: Number.MAX_SAFE_INTEGER, min: 1 }),
			});

			expect(typeof matrixUnit.id).toBe('number');
		});
	});

	describe('runtime mutability', () => {
		test('meta property is frozen', () => {
			const sharedMeta: TestMeta = {
				label: 'initial',
				nested: {
					version: 1,
				},
			};

			const { matrixUnit } = createMatrixUnit({
				meta: sharedMeta,
			});

			expect(Object.isFrozen(matrixUnit.meta)).toBeTruthy();

			expect(matrixUnit.meta).toBe(sharedMeta);
		});
	});
});
