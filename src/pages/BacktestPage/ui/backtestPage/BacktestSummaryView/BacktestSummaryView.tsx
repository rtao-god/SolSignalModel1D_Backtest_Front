import type { BacktestSummaryDto } from '@/shared/types/backtest.types'
import type { KeyValueSectionDto, ReportSectionDto, TableSectionDto } from '@/shared/types/report.types'
import { Text } from '@/shared/ui'
import { renderTermTooltipTitle } from '@/shared/ui/TermTooltip'
import { resolveReportColumnTooltip, resolveReportKeyTooltip } from '@/shared/utils/reportTooltips'
import { resolveReportSectionDescription } from '@/shared/utils/reportDescriptions'
import cls from './BacktestSummaryView.module.scss'

/*
	BacktestSummaryView — компактный рендер отчёта бэктеста.

	Зачем:
		- Показывает метаданные и секции отчёта в карточке.
		- Унифицирует отображение summary для baseline/preview.

	Контракты:
		- summary содержит sections в формате ReportSectionDto.
*/

// Пропсы карточки summary.
interface BacktestSummaryViewProps {
    summary: BacktestSummaryDto
    title: string
}

export function BacktestSummaryView({ summary, title }: BacktestSummaryViewProps) {
    const generatedUtc = summary.generatedAtUtc ? new Date(summary.generatedAtUtc) : null
    const generatedUtcStr =
        generatedUtc ? new Date(generatedUtc).toISOString().replace('T', ' ').replace('Z', ' UTC') : '—'
    const generatedLocalStr = generatedUtc ? generatedUtc.toLocaleString() : '—'

    const hasSections = Array.isArray(summary.sections) && summary.sections.length > 0

    return (
        <div className={cls.summaryCard}>
            <header className={cls.summaryHeader}>
                <Text type='h3'>{title}</Text>
                <Text>ID отчёта: {summary.id}</Text>
                <Text>Тип: {summary.kind}</Text>
                <Text>Сгенерировано (UTC): {generatedUtcStr}</Text>
                <Text>Сгенерировано (локальное время): {generatedLocalStr}</Text>
            </header>

            <div className={cls.sections}>
                {hasSections ?
                    summary.sections.map((section, index) => (
                        <SectionRenderer key={index} section={section} reportKind={summary.kind} />
                    ))
                :   <Text>Нет секций отчёта для отображения.</Text>}
            </div>
        </div>
    )
}

interface SectionRendererProps {
    section: ReportSectionDto
    reportKind?: string
}

/*
	Универсальный рендер секций.

	- KeyValue секции рендерятся как список.
	- Table секции рендерятся как таблица.
	- Иначе отображается JSON-фолбэк.
*/
function SectionRenderer({ section, reportKind }: SectionRendererProps) {
    const kv = section as KeyValueSectionDto
    const tbl = section as TableSectionDto
    const normalizeTitle = (title: string | undefined): string =>
        title ? title.replace(/^=+\s*/, '').replace(/\s*=+$/, '').trim() : ''

    // KeyValue секция.
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

    // Табличная секция.
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
                            <tr key={rowIdx}>
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

    // Фолбэк для неожиданных секций.
    return (
        <section className={cls.section}>
            <Text type='h3'>{normalizeTitle(section.title) || section.title}</Text>
            <pre className={cls.rawJson}>{JSON.stringify(section, null, 2)}</pre>
        </section>
    )
}
