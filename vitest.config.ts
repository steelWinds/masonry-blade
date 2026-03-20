import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
	resolve: {
		alias: {
			src: fileURLToPath(new URL('./src', import.meta.url)),
			tests: fileURLToPath(new URL('./tests', import.meta.url)),
		},
	},
	test: {
		reporters: ['tree'],
	},
});
