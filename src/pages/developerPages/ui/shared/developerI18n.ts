import type { i18n as I18nInstance } from 'i18next'
import { readActiveLocaleResource, readActiveLocaleString } from '@/shared/lib/i18n/readActiveLocaleResource'
import { validateCommonTooltipDescription } from '@/shared/terms/common/tooltipQuality'
import {
    resolveRegisteredTermTooltipRuleIdsByExactLabel,
    resolveRegisteredTermTooltipTitle
} from '@/shared/ui/TermTooltip'
import type { DeveloperLocalizedTermItem } from './types'

/**
 * Читает sentence-блок developer-страницы из активной локали без fallback-цепочки.
 */
export function readDeveloperSentence(i18n: I18nInstance, key: string): string {
    return readActiveLocaleString(i18n, 'developer', key, 'developer.i18n')
}

/**
 * Читает локальный glossary developer-страницы и валидирует все обязательные поля.
 */
export function readDeveloperTermItems(i18n: I18nInstance, key: string): DeveloperLocalizedTermItem[] {
    const resourceName = 'developer.i18n'
    const value = readActiveLocaleResource(i18n, 'developer', key, resourceName)

    if (!Array.isArray(value)) {
        throw new Error(`[${resourceName}] term list is missing or invalid. key=${key}.`)
    }

    return value.map((item, index) => {
        if (!item || typeof item !== 'object') {
            throw new Error(`[${resourceName}] term item is invalid. key=${key}, index=${index}.`)
        }

        const id = (item as Record<string, unknown>).id
        const term = (item as Record<string, unknown>).term
        const description = (item as Record<string, unknown>).description
        const sharedTermId = (item as Record<string, unknown>).sharedTermId

        if (typeof id !== 'string' || id.trim().length === 0) {
            throw new Error(`[${resourceName}] term id is invalid. key=${key}, index=${index}.`)
        }

        const normalizedSharedTermId =
            typeof sharedTermId === 'string' && sharedTermId.trim().length > 0 ? sharedTermId.trim() : null

        if (normalizedSharedTermId) {
            if (typeof description === 'string' && description.trim().length > 0) {
                throw new Error(
                    `[${resourceName}] shared term must not duplicate local description. key=${key}, index=${index}, sharedTermId=${normalizedSharedTermId}.`
                )
            }

            const resolvedTitle = resolveRegisteredTermTooltipTitle(normalizedSharedTermId)
            const normalizedTerm =
                typeof term === 'string' && term.trim().length > 0 ? term.trim() : (resolvedTitle?.trim() ?? '')

            if (!normalizedTerm) {
                throw new Error(
                    `[${resourceName}] shared term label is invalid. key=${key}, index=${index}, sharedTermId=${normalizedSharedTermId}.`
                )
            }

            return { id, term: normalizedTerm, sharedTermId: normalizedSharedTermId }
        }

        if (typeof term !== 'string' || term.trim().length === 0) {
            throw new Error(`[${resourceName}] term label is invalid. key=${key}, index=${index}.`)
        }

        const matchedSharedRuleIds = resolveRegisteredTermTooltipRuleIdsByExactLabel(term)
        const isCanonicalOwnerDefinition = matchedSharedRuleIds.includes(id)
        if (matchedSharedRuleIds.length > 0 && !isCanonicalOwnerDefinition) {
            throw new Error(
                `[${resourceName}] local shared-term duplicate is forbidden. key=${key}, index=${index}, term=${term.trim()}, sharedCandidates=${matchedSharedRuleIds.join(',')}.`
            )
        }

        if (typeof description !== 'string' || description.trim().length === 0) {
            throw new Error(`[${resourceName}] term description is invalid. key=${key}, index=${index}.`)
        }

        const descriptionIssues = validateCommonTooltipDescription(description)
        if (descriptionIssues.length > 0) {
            throw new Error(
                `[${resourceName}] term description must satisfy full-tooltip contract. key=${key}, index=${index}, issues=${descriptionIssues.map(issue => issue.type).join(',')}.`
            )
        }

        return { id, term, description }
    })
}

/**
 * Собирает только валидные term-группы для page-level glossary.
 */
export function readAvailableDeveloperTermGroups(
    i18n: I18nInstance,
    keys: readonly string[]
): DeveloperLocalizedTermItem[][] {
    return keys.flatMap(key => {
        try {
            return [readDeveloperTermItems(i18n, key)]
        } catch {
            return []
        }
    })
}
