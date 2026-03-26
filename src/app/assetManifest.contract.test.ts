import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, test } from 'vitest'

const LOCAL_ASSET_REFERENCE_PATTERN = /<(?:link|script)\b[^>]*(?:href|src)=["']([^"']+)["'][^>]*>/g

function getFrontendRoot(): string {
    return path.resolve(__dirname, '..', '..')
}

function collectHtmlEntryFiles(frontendRoot: string): string[] {
    return fs.readdirSync(frontendRoot, { withFileTypes: true }).flatMap(entry => {
        const nextPath = path.join(frontendRoot, entry.name)

        if (entry.isDirectory()) {
            if (entry.name === 'dist' || entry.name === 'node_modules') {
                return []
            }

            return collectHtmlEntryFiles(nextPath)
        }

        return entry.name.endsWith('.html') ? [nextPath] : []
    })
}

function isExternalAssetReference(assetPath: string): boolean {
    return /^(?:[a-z]+:)?\/\//i.test(assetPath) || assetPath.startsWith('data:')
}

function resolveAssetPath(frontendRoot: string, assetPath: string): string {
    if (assetPath.startsWith('/src/')) {
        return path.join(frontendRoot, assetPath.slice(1))
    }

    if (assetPath.startsWith('/')) {
        return path.join(frontendRoot, 'public', assetPath.slice(1))
    }

    return path.join(frontendRoot, assetPath)
}

describe('asset manifest contract', () => {
    test('html entry files reference only existing local assets', () => {
        const frontendRoot = getFrontendRoot()
        const htmlEntryFiles = collectHtmlEntryFiles(frontendRoot)
        const missingAssets: string[] = []

        // Guard нужен именно для preboot-слоя:
        // broken asset в HTML entry должен ловиться тестом, а не превращаться в runtime noise в браузере.
        for (const htmlFilePath of htmlEntryFiles) {
            const htmlSource = fs.readFileSync(htmlFilePath, 'utf-8')

            for (const match of htmlSource.matchAll(LOCAL_ASSET_REFERENCE_PATTERN)) {
                const assetPath = match[1]
                if (!assetPath || isExternalAssetReference(assetPath)) {
                    continue
                }

                const resolvedAssetPath = resolveAssetPath(frontendRoot, assetPath)
                if (!fs.existsSync(resolvedAssetPath)) {
                    missingAssets.push(
                        `${path.relative(frontendRoot, htmlFilePath)}: ${assetPath} -> ${path.relative(frontendRoot, resolvedAssetPath)}`
                    )
                }
            }
        }

        expect(missingAssets).toEqual([])
    })
})
