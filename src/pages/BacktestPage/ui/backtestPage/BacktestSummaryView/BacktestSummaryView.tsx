import type { BacktestSummaryDto } from '@/shared/types/backtest.types'
import type { PolicyEvaluationDto } from '@/shared/types/policyEvaluation.types'
import type { KeyValueSectionDto, ReportSectionDto, TableSectionDto } from '@/shared/types/report.types'
import { Text } from '@/shared/ui'
import { renderTermTooltipTitle } from '@/shared/ui/TermTooltip'
import { resolveReportColumnTooltip, resolveReportKeyTooltip } from '@/shared/utils/reportTooltips'
import { resolveReportSectionDescription } from '@/shared/utils/reportDescriptions'
import { useTranslation } from 'react-i18next'
import cls from './BacktestSummaryView.module.scss'

function resolveEvaluationRowClass(evaluation: PolicyEvaluationDto | null): string | undefined {
    if (!evaluation) {
        return undefined
    }

    if (evaluation.status === 'good') return cls.rowGood
    if (evaluation.status === 'caution') return cls.rowCaution
    if (evaluation.status === 'bad') return cls.rowBad
    return cls.rowUnknown
}

function resolveEvaluationRowTitle(evaluation: PolicyEvaluationDto | null): string | undefined {
    const reasons = evaluation?.reasons?.map(reason => reason.message).filter(Boolean) ?? []
    if (reasons.length === 0) {
        return undefined
    }

    return reasons.join(' | ')
}
interface BacktestSummaryViewProps {
    summary: BacktestSummaryDto
    title: string
}

export function BacktestSummaryView({ summary, title }: BacktestSummaryViewProps) {
    const { t } = useTranslation('reports')
    const generatedUtc = summary.generatedAtUtc ? new Date(summary.generatedAtUtc) : null
    const generatedUtcStr =
        generatedUtc ? new Date(generatedUtc).toISOString().replace('T', ' ').replace('Z', ' UTC') : '—'
    const generatedLocalStr = generatedUtc ? generatedUtc.toLocaleString() : '—'

    const hasSections = Array.isArray(summary.sections) && summary.sections.length > 0

    return (
        <div className={cls.summaryCard}>
            <header className={cls.summaryHeader}>
                <Text type='h3'>{title}</Text>
                <Text>
                    {t('backtestFull.summaryView.labels.reportId')}: {summary.id}
                </Text>
                <Text>
                    {t('backtestFull.summaryView.labels.reportKind')}: {summary.kind}
                </Text>
                <Text>
                    {t('backtestFull.summaryView.labels.generatedUtc')}: {generatedUtcStr}
                </Text>
                <Text>
                    {t('backtestFull.summaryView.labels.generatedLocal')}: {generatedLocalStr}
                </Text>
            </header>

            <div className={cls.sections}>
                {hasSections ?
                    summary.sections.map((section, index) => (
                        <SectionRenderer key={index} section={section} reportKind={summary.kind} />
                    ))
                :   <Text>{t('backtestFull.summaryView.noSections')}</Text>}
            </div>
        </div>
    )
}

interface SectionRendererProps {
    section: ReportSectionDto
    reportKind?: string
}

function SectionRenderer({ section, reportKind }: SectionRendererProps) {
    const kv = section as KeyValueSectionDto
    const tbl = section as TableSectionDto
    const normalizeTitle = (title: string | undefined): string =>
        title ?
            title
                .replace(/^=+\s*/, '')
                .replace(/\s*=+$/, '')
                .trim()
        :   ''
    if (Array.isArray(kv.items)) {
        const visibleTitle = normalizeTitle(kv.title) || kv.title
        const description = resolveReportSectionDescription(reportKind, kv.title)
        return (
            <section className={cls.section}>
                <Text type='h3'>{visibleTitle}</Text>
                {description && <Text className={cls.sectionSubtitle}>{description}</Text>}
                <dl className={cls.kvList}>
                    {kv.items!.map(item => (
                        <div key={item.key} className={cls.kvRow}>
                            <dt>
                                {renderTermTooltipTitle(
                                    item.key,
                                    resolveReportKeyTooltip(reportKind, visibleTitle, item.key)
                                )}
                            </dt>
                            <dd>{item.value}</dd>
                        </div>
                    ))}
                </dl>
            </section>
        )
    }
    if (Array.isArray(tbl.columns) && Array.isArray(tbl.rows)) {
        const visibleTitle = normalizeTitle(tbl.title) || tbl.title
        const description = resolveReportSectionDescription(reportKind, tbl.title)
        return (
            <section className={cls.section}>
                <Text type='h3'>{visibleTitle}</Text>
                {description && <Text className={cls.sectionSubtitle}>{description}</Text>}
                <table className={cls.table}>
                    <thead>
                        <tr>
                            {tbl.columns!.map(col => (
                                <th key={col}>
                                    {renderTermTooltipTitle(
                                        col,
                                        resolveReportColumnTooltip(reportKind, visibleTitle, col)
                                    )}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {tbl.rows!.map((row, rowIdx) => (
                            <tr
                                key={rowIdx}
                                className={resolveEvaluationRowClass(tbl.rowEvaluations?.[rowIdx] ?? null)}
                                title={resolveEvaluationRowTitle(tbl.rowEvaluations?.[rowIdx] ?? null)}>
                                {row.map((cell, cellIdx) => (
                                    <td key={cellIdx}>{cell}</td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </section>
        )
    }
    return (
        <section className={cls.section}>
            <Text type='h3'>{normalizeTitle(section.title) || section.title}</Text>
            <pre className={cls.rawJson}>{JSON.stringify(section, null, 2)}</pre>
        </section>
    )
}
