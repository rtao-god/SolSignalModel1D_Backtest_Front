import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import Backend from 'i18next-http-backend'
import LanguageDetector from 'i18next-browser-languagedetector'
import { getI18nNamespaces, getSupportedI18nLanguages } from '@/shared/lib/i18n'

void i18n
    .use(Backend)
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        supportedLngs: getSupportedI18nLanguages(),
        nonExplicitSupportedLngs: true,
        load: 'languageOnly',
        ns: getI18nNamespaces(),
        defaultNS: 'common',
        fallbackLng: 'en',
        backend: {
            loadPath: '/locales/{{lng}}/{{ns}}.json'
        },
        detection: {
            order: ['querystring', 'localStorage', 'navigator', 'htmlTag'],
            caches: ['localStorage']
        },
        debug: import.meta.env.DEV,
        interpolation: {
            escapeValue: false
        }
    })

export default i18n
