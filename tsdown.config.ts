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
	dts: true,
	entry: {
		index: './src',
	},
	format: ['esm'],
	ignoreWatch: ['node_modules', 'build', '__tests__'],
	outDir: './build',
	outputOptions: {
		codeSplitting: false,
	},
	platform: 'neutral',
	plugins: [removePlugin({ consoleType: ['log', 'warn', 'debug', 'info'] })],
	publint: true,
});
