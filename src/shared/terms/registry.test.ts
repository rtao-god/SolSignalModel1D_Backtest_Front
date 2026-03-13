import { COMMON_TERM_TOOLTIP_REGISTRY } from './common'
import { validateCommonTooltipDescription } from './common/tooltipQuality'
import { resolveSharedTermSelfAliases } from './registry'
import { buildSafeTermTooltipRegistry } from '@/shared/ui/TermTooltip/lib/termTooltipRegistryIntegrity'
import { resolveTermTooltipDescriptionContent } from '@/shared/ui/TermTooltip/lib/resolveTermTooltipDescriptionContent'
import type { TermTooltipRegistryEntry } from '@/shared/ui/TermTooltip/lib/termTooltipMatcher'

function buildTestAliases(
    title: string | undefined,
    aliases: string[] | undefined,
    autolink: boolean | undefined
): string[] {
    if (autolink === false) {
        return []
    }

    return Array.from(new Set([title, ...(aliases ?? [])].map(value => value?.trim() ?? '').filter(Boolean)))
}

function buildCommonRegistryEntriesForValidation(): TermTooltipRegistryEntry[] {
    return COMMON_TERM_TOOLTIP_REGISTRY.map(term => ({
        id: term.id,
        title: term.title,
        description: `${term.id} description`,
        aliases: buildTestAliases(term.title, term.aliases, term.autolink),
        priority: term.priority ?? 100,
        contexts: term.contexts,
        excludeSelf: term.excludeSelf ?? true,
        pattern: term.pattern
    }))
}

function resolveTooltipText(description: string | (() => string)): string {
    const resolvedDescription = resolveTermTooltipDescriptionContent(description)
    if (typeof resolvedDescription !== 'string') {
        throw new Error('Shared tooltip registry test expects plain string descriptions.')
    }

    return resolvedDescription
}

describe('shared term registry', () => {
    test('contains unique ids', () => {
        const ids = COMMON_TERM_TOOLTIP_REGISTRY.map(term => term.id)
        expect(new Set(ids).size).toBe(ids.length)
    })

    test('keeps autolink labels collision-free', () => {
        const result = buildSafeTermTooltipRegistry(buildCommonRegistryEntriesForValidation())
        expect(result.issues).toEqual([])
    })

    test('policy exposes canonical self aliases', () => {
        expect(resolveSharedTermSelfAliases('policy')).toEqual(expect.arrayContaining(['Policy']))
    })

    test('keeps canonical common tooltip descriptions full and structured', () => {
        const issues = COMMON_TERM_TOOLTIP_REGISTRY.flatMap(term => {
            const description = resolveTooltipText(term.description as string | (() => string))
            return validateCommonTooltipDescription(description).map(issue => `${term.id}: ${issue.message}`)
        })

        expect(issues).toEqual([])
    })
})
