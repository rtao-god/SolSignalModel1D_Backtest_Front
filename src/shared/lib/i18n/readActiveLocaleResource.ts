import type { i18n as I18nInstance } from 'i18next'
import { normalizeI18nLanguage } from './locale'

/**
 * Читает ресурс только из активной локали без fallback-цепочки,
 * чтобы ошибка в одной языковой версии не ломала другую.
 */
export function readActiveLocaleResource(
    i18n: I18nInstance,
    namespace: string,
    key: string,
    errorSource: string
): unknown {
    const activeLanguage = normalizeI18nLanguage(i18n.resolvedLanguage ?? i18n.language)
    const hasNamespaceBundle = i18n.hasResourceBundle(activeLanguage, namespace)
    const hasLoadedNamespace = i18n.hasLoadedNamespace(namespace, { lng: activeLanguage })

    if (!hasNamespaceBundle && !hasLoadedNamespace) {
        throw new Error(
            `[${errorSource}] namespace is not loaded for active language. language=${activeLanguage}, namespace=${namespace}.`
        )
    }

    const value = i18n.getResource(activeLanguage, namespace, key) as unknown

    if (value === undefined) {
        throw new Error(
            `[${errorSource}] resource is missing for active language. language=${activeLanguage}, namespace=${namespace}, key=${key}.`
        )
    }

    return value
}

/**
 * Читает строку только из активной локали и запрещает пустые значения.
 */
export function readActiveLocaleString(
    i18n: I18nInstance,
    namespace: string,
    key: string,
    errorSource: string
): string {
    const value = readActiveLocaleResource(i18n, namespace, key, errorSource)

    if (typeof value !== 'string' || value.trim().length === 0) {
        throw new Error(`[${errorSource}] string resource is missing or invalid. namespace=${namespace}, key=${key}.`)
    }

    return value
}
