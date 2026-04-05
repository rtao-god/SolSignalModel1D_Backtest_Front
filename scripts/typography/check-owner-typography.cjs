const fs = require('fs')
const path = require('path')

const srcRoot = path.resolve(__dirname, '..', '..', 'src')

const scssAllowlist = new Set(
    [
        'app/styles/variables/_typography.scss',
        'app/styles/variables/_surfaces.scss',
        'app/styles/mixins/_text-size.scss',
        'app/styles/mixins/_buttons.scss',
        'app/styles/mixins/_inputs.scss',
        'app/styles/mixins/_layout-primitives.scss',
        'app/styles/mixins/_tables.scss'
    ].map(normalizePath)
)

const tsAllowlist = new Set(['shared/lib/typography/runtimeTokens.ts'].map(normalizePath))

function normalizePath(value) {
    return value.replace(/\\/g, '/')
}

function walkFiles(dir) {
    const collected = []

    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name)

        if (entry.isDirectory()) {
            collected.push(...walkFiles(fullPath))
            continue
        }

        if (entry.isFile()) {
            collected.push(fullPath)
        }
    }

    return collected
}

function toRelative(filePath) {
    return normalizePath(path.relative(srcRoot, filePath))
}

function collectScssViolations(filePath, source) {
    const relativePath = toRelative(filePath)
    if (scssAllowlist.has(relativePath)) {
        return []
    }

    const violations = []
    const lines = source.split(/\r?\n/)
    const blockStack = []

    for (let index = 0; index < lines.length; index += 1) {
        const line = lines[index]
        const lineNumber = index + 1

        const insideAdaptiveTypographyBlock = blockStack.some(
            block =>
                block.startsWith('@media') || block.startsWith('@container') || block.startsWith('@include viewport')
        )

        if (/font-size:\s*(clamp\(|\d+px)/.test(line)) {
            violations.push(`${relativePath}:${lineNumber} raw font-size is forbidden outside owner typography files`)
        }

        if (
            insideAdaptiveTypographyBlock &&
            (/@include type-/.test(line) || /font-size:\s*/.test(line) || /--type-[a-z-]+/.test(line))
        ) {
            violations.push(
                `${relativePath}:${lineNumber} adaptive typography override is forbidden outside owner typography files`
            )
        }

        const openMatches = [...line.matchAll(/([^{};]+)\{/g)]
        for (const match of openMatches) {
            blockStack.push(match[1].trim())
        }

        const closeCount = (line.match(/\}/g) ?? []).length
        for (let closeIndex = 0; closeIndex < closeCount; closeIndex += 1) {
            blockStack.pop()
        }
    }

    return violations
}

function collectTsViolations(filePath, source) {
    const relativePath = toRelative(filePath)
    if (tsAllowlist.has(relativePath)) {
        return []
    }

    const violations = []
    const lines = source.split(/\r?\n/)

    for (let index = 0; index < lines.length; index += 1) {
        const line = lines[index]
        const lineNumber = index + 1

        if (/\bfz\b/.test(line)) {
            violations.push(`${relativePath}:${lineNumber} \`fz\` escape hatch is forbidden`)
        }

        if (/fontSize\s*:/.test(line)) {
            violations.push(`${relativePath}:${lineNumber} local \`fontSize\` usage is forbidden`)
        }
    }

    return violations
}

const violations = []

for (const filePath of walkFiles(srcRoot)) {
    if (filePath.endsWith('.scss')) {
        violations.push(...collectScssViolations(filePath, fs.readFileSync(filePath, 'utf8')))
        continue
    }

    if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
        violations.push(...collectTsViolations(filePath, fs.readFileSync(filePath, 'utf8')))
    }
}

if (violations.length > 0) {
    console.error('Owner typography audit failed:')
    for (const violation of violations) {
        console.error(`- ${violation}`)
    }
    process.exit(1)
}

console.log('Owner typography audit passed.')
