import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
	resolve: {
		alias: {
			lib: fileURLToPath(new URL('./src', import.meta.url)),
			src: fileURLToPath(new URL('./src', import.meta.url)),
		},
	},
	test: {
		setupFiles: ['./vitest.setup.ts'],
	},
});
