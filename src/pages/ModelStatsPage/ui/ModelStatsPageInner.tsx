import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import classNames from '@/shared/lib/helpers/classNames'
import { ReportActualStatusCard, ReportTableTermsBlock, ReportViewControls, Text } from '@/shared/ui'
import SectionPager from '@/shared/ui/SectionPager/ui/SectionPager'
import { useSectionPager } from '@/shared/ui/SectionPager/model/useSectionPager'
import cls from './ModelStatsPage.module.scss'
import { SEGMENT_PREFIX, SEGMENT_INIT_ORDER } from './modelStatsConstants'
import { ModelStatsModeToggle, SegmentToggle } from './ModelStatsControls'
import { ModelStatsTableCard } from './ModelStatsTableCard'
import PageError from '@/shared/ui/errors/PageError/ui/PageError'
import type {
    ModelStatsPageInnerProps,
    SegmentKey,
    ViewMode,
    ReportSection,
    TableSection,
    ResolvedSegmentMeta
} from './modelStatsTypes'
import { buildGlobalMeta, collectAvailableSegments, isTableSection, resolveSegmentMeta, stripSegmentPrefix } from './modelStatsUtils'
import {
    filterPolicyBranchMegaSectionsByBucketOrThrow,
    filterPolicyBranchMegaSectionsByMetricOrThrow,
    filterPolicyBranchMegaSectionsByTpSlModeOrThrow,
    resolvePolicyBranchMegaBucketFromQuery,
    resolvePolicyBranchMegaMetricFromQuery,
    resolvePolicyBranchMegaTpSlModeFromQuery
} from '@/shared/utils/policyBranchMegaTabs'
import {
    DEFAULT_REPORT_BUCKET_MODE,
    DEFAULT_REPORT_METRIC_MODE,
    DEFAULT_REPORT_TP_SL_MODE,
    resolveReportViewCapabilities,
    validateReportViewSelectionOrThrow
} from '@/shared/utils/reportViewCapabilities'
import { resolveReportSourceEndpointOrThrow } from '@/shared/utils/reportSourceEndpoint'
import { buildReportTermsFromSectionsOrThrow, type ReportTermItem } from '@/shared/utils/reportTerms'

