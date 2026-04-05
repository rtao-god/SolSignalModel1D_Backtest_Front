import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import classNames from '@/shared/lib/helpers/classNames'
import {
    ReportActualStatusCard,
    ReportTableTermsBlock,
    ReportViewControls,
    Text,
    buildModelStatsSegmentControlGroup,
    buildModelStatsViewControlGroup
} from '@/shared/ui'
import SectionPager from '@/shared/ui/SectionPager/ui/SectionPager'
import { useSectionPager } from '@/shared/ui/SectionPager/model/useSectionPager'
import {
    buildPublishedReportVariantCompatibleOptions,
    resolvePublishedReportVariantSelection
} from '@/shared/api/tanstackQueries/reportVariants'
import { useCurrentPredictionBackfilledTrainingScopeStatsQuery } from '@/shared/api/tanstackQueries/currentPrediction'
import cls from './ModelStatsPage.module.scss'
import { ModelStatsTableCard } from './ModelStatsTableCard'
import type {
    ModelStatsPageInnerProps,
    SegmentKey,
    ViewMode,
    ReportSection,
    TableSection,
    ResolvedSegmentMeta
} from './modelStatsTypes'
import {
    buildGlobalMeta,
    buildModelStatsHeaderSubtitle,
    filterModelStatsTableSectionsByFamily,
    isTableSection,
    resolveSegmentMeta,
    stripSegmentPrefix
} from './modelStatsUtils'
import { resolveReportSourceEndpoint } from '@/shared/utils/reportSourceEndpoint'
import { buildReportTermsFromSections, type ReportTermItem } from '@/shared/utils/reportTerms'
import { SectionDataState } from '@/shared/ui/errors/SectionDataState'
import { normalizeErrorLike } from '@/shared/lib/errors/normalizeError'

const DEFAULT_MODEL_STATS_SEGMENT: SegmentKey = 'OOS'
const DEFAULT_MODEL_STATS_VIEW: ViewMode = 'business'

function resolveModelStatsSegmentFromQuery(raw: string | null): SegmentKey {
    if (!raw) return DEFAULT_MODEL_STATS_SEGMENT

    const normalized = raw.trim().toLowerCase()
    if (normalized === 'oos') return 'OOS'
    if (normalized === 'recent') return 'RECENT'
    if (normalized === 'train') return 'TRAIN'
    if (normalized === 'full') return 'FULL'

    throw new Error(`[model-stats] invalid segment query: ${raw}.`)
}

function resolveModelStatsViewFromQuery(raw: string | null): ViewMode {
    if (!raw) return DEFAULT_MODEL_STATS_VIEW

    const normalized = raw.trim().toLowerCase()
    if (normalized === 'business') return 'business'
    if (normalized === 'technical') return 'technical'

    throw new Error(`[model-stats] invalid view query: ${raw}.`)
}

function mapSegmentToApiValue(segment: SegmentKey): string {
    switch (segment) {
        case 'OOS':
            return 'oos'
        case 'RECENT':
            return 'recent'
        case 'TRAIN':
            return 'train'
        case 'FULL':
            return 'full'
        default:
            return segment
    }
}

function mapApiSegmentToUiValue(segment: string): SegmentKey {
    switch (segment.trim().toLowerCase()) {
        case 'oos':
            return 'OOS'
        case 'recent':
            return 'RECENT'
        case 'train':
            return 'TRAIN'
        case 'full':
            return 'FULL'
        default:
            throw new Error(`[model-stats] invalid catalog segment value: ${segment}.`)
    }
}

