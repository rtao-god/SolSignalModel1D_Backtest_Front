import type { i18n as I18nInstance } from 'i18next'
import { readActiveLocaleResource } from '@/shared/lib/i18n'

export interface ExplainLocalizedTermItem {
    term: string
    description: string
}

export type ExplainI18nNamespace = 'explain' | 'guide'

/**
 * Читает список терминов из i18n и валидирует контракт для Explain-страниц.
 */
export function readExplainTermItemsOrThrow(
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

        if (typeof term !== 'string' || term.trim().length === 0) {
            throw new Error(`[${resourceName}] term label is invalid. key=${key}, index=${index}.`)
        }

        if (typeof description !== 'string' || description.trim().length === 0) {
            throw new Error(`[${resourceName}] term description is invalid. key=${key}, index=${index}.`)
        }

        return { term, description }
    })
}

/**
 * Читает список строк из i18n (например, для bullet/ordered списков).
 */
export function readExplainStringListOrThrow(
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
export function readExplainTableRowsOrThrow(
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
                throw new Error(`[${resourceName}] table cell is invalid. key=${key}, row=${rowIndex}, cell=${cellIndex}.`)
            }

            return cell
        })
    })
}
