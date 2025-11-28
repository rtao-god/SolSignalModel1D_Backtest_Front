import { useMemo, useState } from 'react'
import classNames from '@/shared/lib/helpers/classNames'
import { Text } from '@/shared/ui'
import { Btn } from '@/shared/ui/Btn'
import { useGetPfiPerModelReportQuery } from '@/shared/api/api'
import type { TableSectionDto } from '@/shared/types/report.types'
import SectionPager from '@/shared/ui/SectionPager/ui/SectionPager'
import { useSectionPager } from '@/shared/ui/SectionPager/model/useSectionPager'
import { buildPfiTabsFromSections } from '@/shared/utils/pfiTabs'
import cls from './PfiPage.module.scss'

type ViewMode = 'business' | 'technical'

interface PfiModeToggleProps {
    mode: ViewMode
    onChange: (mode: ViewMode) => void
}

function PfiModeToggle({ mode, onChange }: PfiModeToggleProps) {
    const handleBusinessClick = () => {
        if (mode !== 'business') {
            onChange('business')
        }
    }

    const handleTechnicalClick = () => {
        if (mode !== 'technical') {
            onChange('technical')
        }
    }

    return (
        <div className={cls.modeToggle}>
            <Btn
                size='small'
                className={classNames(cls.modeButton, { [cls.modeButtonActive]: mode === 'business' }, [])}
                onClick={handleBusinessClick}>
                Бизнес
            </Btn>
            <Btn
                size='small'
                className={classNames(cls.modeButton, { [cls.modeButtonActive]: mode === 'technical' }, [])}
                onClick={handleTechnicalClick}>
                Технарь
            </Btn>
        </div>
    )
}

/**
 * Карточка для одной таблицы PFI (одна модель).
 * Локальный state режима (business / technical) — отдельно на каждую карточку.
 */
interface PfiTableCardProps {
    section: TableSectionDto
    domId: string
}

const BUSINESS_COLUMN_INDEXES = [0, 1, 2, 4, 7, 9]

function PfiTableCard({ section, domId }: PfiTableCardProps) {
    const [mode, setMode] = useState<ViewMode>('business')

    const columns = section.columns ?? []

    const visibleColumnIndexes = useMemo(() => {
        if (columns.length === 0) {
            return [] as number[]
        }

        if (mode === 'technical') {
            // Технарский режим — показываем все столбцы как есть.
            return columns.map((_, idx: number) => idx)
        }

        // Бизнес-режим — только подмножество «главных» колонок.
        return BUSINESS_COLUMN_INDEXES.filter(idx => idx < columns.length)
    }, [mode, columns])

    if (!section.columns || section.columns.length === 0) {
        return null
    }

    return (
        <section id={domId} className={cls.tableCard}>
            <header className={cls.cardHeader}>
                <Text type='h3' className={cls.cardTitle}>
                    {section.title}
                </Text>
                <PfiModeToggle mode={mode} onChange={setMode} />
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
                                    <td key={colIdx}>{row[colIdx]}</td>
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
 * - тянет ReportDocument с PFI по всем моделям;
 * - строит табы по факту секций бэкенда (buildPfiTabsFromSections);
 * - использует useSectionPager для синхронизации:
 *   - стрелки PFI;
 *   - подвкладки в сайдбаре;
 *   - hash в URL.
 */
export default function PfiPage({ className }: PfiPageProps) {
    const { data, isLoading, isError } = useGetPfiPerModelReportQuery()

    const tableSections = useMemo(
        () =>
            (data?.sections ?? []).filter(
                (section): section is TableSectionDto =>
                    Array.isArray((section as TableSectionDto).columns) &&
                    (section as TableSectionDto).columns!.length > 0
            ),
        [data]
    )

    // Табы строим из фактических секций отчёта.
    const tabs = useMemo(() => buildPfiTabsFromSections(tableSections), [tableSections])

    // Общая логика перелистывания/скролла/хэшей — в useSectionPager.
    const { currentIndex, canPrev, canNext, handlePrev, handleNext } = useSectionPager({
        sections: tabs,
        syncHash: true
    })

    if (isLoading) {
        return (
            <div className={classNames(cls.PfiPage, {}, [className ?? ''])}>
                <Text type='h2'>Загружаю PFI отчёт...</Text>
            </div>
        )
    }

    if (isError || !data) {
        return (
            <div className={classNames(cls.PfiPage, {}, [className ?? ''])}>
                <Text type='h2'>Не удалось загрузить PFI отчёт</Text>
            </div>
        )
    }

    return (
        <div className={classNames(cls.PfiPage, {}, [className ?? ''])}>
            <header className={cls.headerRow}>
                <div>
                    <Text type='h2'>{data.title || 'PFI по моделям'}</Text>
                    <Text type='p' className={cls.subtitle}>
                        Отчёт по важности признаков (Permutation Feature Importance) для всех бинарных моделей (move /
                        dir / micro / SL и т.п.).
                    </Text>
                </div>
                <div className={cls.meta}>
                    <Text type='p'>Generated at: {new Date(data.generatedAtUtc).toLocaleString()}</Text>
                    <Text type='p'>Kind: {data.kind}</Text>
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
