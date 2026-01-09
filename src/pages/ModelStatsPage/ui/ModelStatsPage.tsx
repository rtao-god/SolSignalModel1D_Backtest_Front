import { useEffect, useMemo, useState } from 'react'
import classNames from '@/shared/lib/helpers/classNames'
import { Btn, Text } from '@/shared/ui'
import type { KeyValueSectionDto, ReportSectionDto, TableSectionDto } from '@/shared/types/report.types'
import SectionPager from '@/shared/ui/SectionPager/ui/SectionPager'
import { useSectionPager } from '@/shared/ui/SectionPager/model/useSectionPager'
import cls from './ModelStatsPage.module.scss'
import { useModelStatsReportQuery } from '@/shared/api/tanstackQueries/modelStats'
import PageDataBoundary from '@/shared/ui/errors/PageDataBoundary/ui/PageDataBoundary'
import ErrorPlayground from '@/shared/ui/errors/ErrorPlayground/ui/ErrorPlayground'

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

const SEGMENT_INIT_ORDER: SegmentKey[] = ['OOS', 'RECENT', 'TRAIN', 'FULL']

function stripSegmentPrefix(title: string | undefined | null): string {
    if (!title) return ''
    const match = title.match(/^\[(FULL|TRAIN|OOS|RECENT)\]\s*/i)
    if (!match) return title
    return title.slice(match[0].length)
}

function isKeyValueSection(section: ReportSectionDto): section is KeyValueSectionDto {
    return Array.isArray((section as KeyValueSectionDto).items)
}

function isTableSection(section: ReportSectionDto): section is TableSectionDto {
    return Array.isArray((section as TableSectionDto).columns)
}

interface ResolvedSegmentMeta {
    label: string
    description: string
}

function resolveSegmentMeta(segment: SegmentKey, meta: GlobalMeta | null): ResolvedSegmentMeta | null {
    if (!meta) {
        return null
    }

    switch (segment) {
        case 'OOS': {
            const label = 'OOS (честная проверка)'
            const description = `${label}: записей ${meta.oosRecordsCount}. Используется для оценки качества на данных, которых модель не видела при обучении.`
            return { label, description }
        }
        case 'TRAIN': {
            const label = 'Train (обучение)'
            const description = `${label}: записей ${meta.trainRecordsCount}. Показывает, как модель ведёт себя на обучающей выборке.`
            return { label, description }
        }
        case 'FULL': {
            const label = 'Full history'
            const description = `${label}: записей ${meta.totalRecordsCount}. Вся доступная история данных.`
            return { label, description }
        }
        case 'RECENT': {
            const label = `Recent (${meta.recentDays} d)`
            const description = `${label}: записей ${meta.recentRecordsCount}. Свежий отрезок данных за последние дни.`
            return { label, description }
        }
        default:
            return null
    }
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
                size='sm'
                className={classNames(cls.modeButton, { [cls.modeButtonActive]: mode === 'business' }, [])}
                onClick={handleBusinessClick}>
                Бизнес
            </Btn>
            <Btn
                size='sm'
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
                    size='sm'
                    className={classNames(cls.modeButton, { [cls.modeButtonActive]: value === seg.key }, [])}
                    onClick={handleClick(seg.key)}>
                    {renderLabel(seg.key)}
                </Btn>
            ))}
        </div>
    )
}

