import { useEffect, useMemo, useState } from 'react'
import classNames from '@/shared/lib/helpers/classNames'
import { Btn, Text } from '@/shared/ui'
import { useGetModelStatsReportQuery } from '@/shared/api/api'
import type { KeyValueSectionDto, ReportSectionDto, TableSectionDto } from '@/shared/types/report.types'
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

type SegmentKey = 'OOS' | 'TRAIN' | 'FULL' | 'RECENT'

interface SegmentInfo {
    key: SegmentKey
    prefix: string
}

interface GlobalMeta {
    runKind: string
    hasOos: boolean
    trainRecordsCount: number
    oosRecordsCount: number
    totalRecordsCount: number
    recentDays: number
    recentRecordsCount: number
}

const SEGMENT_PREFIX: Record<SegmentKey, string> = {
    FULL: '[FULL] ',
    TRAIN: '[TRAIN] ',
    OOS: '[OOS] ',
    RECENT: '[RECENT] '
}

// Приоритет выбора сегмента по умолчанию
const SEGMENT_INIT_ORDER: SegmentKey[] = ['OOS', 'RECENT', 'TRAIN', 'FULL']

/**
 * Обрезает префикс "[OOS] " / "[TRAIN] " и т.п. в заголовке секции.
 */
function stripSegmentPrefix(title: string | undefined | null): string {
    if (!title) return ''
    const match = title.match(/^\[(FULL|TRAIN|OOS|RECENT)\]\s*/i)
    if (!match) return title
    return title.slice(match[0].length)
}

/**
 * Проверка, что секция — key-value (опираемся на наличие items).
 */
function isKeyValueSection(section: ReportSectionDto): section is KeyValueSectionDto {
    return Array.isArray((section as KeyValueSectionDto).items)
}

/**
 * Проверка, что секция — табличная (опираемся на наличие columns).
 */
function isTableSection(section: ReportSectionDto): section is TableSectionDto {
    return Array.isArray((section as TableSectionDto).columns)
}

/**
 * Переключатель бизнес/тех-режима.
 * Управляет только выбором daily confusion summary vs technical matrix.
 */
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

interface SegmentToggleProps {
    segments: SegmentInfo[]
    value: SegmentKey | null
    onChange: (segment: SegmentKey) => void
}

/**
 * Переключатель сегмента (OOS / Train / Full / Recent).
 * Использует те же стили, что и переключатель бизнес/тех-режима.
 */
function SegmentToggle({ segments, value, onChange }: SegmentToggleProps) {
    if (!segments.length) {
        return null
    }

    const handleClick = (segment: SegmentKey) => () => {
        if (segment !== value) {
            onChange(segment)
        }
    }

    const renderLabel = (segment: SegmentKey) => {
        switch (segment) {
            case 'OOS':
                return 'OOS (честный)'
            case 'TRAIN':
                return 'Train'
            case 'FULL':
                return 'Full history'
            case 'RECENT':
                return 'Recent'
            default:
                return segment
        }
    }

    return (
        <div className={cls.modeToggle}>
            {segments.map(seg => (
                <Btn
                    key={seg.key}
                    size='small'
                    className={classNames(cls.modeButton, { [cls.modeButtonActive]: value === seg.key }, [])}
                    onClick={handleClick(seg.key)}>
                    {renderLabel(seg.key)}
                </Btn>
            ))}
        </div>
    )
}

/**
 * Карточка табличной секции.
 * Заголовок очищается от префикса сегмента.
 */
