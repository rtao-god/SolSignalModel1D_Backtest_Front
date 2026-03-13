import { ReactNode } from 'react'
import { renderTermTooltipRichText, resolveMatchingTermTooltipRuleIds } from '../ui/renderTermTooltipRichText'
import { resolveTermTooltipDescriptionContent } from './resolveTermTooltipDescriptionContent'

interface EnrichTermTooltipDescriptionOptions {
    term?: string | null
    selfAliases?: string[]
    excludeTerms?: string[]
    excludeRuleIds?: string[]
    excludeRuleTitles?: string[]
    maxRecursionDepth?: number
}

function normalizeNonEmptyValues(values: Array<string | null | undefined>): string[] {
    return values.map(value => value?.trim() ?? '').filter(value => value.length > 0)
}

export function enrichTermTooltipDescription(
    description: ReactNode | (() => ReactNode),
    options?: EnrichTermTooltipDescriptionOptions
): ReactNode {
    return resolveTermTooltipDescriptionContent(description, {
        resolveString: resolvedDescription => {
            const term = options?.term?.trim() ?? ''
            const selfAliases = normalizeNonEmptyValues([term || undefined, ...(options?.selfAliases ?? [])])
            const excludeTerms = normalizeNonEmptyValues([...(options?.excludeTerms ?? []), ...selfAliases])
            const excludeRuleTitles = normalizeNonEmptyValues([...(options?.excludeRuleTitles ?? []), ...selfAliases])
            const matchedRuleIds = Array.from(
                new Set(selfAliases.flatMap(alias => resolveMatchingTermTooltipRuleIds(alias)))
            )
            const excludeRuleIds = Array.from(
                new Set(normalizeNonEmptyValues([...(options?.excludeRuleIds ?? []), ...matchedRuleIds]))
            )

            return renderTermTooltipRichText(resolvedDescription, {
                excludeTerms,
                excludeRuleIds,
                excludeRuleTitles,
                // Два уровня оставляют вложенные glossary-ссылки интерактивными и при этом ограничивают циклы.
                maxRecursionDepth: options?.maxRecursionDepth ?? 2
            })
        }
    })
}
