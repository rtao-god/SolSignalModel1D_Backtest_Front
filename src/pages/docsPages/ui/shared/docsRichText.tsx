import { Fragment, type ReactNode } from 'react'
import { TermTooltip } from '@/shared/ui'
import { renderTermTooltipRichText } from '@/shared/ui/TermTooltip'
import {
    matchTermTooltips,
    normalizeComparableTerm,
    type TermTooltipMatch,
    type TermTooltipRegistryEntry
} from '@/shared/ui/TermTooltip/lib/termTooltipMatcher'
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

type DocsGlossaryTooltipRule = TermTooltipRegistryEntry & {
    glossaryItem: DocsLocalizedTermItem
}

type DocsGlossaryTooltipMatch = TermTooltipMatch & {
    rule: DocsGlossaryTooltipRule
}

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

function buildDocsGlossaryTooltipRegistry(glossary: DocsGlossary): DocsGlossaryTooltipRule[] {
    return Array.from(glossary.values()).map(item => ({
        id: item.id,
        title: item.term,
        description: item.description,
        aliases: [item.term],
        priority: item.term.length,
        glossaryItem: item
    }))
}

function renderDocsGlossaryTooltip(
    glossaryItem: DocsLocalizedTermItem,
    label: string,
    options: RenderDocsRichTextOptions,
    key: string
): ReactNode {
    const visitedTermIds = options.visitedTermIds ?? []

    return (
        <TermTooltip
            key={key}
            term={label}
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
}

function renderDocsGlossaryAwareCoreText(
    text: string,
    options: RenderDocsRichTextOptions,
    excludeTerms: string[],
    glossaryRegistry: DocsGlossaryTooltipRule[]
): ReactNode {
    const visitedTermIds = new Set(options.visitedTermIds ?? [])
    const excludedTerms = new Set(excludeTerms.map(item => normalizeComparableTerm(item)).filter(item => item.length > 0))
    // Page-level glossary должен матчиться раньше глобального registry,
    // иначе локальные термины страницы теряются или дробятся на более общие global-term совпадения.
    const matches = matchTermTooltips(text, glossaryRegistry, visitedTermIds, excludedTerms) as DocsGlossaryTooltipMatch[]

    if (matches.length === 0) {
        return renderTermTooltipRichText(text, { excludeTerms })
    }

    const nodes: ReactNode[] = []
    let lastIndex = 0

    matches.forEach((match, index) => {
        if (match.start > lastIndex) {
            const textChunk = text.slice(lastIndex, match.start)
            if (textChunk) {
                nodes.push(<Fragment key={`docs-glossary-text-${index}-${lastIndex}`}>{renderTermTooltipRichText(textChunk, { excludeTerms })}</Fragment>)
            }
        }

        nodes.push(renderDocsGlossaryTooltip(match.rule.glossaryItem, match.value, options, `docs-glossary-term-${match.rule.id}-${match.start}-${index}`))
        lastIndex = match.end
    })

    if (lastIndex < text.length) {
        const tail = text.slice(lastIndex)
        if (tail) {
            nodes.push(<Fragment key={`docs-glossary-tail-${lastIndex}`}>{renderTermTooltipRichText(tail, { excludeTerms })}</Fragment>)
        }
    }

    return <>{nodes}</>
}

function renderTextSegmentPreservingEdges(
    text: string,
    options: RenderDocsRichTextOptions,
    excludeTerms: string[],
    glossaryRegistry: DocsGlossaryTooltipRule[]
): ReactNode {
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
            {renderDocsGlossaryAwareCoreText(coreText, options, excludeTerms, glossaryRegistry)}
            {trailingWhitespace}
        </>
    )
}

function isDefinitionLeadExplicitTerm(segments: ExplicitDocsSegment[], segmentIndex: number): boolean {
    if (segmentIndex !== 0) {
        return false
    }

    const nextSegment = segments[segmentIndex + 1]
    if (!nextSegment || nextSegment.type !== 'text') {
        return false
    }

    const trimmed = nextSegment.value.trimStart()
    // Self-definition остаётся plain-text только для явной дефиниции в начале строки.
    // Обычное употребление термина в начале предложения должно оставаться tooltip-ссылкой.
    return /^(?:—|-|:|это\b|is\b|means\b)/i.test(trimmed)
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
    const glossaryRegistry = buildDocsGlossaryTooltipRegistry(options.glossary)
    const segments = parseExplicitDocsSegments(text)
    const nodes: ReactNode[] = []

    segments.forEach((segment, index) => {
        if (segment.type === 'text') {
            if (!segment.value) {
                return
            }

            nodes.push(
                <Fragment key={`docs-text-${index}`}>
                    {renderTextSegmentPreservingEdges(segment.value, options, excludeTerms, glossaryRegistry)}
                </Fragment>
            )
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

        if (isDefinitionLeadExplicitTerm(segments, index)) {
            nodes.push(segment.label)
            return
        }

        nodes.push(renderDocsGlossaryTooltip(glossaryItem, segment.label, options, `docs-term-${segment.termId}-${index}`))
    })

    return <>{nodes}</>
}
