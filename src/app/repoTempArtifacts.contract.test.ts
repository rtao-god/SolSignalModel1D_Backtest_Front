import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, test } from 'vitest'

interface RepositoryTempArtifactPolicy {
    canonicalTempRootDirectory: string
    cleanupScriptRelativePath: string
    allowedTrackedTempFiles: string[]
    forbiddenRootEntryPatterns: string[]
}

function getFrontendRoot(): string {
    return path.resolve(__dirname, '..', '..')
}

function getRepositoryRoot(): string {
    return path.resolve(getFrontendRoot(), '..')
}

function loadPolicy(repositoryRoot: string): RepositoryTempArtifactPolicy {
    const policyPath = path.join(repositoryRoot, 'temp-artifact-policy.json')

    return JSON.parse(fs.readFileSync(policyPath, 'utf-8')) as RepositoryTempArtifactPolicy
}

function convertWildcardPatternToRegex(pattern: string): RegExp {
    const escaped = pattern
        .replace(/[|\\{}()[\]^$+?.]/g, '\\$&')
        .replace(/\*/g, '.*')
        .replace(/\?/g, '.')

    return new RegExp(`^${escaped}$`, 'i')
}

describe('repository temp artifacts contract', () => {
    test('repository root does not contain forbidden temporary entries outside canonical temp directory', () => {
        const repositoryRoot = getRepositoryRoot()
        const policy = loadPolicy(repositoryRoot)
        const forbiddenPatterns = policy.forbiddenRootEntryPatterns.map(convertWildcardPatternToRegex)

        const offenders = fs
            .readdirSync(repositoryRoot, { withFileTypes: true })
            .map(entry => entry.name)
            .filter(
                entryName =>
                    entryName.toLowerCase() !== policy.canonicalTempRootDirectory.toLowerCase() &&
                    forbiddenPatterns.some(pattern => pattern.test(entryName))
            )
            .sort((left, right) => left.localeCompare(right))

        expect(offenders).toEqual([])
    })

    test('canonical temp directory contains only tracked artifacts', () => {
        const repositoryRoot = getRepositoryRoot()
        const policy = loadPolicy(repositoryRoot)
        const canonicalTempRootPath = path.join(repositoryRoot, policy.canonicalTempRootDirectory)

        expect(fs.existsSync(canonicalTempRootPath)).toBe(true)

        const offenders = fs
            .readdirSync(canonicalTempRootPath, { withFileTypes: true })
            .map(entry => entry.name)
            .filter(
                entryName =>
                    !policy.allowedTrackedTempFiles.some(
                        allowedName => allowedName.toLowerCase() === entryName.toLowerCase()
                    )
            )
            .sort((left, right) => left.localeCompare(right))

        expect(offenders).toEqual([])
    })

    test('configured cleanup script exists', () => {
        const repositoryRoot = getRepositoryRoot()
        const policy = loadPolicy(repositoryRoot)
        const cleanupScriptPath = path.join(repositoryRoot, ...policy.cleanupScriptRelativePath.split('/'))

        expect(fs.existsSync(cleanupScriptPath)).toBe(true)
    })
})
