import { describe, expect, it } from 'vitest'
import { resolve } from 'node:path'
import { resolveFrontendProjectPaths } from './projectPaths'

describe('resolveFrontendProjectPaths', () => {
    it('anchors Vite and Vitest caches inside the frontend project root', () => {
        const paths = resolveFrontendProjectPaths()
        const vitestCacheDir = resolve(paths.viteCacheDir, 'vitest')

        expect(paths.rootDir).toBe('D:\\crypto\\SolSignalModel1D_Backtest_Front')
        expect(paths.viteCacheDir).toBe('D:\\crypto\\SolSignalModel1D_Backtest_Front\\node_modules\\.vite')
        expect(vitestCacheDir).toBe('D:\\crypto\\SolSignalModel1D_Backtest_Front\\node_modules\\.vite\\vitest')
    })

    it('ignores the caller cwd and resolves from the config file location', () => {
        const paths = resolveFrontendProjectPaths('file:///D:/crypto/SolSignalModel1D_Backtest_Front/config/vite/projectPaths.ts')
        const vitestCacheDir = resolve(paths.viteCacheDir, 'vitest')

        expect(paths.rootDir).toBe('D:\\crypto\\SolSignalModel1D_Backtest_Front')
        expect(paths.viteCacheDir.startsWith('D:\\crypto\\node_modules')).toBe(false)
        expect(vitestCacheDir.startsWith('D:\\crypto\\node_modules')).toBe(false)
    })
})
