import type { i18n as I18nInstance } from 'i18next'
import { readActiveLocaleResource } from '@/shared/lib/i18n'

export interface MainIntroLocalizedTermItem {
    term: string
    description: string
}

/**
 * Читает список абзацев intro-блока главной из i18n и проверяет контракт.
 */
export function readMainIntroStringListOrThrow(i18n: I18nInstance, key: string): string[] {
    const value = readActiveLocaleResource(i18n, 'reports', key, 'main.intro.i18n')
    if (!Array.isArray(value)) {
        throw new Error(`[main.intro.i18n] string list is missing or invalid. key=${key}.`)
    }

    return value.map((item, index) => {
        if (typeof item !== 'string' || item.trim().length === 0) {
            throw new Error(`[main.intro.i18n] string list item is invalid. key=${key}, index=${index}.`)
        }

        return item
    })
}

/**
 * Читает список терминов intro-глоссария и валидирует поля term/description.
 */
export function readMainIntroTermItemsOrThrow(
    i18n: I18nInstance,
    key: string
): MainIntroLocalizedTermItem[] {
    const value = readActiveLocaleResource(i18n, 'reports', key, 'main.intro.i18n')
    if (!Array.isArray(value)) {
        throw new Error(`[main.intro.i18n] term list is missing or invalid. key=${key}.`)
    }

    return value.map((item, index) => {
        if (!item || typeof item !== 'object') {
            throw new Error(`[main.intro.i18n] term item is invalid. key=${key}, index=${index}.`)
        }

        const term = (item as Record<string, unknown>).term
        const description = (item as Record<string, unknown>).description

        if (typeof term !== 'string' || term.trim().length === 0) {
            throw new Error(`[main.intro.i18n] term label is invalid. key=${key}, index=${index}.`)
        }

        if (typeof description !== 'string' || description.trim().length === 0) {
            throw new Error(`[main.intro.i18n] term description is invalid. key=${key}, index=${index}.`)
        }

        return { term, description }
    })
}
