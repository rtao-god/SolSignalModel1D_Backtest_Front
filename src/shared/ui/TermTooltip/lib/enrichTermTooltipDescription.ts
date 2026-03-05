import { ReactNode } from 'react'
import { renderTermTooltipRichText } from '../ui/renderTermTooltipRichText'

interface EnrichTermTooltipDescriptionOptions {
    term?: string | null
    excludeTerms?: string[]
    excludeRuleIds?: string[]
    excludeRuleTitles?: string[]
    maxRecursionDepth?: number
}

function normalizeNonEmptyValues(values: Array<string | null | undefined>): string[] {
    return values.map(value => value?.trim() ?? '').filter(value => value.length > 0)
}

export function enrichTermTooltipDescription(
    description: ReactNode,
    options?: EnrichTermTooltipDescriptionOptions
): ReactNode {
    if (typeof description !== 'string') {
        return description
    }

    const term = options?.term?.trim() ?? ''
    const excludeTerms = normalizeNonEmptyValues([...(options?.excludeTerms ?? []), term || undefined])
    const excludeRuleTitles = normalizeNonEmptyValues([...(options?.excludeRuleTitles ?? []), term || undefined])

    return renderTermTooltipRichText(description, {
        excludeTerms,
        excludeRuleIds: normalizeNonEmptyValues(options?.excludeRuleIds ?? []),
        excludeRuleTitles,
        maxRecursionDepth: options?.maxRecursionDepth ?? 1
    })
}
