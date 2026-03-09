import type { i18n as I18nInstance } from 'i18next'
import { readActiveLocaleResource } from '@/shared/lib/i18n'

export interface DocsLocalizedTermItem {
    id: string
    term: string
    description: string
}

/**
 * Читает список терминов docs-страницы и валидирует обязательные поля.
 */
export function readDocsTermItemsOrThrow(i18n: I18nInstance, key: string): DocsLocalizedTermItem[] {
    const value = readActiveLocaleResource(i18n, 'docs', key, 'docs.i18n')
    if (!Array.isArray(value)) {
        throw new Error(`[docs.i18n] term list is missing or invalid. key=${key}.`)
    }

    return value.map((item, index) => {
        if (!item || typeof item !== 'object') {
            throw new Error(`[docs.i18n] term item is invalid. key=${key}, index=${index}.`)
        }

        const id = (item as Record<string, unknown>).id
        const term = (item as Record<string, unknown>).term
        const description = (item as Record<string, unknown>).description

        if (typeof id !== 'string' || id.trim().length === 0) {
            throw new Error(`[docs.i18n] term id is invalid. key=${key}, index=${index}.`)
        }

        if (typeof term !== 'string' || term.trim().length === 0) {
            throw new Error(`[docs.i18n] term label is invalid. key=${key}, index=${index}.`)
        }

        if (typeof description !== 'string' || description.trim().length === 0) {
            throw new Error(`[docs.i18n] term description is invalid. key=${key}, index=${index}.`)
        }

        return { id, term, description }
    })
}

/**
 * Читает список абзацев или пунктов и запрещает пустые элементы.
 */
export function readDocsStringListOrThrow(i18n: I18nInstance, key: string): string[] {
    const value = readActiveLocaleResource(i18n, 'docs', key, 'docs.i18n')
    if (!Array.isArray(value)) {
        throw new Error(`[docs.i18n] string list is missing or invalid. key=${key}.`)
    }

    return value.map((item, index) => {
        if (typeof item !== 'string' || item.trim().length === 0) {
            throw new Error(`[docs.i18n] string list item is invalid. key=${key}, index=${index}.`)
        }

        return item
    })
}

/**
 * Читает таблицу docs-страницы как массив строк и валидирует каждую ячейку.
 */
export function readDocsTableRowsOrThrow(i18n: I18nInstance, key: string): string[][] {
    const value = readActiveLocaleResource(i18n, 'docs', key, 'docs.i18n')
    if (!Array.isArray(value)) {
        throw new Error(`[docs.i18n] table rows are missing or invalid. key=${key}.`)
    }

    return value.map((row, rowIndex) => {
        if (!Array.isArray(row)) {
            throw new Error(`[docs.i18n] table row is invalid. key=${key}, row=${rowIndex}.`)
        }

        return row.map((cell, cellIndex) => {
            if (typeof cell !== 'string' || cell.trim().length === 0) {
                throw new Error(`[docs.i18n] table cell is invalid. key=${key}, row=${rowIndex}, cell=${cellIndex}.`)
            }

            return cell
        })
    })
}

/**
 * Собирает только валидные группы терминов для page-level glossary,
 * чтобы дефект одной секции не блокировал рендер соседних секций.
 */
export function readAvailableDocsTermGroups(i18n: I18nInstance, keys: readonly string[]): DocsLocalizedTermItem[][] {
    return keys.flatMap(key => {
        try {
            return [readDocsTermItemsOrThrow(i18n, key)]
        } catch {
            return []
        }
    })
}
