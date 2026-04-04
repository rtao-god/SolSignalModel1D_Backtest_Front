// @vitest-environment node
import { describe, expect, it } from 'vitest'
import viteConfig from '../../vite.config'
import { resolveFrontendProjectPaths } from './projectPaths'

describe('vite.config paths', () => {
    it('anchors root, envDir and caches inside the frontend project directory', () => {
        const projectPaths = resolveFrontendProjectPaths()
        const resolvedConfig = viteConfig({ mode: 'test', command: 'serve', isSsrBuild: false, isPreview: false })

        expect(resolvedConfig.root).toBe(projectPaths.rootDir)
        expect(resolvedConfig.envDir).toBe(projectPaths.rootDir)
        expect(resolvedConfig.cacheDir).toBe(projectPaths.viteCacheDir)
        expect(resolvedConfig.test?.cache).toBeUndefined()
    })
})
