import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import classNames from '@/shared/lib/helpers/classNames'
import { Text } from '@/shared/ui'
import { Btn } from '@/shared/ui/Btn'
import { useGetPfiPerModelReportQuery } from '@/shared/api/api'
import type { TableSectionDto } from '@/shared/types/report.types'
import SectionPager from '@/shared/ui/SectionPager/ui/SectionPager'
import { PFI_TABS } from '@/shared/utils/pfiTabs'
import cls from './PfiPage.module.scss'

type ViewMode = 'business' | 'technical'

/**
 * Локальный переключатель режима отображения:
 * - business: минимум столбцов для "продажного" вида;
 * - technical: полный набор столбцов.
 * Переключатель управляет только одной таблицей (одной "вкладкой"),
 * соседние таблицы живут своей жизнью.
 */
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
 * Здесь хранится локальное состояние режима отображения,
 * чтобы переключение не влияло на соседние таблицы.
 */
interface PfiTableCardProps {
    section: TableSectionDto
    domId: string
}

const BUSINESS_COLUMN_INDEXES = [0, 1, 2, 4, 7, 9]
// 0: Index
// 1: FeatureName
// 2: ImportanceAuc
// 4: DeltaMean
// 7: CorrScore
// 9: Support (CountPos/CountNeg)

/**
 * Важно: бизнес-режим здесь реализован как "подмножество колонок по индексам".
 * Это опирается на порядок колонок, который задаётся на бэкенде
 * в FeatureImportanceTableDefinitions.PerModelFeatureStats.
 */
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

        // Бизнес-режим — только подмножество "главных" колонок.
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
                                const title = columns[colIdx] ?? `col_${colIdx}` // защита от выхода за границы
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

/**
 * Страница PFI:
 * - тянет ReportDocument с PFI по всем моделям;
 * - для каждой таблицы строит отдельную карточку с локальным переключателем режима;
 * - для первых N моделей (из PFI_TABS) навешивает якоря и плавающий SectionPager;
 * - синхронизируется с подвкладками в сайдбаре через hash и scrollIntoView.
 */
interface PfiPageProps {
    className?: string
}

export default function PfiPage({ className }: PfiPageProps) {
    // ВАЖНО: все хуки до любых return
    const { data, isLoading, isError } = useGetPfiPerModelReportQuery()
    const location = useLocation()

    const tableSections = useMemo(
        () =>
            (data?.sections ?? []).filter(
                (section): section is TableSectionDto =>
                    Array.isArray((section as TableSectionDto).columns) &&
                    !!(section as TableSectionDto).columns &&
                    (section as TableSectionDto).columns!.length > 0
            ),
        [data]
    )

    // Табов может быть меньше, чем таблиц — берём первые N под PFI_TABS,
    // остальные таблицы считаем "дополнительными" без подвкладок/стрелок.
    const mainTabs = useMemo(() => PFI_TABS.slice(0, tableSections.length), [tableSections.length])

    const mainSections = mainTabs.length > 0 ? tableSections.slice(0, mainTabs.length) : []
    const extraSections = mainTabs.length > 0 ? tableSections.slice(mainTabs.length) : tableSections

    // Текущий индекс "страницы" (модели) для SectionPager
    const [currentIndex, setCurrentIndex] = useState(0)

    // При изменении количества вкладок — поджимаем currentIndex в допустимый диапазон
    useEffect(() => {
        if (mainTabs.length === 0) {
            if (currentIndex !== 0) {
                setCurrentIndex(0)
            }
            return
        }

        if (currentIndex >= mainTabs.length) {
            setCurrentIndex(mainTabs.length - 1)
        }
    }, [currentIndex, mainTabs.length])

    // Реакция на изменение hash (клик по подвкладке в сайдбаре)
    useEffect(() => {
        if (mainTabs.length === 0) return

        const hash = location.hash.replace('#', '')
        if (!hash) return

        const idx = mainTabs.findIndex(tab => tab.anchor === hash)
        if (idx < 0) return

        setCurrentIndex(idx)

        if (typeof document === 'undefined') return
        const el = document.getElementById(hash)
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
    }, [location.hash, mainTabs])

    const handleNavigate = (index: number) => {
        if (index < 0 || index >= mainTabs.length) return

        setCurrentIndex(index)

        const tab = mainTabs[index]
        const anchor = tab.anchor

        if (typeof window !== 'undefined') {
            // Обновляем hash, чтобы сайдбар подсветил нужную подвкладку
            window.location.hash = `#${anchor}`
        }

        if (typeof document === 'undefined') return
        const element = document.getElementById(anchor)
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
    }

    // После всех хуков — условные return'ы
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
                {/* Основные модели, для которых есть подвкладки и стрелки */}
                {mainSections.map((section, index) => (
                    <PfiTableCard
                        key={section.title ?? mainTabs[index].id}
                        section={section}
                        domId={mainTabs[index].anchor}
                    />
                ))}

                {/* Дополнительные таблицы без подвкладок/стрелок (если backend вернул больше секций) */}
                {extraSections.map((section, extraIndex) => {
                    const domId = `pfi-extra-${extraIndex}`
                    return <PfiTableCard key={section.title ?? domId} section={section} domId={domId} />
                })}
            </div>

            {/* Плавающая пагинация по основным моделям PFI (вверх/вниз) */}
            {mainTabs.length > 1 && (
                <SectionPager
                    sections={mainTabs.map(tab => ({ id: tab.id, anchor: tab.anchor }))}
                    currentIndex={currentIndex}
                    onNavigate={handleNavigate}
                />
            )}
        </div>
    )
}
