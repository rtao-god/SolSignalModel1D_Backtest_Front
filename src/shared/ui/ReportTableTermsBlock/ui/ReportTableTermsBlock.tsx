import { Text, TermTooltip } from '@/shared/ui'
import { renderTermTooltipRichText } from '@/shared/ui/TermTooltip'
import { resolveReportColumnTooltip } from '@/shared/utils/reportTooltips'
import cls from './ReportTableTermsBlock.module.scss'

interface ReportTableTermsBlockProps {
    reportKind?: string
    sectionTitle?: string
    columns?: string[]
    terms?: ReportTableTermItem[]
    enhanceDomainTerms?: boolean
    showTermTitleTooltip?: boolean
    displayMode?: 'inline' | 'tooltipOnly'
    title?: string
    subtitle?: string
    className?: string
}

type ReportTableTermTextResolver = () => string

export interface ReportTableTermItem {
    key: string
    title: string
    description?: string
    tooltip?: string
    resolveDescription?: ReportTableTermTextResolver
    resolveTooltip?: ReportTableTermTextResolver
}

function buildSelfTooltipExclusions(termTitle: string) {
    return {
        excludeTerms: [termTitle],
        excludeRuleTitles: [termTitle]
    }
}

function ensureNonEmptyValueOrThrow(value: string | undefined, label: string): string {
    if (!value || value.trim().length === 0) {
        throw new Error(`[report-terms] ${label} is empty.`)
    }

    return value.trim()
}

function resolveLazyTextOrThrow(
    value: string | undefined,
    resolver: ReportTableTermTextResolver | undefined,
    label: string
): string {
    if (typeof value === 'string' && value.trim().length > 0) {
        return value.trim()
    }

    if (!resolver) {
        throw new Error(`[report-terms] ${label} is missing.`)
    }

    const resolved = resolver()
    if (!resolved || resolved.trim().length === 0) {
        throw new Error(`[report-terms] ${label} resolved to empty value.`)
    }

    return resolved.trim()
}

function buildTermsFromColumnsOrThrow(
    reportKind: string,
    sectionTitle: string,
    columns: string[]
): ReportTableTermItem[] {
    if (!reportKind || reportKind.trim().length === 0) {
        throw new Error('[report-terms] reportKind is empty.')
    }

    if (!sectionTitle || sectionTitle.trim().length === 0) {
        throw new Error('[report-terms] sectionTitle is empty.')
    }

    if (!columns || columns.length === 0) {
        throw new Error('[report-terms] columns are empty.')
    }

    return columns.map(column => {
        const key = ensureNonEmptyValueOrThrow(column, 'column title')

        const tooltip = resolveReportColumnTooltip(reportKind, sectionTitle, key)
        if (!tooltip || tooltip.trim().length === 0) {
            throw new Error(`[report-terms] tooltip is missing for column=${key}, reportKind=${reportKind}.`)
        }

        return {
            key,
            title: key,
            description: tooltip,
            tooltip
        }
    })
}

function buildProvidedTermsOrThrow(terms: ReportTableTermItem[]): ReportTableTermItem[] {
    if (!terms || terms.length === 0) {
        throw new Error('[report-terms] provided terms are empty.')
    }

    return terms.map((term, index) => ({
        key: ensureNonEmptyValueOrThrow(term.key, `terms[${index}].key`),
        title: ensureNonEmptyValueOrThrow(term.title, `terms[${index}].title`),
        description:
            typeof term.description === 'string' && term.description.trim().length > 0 ? term.description.trim() : undefined,
        tooltip: typeof term.tooltip === 'string' && term.tooltip.trim().length > 0 ? term.tooltip.trim() : undefined,
        resolveDescription: term.resolveDescription,
        resolveTooltip: term.resolveTooltip
    }))
}

export default function ReportTableTermsBlock({
    reportKind,
    sectionTitle,
    columns,
    terms,
    enhanceDomainTerms = false,
    showTermTitleTooltip = true,
    displayMode = 'inline',
    title = 'Термины таблицы',
    subtitle = 'Подробные определения всех колонок, которые используются в таблице ниже.',
    className
}: ReportTableTermsBlockProps) {
    const resolvedTerms =
        terms ?
            buildProvidedTermsOrThrow(terms)
        :   buildTermsFromColumnsOrThrow(
                ensureNonEmptyValueOrThrow(reportKind, 'reportKind'),
                ensureNonEmptyValueOrThrow(sectionTitle, 'sectionTitle'),
                columns ?? []
            )

    return (
        <div className={`${cls.root}${className ? ` ${className}` : ''}`} data-tooltip-boundary>
            <div className={cls.header}>
                <Text type='h3' className={cls.title}>
                    {title}
                </Text>
                <Text className={cls.subtitle}>{subtitle}</Text>
            </div>

            <div className={cls.grid}>
                {resolvedTerms.map(term => {
                    const itemClassName =
                        displayMode === 'tooltipOnly' ? `${cls.item} ${cls.itemCompact}` : cls.item

                    return (
                        <div key={`${sectionTitle}:${term.key}`} className={itemClassName}>
                            {showTermTitleTooltip ?
                                <TermTooltip
                                    term={term.title}
                                    description={() => {
                                        const tooltip = resolveLazyTextOrThrow(
                                            term.tooltip,
                                            term.resolveTooltip,
                                            `terms.${term.key}.tooltip`
                                        )

                                        return enhanceDomainTerms ?
                                                renderTermTooltipRichText(tooltip, buildSelfTooltipExclusions(term.title))
                                            :   tooltip
                                    }}
                                    type='span'
                                />
                            :   <Text type='span'>{term.title}</Text>}

                            {displayMode === 'inline' && (
                                <Text className={cls.description}>
                                    {(() => {
                                        const description = resolveLazyTextOrThrow(
                                            term.description,
                                            term.resolveDescription,
                                            `terms.${term.key}.description`
                                        )

                                        return enhanceDomainTerms ?
                                                renderTermTooltipRichText(
                                                    description,
                                                    buildSelfTooltipExclusions(term.title)
                                                )
                                            :   description
                                    })()}
                                </Text>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
