import { createContext } from 'react'

export interface LocaleContextValue {
    i18nLanguage: string
    intlLocale: string
    formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string
    formatDate: (value: Date | string | number, options?: Intl.DateTimeFormatOptions) => string
}

export const LocaleContext = createContext<LocaleContextValue | null>(null)
