import type { i18n as I18nInstance } from 'i18next'
import { readActiveLocaleResource, readActiveLocaleString } from '@/shared/lib/i18n/readActiveLocaleResource'
import type { DeveloperLocalizedTermItem } from './types'

/**
 * Читает sentence-блок developer-страницы из активной локали без fallback-цепочки.
 */
export function readDeveloperSentenceOrThrow(i18n: I18nInstance, key: string): string {
    return readActiveLocaleString(i18n, 'developer', key, 'developer.i18n')
}

/**
 * Читает локальный glossary developer-страницы и валидирует все обязательные поля.
 */
export function readDeveloperTermItemsOrThrow(i18n: I18nInstance, key: string): DeveloperLocalizedTermItem[] {
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
 * Собирает только валидные term-группы для page-level glossary.
 */
export function readAvailableDeveloperTermGroups(
    i18n: I18nInstance,
    keys: readonly string[]
): DeveloperLocalizedTermItem[][] {
    return keys.flatMap(key => {
        try {
            return [readDeveloperTermItemsOrThrow(i18n, key)]
        } catch {
            return []
        }
    })
}
