import type { BacktestSummaryDto } from '@/shared/types/backtest.types'
import type { KeyValueSectionDto, ReportSectionDto, TableSectionDto } from '@/shared/types/report.types'
import { Text } from '@/shared/ui'
import cls from './BacktestSummaryView.module.scss'

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
                <Text type='p'>ID отчёта: {summary.id}</Text>
                <Text type='p'>Тип: {summary.kind}</Text>
                <Text type='p'>Сгенерировано (UTC): {generatedUtcStr}</Text>
                <Text type='p'>Сгенерировано (локальное время): {generatedLocalStr}</Text>
            </header>

            <div className={cls.sections}>
                {hasSections ?
                    summary.sections.map((section, index) => <SectionRenderer key={index} section={section} />)
                :   <Text type='p'>Нет секций отчёта для отображения.</Text>}
            </div>
        </div>
    )
}

interface SectionRendererProps {
    section: ReportSectionDto
}

/**
 * Универсальный рендер секций:
 * - если есть items → KeyValue;
 * - если есть columns/rows → таблица;
 * - иначе дамп JSON.
 */
function SectionRenderer({ section }: SectionRendererProps) {
    const kv = section as KeyValueSectionDto
    const tbl = section as TableSectionDto

    // KeyValue секция
    if (Array.isArray(kv.items)) {
        return (
            <section className={cls.section}>
                <Text type='h3'>{kv.title}</Text>
                <dl className={cls.kvList}>
                    {kv.items!.map(item => (
                        <div key={item.key} className={cls.kvRow}>
                            <dt>{item.key}</dt>
                            <dd>{item.value}</dd>
                        </div>
                    ))}
                </dl>
            </section>
        )
    }

    // Табличная секция
    if (Array.isArray(tbl.columns) && Array.isArray(tbl.rows)) {
        return (
            <section className={cls.section}>
                <Text type='h3'>{tbl.title}</Text>
                <table className={cls.table}>
                    <thead>
                        <tr>
                            {tbl.columns!.map(col => (
                                <th key={col}>{col}</th>
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

    // Фолбэк для неожиданных секций
    return (
        <section className={cls.section}>
            <Text type='h3'>{section.title}</Text>
            <pre className={cls.rawJson}>{JSON.stringify(section, null, 2)}</pre>
        </section>
    )
}
