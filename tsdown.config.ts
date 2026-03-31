import { defineConfig } from 'tsdown';
import removePlugin from 'unplugin-remove/esbuild';
import workerPlugins from 'tsdown-plugin-worker';

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
	plugins: [
		workerPlugins({ format: 'es' }),
		removePlugin({ consoleType: ['log', 'warn', 'debug', 'info'] }),
	],
	publint: true,
});
