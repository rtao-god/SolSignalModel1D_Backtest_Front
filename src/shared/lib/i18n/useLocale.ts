import { useContext } from 'react'
import { LocaleContext, type LocaleContextValue } from './LocaleContext'

/**
 * Единая точка доступа к текущей i18n-локали и Intl-форматтерам.
 */
export function useLocale(): LocaleContextValue {
    const context = useContext(LocaleContext)
    if (!context) {
        throw new Error('[locale] useLocale must be used within LocaleProvider.')
    }

    return context
}
