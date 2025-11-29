import { useMemo, useState } from 'react'
import classNames from '@/shared/lib/helpers/classNames'
import { Btn, Text } from '@/shared/ui'
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

type ViewMode = 'business' | 'technical'

interface ModelStatsModeToggleProps {
    mode: ViewMode
    onChange: (mode: ViewMode) => void
}

function ModelStatsModeToggle({ mode, onChange }: ModelStatsModeToggleProps) {
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
 * Простейшая карточка таблицы статистики модели.
 * Показываем все колонки как есть (без локального бизнес/тех режима).
 * Глобальный режим (business/technical) влияет только на то,
 * какие секции вообще попадают в tableSections.
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
 * - тянет ReportDocument kind="backtest_model_stats" (через API);
 * - строит табы по секциям (SectionPager + hash в URL);
 * - глобальный режим business/technical управляет тем,
 *   какую версию daily confusion показать: summary vs matrix.
 */
export default function ModelStatsPage({ className }: ModelStatsPageProps) {
    const { data, isLoading, isError } = useGetModelStatsReportQuery()

    // Глобальный режим: по умолчанию "человеческий" (business).
    const [mode, setMode] = useState<ViewMode>('business')

    // Все табличные секции как есть из репорта.
    const rawTableSections = useMemo(
        () =>
            (data?.sections ?? []).filter(
                (section): section is TableSectionDto =>
                    Array.isArray((section as TableSectionDto).columns) &&
                    (section as TableSectionDto).columns!.length > 0
            ),
        [data]
    )

    // Функция, которая решает, нужно ли показывать секцию в текущем режиме.
    const tableSections = useMemo(() => {
        if (!rawTableSections.length) {
            return [] as TableSectionDto[]
        }

        return rawTableSections.filter(section => {
            const title = section.title ?? ''

            const isDailyBusiness = title.startsWith('Daily label summary (business)')
            const isDailyTechnical = title.startsWith('Daily label confusion (3-class, technical)')

            // В бизнес-режиме скрываем технарскую матрицу, оставляем summary.
            if (mode === 'business' && isDailyTechnical) {
                return false
            }

            // В технарском режиме наоборот: скрываем summary, показываем матрицу.
            if (mode === 'technical' && isDailyBusiness) {
                return false
            }

            // Все остальные секции (trend, SL, thresholds и т.п.) показываем всегда.
            return true
        })
    }, [rawTableSections, mode])

    const tabs = useMemo(
        () =>
            tableSections.map((section, index) => {
                const label = section.title || `Секция ${index + 1}`

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

            {/* Глобальный переключатель режимов для всей страницы */}
            <ModelStatsModeToggle mode={mode} onChange={setMode} />

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