export function ModelStatsPageInner({
    className,
    embedded = false,
    familyFilter = null,
    data,
    variantCatalog,
    isLoading,
    error,
    onRetry
}: ModelStatsPageInnerProps) {
    const { t, i18n } = useTranslation('reports')
    const [searchParams, setSearchParams] = useSearchParams()
    const trainingScopeStatsQuery = useCurrentPredictionBackfilledTrainingScopeStatsQuery()

    const rootClassName = classNames(cls.ModelStatsPage, { [cls.embedded]: embedded }, [className ?? ''])
    const allSections = useMemo(() => (data?.sections as ReportSection[] | undefined) ?? [], [data?.sections])
    const globalMetaState = useMemo(() => {
        try {
            return {
                value: buildGlobalMeta(allSections),
                error: null as Error | null
            }
        } catch (err) {
            const safeError = normalizeErrorLike(err, 'Failed to parse model-stats global metadata.', {
                source: 'model-stats-global-meta',
                domain: 'ui_section',
                owner: 'model-stats-page',
                expected: 'Model stats page should parse global metadata from published report sections.',
                requiredAction: 'Inspect model-stats report sections and global metadata builder.'
            })
            return {
                value: null,
                error: safeError
            }
        }
    }, [allSections])
    const globalMeta = globalMetaState.value

    const rawSegmentState = useMemo(() => {
        try {
            return {
                value: resolveModelStatsSegmentFromQuery(searchParams.get('segment')),
                error: null as Error | null
            }
        } catch (err) {
            const safeError = normalizeErrorLike(err, 'Failed to parse model-stats segment query.', {
                source: 'model-stats-segment-query',
                domain: 'ui_section',
                owner: 'model-stats-page',
                expected: 'Model stats page should parse a valid segment query value.',
                requiredAction: 'Inspect the segment URL param and supported segment values.'
            })
            return {
                value: DEFAULT_MODEL_STATS_SEGMENT,
                error: safeError
            }
        }
    }, [searchParams])

    const rawViewState = useMemo(() => {
        try {
            return {
                value: resolveModelStatsViewFromQuery(searchParams.get('view')),
                error: null as Error | null
            }
        } catch (err) {
            const safeError = normalizeErrorLike(err, 'Failed to parse model-stats view query.', {
                source: 'model-stats-view-query',
                domain: 'ui_section',
                owner: 'model-stats-page',
                expected: 'Model stats page should parse a valid view query value.',
                requiredAction: 'Inspect the view URL param and supported view values.'
            })
            return {
                value: DEFAULT_MODEL_STATS_VIEW,
                error: safeError
            }
        }
    }, [searchParams])

    const variantSelectionState = useMemo(() => {
        if (!variantCatalog || rawSegmentState.error || rawViewState.error) {
            return {
                segment: rawSegmentState.value,
                view: rawViewState.value,
                error: rawSegmentState.error ?? rawViewState.error
            }
        }

        try {
            const resolution = resolvePublishedReportVariantSelection(variantCatalog, {
                segment: searchParams.get('segment'),
                view: searchParams.get('view')
            })

            return {
                segment: mapApiSegmentToUiValue(resolution.selection.segment),
                view: resolveModelStatsViewFromQuery(resolution.selection.view),
                error: null as Error | null
            }
        } catch (err) {
            const safeError = normalizeErrorLike(err, 'Failed to resolve model-stats variant.', {
                source: 'model-stats-variant-selection',
                domain: 'ui_section',
                owner: 'model-stats-page',
                expected: 'Model stats page should resolve a catalog-compatible variant from URL params.',
                requiredAction: 'Inspect published model-stats catalog and URL selection.'
            })
            return {
                segment: rawSegmentState.value,
                view: rawViewState.value,
                error: safeError
            }
        }
    }, [rawSegmentState.error, rawSegmentState.value, rawViewState.error, rawViewState.value, searchParams, variantCatalog])

    const segmentState = useMemo(
        () => ({
            value: variantSelectionState.segment,
            error: rawSegmentState.error ?? variantSelectionState.error
        }),
        [rawSegmentState.error, variantSelectionState.error, variantSelectionState.segment]
    )
    const viewState = useMemo(
        () => ({
            value: variantSelectionState.view,
            error: rawViewState.error ?? variantSelectionState.error
        }),
        [rawViewState.error, variantSelectionState.error, variantSelectionState.view]
    )

    const sourceEndpointState = useMemo(() => {
        try {
            return {
                value: resolveReportSourceEndpoint(),
                error: null as Error | null
            }
        } catch (err) {
            const safeError = normalizeErrorLike(err, 'Failed to resolve report source endpoint.', {
                source: 'model-stats-source-endpoint',
                domain: 'ui_section',
                owner: 'model-stats-page',
                expected: 'Model stats page should resolve a non-empty report source endpoint.',
                requiredAction: 'Inspect API base URL configuration and report source endpoint resolver.'
            })
            return {
                value: null as string | null,
                error: safeError
            }
        }
    }, [])

    const filteredTableSectionsState = useMemo(() => {
        try {
            return {
                value: filterModelStatsTableSectionsByFamily(
                    allSections.filter(isTableSection) as TableSection[],
                    familyFilter
                ),
                error: null as Error | null
            }
        } catch (err) {
            const safeError = normalizeErrorLike(err, 'Failed to filter model-stats sections by family.', {
                source: 'model-stats-family-filter',
                domain: 'ui_section',
                owner: 'model-stats-page',
                expected: 'Model stats page should resolve visible table sections for the requested model family.',
                requiredAction: 'Inspect the published model-stats report and family filter contract.',
                extra: { familyFilter }
            })
            return {
                value: [] as TableSection[],
                error: safeError
            }
        }
    }, [allSections, familyFilter])
    const tableSections = filteredTableSectionsState.value
    const keyValueSectionCount = useMemo(
        () =>
            allSections.filter(section => Array.isArray((section as { items?: unknown[] }).items)).length,
        [allSections]
    )

    const tableTermsState = useMemo(() => {
        try {
            return {
                terms: buildReportTermsFromSections({
                    sections: tableSections,
                    reportKind: 'backtest_model_stats',
                    contextTag: 'model-stats',
                    resolveSectionTitle: section => stripSegmentPrefix(section.title),
                    locale: i18n.resolvedLanguage ?? i18n.language
                }),
                error: null as Error | null
            }
        } catch (err) {
            const safeError = normalizeErrorLike(err, 'Failed to build model stats terms.', {
                source: 'model-stats-terms',
                domain: 'ui_section',
                owner: 'model-stats-page',
                expected: 'Model stats page should build terms from table sections and shared glossary.',
                requiredAction: 'Inspect model-stats table sections and term resolver.'
            })
            return {
                terms: [] as ReportTermItem[],
                error: safeError
            }
        }
    }, [i18n.language, i18n.resolvedLanguage, tableSections])

    const tabs = useMemo(
        () =>
            tableSections.map((section, index) => {
                const rawTitle = section.title || t('modelStats.inner.tabs.sectionFallback', { index: index + 1 })
                const label = stripSegmentPrefix(rawTitle)

                return {
                    id: `model-${index + 1}`,
                    label,
                    anchor: `ml-model-${index + 1}`
                }
            }),
        [tableSections, t]
    )

    const { currentIndex, canPrev, canNext, handlePrev, handleNext } = useSectionPager({
        sections: tabs,
        syncHash: true
    })

    const currentSegmentMeta: ResolvedSegmentMeta | null = useMemo(
        () =>
            resolveSegmentMeta(
                segmentState.value,
                globalMeta,
                t,
                i18n.resolvedLanguage ?? i18n.language,
                trainingScopeStatsQuery.data ?? null
            ),
        [globalMeta, i18n.language, i18n.resolvedLanguage, segmentState.value, t, trainingScopeStatsQuery.data]
    )

    const controlGroups = useMemo(() => {
        const compatibleSegments =
            variantCatalog ?
                buildPublishedReportVariantCompatibleOptions(
                    variantCatalog,
                    {
                        segment: mapSegmentToApiValue(segmentState.value),
                        view: viewState.value
                    },
                    'segment'
                ).map(option => mapApiSegmentToUiValue(option.value))
            :   null
        const compatibleViews =
            variantCatalog ?
                buildPublishedReportVariantCompatibleOptions(
                    variantCatalog,
                    {
                        segment: mapSegmentToApiValue(segmentState.value),
                        view: viewState.value
                    },
                    'view'
                ).map(option => option.value)
            :   null

        const segmentGroup = buildModelStatsSegmentControlGroup({
            value: segmentState.value,
            splitStats: trainingScopeStatsQuery.data ?? null,
            onChange: next => {
                if (next === segmentState.value) return
                const nextParams = new URLSearchParams(searchParams)
                nextParams.set('segment', mapSegmentToApiValue(next))
                setSearchParams(nextParams, { replace: true })
            }
        })
        segmentGroup.options =
            compatibleSegments ? segmentGroup.options.filter(option => compatibleSegments.includes(option.value)) : segmentGroup.options

        const viewGroup = buildModelStatsViewControlGroup({
            value: viewState.value,
            onChange: next => {
                if (next === viewState.value) return
                const nextParams = new URLSearchParams(searchParams)
                nextParams.set('view', next)
                setSearchParams(nextParams, { replace: true })
            }
        })
        viewGroup.options =
            compatibleViews ? viewGroup.options.filter(option => compatibleViews.includes(option.value)) : viewGroup.options

        return [
            segmentGroup,
            viewGroup
        ]
    }, [searchParams, segmentState.value, setSearchParams, trainingScopeStatsQuery.data, variantCatalog, viewState.value])

    const segmentDescription = currentSegmentMeta?.description ?? ''
    const subtitle = buildModelStatsHeaderSubtitle(
        i18n.resolvedLanguage ?? i18n.language,
        trainingScopeStatsQuery.data ?? null
    )

    const controlsError = segmentState.error ?? viewState.error ?? null
    const reportStateError = error ?? sourceEndpointState.error ?? globalMetaState.error ?? filteredTableSectionsState.error ?? null
    const hasReadyReport = Boolean(data && sourceEndpointState.value)

    return (
        <div className={rootClassName}>
            <header className={cls.headerRow}>
                <div className={cls.headerMain}>
                    <Text type='h2'>{data?.title || t('modelStats.inner.header.titleFallback')}</Text>
                    <Text className={cls.subtitle}>{subtitle}</Text>

                    <div className={cls.badgesRow}>
                        {currentSegmentMeta && (
                            <span className={cls.badge}>
                                {t('modelStats.inner.badges.segment', { value: currentSegmentMeta.label })}
                            </span>
                        )}

                        <span className={cls.badge}>
                            {t('modelStats.inner.badges.modeLabel')}{' '}
                            {viewState.value === 'business' ?
                                t('modelStats.inner.badges.modeBusiness')
                            :   t('modelStats.inner.badges.modeTechnical')}
                        </span>

                        {globalMeta?.runKind && (
                            <span className={cls.badge}>
                                {t('modelStats.inner.badges.runKind', { value: globalMeta.runKind })}
                            </span>
                        )}
                    </div>

                    <ReportViewControls groups={controlGroups} />
                    {controlsError && (
                        <SectionDataState
                            isError
                            error={controlsError}
                            hasData={false}
                            title={
                                segmentState.error ?
                                    t('modelStats.inner.errors.bucketQuery.title')
                                :   t('modelStats.inner.errors.metricQuery.title')
                            }
                            description={
                                segmentState.error ?
                                    t('modelStats.inner.errors.bucketQuery.message')
                                :   t('modelStats.inner.errors.metricQuery.message')
                            }
                            logContext={{ source: 'model-stats-controls' }}>
                            {null}
                        </SectionDataState>
                    )}
                </div>

                {data && sourceEndpointState.value && (
                    <ReportActualStatusCard
                        statusMode='actual'
                        statusTitle={t('modelStats.inner.status.publishedTitle')}
                        dataSource={sourceEndpointState.value}
                        reportTitle={data.title}
                        reportId={data.id}
                        reportKind={data.kind}
                        generatedAtUtc={data.generatedAtUtc}
                        statusLines={[
                            ...(globalMeta?.runKind ?
                                [{ label: t('modelStats.inner.statusLines.runKind'), value: globalMeta.runKind }]
                            :   []),
                            ...(globalMeta ?
                                [
                                    {
                                        label: t('modelStats.inner.statusLines.oos'),
                                        value:
                                            globalMeta.hasOos ?
                                                t('modelStats.inner.status.oosPresent', {
                                                    value: globalMeta.oosRecordsCount
                                                })
                                            :   t('modelStats.inner.status.oosMissing')
                                    }
                                ]
                            :   []),
                            ...(globalMeta ?
                                [
                                    {
                                        label: t('modelStats.inner.statusLines.trainRecent'),
                                        value: `${globalMeta.trainRecordsCount} / ${globalMeta.recentRecordsCount} (${globalMeta.recentDays} d)`
                                    }
                                ]
                            :   []),
                            {
                                label: t('modelStats.inner.statusLines.keyValueSections'),
                                value: String(keyValueSectionCount)
                            },
                            {
                                label: t('modelStats.inner.statusLines.tableSections'),
                                value: String(tableSections.length)
                            }
                        ]}
                    />
                )}
            </header>

            {segmentDescription && <Text className={cls.segmentSubtitle}>{segmentDescription}</Text>}

            <SectionDataState
                isLoading={isLoading}
                isError={Boolean(reportStateError)}
                error={reportStateError}
                hasData={hasReadyReport}
                onRetry={onRetry}
                title={
                    sourceEndpointState.error ?
                        t('modelStats.inner.errors.invalidSource.title')
                    :   t('modelStats.page.errorTitle')
                }
                description={sourceEndpointState.error ? t('modelStats.inner.errors.invalidSource.message') : undefined}
                loadingText={t('errors:ui.pageDataBoundary.loading', { defaultValue: 'Loading data' })}
                logContext={{ source: 'model-stats-report' }}>
                <SectionDataState
                    isError={Boolean(tableTermsState.error)}
                    error={tableTermsState.error}
                    hasData={!tableTermsState.error}
                    title={t('modelStats.inner.errors.terms.title')}
                    description={t('modelStats.inner.errors.terms.message')}
                    onRetry={onRetry}
                    logContext={{ source: 'model-stats-terms' }}>
                    {tableTermsState.terms.length > 0 && (
                        <ReportTableTermsBlock
                            terms={tableTermsState.terms}
                            title={t('modelStats.inner.terms.title')}
                            subtitle={t('modelStats.inner.terms.subtitle')}
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
                </SectionDataState>
            </SectionDataState>
        </div>
    )
}
