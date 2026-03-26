import { describe, expect, test } from 'vitest'
import path from 'node:path'
import fs from 'node:fs'
import { resolveRegisteredTermTooltipRuleIdsByExactLabel } from '@/shared/ui/TermTooltip'

interface DuplicateIssue {
    file: string
    path: string
    term: string
    sharedCandidates: string[]
}

function isWhyOnlyCollision(sharedCandidates: string[]): boolean {
    return sharedCandidates.length > 0 && sharedCandidates.every(candidate => candidate.startsWith('why-'))
}

function collectLocaleFilesToScan(): string[] {
    const candidates = [
        path.resolve(process.cwd(), 'public', 'locales'),
        path.resolve(process.cwd(), 'SolSignalModel1D_Backtest_Front', 'public', 'locales')
    ]

    const localesRoot = candidates.find(candidate => fs.existsSync(candidate))
    if (!localesRoot) {
        throw new Error('[shared-term-ownership.test] locales root is missing.')
    }

    return ['ru', 'en'].flatMap(locale => {
        const localeDirectory = path.resolve(localesRoot, locale)
        return fs
            .readdirSync(localeDirectory)
            .filter(fileName => fileName.endsWith('.json'))
            .map(fileName => path.join('public', 'locales', locale, fileName))
    })
}

function resolveLocaleFilePath(relativeFilePath: string): string {
    const candidates = [
        path.resolve(process.cwd(), relativeFilePath),
        path.resolve(process.cwd(), 'SolSignalModel1D_Backtest_Front', relativeFilePath)
    ]

    const matchedPath = candidates.find(candidate => fs.existsSync(candidate))
    if (!matchedPath) {
        throw new Error(`[shared-term-ownership.test] locale file is missing. relativePath=${relativeFilePath}.`)
    }

    return matchedPath
}

function collectDuplicateIssuesInNode(node: unknown, file: string, pathStack: string[] = []): DuplicateIssue[] {
    if (Array.isArray(node)) {
        return node.flatMap((item, index) => collectDuplicateIssuesInNode(item, file, [...pathStack, `[${index}]`]))
    }

    if (!node || typeof node !== 'object') {
        return []
    }

    const issueList: DuplicateIssue[] = []
    const record = node as Record<string, unknown>
    const term = typeof record.term === 'string' ? record.term.trim() : ''
    const description = typeof record.description === 'string' ? record.description.trim() : ''
    const sharedTermId = typeof record.sharedTermId === 'string' ? record.sharedTermId.trim() : ''
    const localId = typeof record.id === 'string' ? record.id.trim() : ''

    if (term && description) {
        const sharedCandidates = resolveRegisteredTermTooltipRuleIdsByExactLabel(term)
        const isCanonicalOwnerDefinition = localId.length > 0 && sharedCandidates.includes(localId)

        if (isWhyOnlyCollision(sharedCandidates)) {
            return issueList
        }

        if (sharedTermId || (sharedCandidates.length > 0 && !isCanonicalOwnerDefinition)) {
            issueList.push({
                file,
                path: pathStack.join('.'),
                term,
                sharedCandidates: sharedTermId ? [sharedTermId, ...sharedCandidates] : sharedCandidates
            })
        }
    }

    return issueList.concat(
        Object.entries(record).flatMap(([key, value]) => collectDuplicateIssuesInNode(value, file, [...pathStack, key]))
    )
}

function collectDuplicateIssues(): DuplicateIssue[] {
    return collectLocaleFilesToScan().flatMap(relativeFilePath => {
        const absoluteFilePath = resolveLocaleFilePath(relativeFilePath)
        const content = fs.readFileSync(absoluteFilePath, 'utf-8')
        const parsed = JSON.parse(content) as unknown
        return collectDuplicateIssuesInNode(parsed, relativeFilePath)
    })
}

describe('localized shared-term ownership', () => {
    test('forbids local descriptions for terms that already belong to shared tooltip registry', () => {
        expect(collectDuplicateIssues()).toEqual([])
    })
})
