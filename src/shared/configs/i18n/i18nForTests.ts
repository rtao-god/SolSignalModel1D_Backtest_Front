import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { I18N_NAMESPACES } from './namespaces'

const resources = {
    ru: {
        common: {
            lang: {
                switchTo: 'Переключить язык на {{lang}}'
            }
        },
        nav: {
            route: {
                main: 'Главная'
            }
        },
        docs: {
            page: {
                title: 'Документация'
            }
        }
    },
    en: {
        common: {
            lang: {
                switchTo: 'Switch language to {{lang}}'
            }
        },
        nav: {
            route: {
                main: 'Main'
            }
        },
        docs: {
            page: {
                title: 'Documentation'
            }
        }
    }
}

void i18n.use(initReactI18next).init({
    resources,
    ns: I18N_NAMESPACES,
    defaultNS: 'common',
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
        escapeValue: false
    },
    debug: false
})

export default i18n
