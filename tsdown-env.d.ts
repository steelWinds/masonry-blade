interface ImportMetaEnv {
	readonly TSDOWN_APP_NAME: string;
	readonly TSDOWN_APP_DESCRIPTION: string;
	readonly TSDOWN_MODE: 'development' | 'production';
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
