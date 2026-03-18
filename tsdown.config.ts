import { defineConfig } from 'tsdown';

export default defineConfig({
	alias: {
		src: './src',
		tests: './tests',
	},
	attw: {
		profile: 'esm-only',
	},
	define: {
		'import.meta.env.APPEND_TO_MATRIX_WORKER': JSON.stringify('./worker.js'),
	},
	dts: true,
	entry: {
		index: 'src/core/MasonryMatrix/index.ts',
		worker:
			'src/core/MasonryMatrix/internal/matrixEngine/appendToMatrix.worker.ts',
	},
	exports: true,
	ignoreWatch: ['node_modules', 'build', '__tests__'],
	outDir: './build',
	platform: 'neutral',
	publint: true,
	shims: true,
});
