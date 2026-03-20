import { defineConfig } from 'tsdown';
import removePlugin from 'unplugin-remove/esbuild';

export default defineConfig({
	alias: {
		src: './src',
		tests: './tests',
	},
	attw: {
		profile: 'esm-only',
	},
	define: {
		'import.meta.env.MATRIX_ENGINE_WORKER': JSON.stringify('./worker.js'),
	},
	dts: true,
	entry: {
		index: './src',
		worker: './src/services/MatrixEngine',
	},
	exports: {
		exclude: ['worker'],
	},
	format: ['esm'],
	ignoreWatch: ['node_modules', 'build', '__tests__'],
	outDir: './build',
	platform: 'neutral',
	plugins: [removePlugin({ consoleType: ['log', 'warn', 'debug', 'info'] })],
	publint: true,
	shims: true,
});
