import * as fc from 'fast-check';
import { describe, expect, test } from 'vitest';
import { isPositiveFiniteNumber } from 'src/utils/IsFiniteNonZero';

describe('isPositiveFiniteNumber', () => {
	test('returns true for positive finite numbers', () => {
		expect(isPositiveFiniteNumber(1)).toBe(true);
		expect(isPositiveFiniteNumber(0.1)).toBe(true);
		expect(isPositiveFiniteNumber(Number.MIN_VALUE)).toBe(true);
		expect(isPositiveFiniteNumber(999_999.123)).toBe(true);
	});

	test('returns false for zero and negative finite numbers', () => {
		expect(isPositiveFiniteNumber(0)).toBe(false);
		expect(isPositiveFiniteNumber(-0)).toBe(false);
		expect(isPositiveFiniteNumber(-1)).toBe(false);
		expect(isPositiveFiniteNumber(-0.0001)).toBe(false);
		expect(isPositiveFiniteNumber(Number.NEGATIVE_INFINITY)).toBe(false);
	});

	test('returns false for NaN and infinities', () => {
		expect(isPositiveFiniteNumber(Number.NaN)).toBe(false);
		expect(isPositiveFiniteNumber(Number.POSITIVE_INFINITY)).toBe(false);
		expect(isPositiveFiniteNumber(Number.NEGATIVE_INFINITY)).toBe(false);
	});

	test('matches the mathematical contract for arbitrary numbers', () => {
		fc.assert(
			fc.property(fc.double(), (value) => {
				expect(isPositiveFiniteNumber(value)).toBe(
					Number.isFinite(value) && value > 0,
				);
			}),
		);
	});

	test('returns true for every arbitrary positive finite number', () => {
		fc.assert(
			fc.property(
				fc.double({
					min: Number.MIN_VALUE,
					noDefaultInfinity: true,
					noNaN: true,
				}),
				(value) => {
					expect(isPositiveFiniteNumber(value)).toBe(true);
				},
			),
		);
	});

	test('returns false for every arbitrary non-positive finite number', () => {
		fc.assert(
			fc.property(
				fc.double({
					max: 0,
					noDefaultInfinity: true,
					noNaN: true,
				}),
				(value) => {
					expect(isPositiveFiniteNumber(value)).toBe(false);
				},
			),
		);
	});
});
