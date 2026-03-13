export const MIN_COMMON_TOOLTIP_DESCRIPTION_LENGTH = 180
export const MIN_COMMON_TOOLTIP_PARAGRAPH_COUNT = 2

const COMMON_TOOLTIP_REQUIRED_MARKERS = [
    'Как читать:',
    'Как работает:',
    'Что показывает:',
    'Что проверяется:',
    'Что хранится внутри:',
    'Что меняет:',
    'Что не меняет:',
    'Как это влияет',
    'Когда срабатывает:',
    'Зачем нужен:',
    'Зачем важен:',
    'Почему',
    'Пример:',
    'Формула:',
    'How to read:',
    'How to read it:',
    'How it works:',
    'What it shows:',
    'What it changes:',
    'What it checks:',
    'Why',
    'Example:',
    'Formula:'
] as const

const COMMON_TOOLTIP_BANNED_SNIPPETS = [
    'Точное определение зависит от таблицы; см. описание секции выше.',
    'Показатель отчёта current prediction:',
    'Current prediction report metric:'
] as const

export interface CommonTooltipQualityIssue {
    type: 'too-short' | 'not-enough-paragraphs' | 'missing-structure-marker' | 'banned-snippet'
    message: string
}

function stripTooltipMarkup(description: string): string {
    return description
        .replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, '$2')
        .replace(/\[\[([^\]]+)\]\]/g, '$1')
        .replace(/\s+/g, ' ')
        .trim()
}

function splitDescriptionParagraphs(description: string): string[] {
    return description
        .split(/\n\s*\n/)
        .map(part => part.trim())
        .filter(Boolean)
}

/**
 * Валидирует канонический shared-tooltip как полноценное пользовательское описание,
 * а не короткую подпись. Этот гейт применяется только к owner-слою общих терминов.
 */
export function validateCommonTooltipDescription(description: string): CommonTooltipQualityIssue[] {
    const normalizedDescription = stripTooltipMarkup(description)
    const paragraphs = splitDescriptionParagraphs(description)
    const issues: CommonTooltipQualityIssue[] = []

    if (normalizedDescription.length < MIN_COMMON_TOOLTIP_DESCRIPTION_LENGTH) {
        issues.push({
            type: 'too-short',
            message: `Description is too short (${normalizedDescription.length} chars).`
        })
    }

    if (paragraphs.length < MIN_COMMON_TOOLTIP_PARAGRAPH_COUNT) {
        issues.push({
            type: 'not-enough-paragraphs',
            message: `Description must contain at least ${MIN_COMMON_TOOLTIP_PARAGRAPH_COUNT} semantic paragraphs.`
        })
    }

    if (!COMMON_TOOLTIP_REQUIRED_MARKERS.some(marker => description.includes(marker))) {
        issues.push({
            type: 'missing-structure-marker',
            message: 'Description must contain an explicit reading marker like "Как читать:" or "Пример:".'
        })
    }

    COMMON_TOOLTIP_BANNED_SNIPPETS.forEach(snippet => {
        if (description.includes(snippet)) {
            issues.push({
                type: 'banned-snippet',
                message: `Description contains banned snippet: "${snippet}".`
            })
        }
    })

    return issues
}
