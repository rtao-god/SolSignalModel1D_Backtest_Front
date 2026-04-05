import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { describe, expect, test } from 'vitest'

function getFrontendRoot(): string {
    return path.resolve(__dirname, '..', '..', '..', '..')
}

describe('runtime logging contract', () => {
    test('working frontend code does not use raw console logging outside the logging sink', () => {
        const frontendRoot = getFrontendRoot()
        const ripgrepArgs = [
            '-n',
            '--hidden',
            '--glob',
            '!**/*.test.*',
            '--glob',
            '!**/*.stories.*',
            '--glob',
            '!**/shared/lib/logging/logError.ts',
            'console\\.(log|info|debug|warn|error)\\s*\\(',
            path.join(frontendRoot, 'src')
        ]
        const searchResult = spawnSync('rg', ripgrepArgs, {
            cwd: frontendRoot,
            encoding: 'utf-8'
        })

        const stdout = searchResult.stdout?.trim() ?? ''
        const stderr = searchResult.stderr?.trim() ?? ''
        const exitCode = searchResult.status ?? 1

        if (exitCode !== 0 && exitCode !== 1) {
            throw new Error(`rg failed. exitCode=${exitCode}. stderr=${stderr}`)
        }

        expect(stdout).toBe('')
    })

    test('working frontend code does not use raw generic error wrapping outside shared normalizers', () => {
        const frontendRoot = getFrontendRoot()
        const ripgrepArgs = [
            '-n',
            '--hidden',
            '--glob',
            '!**/*.test.*',
            '--glob',
            '!**/*.stories.*',
            '--glob',
            '!**/shared/lib/errors/normalizeError.ts',
            '--glob',
            '!**/shared/lib/logging/setupGlobalErrorHandlers.ts',
            'error instanceof Error \\? error : new Error\\(|err instanceof Error \\? err : new Error\\(|new Error\\(\'Network response was not ok\'\\)|An unknown error occurred|new Error\\(\'Failed to load [^\']*catalog\\.\'\\)|new Error\\(\'Failed to load [^\']*report\\.\'\\)|new Error\\(\'Failed to resolve report source endpoint\\.\'\\)|new Error\\(\'Failed to build [^\']* terms\\.\'\\)|throw new Error\\(\'no data\'\\)|Request timed out after|setError\\(\'Failed to load posts\'\\)',
            path.join(frontendRoot, 'src')
        ]
        const searchResult = spawnSync('rg', ripgrepArgs, {
            cwd: frontendRoot,
            encoding: 'utf-8'
        })

        const stdout = searchResult.stdout?.trim() ?? ''
        const stderr = searchResult.stderr?.trim() ?? ''
        const exitCode = searchResult.status ?? 1

        if (exitCode !== 0 && exitCode !== 1) {
            throw new Error(`rg failed. exitCode=${exitCode}. stderr=${stderr}`)
        }

        expect(stdout).toBe('')
    })
})
