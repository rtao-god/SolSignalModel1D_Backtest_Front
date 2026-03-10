import {
    buildDocsGlossaryOrThrow,
    renderDocsRichText
} from '@/pages/docsPages/ui/shared/docsRichText'
import type { GuideLocalizedTermItem } from './guideI18n'

type GuideGlossary = ReturnType<typeof buildDocsGlossaryOrThrow>

interface RenderGuideRichTextOptions {
    glossary: GuideGlossary
    visitedTermIds?: string[]
}

/**
 * Guide-страницы используют тот же механизм explicit-term rich-text,
 * но владелец контента и словаря остаётся в namespace guide.
 */
export function buildGuideGlossaryOrThrow(groups: GuideLocalizedTermItem[][]): GuideGlossary {
    return buildDocsGlossaryOrThrow(groups)
}

/**
 * Рендерит guide-rich-text с локальными tooltip-терминами и глобальным term registry.
 */
export function renderGuideRichText(text: string, options: RenderGuideRichTextOptions) {
    return renderDocsRichText(text, options)
}
