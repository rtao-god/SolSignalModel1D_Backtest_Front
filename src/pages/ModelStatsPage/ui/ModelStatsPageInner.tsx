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
import cls from './ModelStatsPage.module.scss'
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
import { buildGlobalMeta, isTableSection, resolveSegmentMeta, stripSegmentPrefix } from './modelStatsUtils'
import { resolveReportSourceEndpointOrThrow } from '@/shared/utils/reportSourceEndpoint'
import { buildReportTermsFromSectionsOrThrow, type ReportTermItem } from '@/shared/utils/reportTerms'

const DEFAULT_MODEL_STATS_SEGMENT: SegmentKey = 'OOS'
const DEFAULT_MODEL_STATS_VIEW: ViewMode = 'business'

function resolveModelStatsSegmentFromQueryOrThrow(raw: string | null): SegmentKey {
    if (!raw) return DEFAULT_MODEL_STATS_SEGMENT

    const normalized = raw.trim().toLowerCase()
    if (normalized === 'oos' || normalized === 'out_of_sample' || normalized === 'out-of-sample') return 'OOS'
    if (normalized === 'recent') return 'RECENT'
    if (normalized === 'train') return 'TRAIN'
    if (normalized === 'full' || normalized === 'full_history' || normalized === 'full-history') return 'FULL'

    throw new Error(`[model-stats] invalid segment query: ${raw}.`)
}

function resolveModelStatsViewFromQueryOrThrow(raw: string | null): ViewMode {
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

export function ModelStatsPageInner({ className, data }: ModelStatsPageInnerProps) {
    const { t } = useTranslation('reports')
    const [searchParams, setSearchParams] = useSearchParams()

    const rootClassName = classNames(cls.ModelStatsPage, {}, [className ?? ''])
    const allSections = useMemo(() => (data.sections as ReportSection[] | undefined) ?? [], [data.sections])
    const globalMeta = useMemo(() => buildGlobalMeta(allSections), [allSections])

    const segmentState = useMemo(() => {
        try {
            return {
                value: resolveModelStatsSegmentFromQueryOrThrow(searchParams.get('segment')),
                error: null as Error | null
            }
        } catch (err) {
            const safeError = err instanceof Error ? err : new Error('Failed to parse model-stats segment query.')
            return {
                value: DEFAULT_MODEL_STATS_SEGMENT,
                error: safeError
            }
        }
    }, [searchParams])

    const viewState = useMemo(() => {
        try {
            return {
                value: resolveModelStatsViewFromQueryOrThrow(searchParams.get('view')),
                error: null as Error | null
            }
        } catch (err) {
            const safeError = err instanceof Error ? err : new Error('Failed to parse model-stats view query.')
            return {
                value: DEFAULT_MODEL_STATS_VIEW,
                error: safeError
            }
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

    const tableSections = useMemo(() => allSections.filter(isTableSection), [allSections]) as TableSection[]

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
        () => resolveSegmentMeta(segmentState.value, globalMeta, t),
        [globalMeta, segmentState.value, t]
    )

    const controlGroups = useMemo(() => {
        return [
            buildModelStatsSegmentControlGroup({
                value: segmentState.value,
                onChange: next => {
                    if (next === segmentState.value) return
                    const nextParams = new URLSearchParams(searchParams)
                    nextParams.set('segment', mapSegmentToApiValue(next))
                    setSearchParams(nextParams, { replace: true })
                }
            }),
            buildModelStatsViewControlGroup({
                value: viewState.value,
                onChange: next => {
                    if (next === viewState.value) return
                    const nextParams = new URLSearchParams(searchParams)
                    nextParams.set('view', next)
                    setSearchParams(nextParams, { replace: true })
                }
            })
        ]
    }, [searchParams, segmentState.value, setSearchParams, viewState.value])

    const segmentDescription = currentSegmentMeta?.description ?? ''

    if (sourceEndpointState.error || !sourceEndpointState.value) {
        return (
            <PageError
                title={t('modelStats.inner.errors.invalidSource.title')}
                message={t('modelStats.inner.errors.invalidSource.message')}
                error={
                    sourceEndpointState.error ??
                    new Error('[model-stats] report source endpoint is missing after validation.')
                }
            />
        )
    }

    if (segmentState.error) {
        return (
            <PageError
                title={t('modelStats.inner.errors.bucketQuery.title')}
                message={t('modelStats.inner.errors.bucketQuery.message')}
                error={segmentState.error}
            />
        )
    }

    if (viewState.error) {
        return (
            <PageError
                title={t('modelStats.inner.errors.metricQuery.title')}
                message={t('modelStats.inner.errors.metricQuery.message')}
                error={viewState.error}
            />
        )
    }

    if (tableTermsState.error) {
        return (
            <PageError
                title={t('modelStats.inner.errors.terms.title')}
                message={t('modelStats.inner.errors.terms.message')}
                error={tableTermsState.error}
            />
        )
    }

    return (
        <div className={rootClassName}>
            <header className={cls.headerRow}>
                <div className={cls.headerMain}>
                    <Text type='h2'>{data.title || t('modelStats.inner.header.titleFallback')}</Text>
                    <Text className={cls.subtitle}>{t('modelStats.inner.header.subtitle')}</Text>

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
                </div>

                <ReportActualStatusCard
                    statusMode='debug'
                    statusTitle={t('modelStats.inner.status.title')}
                    statusMessage={t('modelStats.inner.status.message')}
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
                        :   [])
                    ]}
                />
            </header>

            {segmentDescription && <Text className={cls.segmentSubtitle}>{segmentDescription}</Text>}

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
        </div>
    )
}
