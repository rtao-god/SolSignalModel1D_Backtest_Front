import { useMemo, useState } from 'react'
import classNames from '@/shared/lib/helpers/classNames'
import type { TableSectionDto } from '@/shared/types/report.types'
import SectionPager from '@/shared/ui/SectionPager/ui/SectionPager'
import { useSectionPager } from '@/shared/ui/SectionPager/model/useSectionPager'
import { buildPfiTabsFromSections } from '@/shared/utils/pfiTabs'
import TableExportButton from '@/shared/ui/TableExportButton/ui/TableExportButton'
import { ViewModeToggle, type ViewMode } from '@/shared/ui/ViewModeToggle/ui/ViewModeToggle'
import cls from './PfiPage.module.scss'
import { usePfiPerModelReportQuery } from '@/shared/api/tanstackQueries/pfi'
import { Text } from '@/shared/ui'

interface PfiTableCardProps {
    section: TableSectionDto
    domId: string
}

// Индексы колонок, которые показываются в бизнес-режиме.
const BUSINESS_COLUMN_INDEXES = [0, 1, 2, 4, 7, 9]

function PfiTableCard({ section, domId }: PfiTableCardProps) {
    const [mode, setMode] = useState<ViewMode>('business')

    const columns = section.columns ?? []

    const visibleColumnIndexes = useMemo(() => {
        if (columns.length === 0) {
            return [] as number[]
        }

        if (mode === 'technical') {
            return columns.map((_, idx: number) => idx)
        }

        return BUSINESS_COLUMN_INDEXES.filter(idx => idx < columns.length)
    }, [mode, columns])

    if (!section.columns || section.columns.length === 0) {
        return null
    }

    const exportColumns = visibleColumnIndexes.map(colIdx => columns[colIdx] ?? `col_${colIdx}`)
    const exportRows = section.rows?.map(row => visibleColumnIndexes.map(colIdx => (row ? row[colIdx] : ''))) ?? []

    const fileBaseName = section.title || domId

    return (
        <section id={domId} className={cls.tableCard}>
            <header className={cls.cardHeader}>
                <div>
                    <Text type='h3' className={cls.cardTitle}>
                        {section.title}
                    </Text>
                    <ViewModeToggle mode={mode} onChange={setMode} className={cls.modeToggle} />
                </div>

                <TableExportButton
                    columns={exportColumns}
                    rows={exportRows}
                    fileBaseName={fileBaseName}
                    defaultFormat='pdf'
                />
            </header>

            <div className={cls.tableScroll}>
                <table className={cls.table}>
                    <thead>
                        <tr>
                            {visibleColumnIndexes.map(colIdx => {
                                const title = columns[colIdx] ?? `col_${colIdx}`
                                return <th key={colIdx}>{title}</th>
                            })}
                        </tr>
                    </thead>
                    <tbody>
                        {section.rows?.map((row, rowIndex) => (
                            <tr key={rowIndex}>
                                {visibleColumnIndexes.map(colIdx => (
                                    <td key={colIdx}>{row ? row[colIdx] : ''}</td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    )
}

interface PfiPageProps {
    className?: string
}

/**
 * Страница PFI:
 * - Suspense-данные приходят из usePfiPerModelReportQuery;
 * - PageSuspense с текстом "Загружаю PFI отчёт…" навешивается на уровне роутера.
 */
export default function PfiPage({ className }: PfiPageProps) {
    const { data } = usePfiPerModelReportQuery()

    const tableSections = useMemo(
        () =>
            (data?.sections ?? []).filter(
                (section): section is TableSectionDto =>
                    Array.isArray((section as TableSectionDto).columns) &&
                    (section as TableSectionDto).columns!.length > 0
            ),
        [data]
    )

    const tabs = useMemo(() => buildPfiTabsFromSections(tableSections), [tableSections])

    const { currentIndex, canPrev, canNext, handlePrev, handleNext } = useSectionPager({
        sections: tabs,
        syncHash: true
    })

    const rootClassName = classNames(cls.PfiPage, {}, [className ?? ''])

    if (!data || tableSections.length === 0) {
        return (
            <div className={rootClassName}>
                <Text type='h2'>PFI отчёт пустой</Text>
                <Text>
                    Бэкенд вернул отчёт без табличных секций. Имеет смысл проверить конфигурацию генерации PFI или
                    данные в базе.
                </Text>
            </div>
        )
    }

    return (
        <div className={rootClassName}>
            <header className={cls.headerRow}>
                <div>
                    <Text type='h2'>{data.title || 'PFI по моделям'}</Text>
                    <Text className={cls.subtitle}>
                        Отчёт по важности признаков (Permutation Feature Importance) для всех бинарных моделей (move /
                        dir / micro / SL и т.п.).
                    </Text>
                </div>
                <div className={cls.meta}>
                    <Text>Generated at: {new Date(data.generatedAtUtc).toLocaleString()}</Text>
                    <Text>Kind: {data.kind}</Text>
                </div>
            </header>

            <div className={cls.tablesGrid}>
                {tableSections.map((section, index) => {
                    const tab = tabs[index]
                    const domId = tab?.anchor ?? `pfi-model-${index + 1}`

                    return <PfiTableCard key={section.title ?? domId} section={section} domId={domId} />
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
