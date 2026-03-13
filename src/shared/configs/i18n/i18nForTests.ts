import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { I18N_NAMESPACES } from './namespaces'
import commonRu from '../../../../public/locales/ru/common.json'
import navRu from '../../../../public/locales/ru/nav.json'
import errorsRu from '../../../../public/locales/ru/errors.json'
import authRu from '../../../../public/locales/ru/auth.json'
import aboutRu from '../../../../public/locales/ru/about.json'
import reportsRu from '../../../../public/locales/ru/reports.json'
import tooltipsRu from '../../../../public/locales/ru/tooltips.json'
import docsRu from '../../../../public/locales/ru/docs.json'
import explainRu from '../../../../public/locales/ru/explain.json'
import guideRu from '../../../../public/locales/ru/guide.json'
import developerRu from '../../../../public/locales/ru/developer.json'
import commonEn from '../../../../public/locales/en/common.json'
import navEn from '../../../../public/locales/en/nav.json'
import errorsEn from '../../../../public/locales/en/errors.json'
import authEn from '../../../../public/locales/en/auth.json'
import aboutEn from '../../../../public/locales/en/about.json'
import reportsEn from '../../../../public/locales/en/reports.json'
import tooltipsEn from '../../../../public/locales/en/tooltips.json'
import docsEn from '../../../../public/locales/en/docs.json'
import explainEn from '../../../../public/locales/en/explain.json'
import guideEn from '../../../../public/locales/en/guide.json'
import developerEn from '../../../../public/locales/en/developer.json'

const resources = {
    ru: {
        common: commonRu,
        nav: navRu,
        errors: errorsRu,
        auth: authRu,
        about: aboutRu,
        reports: reportsRu,
        tooltips: tooltipsRu,
        docs: docsRu,
        explain: explainRu,
        guide: guideRu,
        developer: developerRu
    },
    en: {
        common: commonEn,
        nav: navEn,
        errors: errorsEn,
        auth: authEn,
        about: aboutEn,
        reports: reportsEn,
        tooltips: tooltipsEn,
        docs: docsEn,
        explain: explainEn,
        guide: guideEn,
        developer: developerEn
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
