import { useEffect, useMemo, useState } from 'react'
import classNames from '@/shared/lib/helpers/classNames'
import { Text } from '@/shared/ui'
import SectionPager from '@/shared/ui/SectionPager/ui/SectionPager'
import { useSectionPager } from '@/shared/ui/SectionPager/model/useSectionPager'
import cls from './ModelStatsPage.module.scss'
import { SEGMENT_PREFIX, SEGMENT_INIT_ORDER } from './modelStatsConstants'
import { ModelStatsModeToggle, SegmentToggle } from './ModelStatsControls'
import { ModelStatsTableCard } from './ModelStatsTableCard'
import type {
    ModelStatsPageInnerProps,
    SegmentKey,
    ViewMode,
    ReportSection,
    TableSection,
    ResolvedSegmentMeta
} from './modelStatsTypes'
import { buildGlobalMeta, collectAvailableSegments, isTableSection, resolveSegmentMeta, stripSegmentPrefix } from './modelStatsUtils'

export function ModelStatsPageInner({ className, data }: ModelStatsPageInnerProps) {
    const [mode, setMode] = useState<ViewMode>('business')
    const [segment, setSegment] = useState<SegmentKey | null>(null)

    const rootClassName = classNames(cls.ModelStatsPage, {}, [className ?? ''])

    const allSections = useMemo(() => (data.sections as ReportSection[] | undefined) ?? [], [data.sections])


    const globalMeta = useMemo(() => buildGlobalMeta(allSections), [allSections])

    const rawTableSections = useMemo(() => allSections.filter(isTableSection), [allSections])


    const availableSegments = useMemo(() => collectAvailableSegments(rawTableSections), [rawTableSections])


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
            return [] as TableSection[]
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

    const currentSegmentMeta: ResolvedSegmentMeta | null = useMemo(
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
        </div>
    )
}
