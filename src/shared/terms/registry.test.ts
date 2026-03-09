import { COMMON_TERM_TOOLTIP_REGISTRY } from './common'
import { resolveSharedTermSelfAliasesOrThrow } from './registry'
import { buildSafeTermTooltipRegistry } from '@/shared/ui/TermTooltip/lib/termTooltipRegistryIntegrity'
import type { TermTooltipRegistryEntry } from '@/shared/ui/TermTooltip/lib/termTooltipMatcher'

function buildTestAliases(title: string | undefined, aliases: string[] | undefined, autolink: boolean | undefined): string[] {
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
        expect(resolveSharedTermSelfAliasesOrThrow('policy')).toEqual(expect.arrayContaining(['Policy']))
    })
})
