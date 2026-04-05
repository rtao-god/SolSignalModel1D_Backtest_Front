import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export interface FrontendProjectPaths {
    rootDir: string
    viteCacheDir: string
}

export function resolveFrontendProjectPaths(configFileUrl: string = import.meta.url): FrontendProjectPaths {
    const rootDir = resolve(fileURLToPath(new URL('../..', configFileUrl)))
    const viteCacheDir = resolve(rootDir, 'node_modules', '.vite')

    return {
        rootDir,
        viteCacheDir
    }
}
