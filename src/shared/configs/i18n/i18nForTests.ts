import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { I18N_NAMESPACES } from './namespaces'
import commonRu from '../../../../public/locales/ru/common.json'
import navRu from '../../../../public/locales/ru/nav.json'
import errorsRu from '../../../../public/locales/ru/errors.json'
import authRu from '../../../../public/locales/ru/auth.json'
import reportsRu from '../../../../public/locales/ru/reports.json'
import tooltipsRu from '../../../../public/locales/ru/tooltips.json'
import docsRu from '../../../../public/locales/ru/docs.json'
import explainRu from '../../../../public/locales/ru/explain.json'
import commonEn from '../../../../public/locales/en/common.json'
import navEn from '../../../../public/locales/en/nav.json'
import errorsEn from '../../../../public/locales/en/errors.json'
import authEn from '../../../../public/locales/en/auth.json'
import reportsEn from '../../../../public/locales/en/reports.json'
import tooltipsEn from '../../../../public/locales/en/tooltips.json'
import docsEn from '../../../../public/locales/en/docs.json'
import explainEn from '../../../../public/locales/en/explain.json'

const resources = {
    ru: {
        common: commonRu,
        nav: navRu,
        errors: errorsRu,
        auth: authRu,
        reports: reportsRu,
        tooltips: tooltipsRu,
        docs: docsRu,
        explain: explainRu
    },
    en: {
        common: commonEn,
        nav: navEn,
        errors: errorsEn,
        auth: authEn,
        reports: reportsEn,
        tooltips: tooltipsEn,
        docs: docsEn,
        explain: explainEn
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
