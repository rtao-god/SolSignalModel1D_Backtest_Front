import fs from 'node:fs'
import path from 'node:path'

const pagesRoot = path.resolve(__dirname)
const frontendRoot = path.resolve(pagesRoot, '..', '..')
const sourceRoot = path.join(frontendRoot, 'src')
const localesRoot = path.join(frontendRoot, 'public', 'locales')
const PLAIN_NATIVE_TOOLTIP_TAGS = [
    'div',
    'span',
    'p',
    'li',
    'label',
    'button',
    'strong',
    'em',
    'small',
    'td',
    'th',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6'
] as const

interface PlainTranslationUsage {
    filePath: string
    line: number
    tagName: string
    namespace: string
    key: string
}

function collectSourceFiles(currentPath: string): string[] {
    return fs.readdirSync(currentPath, { withFileTypes: true }).flatMap(entry => {
        const nextPath = path.join(currentPath, entry.name)

        if (entry.isDirectory()) {
            return collectSourceFiles(nextPath)
        }

        if (!/\.(ts|tsx)$/.test(entry.name)) {
            return []
        }

        if (/\.test\.(ts|tsx)$/.test(entry.name)) {
            return []
        }

        return [nextPath]
    })
}

function loadLocaleNamespaces(): Map<string, Record<string, unknown>> {
    const namespaces = new Map<string, Record<string, unknown>>()

    fs.readdirSync(localesRoot, { withFileTypes: true })
        .filter(entry => entry.isDirectory())
        .forEach(languageDirectory => {
            const languagePath = path.join(localesRoot, languageDirectory.name)

            fs.readdirSync(languagePath, { withFileTypes: true })
                .filter(entry => entry.isFile() && entry.name.endsWith('.json'))
                .forEach(entry => {
                    const namespace = entry.name.replace(/\.json$/, '')
                    const localeKey = `${languageDirectory.name}:${namespace}`
                    const localePath = path.join(languagePath, entry.name)
                    namespaces.set(
                        localeKey,
                        JSON.parse(fs.readFileSync(localePath, 'utf-8')) as Record<string, unknown>
                    )
                })
        })

    return namespaces
}

function getNestedValue(source: Record<string, unknown>, key: string): unknown {
    return key.split('.').reduce<unknown>((currentValue, segment) => {
        if (!currentValue || typeof currentValue !== 'object' || !(segment in currentValue)) {
            return undefined
        }

        return (currentValue as Record<string, unknown>)[segment]
    }, source)
}

function collectDefaultNamespaces(source: string): string[] {
    const matches = [...source.matchAll(/useTranslation\(\s*(?:\[\s*)?['"`]([^'"`]+)['"`]/g)]

    return [...new Set(matches.map(match => match[1]).filter(Boolean))]
}

function resolveTranslationNamespace(callExpression: string, defaultNamespaces: string[]): string {
    const explicitNamespaceMatch = callExpression.match(/ns\s*:\s*['"`]([^'"`]+)['"`]/)

    if (explicitNamespaceMatch?.[1]) {
        return explicitNamespaceMatch[1]
    }

    if (defaultNamespaces.length === 1) {
        return defaultNamespaces[0]
    }

    return 'common'
}

function containsExplicitTooltipMarkup(
    localeNamespaces: Map<string, Record<string, unknown>>,
    namespace: string,
    key: string
): boolean {
    for (const [localeKey, localeNamespace] of localeNamespaces.entries()) {
        if (!localeKey.endsWith(`:${namespace}`)) {
            continue
        }

        const value = getNestedValue(localeNamespace, key)

        if (typeof value === 'string' && value.includes('[[')) {
            return true
        }
    }

    return false
}

function collectPlainTranslationUsagesWithTooltipMarkup(
    localeNamespaces: Map<string, Record<string, unknown>>
): PlainTranslationUsage[] {
    const files = collectSourceFiles(sourceRoot)
    const offenders: PlainTranslationUsage[] = []
    const plainUsagePattern = new RegExp(
        `<(${PLAIN_NATIVE_TOOLTIP_TAGS.join('|')})\\b[^>]*>\\s*\\{t\\(([\\s\\S]*?)\\)\\}\\s*</\\1>`,
        'g'
    )

    files.forEach(filePath => {
        const source = fs.readFileSync(filePath, 'utf-8')
        const defaultNamespaces = collectDefaultNamespaces(source)
        let match: RegExpExecArray | null = null

        while ((match = plainUsagePattern.exec(source)) !== null) {
            const tagName = match[1]
            const callExpression = match[2]
            const keyMatch = callExpression.match(/['"`]([^'"`]+)['"`]/)

            if (!keyMatch?.[1]) {
                continue
            }

            const translationKey = keyMatch[1]

            if (translationKey.includes('${')) {
                continue
            }

            const namespace = resolveTranslationNamespace(callExpression, defaultNamespaces)

            if (!containsExplicitTooltipMarkup(localeNamespaces, namespace, translationKey)) {
                continue
            }

            const line = source.slice(0, match.index).split('\n').length

            offenders.push({
                filePath: path.relative(frontendRoot, filePath),
                line,
                tagName,
                namespace,
                key: translationKey
            })
        }
    })

    return offenders
}

describe('tooltip markup contract', () => {
    test('frontend source does not render tooltip-markup translations through plain native text tags', () => {
        // Этот guard страхует возврат к raw [[term|label]] в user text:
        // если перевод реально содержит explicit tooltip markup, plain native text container не имеет права рендерить его напрямую.
        const localeNamespaces = loadLocaleNamespaces()
        const offenders = collectPlainTranslationUsagesWithTooltipMarkup(localeNamespaces)

        expect(offenders).toEqual([])
    })
})
