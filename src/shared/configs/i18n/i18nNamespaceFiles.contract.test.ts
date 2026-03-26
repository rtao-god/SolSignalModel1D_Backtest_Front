import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, test } from 'vitest'
import { I18N_NAMESPACES } from './namespaces'
import { getSupportedI18nLanguages } from '@/shared/lib/i18n'

function getFrontendRoot(): string {
    return path.resolve(__dirname, '..', '..', '..', '..')
}

describe('i18n namespace contract', () => {
    test('every supported language has every declared namespace file with valid json', () => {
        const frontendRoot = getFrontendRoot()
        const missingNamespaceFiles: string[] = []
        const invalidNamespaceFiles: string[] = []

        getSupportedI18nLanguages().forEach(language => {
            I18N_NAMESPACES.forEach(namespace => {
                const namespaceFilePath = path.join(frontendRoot, 'public', 'locales', language, `${namespace}.json`)

                if (!fs.existsSync(namespaceFilePath)) {
                    missingNamespaceFiles.push(path.relative(frontendRoot, namespaceFilePath))
                    return
                }

                try {
                    JSON.parse(fs.readFileSync(namespaceFilePath, 'utf-8'))
                } catch (error) {
                    const normalizedError = error instanceof Error ? error.message : String(error)
                    invalidNamespaceFiles.push(
                        `${path.relative(frontendRoot, namespaceFilePath)} :: ${normalizedError}`
                    )
                }
            })
        })

        expect(missingNamespaceFiles).toEqual([])
        expect(invalidNamespaceFiles).toEqual([])
    })
})