function ModelStatsTableCard({ section, domId }: ModelStatsTableCardProps) {
    if (!section.columns || section.columns.length === 0) {
        return null
    }

    const visibleTitle = stripSegmentPrefix(section.title)

    return (
        <section id={domId} className={cls.tableCard}>
            <header className={cls.cardHeader}>
                <Text type='h3' className={cls.cardTitle}>
                    {visibleTitle}
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
 * - читает global-meta (RunKind, HasOos, размеры выборок);
 * - даёт выбрать сегмент (OOS / Train / Full / Recent);
 * - бизнес/тех-режим управляет версией daily confusion.
 */
export default function ModelStatsPage({ className }: ModelStatsPageProps) {
    const { data, isLoading, isError } = useGetModelStatsReportQuery()

    // Глобальный режим отображения daily confusion.
    const [mode, setMode] = useState<ViewMode>('business')

    // Текущий сегмент (OOS / Train / Full / Recent).
    const [segment, setSegment] = useState<SegmentKey | null>(null)

    // Все секции отчёта.
    const allSections = useMemo(() => (data?.sections as ReportSectionDto[] | undefined) ?? [], [data])

    // Глобальные метаданные по мультисегментному отчёту.
    const globalMeta = useMemo<GlobalMeta | null>(() => {
        if (!allSections.length) {
            return null
        }

        const metaSection = allSections.filter(isKeyValueSection).find(section => {
            const title = section.title ?? ''
            // Название из бэкенда: "Параметры модельных статистик (multi-segment)"
            return title.includes('multi-segment') || title.includes('Параметры модельных статистик')
        })

        if (!metaSection || !Array.isArray(metaSection.items)) {
            return null
        }

        const map = new Map<string, string>()
        for (const item of metaSection.items) {
            if (!item) continue
            if (typeof item.key === 'string') {
                map.set(item.key, String(item.value ?? ''))
            }
        }

        const parseIntSafe = (key: string): number => {
            const raw = map.get(key)
            const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN
            return Number.isFinite(parsed) ? parsed : 0
        }

        const parseBoolSafe = (key: string): boolean => {
            const raw = (map.get(key) ?? '').toLowerCase()
            return raw === 'true' || raw === '1' || raw === 'yes'
        }

        return {
            runKind: map.get('RunKind') ?? '',
            hasOos: parseBoolSafe('HasOos'),
            trainRecordsCount: parseIntSafe('TrainRecordsCount'),
            oosRecordsCount: parseIntSafe('OosRecordsCount'),
            totalRecordsCount: parseIntSafe('TotalRecordsCount'),
            recentDays: parseIntSafe('RecentDays'),
            recentRecordsCount: parseIntSafe('RecentRecordsCount')
        }
    }, [allSections])

    // Все табличные секции (до фильтрации по сегменту/режиму).
    const rawTableSections = useMemo(() => allSections.filter(isTableSection), [allSections])

    // Доступные сегменты по префиксам "[OOS] ", "[TRAIN] " и т.д.
    const availableSegments = useMemo<SegmentInfo[]>(() => {
        if (!rawTableSections.length) {
            return []
        }

        const found = new Map<SegmentKey, SegmentInfo>()

        for (const section of rawTableSections) {
            const title = section.title ?? ''
            ;(Object.entries(SEGMENT_PREFIX) as [SegmentKey, string][]).forEach(([key, prefix]) => {
                if (title.startsWith(prefix) && !found.has(key)) {
                    found.set(key, { key, prefix })
                }
            })
        }

        const ordered: SegmentInfo[] = []
        for (const key of SEGMENT_INIT_ORDER) {
            const seg = found.get(key)
            if (seg) {
                ordered.push(seg)
            }
        }

        return ordered
    }, [rawTableSections])

    // Инициализация выбранного сегмента (OOS → Recent → Train → Full).
    useEffect(() => {
        if (segment !== null) {
            return
        }
        if (!availableSegments.length) {
            return
        }

        for (const key of SEGMENT_INIT_ORDER) {
            if (availableSegments.some(seg => seg.key === key)) {
                setSegment(key)
                return
            }
        }

        // fallback: первый доступный сегмент
        setSegment(availableSegments[0].key)
    }, [segment, availableSegments])

    // Табличные секции после фильтрации по сегменту и бизнес/тех-режиму.
    const tableSections = useMemo(() => {
        if (!rawTableSections.length) {
            return [] as TableSectionDto[]
        }

        return rawTableSections.filter(section => {
            const title = section.title ?? ''

            // Фильтр по сегменту: оставляем только таблицы с нужным префиксом.
            if (segment) {
                const prefix = SEGMENT_PREFIX[segment]
                if (!title.startsWith(prefix)) {
                    return false
                }
            }

            // Фильтр по режиму: summary vs technical matrix для daily confusion.
            const isDailyBusiness = title.includes('Daily label summary (business)')
            const isDailyTechnical = title.includes('Daily label confusion (3-class, technical)')

            if (mode === 'business' && isDailyTechnical) {
                return false
            }

            if (mode === 'technical' && isDailyBusiness) {
                return false
            }

            return true
        })
    }, [rawTableSections, segment, mode])

    // Таб-лист для SectionPager; заголовки без префикса сегмента.
    const tabs = useMemo(
        () =>
            tableSections.map((section, index) => {
                const rawTitle = section.title || `Секция ${index + 1}`
                const label = stripSegmentPrefix(rawTitle)

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

    // Краткое описание выбранного сегмента с размером выборки.
    const segmentDescription = useMemo(() => {
        if (!segment || !globalMeta) {
            return ''
        }

        let segmentLabel: string
        let recordsCount: number

        switch (segment) {
            case 'OOS':
                segmentLabel = 'OOS (честный)'
                recordsCount = globalMeta.oosRecordsCount
                break
            case 'TRAIN':
                segmentLabel = 'Train'
                recordsCount = globalMeta.trainRecordsCount
                break
            case 'FULL':
                segmentLabel = 'Full history'
                recordsCount = globalMeta.totalRecordsCount
                break
            case 'RECENT':
                segmentLabel = `Recent (${globalMeta.recentDays} d)`
                recordsCount = globalMeta.recentRecordsCount
                break
            default:
                segmentLabel = segment
                recordsCount = 0
        }

        return `${segmentLabel}: записей ${recordsCount}`
    }, [segment, globalMeta])

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
                        Сводный отчёт по качеству и поведению ML-моделей на разных выборках (train / OOS / full /
                        recent).
                    </Text>
                </div>
                <div className={cls.meta}>
                    <Text type='p'>Generated at: {new Date(data.generatedAtUtc).toLocaleString()}</Text>
                    <Text type='p'>Kind: {data.kind}</Text>
                    {globalMeta && (
                        <>
                            <Text type='p'>Run kind: {globalMeta.runKind || 'n/a'}</Text>
                            <Text type='p'>
                                OOS:{' '}
                                {globalMeta.hasOos ?
                                    `есть, записей ${globalMeta.oosRecordsCount}`
                                :   'нет (используется только train)'}
                            </Text>
                            <Text type='p'>
                                Train: {globalMeta.trainRecordsCount}, Recent ({globalMeta.recentDays} d):{' '}
                                {globalMeta.recentRecordsCount}
                            </Text>
                        </>
                    )}
                </div>
            </header>

            {/* Переключатели сегмента и бизнес/тех-режима */}
            <SegmentToggle segments={availableSegments} value={segment} onChange={setSegment} />
            <ModelStatsModeToggle mode={mode} onChange={setMode} />

            {segmentDescription && (
                <Text type='p' className={cls.subtitle}>
                    {segmentDescription}
                </Text>
            )}

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
