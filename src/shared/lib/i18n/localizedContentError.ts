import { getSupportedI18nLanguages, normalizeI18nLanguage } from './locale'

const LOCALIZED_CONTENT_ERROR_PATTERN = /\[[a-z0-9.-]+\.i18n\]/i
const ACTIVE_LOCALE_RESOURCE_ERROR_FRAGMENT = 'resource is missing for active language'
const ACTIVE_LOCALE_NAMESPACE_PENDING_FRAGMENT = 'namespace is not loaded for active language'

/**
 * Возвращает альтернативный поддерживаемый язык для явного переключения,
 * когда активная локаль блока или страницы нарушает строгий i18n-контракт.
 */
export function resolveAlternativeI18nLanguage(language: string | null | undefined): string | null {
    const activeLanguage = normalizeI18nLanguage(language)
    return getSupportedI18nLanguages().find(candidate => candidate !== activeLanguage) ?? null
}

/**
 * Определяет ошибки строгой локализации, которые должны оставаться
 * внутри page/section boundary и не превращаться в fatal overlay.
 */
export function isLocalizedContentError(error: unknown): error is Error {
    if (!(error instanceof Error)) {
        return false
    }

    return (
        LOCALIZED_CONTENT_ERROR_PATTERN.test(error.message) ||
        error.message.includes(ACTIVE_LOCALE_RESOURCE_ERROR_FRAGMENT)
    )
}

/**
 * Определяет временный i18n-race, когда strict reader вызван до завершения
 * загрузки namespace для активной локали.
 */
export function isLocalizedContentPendingError(error: unknown): error is Error {
    return error instanceof Error && error.message.includes(ACTIVE_LOCALE_NAMESPACE_PENDING_FRAGMENT)
}
