import { defineConfig } from 'tsdown';
import workerPlugins from 'tsdown-plugin-worker';

export default defineConfig({
	alias: {
		lib: './lib',
		src: './src',
		tests: './tests',
	},
	dts: true,
	entry: 'src/app/index.ts',
	ignoreWatch: ['node_modules', 'build', '__tests__'],
	outDir: './build',
	platform: 'neutral',
	plugins: [workerPlugins({ format: 'es' })],
});
