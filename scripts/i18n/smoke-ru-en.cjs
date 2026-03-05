const fs = require('fs')
const path = require('path')
const i18next = require('i18next')

const PROJECT_ROOT = path.resolve(__dirname, '../..')
const LOCALES_ROOT = path.join(PROJECT_ROOT, 'public', 'locales')

const LANGUAGES = ['ru', 'en']
const NAMESPACES = ['common', 'nav', 'errors', 'auth', 'reports', 'tooltips', 'docs', 'explain']

function readJson(filePath) {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
}

function loadResources() {
    const resources = {}

    for (const language of LANGUAGES) {
        resources[language] = {}

        for (const namespace of NAMESPACES) {
            const filePath = path.join(LOCALES_ROOT, language, `${namespace}.json`)
            resources[language][namespace] = readJson(filePath)
        }
    }

    return resources
}

async function main() {
    const resources = loadResources()

    const instance = i18next.createInstance()
    await instance.init({
        resources,
        ns: NAMESPACES,
        defaultNS: 'common',
        lng: 'ru',
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false
        }
    })

    const checks = [
        'nav:route.main',
        'nav:section.docs',
        'docs:page.title',
        'common:lang.switchTo'
    ]

    const results = {}
    for (const language of LANGUAGES) {
        await instance.changeLanguage(language)
        results[language] = {}

        for (const key of checks) {
            const value = instance.t(key, { lang: 'EN' })
            if (!value || value === key) {
                throw new Error(`[i18n:smoke] key not resolved for ${language}: ${key}`)
            }

            results[language][key] = value
        }
    }

    if (results.ru['nav:route.main'] === results.en['nav:route.main']) {
        throw new Error('[i18n:smoke] ru/en translation for nav:route.main must differ.')
    }

    if (results.ru['docs:page.title'] === results.en['docs:page.title']) {
        throw new Error('[i18n:smoke] ru/en translation for docs:page.title must differ.')
    }

    console.log('[i18n:smoke] OK: ru/en resources load and language switch changes visible keys.')
}

main().catch(error => {
    console.error(error.message)
    process.exit(1)
})
