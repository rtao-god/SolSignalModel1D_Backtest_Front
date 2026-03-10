import type { i18n as I18nInstance } from 'i18next'
import { readActiveLocaleResource } from '@/shared/lib/i18n'

export interface GuideLocalizedTermItem {
    id: string
    term: string
    description: string
}

/**
 * Читает локальные термины guide-страницы и валидирует полный контракт tooltip-глоссария.
 */
export function readGuideTermItemsOrThrow(i18n: I18nInstance, key: string): GuideLocalizedTermItem[] {
    const resourceName = 'guide.i18n'
    const value = readActiveLocaleResource(i18n, 'guide', key, resourceName)

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

        if (typeof id !== 'string' || id.trim().length === 0) {
            throw new Error(`[${resourceName}] term id is invalid. key=${key}, index=${index}.`)
        }

        if (typeof term !== 'string' || term.trim().length === 0) {
            throw new Error(`[${resourceName}] term label is invalid. key=${key}, index=${index}.`)
        }

        if (typeof description !== 'string' || description.trim().length === 0) {
            throw new Error(`[${resourceName}] term description is invalid. key=${key}, index=${index}.`)
        }

        return { id, term, description }
    })
}

/**
 * Читает список абзацев guide-страницы и запрещает пустые элементы.
 */
export function readGuideStringListOrThrow(i18n: I18nInstance, key: string): string[] {
    const resourceName = 'guide.i18n'
    const value = readActiveLocaleResource(i18n, 'guide', key, resourceName)

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
 * Читает таблицу guide-страницы и валидирует каждую ячейку.
 */
export function readGuideTableRowsOrThrow(i18n: I18nInstance, key: string): string[][] {
    const resourceName = 'guide.i18n'
    const value = readActiveLocaleResource(i18n, 'guide', key, resourceName)

    if (!Array.isArray(value)) {
        throw new Error(`[${resourceName}] table rows are missing or invalid. key=${key}.`)
    }

    return value.map((row, rowIndex) => {
        if (!Array.isArray(row)) {
            throw new Error(`[${resourceName}] table row is invalid. key=${key}, row=${rowIndex}.`)
        }

        return row.map((cell, cellIndex) => {
            if (typeof cell !== 'string' || cell.trim().length === 0) {
                throw new Error(`[${resourceName}] table cell is invalid. key=${key}, row=${rowIndex}, cell=${cellIndex}.`)
            }

            return cell
        })
    })
}

/**
 * Собирает только валидные term-группы, чтобы один дефект локали не блокировал соседние секции.
 */
export function readAvailableGuideTermGroups(i18n: I18nInstance, keys: readonly string[]): GuideLocalizedTermItem[][] {
    return keys.flatMap(key => {
        try {
            return [readGuideTermItemsOrThrow(i18n, key)]
        } catch {
            return []
        }
    })
}
