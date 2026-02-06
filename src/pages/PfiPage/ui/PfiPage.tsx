import { useEffect, useMemo, useState } from 'react'
import classNames from '@/shared/lib/helpers/classNames'
import type { TableSectionDto } from '@/shared/types/report.types'
import SectionPager from '@/shared/ui/SectionPager/ui/SectionPager'
import { useSectionPager } from '@/shared/ui/SectionPager/model/useSectionPager'
import { buildPfiTabsFromSections } from '@/shared/utils/pfiTabs'
import TableExportButton from '@/shared/ui/TableExportButton/ui/TableExportButton'
import { ViewModeToggle, type ViewMode } from '@/shared/ui/ViewModeToggle/ui/ViewModeToggle'
import { SortableTable, type TableRow, getCellValue, toExportCell } from '@/shared/ui/SortableTable'
import cls from './PfiPage.module.scss'
import { usePfiPerModelReportQuery } from '@/shared/api/tanstackQueries/pfi'
import { Text } from '@/shared/ui'
import { renderTermTooltipTitle } from '@/shared/ui/TermTooltip'
import { resolveReportColumnTooltip } from '@/shared/utils/reportTooltips'
import { resolveReportSectionDescription } from '@/shared/utils/reportDescriptions'
import PageDataBoundary from '@/shared/ui/errors/PageDataBoundary/ui/PageDataBoundary'
import type { PfiPageProps, PfiTableCardProps } from './types'

/*
	PfiPage — отчёт важности признаков (PFI).

	Зачем:
		- Показывает вклад фичей по всем моделям.
		- Даёт экспорт таблиц и навигацию по секциям.

	Источники данных и сайд-эффекты:
		- usePfiPerModelReportQuery() (TanStack Query).

	Контракты:
		- Табличные секции обязаны иметь columns и rows.
*/

// Индексы колонок, которые показываются в бизнес-режиме.
const BUSINESS_COLUMN_INDEXES = [0, 1, 2, 4, 7, 9]

/*
	Карточка таблицы PFI.

	- Показывает таблицу по одной секции отчёта.
	- Даёт переключатель business/technical и экспорт.
*/
function PfiTableCard({ section, domId }: PfiTableCardProps) {
    const [mode, setMode] = useState<ViewMode>('business')
    const [sortedRows, setSortedRows] = useState<TableRow[]>([])

    const columns: string[] = section.columns ?? []

    const visibleColumnIndexes = useMemo<number[]>(() => {
        if (columns.length === 0) {
            return [] as number[]
        }

        if (mode === 'technical') {
            return columns.map((_value: string, idx: number) => idx)
        }

        return BUSINESS_COLUMN_INDEXES.filter(idx => idx < columns.length)
    }, [mode, columns])

    if (!section.columns || section.columns.length === 0) {
        return null
    }

    useEffect(() => {
        setSortedRows(section.rows ?? [])
    }, [section.rows])

    const exportColumns = visibleColumnIndexes.map((colIdx: number) => columns[colIdx] ?? `col_${colIdx}`)
    const rowsForExport: TableRow[] = sortedRows.length > 0 ? sortedRows : (section.rows ?? [])
    const exportRows = useMemo(
        () =>
            rowsForExport.map((row: TableRow) =>
                visibleColumnIndexes.map((colIdx: number) => toExportCell(getCellValue(row, colIdx)))
            ),
        [rowsForExport, visibleColumnIndexes]
    )

    const fileBaseName = section.title || domId
    const description = resolveReportSectionDescription('pfi_per_model', section.title)
    const renderColumnTitle = (title: string) =>
        renderTermTooltipTitle(title, resolveReportColumnTooltip('pfi_per_model', section.title, title))

    return (
        <section id={domId} className={cls.tableCard}>
            <header className={cls.cardHeader}>
                <div>
                    <Text type='h3' className={cls.cardTitle}>
                        {section.title}
                    </Text>
                    {description && <Text className={cls.cardSubtitle}>{description}</Text>}
                    <ViewModeToggle mode={mode} onChange={setMode} className={cls.modeToggle} />
                </div>

                <TableExportButton
                    columns={exportColumns}
                    rows={exportRows}
                    fileBaseName={fileBaseName}
                    defaultFormat='pdf'
                />
            </header>

            <SortableTable
                columns={columns}
                rows={section.rows ?? []}
                visibleColumnIndexes={visibleColumnIndexes}
                storageKey={`pfi.sort.${domId}`}
                onSortedRowsChange={setSortedRows}
                renderColumnTitle={renderColumnTitle}
            />
        </section>
    )
}

export default function PfiPage({ className }: PfiPageProps) {
    const { data, isError, error, refetch } = usePfiPerModelReportQuery()

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

    return (
        <PageDataBoundary
            isError={isError}
            error={error}
            hasData={Boolean(data)}
            onRetry={refetch}
            errorTitle='Не удалось загрузить PFI отчёт'>
            {data && (
                <div className={rootClassName}>
                    <header className={cls.headerRow}>
                        <div>
                            <Text type='h2'>{data.title || 'PFI по моделям'}</Text>
                            <Text className={cls.subtitle}>
                                Отчёт по важности признаков (Permutation Feature Importance) для всех бинарных моделей
                                (move / dir / micro / SL и т.п.). Чем выше ΔAUC, тем сильнее признак влияет на качество,
                                а знаки ΔMean/корреляций помогают понять направление влияния.
                            </Text>
                        </div>
                        <div className={cls.meta}>
                            <Text>Generated at: {new Date(data.generatedAtUtc).toLocaleString()}</Text>
                            <Text>Kind: {data.kind}</Text>
                        </div>
                    </header>

                    {tableSections.length === 0 ? (
                        <div>
                            <Text type='h2'>PFI отчёт пустой</Text>
                            <Text>
                                Бэкенд вернул отчёт без табличных секций. Имеет смысл проверить конфигурацию генерации
                                PFI или данные в базе.
                            </Text>
                        </div>
                    ) : (
                        <>
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
                        </>
                    )}
                </div>
            )}
        </PageDataBoundary>
    )
}
