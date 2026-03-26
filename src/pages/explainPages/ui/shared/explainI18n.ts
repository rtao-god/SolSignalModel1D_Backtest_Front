import type { i18n as I18nInstance } from 'i18next'
import { readActiveLocaleResource } from '@/shared/lib/i18n'
import { validateCommonTooltipDescription } from '@/shared/terms/common/tooltipQuality'
import {
    resolveRegisteredTermTooltipRuleIdsByExactLabel,
    resolveRegisteredTermTooltipTitle
} from '@/shared/ui/TermTooltip'

export interface ExplainLocalizedTermItem {
    term: string
    description?: string
    sharedTermId?: string
}

export type ExplainI18nNamespace = 'explain' | 'guide'

/**
 * Читает список терминов из i18n и валидирует контракт для Explain-страниц.
 */
export function readExplainTermItems(
    i18n: I18nInstance,
    key: string,
    namespace: ExplainI18nNamespace = 'explain'
): ExplainLocalizedTermItem[] {
    const resourceName = `${namespace}.i18n`
    const value = readActiveLocaleResource(i18n, namespace, key, resourceName)
    if (!Array.isArray(value)) {
        throw new Error(`[${resourceName}] term list is missing or invalid. key=${key}.`)
    }

    return value.map((item, index) => {
        if (!item || typeof item !== 'object') {
            throw new Error(`[${resourceName}] term item is invalid. key=${key}, index=${index}.`)
        }

        const term = (item as Record<string, unknown>).term
        const description = (item as Record<string, unknown>).description
        const sharedTermId = (item as Record<string, unknown>).sharedTermId

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

            return { term: normalizedTerm, sharedTermId: normalizedSharedTermId }
        }

        if (typeof term !== 'string' || term.trim().length === 0) {
            throw new Error(`[${resourceName}] term label is invalid. key=${key}, index=${index}.`)
        }

        const matchedSharedRuleIds = resolveRegisteredTermTooltipRuleIdsByExactLabel(term)
        if (matchedSharedRuleIds.length > 0) {
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

        return { term, description }
    })
}

/**
 * Читает список строк из i18n (например, для bullet/ordered списков).
 */
export function readExplainStringList(
    i18n: I18nInstance,
    key: string,
    namespace: ExplainI18nNamespace = 'explain'
): string[] {
    const resourceName = `${namespace}.i18n`
    const value = readActiveLocaleResource(i18n, namespace, key, resourceName)
    if (!Array.isArray(value)) {
        throw new Error(`[${resourceName}] string list is missing or invalid. key=${key}.`)
    }

    return value.map((item, index) => {
        if (typeof item !== 'string' || item.trim().length === 0) {
            throw new Error(`[${resourceName}] string list item is invalid. key=${key}, index=${index}.`)
        }

        return item
    })
}

/**
 * Читает таблицу как массив строк (rows -> cells) и валидирует типы.
 */
export function readExplainTableRows(
    i18n: I18nInstance,
    key: string,
    namespace: ExplainI18nNamespace = 'explain'
): string[][] {
    const resourceName = `${namespace}.i18n`
    const value = readActiveLocaleResource(i18n, namespace, key, resourceName)
    if (!Array.isArray(value)) {
        throw new Error(`[${resourceName}] table rows are missing or invalid. key=${key}.`)
    }

    return value.map((row, rowIndex) => {
        if (!Array.isArray(row)) {
            throw new Error(`[${resourceName}] table row is invalid. key=${key}, row=${rowIndex}.`)
        }

        return row.map((cell, cellIndex) => {
            if (typeof cell !== 'string') {
                throw new Error(
                    `[${resourceName}] table cell is invalid. key=${key}, row=${rowIndex}, cell=${cellIndex}.`
                )
            }

            return cell
        })
    })
}