export function ModelStatsPageInner({ className, data }: ModelStatsPageInnerProps) {
    const [mode, setMode] = useState<ViewMode>('business')
    const [segment, setSegment] = useState<SegmentKey | null>(null)
    const [searchParams, setSearchParams] = useSearchParams()

    const rootClassName = classNames(cls.ModelStatsPage, {}, [className ?? ''])

    const allSections = useMemo(() => (data.sections as ReportSection[] | undefined) ?? [], [data.sections])


    const globalMeta = useMemo(() => buildGlobalMeta(allSections), [allSections])

    const rawTableSections = useMemo(() => allSections.filter(isTableSection), [allSections])
    const viewCapabilities = useMemo(() => resolveReportViewCapabilities(rawTableSections), [rawTableSections])

    const bucketState = useMemo(() => {
        try {
            const bucket = resolvePolicyBranchMegaBucketFromQuery(searchParams.get('bucket'), DEFAULT_REPORT_BUCKET_MODE)
            return { value: bucket, error: null as Error | null }
        } catch (err) {
            const safeError = err instanceof Error ? err : new Error('Failed to parse model-stats bucket query.')
            return { value: DEFAULT_REPORT_BUCKET_MODE, error: safeError }
        }
    }, [searchParams])

    const metricState = useMemo(() => {
        try {
            const metric = resolvePolicyBranchMegaMetricFromQuery(searchParams.get('metric'), DEFAULT_REPORT_METRIC_MODE)
            return { value: metric, error: null as Error | null }
        } catch (err) {
            const safeError = err instanceof Error ? err : new Error('Failed to parse model-stats metric query.')
            return { value: DEFAULT_REPORT_METRIC_MODE, error: safeError }
        }
    }, [searchParams])

    const tpSlState = useMemo(() => {
        try {
            const mode = resolvePolicyBranchMegaTpSlModeFromQuery(searchParams.get('tpsl'), DEFAULT_REPORT_TP_SL_MODE)
            return { value: mode, error: null as Error | null }
        } catch (err) {
            const safeError = err instanceof Error ? err : new Error('Failed to parse model-stats tpsl query.')
            return { value: DEFAULT_REPORT_TP_SL_MODE, error: safeError }
        }
    }, [searchParams])

    const sourceEndpointState = useMemo(() => {
        try {
            return {
                value: resolveReportSourceEndpointOrThrow(),
                error: null as Error | null
            }
        } catch (err) {
            const safeError = err instanceof Error ? err : new Error('Failed to resolve report source endpoint.')
            return {
                value: null as string | null,
                error: safeError
            }
        }
    }, [])


    const viewSelectionState = useMemo(() => {
        try {
            validateReportViewSelectionOrThrow(
                {
                    bucket: bucketState.value,
                    metric: metricState.value,
                    tpSl: tpSlState.value
                },
                viewCapabilities,
                'model-stats'
            )

            return { error: null as Error | null }
        } catch (err) {
            const safeError = err instanceof Error ? err : new Error('Failed to validate model-stats view state.')
            return { error: safeError }
        }
    }, [bucketState.value, metricState.value, tpSlState.value, viewCapabilities])

    const filteredRawTableSectionsState = useMemo(() => {
        if (viewSelectionState.error) {
            return { sections: [] as TableSection[], error: viewSelectionState.error }
        }

        try {
            let nextSections = rawTableSections

            if (viewCapabilities.supportsBucketFiltering) {
                nextSections = filterPolicyBranchMegaSectionsByBucketOrThrow(nextSections, bucketState.value)
            }

            if (viewCapabilities.supportsMetricFiltering) {
                nextSections = filterPolicyBranchMegaSectionsByMetricOrThrow(nextSections, metricState.value)
            }

            if (viewCapabilities.supportsTpSlFiltering) {
                nextSections = filterPolicyBranchMegaSectionsByTpSlModeOrThrow(nextSections, tpSlState.value)
            }

            return { sections: nextSections, error: null as Error | null }
        } catch (err) {
            const safeError =
                err instanceof Error ? err : new Error('Failed to filter model-stats sections by bucket/metric.')
            return { sections: [] as TableSection[], error: safeError }
        }
    }, [bucketState.value, metricState.value, rawTableSections, tpSlState.value, viewCapabilities, viewSelectionState.error])

    const availableSegments = useMemo(
        () => collectAvailableSegments(filteredRawTableSectionsState.sections),
        [filteredRawTableSectionsState.sections]
    )


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
        if (!filteredRawTableSectionsState.sections.length) {
            return [] as TableSection[]
        }

        return filteredRawTableSectionsState.sections.filter(section => {
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
    }, [filteredRawTableSectionsState.sections, segment, mode])

    const tableTermsState = useMemo(() => {
        try {
            return {
                terms: buildReportTermsFromSectionsOrThrow({
                    sections: tableSections,
                    reportKind: 'backtest_model_stats',
                    contextTag: 'model-stats',
                    resolveSectionTitle: section => stripSegmentPrefix(section.title)
                }),
                error: null as Error | null
            }
        } catch (err) {
            const safeError = err instanceof Error ? err : new Error('Failed to build model stats terms.')
            return {
                terms: [] as ReportTermItem[],
                error: safeError
            }
        }
    }, [tableSections])


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

    const handleBucketChange = (next: typeof bucketState.value) => {
        if (next === bucketState.value) return
        const nextParams = new URLSearchParams(searchParams)
        nextParams.set('bucket', next)
        setSearchParams(nextParams, { replace: true })
    }

    const handleMetricChange = (next: typeof metricState.value) => {
        if (next === metricState.value) return
        const nextParams = new URLSearchParams(searchParams)
        nextParams.set('metric', next)
        setSearchParams(nextParams, { replace: true })
    }

    const handleTpSlModeChange = (next: typeof tpSlState.value) => {
        if (next === tpSlState.value) return
        const nextParams = new URLSearchParams(searchParams)
        nextParams.set('tpsl', next)
        setSearchParams(nextParams, { replace: true })
    }

    if (sourceEndpointState.error || !sourceEndpointState.value) {
        return (
            <PageError
                title='Model stats report source is invalid'
                message='API source endpoint is missing or invalid. Проверь VITE_API_BASE_URL / VITE_DEV_API_PROXY_TARGET.'
                error={
                    sourceEndpointState.error ??
                    new Error('[model-stats] report source endpoint is missing after validation.')
                }
            />
        )
    }

    if (bucketState.error) {
        return (
            <PageError
                title='Model stats bucket query is invalid'
                message='Query parameter \"bucket\" is invalid. Expected daily, intraday, delayed, or total.'
                error={bucketState.error}
            />
        )
    }

    if (metricState.error) {
        return (
            <PageError
                title='Model stats metric query is invalid'
                message='Query parameter \"metric\" is invalid. Expected real or no-biggest-liq-loss.'
                error={metricState.error}
            />
        )
    }

    if (tpSlState.error) {
        return (
            <PageError
                title='Model stats TP/SL query is invalid'
                message='Query parameter \"tpsl\" is invalid. Expected all, dynamic, or static.'
                error={tpSlState.error}
            />
        )
    }

    if (filteredRawTableSectionsState.error) {
        return (
            <PageError
                title='Model stats sections are missing'
                message='Report sections for the selected bucket/metric were not found or are tagged inconsistently.'
                error={filteredRawTableSectionsState.error}
            />
        )
    }

    if (tableTermsState.error) {
        return (
            <PageError
                title='Model stats terms are invalid'
                message='Не удалось построить термины для таблиц model stats. Проверь колонки и словарь подсказок.'
                error={tableTermsState.error}
            />
        )
    }

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

                    <ReportViewControls
                        bucket={bucketState.value}
                        metric={metricState.value}
                        tpSlMode={tpSlState.value}
                        capabilities={viewCapabilities}
                        onBucketChange={handleBucketChange}
                        onMetricChange={handleMetricChange}
                        onTpSlModeChange={handleTpSlModeChange}
                    />
                </div>

                <ReportActualStatusCard
                    statusMode='debug'
                    statusTitle='DEBUG: freshness not verified'
                    statusMessage='Status endpoint для backtest_model_stats не настроен: показываются metadata отчёта без freshness-проверки.'
                    dataSource={sourceEndpointState.value}
                    reportTitle={data.title}
                    reportId={data.id}
                    reportKind={data.kind}
                    generatedAtUtc={data.generatedAtUtc}
                    statusLines={[
                        ...(globalMeta?.runKind ? [{ label: 'Run kind', value: globalMeta.runKind }] : []),
                        ...(globalMeta
                            ? [
                                  {
                                      label: 'OOS',
                                      value: globalMeta.hasOos
                                          ? `есть, записей ${globalMeta.oosRecordsCount}`
                                          : 'нет (используется только train)'
                                  }
                              ]
                            : []),
                        ...(globalMeta
                            ? [
                                  {
                                      label: 'Train / Recent',
                                      value: `${globalMeta.trainRecordsCount} / ${globalMeta.recentRecordsCount} (${globalMeta.recentDays} d)`
                                  }
                              ]
                            : [])
                    ]}
                />
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

            {tableTermsState.terms.length > 0 && (
                <ReportTableTermsBlock
                    terms={tableTermsState.terms}
                    title='Термины model stats'
                    subtitle='Подробные определения всех колонок, которые используются в текущем наборе таблиц.'
                    className={cls.tablesTerms}
                />
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
