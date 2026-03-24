export const MATRIX_ERRORS = {
	INVALID_COLUMN_COUNT: 'column count must be a positive integer',
	INVALID_GAP:
		'gap must be a finite non-negative number that leaves positive width for columns',
	INVALID_ID: 'invalid or empty item id',
	INVALID_ROOT_WIDTH: 'rootWidth must be a finite positive number',
} as const;