function ModelStatsTableCard({ section, domId }: ModelStatsTableCardProps) {
    if (!section.columns || section.columns.length === 0) {
        return null
    }

    const visibleTitle = stripSegmentPrefix(section.title)
    const headingId = `${domId}-title`

    return (
        <section id={domId} aria-labelledby={headingId} className={cls.tableCard}>
            <header className={cls.cardHeader}>
                <Text type='h3' className={cls.cardTitle} id={headingId}>
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

// Тип отчёта берём из хука, чтобы не дублировать DTO.
type ModelStatsReport = NonNullable<ReturnType<typeof useModelStatsReportQuery>['data']>

interface ModelStatsPageInnerProps {
    className?: string
    data: ModelStatsReport
}

/**
 * Внутренняя часть страницы: сюда попадает только валидный data.
 * Здесь нет проверки isError / !data — это всё решает PageDataBoundary.
 */
function ModelStatsPageInner({ className, data }: ModelStatsPageInnerProps) {
    const [mode, setMode] = useState<ViewMode>('business')
    const [segment, setSegment] = useState<SegmentKey | null>(null)

    const rootClassName = classNames(cls.ModelStatsPage, {}, [className ?? ''])

    const allSections = useMemo(() => (data.sections as ReportSectionDto[] | undefined) ?? [], [data.sections])

    const globalMeta = useMemo<GlobalMeta | null>(() => {
        if (!allSections.length) {
            return null
        }

        const metaSection = allSections.filter(isKeyValueSection).find(section => {
            const title = section.title ?? ''
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

    const rawTableSections = useMemo(() => allSections.filter(isTableSection), [allSections])

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

        setSegment(availableSegments[0].key)
    }, [segment, availableSegments])

    const tableSections = useMemo(() => {
        if (!rawTableSections.length) {
            return [] as TableSectionDto[]
        }

        return rawTableSections.filter(section => {
            const title = section.title ?? ''

            if (segment) {
                const prefix = SEGMENT_PREFIX[segment]
                if (!title.startsWith(prefix)) {
                    return false
                }
            }

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
    })

    const currentSegmentMeta = useMemo(
        () => (segment ? resolveSegmentMeta(segment, globalMeta) : null),
        [segment, globalMeta]
    )

    const segmentDescription = currentSegmentMeta?.description ?? ''

    return (
        <div className={rootClassName}>
            <header className={cls.headerRow}>
                <div className={cls.headerMain}>
                    <Text type='h2'>{data.title || 'Статистика моделей'}</Text>
                    <Text className={cls.subtitle}>
                        Сводный отчёт по качеству и поведению ML-моделей на разных выборках (train / OOS / full /
                        recent). Сначала выберите сегмент данных и режим отчёта, ниже — детальные карточки с метриками.
                    </Text>

                    <div className={cls.badgesRow}>
                        {currentSegmentMeta && <span className={cls.badge}>Сегмент: {currentSegmentMeta.label}</span>}
                        <span className={cls.badge}>
                            Режим:{' '}
                            {mode === 'business' ?
                                'Бизнес-представление (агрегированные показатели)'
                            :   'Технический (подробные матрицы ошибок)'}
                        </span>
                        {globalMeta?.runKind && <span className={cls.badge}>Тип запуска: {globalMeta.runKind}</span>}
                    </div>
                </div>

                <div className={cls.meta}>
                    <Text className={cls.metaTitle}>Параметры прогона</Text>
                    <Text className={cls.metaLine}>Сформирован: {new Date(data.generatedAtUtc).toLocaleString()}</Text>
                    <Text className={cls.metaLine}>Тип отчёта: {data.kind}</Text>
                    {globalMeta && (
                        <>
                            <Text className={cls.metaLine}>Run kind: {globalMeta.runKind || 'n/a'}</Text>
                            <Text className={classNames(cls.metaLine, {}, [cls.metaLineStrong])}>
                                OOS:{' '}
                                {globalMeta.hasOos ?
                                    `есть, записей ${globalMeta.oosRecordsCount}`
                                :   'нет (используется только train)'}
                            </Text>
                            <Text className={cls.metaLine}>
                                Train: {globalMeta.trainRecordsCount}, Recent ({globalMeta.recentDays} d):{' '}
                                {globalMeta.recentRecordsCount}
                            </Text>
                        </>
                    )}
                </div>
            </header>

            <section className={cls.controlBar}>
                <div className={cls.controlBarMain}>
                    <SegmentToggle segments={availableSegments} value={segment} onChange={setSegment} />
                    <ModelStatsModeToggle mode={mode} onChange={setMode} />
                </div>
                <div className={cls.controlBarInfo}>
                    <Text className={cls.controlTitle}>Как читать этот отчёт</Text>
                    <Text className={cls.controlText}>
                        Сегменты (OOS / Train / Full / Recent) задают, на каких данных считаются метрики. Режим
                        &quot;Бизнес&quot; показывает агрегированные показатели, &quot;Технарь&quot; — детальные матрицы
                        ошибок и распределения для анализа модели.
                    </Text>
                </div>
            </section>

            {segmentDescription && <Text className={cls.segmentSubtitle}>{segmentDescription}</Text>}

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

            {/* <ErrorPlayground /> */}
        </div>
    )
}

/**
 * Внешняя страница: только загрузка/ошибки + boundary.
 * Здесь нет ранних return по ошибке, всё делегировано PageDataBoundary.
 */
export default function ModelStatsPage({ className }: ModelStatsPageProps) {
    const { data, isError, error, refetch } = useModelStatsReportQuery()

    return (
        <PageDataBoundary
            isError={isError}
            error={error}
            hasData={Boolean(data)}
            onRetry={refetch}
            errorTitle='Не удалось загрузить статистику моделей'>
            {data && <ModelStatsPageInner className={className} data={data} />}
        </PageDataBoundary>
    )
}
