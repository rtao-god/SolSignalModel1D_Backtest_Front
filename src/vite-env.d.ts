/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly API_BASE_URL: string
    readonly VITE_ML_API_BASE_URL: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
