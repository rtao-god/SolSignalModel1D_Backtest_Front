// File: src/pages/BacktestSummaryReportPage/ui/BacktestSummaryReportPage.tsx
import classNames from '@/shared/lib/helpers/classNames'
import cls from './BacktestSummaryReportPage.module.scss'
import { Text } from '@/shared/ui'
import type { ReportSectionDto, KeyValueSectionDto, TableSectionDto } from '@/shared/types/report.types'
import type BacktestSummaryReportProps from '../types'
import { useGetBacktestBaselineSummaryQuery } from '@/shared/api/api'

export default function BacktestSummaryReportPage({ className }: BacktestSummaryReportProps) {
    const { data, isLoading, isError } = useGetBacktestBaselineSummaryQuery()

    if (isLoading) {
        return (
            <div className={classNames(cls.BacktestSummaryPage, {}, [className ?? ''])}>
                <Text type='h2'>Загружаю сводку бэктеста...</Text>
            </div>
        )
    }

    if (isError || !data) {
        return (
            <div className={classNames(cls.BacktestSummaryPage, {}, [className ?? ''])}>
                <Text type='h2'>Не удалось загрузить сводку бэктеста</Text>
            </div>
        )
    }

    const generatedUtc = data.generatedAtUtc ? new Date(data.generatedAtUtc) : null
    const generatedUtcStr = generatedUtc ? generatedUtc.toISOString().replace('T', ' ').replace('Z', ' UTC') : '—'
    const generatedLocalStr = generatedUtc ? generatedUtc.toLocaleString() : '—'

    const hasSections = Array.isArray(data.sections) && data.sections.length > 0

    return (
        <div className={classNames(cls.BacktestSummaryPage, {}, [className ?? ''])}>
            {/* Шапка отчёта */}
            <header className={cls.header}>
                <Text type='h1'>{data.title}</Text>
                <Text type='p'>ID отчёта: {data.id}</Text>
                <Text type='p'>Тип: {data.kind}</Text>
                <Text type='p'>Сгенерировано (UTC): {generatedUtcStr}</Text>
                <Text type='p'>Сгенерировано (локальное время): {generatedLocalStr}</Text>
            </header>

            {/* Секции отчёта */}
            <div className={cls.sections}>
                {hasSections ?
                    data.sections.map((section, index) => <SectionRenderer key={index} section={section} />)
                :   <Text type='p'>Нет секций отчёта для отображения.</Text>}
            </div>
        </div>
    )
}

interface SectionRendererProps {
    section: ReportSectionDto
}

// Универсальный рендер секций, как в CurrentMLModelPredictionPage:
// - если есть items → KeyValue
// - если есть columns/rows → таблица
// - иначе просто дамп JSON (запасной вариант для будущих типов секций)
function SectionRenderer({ section }: SectionRendererProps) {
    const kv = section as KeyValueSectionDto
    const tbl = section as TableSectionDto

    // KeyValue секция
    if (Array.isArray(kv.items)) {
        return (
            <section className={cls.section}>
                <Text type='h2'>{kv.title}</Text>
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
                <Text type='h2'>{tbl.title}</Text>
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

    // Фолбэк для будущих типов секций
    return (
        <section className={cls.section}>
            <Text type='h2'>{section.title}</Text>
            <pre className={cls.rawJson}>{JSON.stringify(section, null, 2)}</pre>
        </section>
    )
}
