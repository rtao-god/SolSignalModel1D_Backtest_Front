import { Text } from '@/shared/ui'
import { renderTermTooltipTitle } from '@/shared/ui/TermTooltip'
import { resolveReportColumnTooltip } from '@/shared/utils/reportTooltips'
import { resolveReportSectionDescription } from '@/shared/utils/reportDescriptions'
import cls from './ModelStatsPage.module.scss'
import { stripSegmentPrefix } from './modelStatsUtils'
import type { ModelStatsTableCardProps } from './modelStatsTypes'

export function ModelStatsTableCard({ section, domId }: ModelStatsTableCardProps) {
    if (!section.columns || section.columns.length === 0) {
        return null
    }

    const visibleTitle = stripSegmentPrefix(section.title)
    const headingId = `${domId}-title`
    const description = resolveReportSectionDescription('backtest_model_stats', visibleTitle)

    return (
        <section id={domId} aria-labelledby={headingId} className={cls.tableCard}>
            <header className={cls.cardHeader}>
                <div>
                    <Text type='h3' className={cls.cardTitle} id={headingId}>
                        {visibleTitle}
                    </Text>
                    {description && <Text className={cls.cardSubtitle}>{description}</Text>}
                </div>
            </header>

            <div className={cls.tableScroll}>
                <table className={cls.table}>
                    <thead>
                        <tr>
                            {section.columns.map((colTitle, colIdx) => (
                                <th key={colIdx}>
                                    {renderTermTooltipTitle(
                                        colTitle,
                                        resolveReportColumnTooltip('backtest_model_stats', visibleTitle, colTitle)
                                    )}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {section.rows?.map((row, rowIndex) => (
                            <tr key={rowIndex}>
                                {row.map((cell, colIdx) => (
                                    <td key={colIdx}>{cell}</td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    )
}
