import { resolveMatchingTermTooltipRuleIds } from '@/shared/ui/TermTooltip/ui/renderTermTooltipRichText'

const TERMS_BLOCK_COLLAPSE_STORAGE_PREFIX = 'report-terms-block:collapsed:'

function normalizeNonEmptyAliases(values: string[]): string[] {
    return Array.from(new Set(values.map(value => value.trim()).filter(value => value.length > 0)))
}

function normalizeStorageKeyPart(value: string | undefined): string {
    return (value ?? '').trim().replace(/\s+/g, ' ')
}

export function buildSelfTooltipExclusions(termKey: string, termTitle: string, selfAliases: string[] = []) {
    const allAliases = normalizeNonEmptyAliases([termTitle, termKey, ...selfAliases])
    const excludeRuleIds = Array.from(new Set(allAliases.flatMap(alias => resolveMatchingTermTooltipRuleIds(alias))))

    return {
        excludeTerms: allAliases,
        excludeRuleIds,
        excludeRuleTitles: allAliases
    }
}

export function buildReportTableTermsCollapseStorageKey(params: {
    reportKind?: string
    sectionTitle?: string
    title?: string
    termKeys: string[]
}): string | null {
    const normalizedTermKeys = normalizeNonEmptyAliases(params.termKeys)
    const parts = [
        normalizeStorageKeyPart(params.reportKind),
        normalizeStorageKeyPart(params.sectionTitle),
        normalizeStorageKeyPart(params.title),
        normalizeStorageKeyPart(normalizedTermKeys.join('|'))
    ].filter(value => value.length > 0)

    if (parts.length === 0) {
        return null
    }

    return `${TERMS_BLOCK_COLLAPSE_STORAGE_PREFIX}${parts.join('::')}`
}
