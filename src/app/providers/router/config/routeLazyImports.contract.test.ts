import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, test } from 'vitest'

const ROUTE_IMPORT_PATTERN = /const\s+\w+\s*=\s*\(\)\s*=>\s*import\(\s*'(@\/[^']+)'\s*\)/g
const DEFAULT_EXPORT_PATTERN = /export\s+default|export\s*\{\s*default(?:\s+as\s+\w+)?\s*\}/

function getFrontendRoot(): string {
    return path.resolve(__dirname, '..', '..', '..', '..', '..')
}

function resolveImportCandidates(frontendRoot: string, moduleSpecifier: string): string[] {
    const relativeImportPath = moduleSpecifier.replace(/^@\//, '')
    const basePath = path.join(frontendRoot, 'src', relativeImportPath)

    return [
        `${basePath}.ts`,
        `${basePath}.tsx`,
        `${basePath}.js`,
        `${basePath}.jsx`,
        path.join(basePath, 'index.ts'),
        path.join(basePath, 'index.tsx'),
        path.join(basePath, 'index.js'),
        path.join(basePath, 'index.jsx')
    ]
}

function resolveExistingModuleFile(frontendRoot: string, moduleSpecifier: string): string | null {
    return resolveImportCandidates(frontendRoot, moduleSpecifier).find(candidate => fs.existsSync(candidate)) ?? null
}

describe('route lazy import contract', () => {
    test('route lazy imports resolve to existing default-export modules', () => {
        const frontendRoot = getFrontendRoot()
        const routeConfigPath = path.join(
            frontendRoot,
            'src',
            'app',
            'providers',
            'router',
            'config',
            'routeConfig.tsx'
        )
        const routeConfigSource = fs.readFileSync(routeConfigPath, 'utf-8')
        const importSpecifiers = [...routeConfigSource.matchAll(ROUTE_IMPORT_PATTERN)].map(match => match[1])

        expect(importSpecifiers.length).toBeGreaterThan(0)

        const missingModules: string[] = []
        const nonDefaultModules: string[] = []

        importSpecifiers.forEach(moduleSpecifier => {
            const resolvedModuleFile = resolveExistingModuleFile(frontendRoot, moduleSpecifier)
            if (resolvedModuleFile == null) {
                missingModules.push(moduleSpecifier)
                return
            }

            const moduleSource = fs.readFileSync(resolvedModuleFile, 'utf-8')
            if (!DEFAULT_EXPORT_PATTERN.test(moduleSource)) {
                nonDefaultModules.push(`${moduleSpecifier} -> ${path.relative(frontendRoot, resolvedModuleFile)}`)
            }
        })

        expect(missingModules).toEqual([])
        expect(nonDefaultModules).toEqual([])
    })
})
