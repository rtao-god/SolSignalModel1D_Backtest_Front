import { PropsWithChildren, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { LocaleContext, normalizeI18nLanguage, resolveIntlLocaleByI18nLanguage } from '@/shared/lib/i18n'
import { formatDateWithLocale } from '@/shared/utils/dateFormat'

/**
 * Провайдер локали связывает i18n-язык приложения с Intl-форматтерами,
 * чтобы дата/числа всегда рендерились в том же языковом контексте, что и UI-тексты.
 */
export default function LocaleProvider({ children }: PropsWithChildren) {
    const { i18n } = useTranslation()
    const i18nLanguage = normalizeI18nLanguage(i18n.resolvedLanguage ?? i18n.language)
    const intlLocale = resolveIntlLocaleByI18nLanguage(i18nLanguage)

    const value = useMemo(
        () => ({
            i18nLanguage,
            intlLocale,
            formatNumber: (number: number, options?: Intl.NumberFormatOptions) =>
                new Intl.NumberFormat(intlLocale, options).format(number),
            formatDate: (input: Date | string | number, options?: Intl.DateTimeFormatOptions) =>
                formatDateWithLocale(input, intlLocale, options)
        }),
        [i18nLanguage, intlLocale]
    )

    return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}
