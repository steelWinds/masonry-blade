import { defineConfig } from 'tsdown';
import workerPlugins from 'tsdown-plugin-worker';

export default defineConfig({
	alias: {
		lib: './lib',
		src: './src',
	},
	entry: 'src/app/masonry-blade.ts',
	ignoreWatch: ['node_modules', 'build', '__tests__'],
	outDir: './build',
	platform: 'node',
	plugins: [workerPlugins({ format: 'es' })],
});
