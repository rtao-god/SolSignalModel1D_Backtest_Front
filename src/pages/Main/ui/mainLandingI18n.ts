import type { i18n as I18nInstance } from 'i18next'
import { readActiveLocaleResource } from '@/shared/lib/i18n'

/**
 * Читает список строк для любого текстового блока главной страницы и валидирует контракт локали.
 */
export function readMainStringListOrThrow(i18n: I18nInstance, key: string): string[] {
    const value = readActiveLocaleResource(i18n, 'reports', key, 'main.i18n')
    if (!Array.isArray(value)) {
        throw new Error(`[main.i18n] string list is missing or invalid. key=${key}.`)
    }

    return value.map((item, index) => {
        if (typeof item !== 'string' || item.trim().length === 0) {
            throw new Error(`[main.i18n] string list item is invalid. key=${key}, index=${index}.`)
        }

        return item
    })
}
