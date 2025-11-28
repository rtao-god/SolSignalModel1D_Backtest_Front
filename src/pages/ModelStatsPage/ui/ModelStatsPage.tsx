import { useMemo } from 'react'
import classNames from '@/shared/lib/helpers/classNames'
import { Text } from '@/shared/ui'
import { useGetModelStatsReportQuery } from '@/shared/api/api'
import type { TableSectionDto } from '@/shared/types/report.types'
import SectionPager from '@/shared/ui/SectionPager/ui/SectionPager'
import { useSectionPager } from '@/shared/ui/SectionPager/model/useSectionPager'
import cls from './ModelStatsPage.module.scss'

interface ModelStatsPageProps {
    className?: string
}

interface ModelStatsTableCardProps {
    section: TableSectionDto
    domId: string
}

/**
 * Простейшая карточка таблицы статистики модели.
 * Показываем все колонки как есть (без бизнес/тех режимов).
 */
function ModelStatsTableCard({ section, domId }: ModelStatsTableCardProps) {
    if (!section.columns || section.columns.length === 0) {
        return null
    }

    return (
        <section id={domId} className={cls.tableCard}>
            <header className={cls.cardHeader}>
                <Text type='h3' className={cls.cardTitle}>
                    {section.title}
                </Text>
            </header>

            <div className={cls.tableScroll}>
                <table className={cls.table}>
                    <thead>
                        <tr>
                            {section.columns.map((colTitle, colIdx) => (
                                <th key={colIdx}>{colTitle}</th>
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

/**
 * Страница статистики моделей:
 * - тянет ReportDocument kind="ml_model_stats";
 * - строит табы по секциям (SectionPager + hash в URL);
 * - каждая секция = отдельная таблица по модели/группе моделей.
 */
export default function ModelStatsPage({ className }: ModelStatsPageProps) {
    const { data, isLoading, isError } = useGetModelStatsReportQuery()

    const tableSections = useMemo(
        () =>
            (data?.sections ?? []).filter(
                (section): section is TableSectionDto =>
                    Array.isArray((section as TableSectionDto).columns) &&
                    (section as TableSectionDto).columns!.length > 0
            ),
        [data]
    )

    const tabs = useMemo(
        () =>
            tableSections.map((section, index) => {
                const label = section.title || `Модель ${index + 1}`

                return {
                    id: `model-${index + 1}`,
                    label,
                    anchor: `ml-model-${index + 1}`
                }
            }),
        [tableSections]
    )

    const { currentIndex, canPrev, canNext, handlePrev, handleNext } = useSectionPager({
        sections: tabs,
        syncHash: true
        // offsetTop берётся из CSS-переменной внутри scrollToAnchor
    })

    if (isLoading) {
        return (
            <div className={classNames(cls.ModelStatsPage, {}, [className ?? ''])}>
                <Text type='h2'>Загружаю статистику моделей...</Text>
            </div>
        )
    }

    if (isError || !data) {
        return (
            <div className={classNames(cls.ModelStatsPage, {}, [className ?? ''])}>
                <Text type='h2'>Не удалось загрузить статистику моделей</Text>
            </div>
        )
    }

    return (
        <div className={classNames(cls.ModelStatsPage, {}, [className ?? ''])}>
            <header className={cls.headerRow}>
                <div>
                    <Text type='h2'>{data.title || 'Статистика моделей'}</Text>
                    <Text type='p' className={cls.subtitle}>
                        Сводный отчёт по качеству и параметрам ML-моделей (метрики, выборки и т.п.).
                    </Text>
                </div>
                <div className={cls.meta}>
                    <Text type='p'>Generated at: {new Date(data.generatedAtUtc).toLocaleString()}</Text>
                    <Text type='p'>Kind: {data.kind}</Text>
                </div>
            </header>

            <div className={cls.tablesGrid}>
                {tableSections.map((section, index) => {
                    const domId = tabs[index]?.anchor ?? `ml-model-${index + 1}`
                    return <ModelStatsTableCard key={section.title ?? domId} section={section} domId={domId} />
                })}
            </div>

            {tabs.length > 1 && (
                <SectionPager
                    sections={tabs}
                    currentIndex={currentIndex}
                    canPrev={canPrev}
                    canNext={canNext}
                    onPrev={handlePrev}
                    onNext={handleNext}
                />
            )}
        </div>
    )
}
