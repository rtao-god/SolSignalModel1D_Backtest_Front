import { I18N_NAMESPACES } from '@/shared/configs/i18n/namespaces'

export const DEFAULT_I18N_LANGUAGE = 'en'
export const DEFAULT_INTL_LOCALE = 'en-US'

const I18N_LANGUAGE_TO_INTL_LOCALE: Record<string, string> = {
    en: 'en-US',
    ru: 'ru-RU'
}

const SUPPORTED_I18N_LANGUAGES = new Set(Object.keys(I18N_LANGUAGE_TO_INTL_LOCALE))

/**
 * Нормализует язык i18n до базового кода (например, ru-RU -> ru),
 * чтобы единообразно выбирать namespace и Intl-локаль.
 */
export function normalizeI18nLanguage(language: string | null | undefined): string {
    if (!language || typeof language !== 'string') {
        return DEFAULT_I18N_LANGUAGE
    }

    const normalized = language.trim().toLowerCase()
    if (!normalized) {
        return DEFAULT_I18N_LANGUAGE
    }

    const base = normalized.split('-')[0]
    if (!base) {
        return DEFAULT_I18N_LANGUAGE
    }

    return SUPPORTED_I18N_LANGUAGES.has(base) ? base : DEFAULT_I18N_LANGUAGE
}

export function resolveIntlLocaleByI18nLanguage(language: string | null | undefined): string {
    const normalized = normalizeI18nLanguage(language)
    return I18N_LANGUAGE_TO_INTL_LOCALE[normalized] ?? DEFAULT_INTL_LOCALE
}

export function getSupportedI18nLanguages(): string[] {
    return [...SUPPORTED_I18N_LANGUAGES]
}

export function getI18nNamespaces(): readonly string[] {
    return I18N_NAMESPACES
}
