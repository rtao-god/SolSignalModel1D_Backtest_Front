import { Fragment, type ReactNode } from 'react'
import { TermTooltip } from '@/shared/ui'
import { renderTermTooltipRichText } from '@/shared/ui/TermTooltip'
import cls from './docsRichText.module.scss'
import type { DocsLocalizedTermItem } from './docsI18n'

type DocsGlossary = Map<string, DocsLocalizedTermItem>

interface RenderDocsRichTextOptions {
    glossary: DocsGlossary
    visitedTermIds?: string[]
}

interface ExplicitDocsSegmentText {
    type: 'text'
    value: string
}

interface ExplicitDocsSegmentTerm {
    type: 'term'
    termId: string
    label: string
}

type ExplicitDocsSegment = ExplicitDocsSegmentText | ExplicitDocsSegmentTerm

/**
 * Собирает единый glossary-map для страницы и запрещает дубли term-id.
 */
export function buildDocsGlossaryOrThrow(groups: DocsLocalizedTermItem[][]): DocsGlossary {
    const glossary = new Map<string, DocsLocalizedTermItem>()

    groups.flat().forEach(item => {
        if (glossary.has(item.id)) {
            throw new Error(`[docs.richText] duplicate glossary term id. termId=${item.id}.`)
        }

        glossary.set(item.id, item)
    })

    return glossary
}

function parseExplicitDocsSegments(text: string): ExplicitDocsSegment[] {
    const pattern = /\[\[([a-z0-9_-]+)\|([^\]]+)\]\]/gi
    const segments: ExplicitDocsSegment[] = []

    let lastIndex = 0
    let next = pattern.exec(text)

    while (next) {
        const full = next[0] ?? ''
        const termId = next[1]?.trim() ?? ''
        const label = next[2]?.trim() ?? ''
        const start = next.index ?? 0

        if (start > lastIndex) {
            segments.push({
                type: 'text',
                value: text.slice(lastIndex, start)
            })
        }

        if (termId && label) {
            segments.push({
                type: 'term',
                termId,
                label
            })
        } else if (full) {
            segments.push({
                type: 'text',
                value: full
            })
        }

        lastIndex = start + full.length
        next = pattern.exec(text)
    }

    if (lastIndex < text.length) {
        segments.push({
            type: 'text',
            value: text.slice(lastIndex)
        })
    }

    return segments.length > 0 ? segments : [{ type: 'text', value: text }]
}

function resolveExcludedTerms(glossary: DocsGlossary, visitedTermIds: string[]): string[] {
    return visitedTermIds
        .map(termId => glossary.get(termId)?.term?.trim() ?? '')
        .filter(term => term.length > 0)
}

function renderTextSegmentPreservingEdges(text: string, excludeTerms: string[]): ReactNode {
    if (!text) {
        return text
    }

    const leadingWhitespace = text.match(/^\s+/)?.[0] ?? ''
    const trailingWhitespace = text.match(/\s+$/)?.[0] ?? ''
    const coreText = text.slice(leadingWhitespace.length, text.length - trailingWhitespace.length)

    if (!coreText) {
        return text
    }

    return (
        <>
            {leadingWhitespace}
            {renderTermTooltipRichText(coreText, { excludeTerms })}
            {trailingWhitespace}
        </>
    )
}

/**
 * Рендерит docs-rich-text, где локальные термины отмечаются через [[term-id|label]],
 * а все остальные известные доменные термины продолжают обрабатываться глобальным tooltip-registry.
 */
export function renderDocsRichText(text: string, options: RenderDocsRichTextOptions): ReactNode {
    if (!text || text.trim().length === 0) {
        return text
    }

    const visitedTermIds = options.visitedTermIds ?? []
    const excludeTerms = resolveExcludedTerms(options.glossary, visitedTermIds)
    const segments = parseExplicitDocsSegments(text)
    const nodes: ReactNode[] = []

    segments.forEach((segment, index) => {
        if (segment.type === 'text') {
            if (!segment.value) {
                return
            }

            nodes.push(<Fragment key={`docs-text-${index}`}>{renderTextSegmentPreservingEdges(segment.value, excludeTerms)}</Fragment>)
            return
        }

        const glossaryItem = options.glossary.get(segment.termId)
        if (!glossaryItem) {
            throw new Error(`[docs.richText] glossary term is missing. termId=${segment.termId}.`)
        }

        if (visitedTermIds.includes(segment.termId)) {
            nodes.push(segment.label)
            return
        }

        nodes.push(
            <TermTooltip
                key={`docs-term-${segment.termId}-${index}`}
                term={segment.label}
                tooltipTitle={glossaryItem.term}
                description={() =>
                    renderDocsRichText(glossaryItem.description, {
                        glossary: options.glossary,
                        visitedTermIds: [...visitedTermIds, glossaryItem.id]
                    })
                }
                type='span'
                className={cls.inlineTerm}
            />
        )
    })

    return <>{nodes}</>
}
