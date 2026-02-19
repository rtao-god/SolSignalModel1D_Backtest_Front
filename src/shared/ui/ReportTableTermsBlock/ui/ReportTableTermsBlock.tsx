import { Text, TermTooltip } from '@/shared/ui'
import { resolveReportColumnTooltip } from '@/shared/utils/reportTooltips'
import cls from './ReportTableTermsBlock.module.scss'

interface ReportTableTermsBlockProps {
    reportKind?: string
    sectionTitle?: string
    columns?: string[]
    terms?: ReportTableTermItem[]
    title?: string
    subtitle?: string
    className?: string
}

export interface ReportTableTermItem {
    key: string
    title: string
    description: string
    tooltip: string
}

function ensureNonEmptyValueOrThrow(value: string | undefined, label: string): string {
    if (!value || value.trim().length === 0) {
        throw new Error(`[report-terms] ${label} is empty.`)
    }

    return value.trim()
}

function buildTermsFromColumnsOrThrow(reportKind: string, sectionTitle: string, columns: string[]): ReportTableTermItem[] {
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

    return terms.map((term, index) => {
        const key = ensureNonEmptyValueOrThrow(term.key, `terms[${index}].key`)
        const title = ensureNonEmptyValueOrThrow(term.title, `terms[${index}].title`)
        const description = ensureNonEmptyValueOrThrow(term.description, `terms[${index}].description`)
        const tooltip = ensureNonEmptyValueOrThrow(term.tooltip, `terms[${index}].tooltip`)

        return {
            key,
            title,
            description,
            tooltip
        }
    })
}

export default function ReportTableTermsBlock({
    reportKind,
    sectionTitle,
    columns,
    terms,
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
                {resolvedTerms.map(term => (
                    <div key={`${sectionTitle}:${term.key}`} className={cls.item}>
                        <TermTooltip term={term.title} description={term.tooltip} type='span' />
                        <Text className={cls.description}>{term.description}</Text>
                    </div>
                ))}
            </div>
        </div>
    )
}
