const { execSync } = require('child_process')

const DIFF_COMMAND =
    process.env.I18N_HARDCODED_SCOPE === 'all'
        ? 'git diff --unified=0 --no-color -- src'
        : 'git diff --cached --unified=0 --no-color -- src'

function loadDiff() {
    try {
        return execSync(DIFF_COMMAND, { encoding: 'utf-8' })
    } catch (error) {
        const output = `${error.stdout ?? ''}${error.stderr ?? ''}`.trim()
        if (output.includes('Not a git repository')) {
            throw new Error('[i18n:hardcoded] Git repository is required for diff-based gate.')
        }

        return error.stdout ? String(error.stdout) : ''
    }
}

function shouldIgnoreLine(line) {
    const trimmed = line.trim()
    if (!trimmed) return true
    if (trimmed.startsWith('//')) return true
    if (trimmed.includes('i18n-exempt')) return true
    if (trimmed.includes('throw new Error')) return true
    if (trimmed.includes('console.')) return true
    if (/^\s*(import|export|const|let|var|type|interface|enum)\b/.test(trimmed)) return true
    return false
}

function isHardcodedUiText(line) {
    if (shouldIgnoreLine(line)) {
        return false
    }

    const attributePattern = /\b(?:aria-label|title|placeholder|label|alt)\s*=\s*['"][^'"{<>]*[A-Za-zА-Яа-яЁё][^'"{<>]*['"]/i
    if (attributePattern.test(line) && !line.includes('t(')) {
        return true
    }

    const jsxTextPattern = />\s*[^<{]+[A-Za-zА-Яа-яЁё][^<{]*\s*</
    if (jsxTextPattern.test(line) && !line.includes('{t(')) {
        return true
    }

    return false
}

function main() {
    const diff = loadDiff()
    if (!diff.trim()) {
        console.log('[i18n:hardcoded] OK: no staged changes in src/.')
        return
    }

    const lines = diff.split(/\r?\n/)
    let currentFile = ''
    const violations = []

    for (const rawLine of lines) {
        if (rawLine.startsWith('+++ b/')) {
            currentFile = rawLine.slice('+++ b/'.length)
            continue
        }

        if (!currentFile.endsWith('.tsx')) {
            continue
        }

        if (!rawLine.startsWith('+') || rawLine.startsWith('+++')) {
            continue
        }

        const addedLine = rawLine.slice(1)
        if (isHardcodedUiText(addedLine)) {
            violations.push({ file: currentFile, line: addedLine.trim() })
        }
    }

    if (violations.length > 0) {
        console.error('[i18n:hardcoded] New hardcoded UI strings found in added TSX lines:')
        for (const violation of violations) {
            console.error(` - ${violation.file}: ${violation.line}`)
        }
        process.exit(1)
    }

    console.log('[i18n:hardcoded] OK: no new hardcoded UI strings in added TSX lines.')
}

main()
