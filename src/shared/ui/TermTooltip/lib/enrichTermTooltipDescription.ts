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

const ENRICHED_TOOLTIP_DESCRIPTION_CACHE_LIMIT = 400
const ENRICHED_TOOLTIP_DESCRIPTION_CACHE = new Map<string, ReactNode>()

function normalizeNonEmptyValues(values: Array<string | null | undefined>): string[] {
    return values.map(value => value?.trim() ?? '').filter(value => value.length > 0)
}

function normalizeCacheKeyValues(values: Array<string | null | undefined>): string[] {
    return Array.from(new Set(normalizeNonEmptyValues(values))).sort((left, right) => left.localeCompare(right))
}

function buildEnrichedTooltipDescriptionCacheKey(
    description: string,
    options: EnrichTermTooltipDescriptionOptions | undefined,
    matchedRuleIds: string[]
): string {
    return JSON.stringify({
        description,
        term: options?.term?.trim() ?? '',
        selfAliases: normalizeCacheKeyValues(options?.selfAliases ?? []),
        excludeTerms: normalizeCacheKeyValues(options?.excludeTerms ?? []),
        excludeRuleIds: normalizeCacheKeyValues([...(options?.excludeRuleIds ?? []), ...matchedRuleIds]),
        excludeRuleTitles: normalizeCacheKeyValues(options?.excludeRuleTitles ?? []),
        maxRecursionDepth: options?.maxRecursionDepth ?? 2
    })
}

function readCachedEnrichedTooltipDescription(cacheKey: string): ReactNode | null {
    if (!ENRICHED_TOOLTIP_DESCRIPTION_CACHE.has(cacheKey)) {
        return null
    }

    const cached = ENRICHED_TOOLTIP_DESCRIPTION_CACHE.get(cacheKey) ?? null
    if (cached !== null) {
        ENRICHED_TOOLTIP_DESCRIPTION_CACHE.delete(cacheKey)
        ENRICHED_TOOLTIP_DESCRIPTION_CACHE.set(cacheKey, cached)
    }

    return cached
}

function writeCachedEnrichedTooltipDescription(cacheKey: string, value: ReactNode): ReactNode {
    if (ENRICHED_TOOLTIP_DESCRIPTION_CACHE.size >= ENRICHED_TOOLTIP_DESCRIPTION_CACHE_LIMIT) {
        const oldestKey = ENRICHED_TOOLTIP_DESCRIPTION_CACHE.keys().next().value
        if (typeof oldestKey === 'string') {
            ENRICHED_TOOLTIP_DESCRIPTION_CACHE.delete(oldestKey)
        }
    }

    ENRICHED_TOOLTIP_DESCRIPTION_CACHE.set(cacheKey, value)
    return value
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

            // Один и тот же tooltip-текст открывается много раз в больших таблицах истории.
            // Кэш снимает повторный прогон rich-text matcher и вложенных term-обёрток на каждом hover.
            const cacheKey = buildEnrichedTooltipDescriptionCacheKey(resolvedDescription, options, matchedRuleIds)
            const cachedDescription = readCachedEnrichedTooltipDescription(cacheKey)
            if (cachedDescription !== null) {
                return cachedDescription
            }

            return writeCachedEnrichedTooltipDescription(
                cacheKey,
                renderTermTooltipRichText(resolvedDescription, {
                    excludeTerms,
                    excludeRuleIds,
                    excludeRuleTitles,
                    // Два уровня оставляют вложенные glossary-ссылки интерактивными и при этом ограничивают циклы.
                    maxRecursionDepth: options?.maxRecursionDepth ?? 2
                })
            )
        }
    })
}
