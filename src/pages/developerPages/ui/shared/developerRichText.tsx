import {
    buildDocsGlossaryOrThrow,
    renderDocsRichText
} from '@/pages/docsPages/ui/shared/docsRichText'
import type { DeveloperLocalizedTermItem } from './types'

type DeveloperGlossary = ReturnType<typeof buildDocsGlossaryOrThrow>

interface RenderDeveloperRichTextOptions {
    glossary: DeveloperGlossary
    visitedTermIds?: string[]
}

/**
 * Developer-страницы используют тот же explicit-term контракт, что и docs/guide,
 * чтобы inline-подсказки и why-tooltip рендерились единообразно.
 */
export function buildDeveloperGlossaryOrThrow(groups: DeveloperLocalizedTermItem[][]): DeveloperGlossary {
    return buildDocsGlossaryOrThrow(groups)
}

/**
 * Рендерит developer-rich-text с page-level glossary и поддержкой вложенных tooltip.
 */
export function renderDeveloperRichText(text: string, options: RenderDeveloperRichTextOptions) {
    return renderDocsRichText(text, options)
}
