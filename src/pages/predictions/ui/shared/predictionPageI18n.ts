import type { i18n as I18nInstance } from 'i18next'

// Вводные блоки страниц прогноза и истории читают bullet-списки из locale как строгие массивы строк.
// Helper держит fail-fast контракт и не даёт silently принять битую структуру за валидный текстовый блок.
export function readPredictionPageStringList(
    i18n: I18nInstance,
    key: string,
    options?: Record<string, unknown>
): string[] {
    const value = i18n.t(key, { ns: 'reports', returnObjects: true, ...options })

    if (!Array.isArray(value) || value.length === 0) {
        throw new Error(`[prediction-pages] Localized string list is missing or empty. key=${key}.`)
    }

    return value.map((item, index) => {
        if (typeof item !== 'string' || item.trim().length === 0) {
            throw new Error(`[prediction-pages] Localized string list item is invalid. key=${key}, index=${index}.`)
        }

        return item
    })
}
