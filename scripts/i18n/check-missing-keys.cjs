const fs = require('fs')
const path = require('path')

const PROJECT_ROOT = path.resolve(__dirname, '../..')
const SRC_ROOT = path.join(PROJECT_ROOT, 'src')
const LOCALES_ROOT = path.join(PROJECT_ROOT, 'public', 'locales')

const LANGUAGES = ['ru', 'en']
const NAMESPACES = ['common', 'nav', 'errors', 'auth', 'reports', 'tooltips', 'docs', 'explain']

function listSourceFiles(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    const files = []

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)
        if (entry.isDirectory()) {
            files.push(...listSourceFiles(fullPath))
            continue
        }

        if (entry.isFile() && (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx'))) {
            files.push(fullPath)
        }
    }

    return files
}

function flattenKeys(value, prefix = '') {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        return [prefix]
    }

    const keys = []
    for (const [key, nested] of Object.entries(value)) {
        const nextPrefix = prefix ? `${prefix}.${key}` : key
        keys.push(...flattenKeys(nested, nextPrefix))
    }

    return keys
}

function readLocaleKeys(language, namespace) {
    const filePath = path.join(LOCALES_ROOT, language, `${namespace}.json`)
    if (!fs.existsSync(filePath)) {
        throw new Error(`[i18n:check] locale file is missing: ${filePath}`)
    }

    const raw = fs.readFileSync(filePath, 'utf-8')
    const parsed = JSON.parse(raw)
    return new Set(flattenKeys(parsed).filter(Boolean))
}

function collectExplicitNamespaceKeys(files) {
    const usage = new Map()
    const keyPattern = /\bt\(\s*['"]([^'"]+:[^'"]+)['"]/g

    for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8')
        let match = keyPattern.exec(content)

        while (match) {
            const fullKey = match[1]
            const [namespace, key] = fullKey.split(':')
            if (!namespace || !key) {
                match = keyPattern.exec(content)
                continue
            }

            if (!usage.has(namespace)) {
                usage.set(namespace, new Set())
            }
            usage.get(namespace).add(key)

            match = keyPattern.exec(content)
        }
    }

    return usage
}

function compareLocaleParity() {
    const errors = []

    for (const namespace of NAMESPACES) {
        const ruKeys = readLocaleKeys('ru', namespace)
        const enKeys = readLocaleKeys('en', namespace)

        for (const key of ruKeys) {
            if (!enKeys.has(key)) {
                errors.push(`[i18n:check] missing key in en/${namespace}.json: ${key}`)
            }
        }

        for (const key of enKeys) {
            if (!ruKeys.has(key)) {
                errors.push(`[i18n:check] missing key in ru/${namespace}.json: ${key}`)
            }
        }
    }

    return errors
}

function validateReferencedKeys(files) {
    const errors = []
    const usage = collectExplicitNamespaceKeys(files)

    for (const [namespace, keys] of usage.entries()) {
        if (!NAMESPACES.includes(namespace)) {
            errors.push(`[i18n:check] namespace ${namespace} is not declared in i18n contract.`)
            continue
        }

        for (const language of LANGUAGES) {
            const localeKeys = readLocaleKeys(language, namespace)
            for (const key of keys) {
                if (!localeKeys.has(key)) {
                    errors.push(`[i18n:check] missing key for ${language}:${namespace}:${key}`)
                }
            }
        }
    }

    return errors
}

function main() {
    const files = listSourceFiles(SRC_ROOT)
    const parityErrors = compareLocaleParity()
    const referenceErrors = validateReferencedKeys(files)
    const allErrors = [...parityErrors, ...referenceErrors]

    if (allErrors.length > 0) {
        allErrors.forEach(error => console.error(error))
        process.exit(1)
    }

    console.log('[i18n:check] OK: locale parity and referenced namespace keys are valid.')
}

main()
