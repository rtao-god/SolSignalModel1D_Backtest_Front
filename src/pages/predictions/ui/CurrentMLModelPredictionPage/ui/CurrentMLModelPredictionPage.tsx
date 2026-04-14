import { useCallback, useMemo, useState } from 'react'
import classNames from '@/shared/lib/helpers/classNames'
import cls from './CurrentMLModelPredictionPage.module.scss'
import CurrentMLModelPredictionProps from './types'
import { ReportDocumentView } from '@/shared/ui/ReportDocumentView/ui/ReportDocumentView'
import { ErrorBlock } from '@/shared/ui/errors/ErrorBlock/ui/ErrorBlock'
import { SectionErrorBoundary } from '@/shared/ui/errors/SectionErrorBoundary/ui/SectionErrorBoundary'
import {
    useCurrentPredictionLivePayloadQuery
} from '@/shared/api/tanstackQueries/currentPrediction'
import {
    ReportViewControls,
    ReportTimingSection,
    Text,
    formatTimingExactUtc,
    useReportTimingNowMs,
    buildCurrentPredictionLiveTrainingScopeDescription,
    buildTrainingScopeControlGroup,
    resolveCurrentPredictionTrainingScopeMeta
} from '@/shared/ui'
import type { CurrentPredictionTrainingScope } from '@/shared/api/endpoints/reportEndpoints'
import { resolveTrainingLabel } from '@/shared/utils/reportTraining'
import { localizeReportKeyValue } from '@/shared/utils/reportPresentationLocalization'
import type {
    KeyValueSectionDto,
    ReportDocumentDto,
    ReportSectionDto,
    TableSectionDto
} from '@/shared/types/report.types'
import { useTranslation } from 'react-i18next'
import { PageDataState } from '@/shared/ui/errors/PageDataState'
import { renderTermTooltipRichText } from '@/shared/ui/TermTooltip'
import { useSelector } from 'react-redux'
import { selectActiveMode } from '@/entities/mode'
import {
    WalkForwardModeCurrentPredictionPanel,
    WalkForwardModeMoneyPanel
} from '@/pages/shared/walkForward/ui/WalkForwardModePanels'
import { PredictionPageIntro } from '@/pages/predictions/ui/shared/PredictionPageIntro/PredictionPageIntro'
import { PredictionTrainingScopeDescriptionBlock } from '@/pages/predictions/ui/shared/PredictionTrainingScopeDescriptionBlock'
import { PredictionSliceTimelinePanel } from '@/pages/predictions/ui/shared/PredictionSliceTimeline'
import { readPredictionPageStringList } from '@/pages/predictions/ui/shared/predictionPageI18n'
import { CURRENT_PREDICTION_POLICY_COLUMN_KEYS } from '@/shared/utils/reportCanonicalKeys'
import {
    resolveCurrentPredictionTimingSnapshot,
    resolveCurrentPredictionTimingPhase,
    resolveCurrentPredictionTimingStatus
} from '@/shared/utils/currentPredictionTiming'

const PREVIEW_STATUS_PREFIX = 'PREVIEW_'
const PREVIEW_STATUS_ITEM_KEY = 'preview_status'
const POLICY_TABLE_SECTION_KEY = 'leverage_policies'
const CURRENT_PREDICTION_POLICY_HIDDEN_COLUMNS = new Set<string>([
    CURRENT_PREDICTION_POLICY_COLUMN_KEYS.hasDirection,
    CURRENT_PREDICTION_POLICY_COLUMN_KEYS.skipped
])

interface CurrentPredictionStatusMeta {
    key: string
    text: string
    isPreview: boolean
}

interface CurrentPredictionTableSectionView extends TableSectionDto {
    columns: string[]
    columnKeys: string[]
    rows: string[][]
}

function resolveCurrentPredictionStatusMeta(report: ReportDocumentDto | undefined): CurrentPredictionStatusMeta | null {
    if (!report) {
        return null
    }

    for (const section of report.sections) {
        const keyValueSection = section as KeyValueSectionDto
        if (!Array.isArray(keyValueSection.items) || keyValueSection.items.length === 0) {
            continue
        }

        for (const item of keyValueSection.items) {
            if ((item.itemKey ?? '').trim() !== PREVIEW_STATUS_ITEM_KEY) {
                continue
            }

            const text = item.value.trim()
            if (!text) {
                return null
            }

            return {
                key: item.key,
                text,
                isPreview: text.toUpperCase().startsWith(PREVIEW_STATUS_PREFIX)
            }
        }
    }

    return null
}

function isCurrentPredictionTableSection(section: ReportSectionDto): section is CurrentPredictionTableSectionView {
    const candidate = section as { columns?: unknown; columnKeys?: unknown; rows?: unknown }
    return Array.isArray(candidate.columns) && Array.isArray(candidate.columnKeys) && Array.isArray(candidate.rows)
}

function sanitizeCurrentPredictionReport(report: ReportDocumentDto): ReportDocumentDto {
    const sections = report.sections.map(section => {
        if (!isCurrentPredictionTableSection(section) || section.sectionKey !== POLICY_TABLE_SECTION_KEY) {
            return section
        }

        const visibleIndices = section.columnKeys.reduce<number[]>((acc, columnKey, index) => {
            if (!CURRENT_PREDICTION_POLICY_HIDDEN_COLUMNS.has(columnKey)) {
                acc.push(index)
            }
            return acc
        }, [])

        if (visibleIndices.length === section.columnKeys.length) {
            return section
        }

        const rows = section.rows.map((row, rowIndex) => {
            if (!Array.isArray(row) || row.length !== section.columnKeys.length) {
                throw new Error(`[current-prediction] Policy table row shape is invalid. rowIndex=${rowIndex}.`)
            }

            return visibleIndices.map(index => row[index] ?? '')
        })

        return {
            ...section,
            columns: visibleIndices.map(index => section.columns[index] ?? ''),
            columnKeys: visibleIndices.map(index => section.columnKeys[index] ?? ''),
            rows
        }
    })

    return {
        ...report,
        sections
    }
}

function DirectionalFixedSplitCurrentPredictionPage({ className }: CurrentMLModelPredictionProps) {
    const { t, i18n } = useTranslation('reports')
    const [trainingScope, setTrainingScope] = useState<CurrentPredictionTrainingScope>('full')
    const nowMs = useReportTimingNowMs()

    const { data: payload, isLoading, isError, error, refetch } = useCurrentPredictionLivePayloadQuery(trainingScope)
    const data = payload?.report ?? null
    const livePublication = payload?.publication ?? null
    const trainingScopeStats = payload?.trainingScopeStats ?? null

    const rootClassName = classNames(cls.CurrentPredictionPage, {}, [className ?? ''])
    const trainingLabel = resolveTrainingLabel(data)
    const currentScopeMeta = resolveCurrentPredictionTrainingScopeMeta(trainingScope, trainingScopeStats)
    const introBullets = useMemo(
        () => readPredictionPageStringList(i18n, 'currentPrediction.page.intro.bullets'),
        [i18n]
    )
    const renderIntroText = useCallback((text: string) => renderTermTooltipRichText(text), [])
    const predictionStatus = resolveCurrentPredictionStatusMeta(data ?? undefined)
    const sanitizedReport = useMemo(() => (data ? sanitizeCurrentPredictionReport(data) : null), [data])
    const timingSnapshot = useMemo(() => (data ? resolveCurrentPredictionTimingSnapshot(data) : null), [data])
    const isRu = (i18n.resolvedLanguage ?? i18n.language).startsWith('ru')
    const locale = isRu ? 'ru-RU' : 'en-US'
    const localizedPredictionStatusText =
        predictionStatus ?
            localizeReportKeyValue(
                data?.kind,
                predictionStatus.key,
                predictionStatus.text,
                i18n.resolvedLanguage ?? i18n.language
            )
        :   null
    const documentFreshness = useMemo(
        () => ({
            statusMode: 'actual' as const,
            statusTitle:
                livePublication && !livePublication.isTargetPredictionDatePublished ?
                    t('currentPrediction.page.reportStatus.latestPublishedTitle')
                :   t('currentPrediction.page.reportStatus.title'),
            statusMessage:
                livePublication && !livePublication.isTargetPredictionDatePublished ?
                    t('currentPrediction.page.reportStatus.latestPublishedMessage', {
                        mode: currentScopeMeta.label,
                        publishedDateUtc: livePublication.publishedPredictionDateUtc,
                        targetDateUtc: livePublication.targetPredictionDateUtc
                    })
                :   t('currentPrediction.page.reportStatus.message', { mode: currentScopeMeta.label })
        }),
        [currentScopeMeta.label, livePublication, t]
    )
    // Explain-блок live-страницы читает диапазоны всех history scope из лёгкого index API,
    // чтобы Full и OOS всегда показывали реальные окна даже если открыт только один live-report.
    const trainingScopeDescription = useMemo(
        () =>
            buildCurrentPredictionLiveTrainingScopeDescription({
                splitStats: trainingScopeStats,
                fullReport: trainingScope === 'full' ? data ?? null : null,
                oosReport: trainingScope === 'oos' ? data ?? null : null
            }),
        [data, trainingScope, trainingScopeStats]
    )
    const controlGroups = useMemo(
        () => [
            buildTrainingScopeControlGroup({
                value: trainingScope,
                onChange: setTrainingScope,
                label: t('currentPrediction.page.scopeLabel'),
                ariaLabel: t('currentPrediction.scope.ariaLabel'),
                infoTooltip: trainingScopeDescription,
                splitStats: trainingScopeStats,
                scopes: ['full', 'oos']
            })
        ],
        [setTrainingScope, t, trainingScopeDescription, trainingScope, trainingScopeStats]
    )
    const timingStatus = useMemo(
        () =>
            timingSnapshot ?
                resolveCurrentPredictionTimingStatus(nowMs, timingSnapshot, isRu)
            :   null,
        [isRu, nowMs, timingSnapshot]
    )
    const timingPhase = useMemo(
        () => (timingSnapshot ? resolveCurrentPredictionTimingPhase(nowMs, timingSnapshot) : 'incomplete'),
        [nowMs, timingSnapshot]
    )
    const timingCards = useMemo(
        () =>
            timingSnapshot ?
                [
                    {
                        id: 'report-built',
                        label: isRu ? 'Сборка прогноза' : 'Forecast build',
                        displayValue: formatTimingExactUtc(timingSnapshot.generatedAtUtc, locale),
                        rows: [
                            {
                                label: isRu ? 'Дата прогноза' : 'Forecast day',
                                value: timingSnapshot.predictionDateUtc ?? (isRu ? 'нет в отчёте' : 'missing in report')
                            },
                            {
                                label: isRu ? 'Собран' : 'Built at',
                                value: formatTimingExactUtc(timingSnapshot.generatedAtUtc, locale)
                            }
                        ]
                    },
                    {
                        id: 'entry-window',
                        label: isRu ? 'Открытие торгового окна' : 'Trading window open',
                        targetUtc:
                            timingPhase === 'before_entry' ? timingSnapshot.entryUtc
                            : null,
                        displayValue:
                            timingPhase !== 'before_entry' && timingSnapshot.entryUtc ?
                                formatTimingExactUtc(timingSnapshot.entryUtc, locale)
                            :   undefined,
                        headline: isRu ? 'Время входа недоступно' : 'Entry time is unavailable',
                        rows: [
                            {
                                label: isRu ? 'Дата прогноза' : 'Forecast day',
                                value: timingSnapshot.predictionDateUtc ?? (isRu ? 'нет в отчёте' : 'missing in report')
                            },
                            {
                                label: isRu ? 'Открытие' : 'Opens at',
                                value:
                                    timingSnapshot.entryUtc ?
                                        formatTimingExactUtc(timingSnapshot.entryUtc, locale)
                                    :   (isRu ? 'нет в отчёте' : 'missing in report')
                            }
                        ]
                    },
                    {
                        id: 'exit-window',
                        label: isRu ? 'Закрытие окна факта' : 'Factual window close',
                        targetUtc:
                            timingPhase === 'before_entry' || timingPhase === 'active' ? timingSnapshot.exitUtc
                            : null,
                        displayValue:
                            timingPhase === 'closed' && timingSnapshot.exitUtc ?
                                formatTimingExactUtc(timingSnapshot.exitUtc, locale)
                            :   undefined,
                        headline: isRu ? 'Время закрытия недоступно' : 'Close time is unavailable',
                        rows: [
                            {
                                label: isRu ? 'Закрытие' : 'Closes at',
                                value:
                                    timingSnapshot.exitUtc ?
                                        formatTimingExactUtc(timingSnapshot.exitUtc, locale)
                                    :   (isRu ? 'нет в отчёте' : 'missing in report')
                            },
                            {
                                label: isRu ? 'Статус режима' : 'Forecast mode',
                                value: localizedPredictionStatusText ?? (isRu ? 'стандартный расчёт' : 'standard run')
                            }
                        ]
                    }
                ]
            :   [],
        [isRu, locale, localizedPredictionStatusText, timingPhase, timingSnapshot]
    )

    return (
        <div className={rootClassName}>
            <PageDataState
                shell={
                    <>
                        {/* Вводный блок рендерится до data-state, чтобы смысл экрана был виден даже при ошибке загрузки live-отчёта. */}
                        <PredictionPageIntro
                            title={t('currentPrediction.page.intro.title')}
                            lead={t('currentPrediction.page.intro.lead')}
                            bullets={introBullets}
                            renderText={renderIntroText}
                        />

                        <PredictionTrainingScopeDescriptionBlock variant='live' description={trainingScopeDescription} />
                        <PredictionSliceTimelinePanel
                            primaryStats={trainingScopeStats}
                            activeScope={trainingScope}
                            isPrimaryLoading={isLoading}
                        />

                        <div className={cls.scopePanel}>
                            <ReportViewControls groups={controlGroups} className={cls.scopeControls} />
                            <Text type='p' className={cls.scopeHint}>
                                {currentScopeMeta.hint}
                            </Text>
                        </div>
                    </>
                }
                isLoading={isLoading}
                isError={isError}
                error={error}
                hasData={Boolean(data)}
                onRetry={refetch}
                title={t('currentPrediction.page.errorTitle')}
                loadingText={t('errors:ui.pageDataBoundary.loading', { defaultValue: 'Loading data' })}
                logContext={{
                    source: 'current-prediction-page',
                    extra: { reportSet: 'live', trainingScope }
                }}>
                {data && (
                    <>
                        {predictionStatus && (
                            <div
                                className={classNames(cls.statusPanel, {
                                    [cls.statusPanelPreview]: predictionStatus.isPreview,
                                    [cls.statusPanelNormal]: !predictionStatus.isPreview
                                })}>
                                <Text type='p' className={cls.statusLabel}>
                                    {t('currentPrediction.page.statusLabel')}
                                </Text>
                                <Text type='p' className={cls.statusValue}>
                                    {localizedPredictionStatusText}
                                </Text>
                            </div>
                        )}

                        {timingSnapshot && timingStatus && (
                            <ReportTimingSection
                                title={isRu ? 'Тайминг текущего прогноза' : 'Current forecast timing'}
                                subtitle={
                                    isRu ?
                                        'Блок показывает, когда собран текущий прогноз, во сколько открывается рабочее окно и когда закрывается фактический день.'
                                    :   'This block shows when the current forecast was built, when its working window opens, and when the factual day closes.'
                                }
                                statusText={timingStatus.text}
                                statusTone={timingStatus.tone}
                                cards={timingCards}
                                locale={locale}
                                remainingLabel={isRu ? 'осталось' : 'remaining'}
                                overdueLabel={isRu ? 'после срока' : 'overdue'}
                            />
                        )}

                        <div className={cls.metaPanel}>
                            <Text type='p' className={cls.metaLine}>
                                {t('currentPrediction.page.meta.currentReport', { reportSet: 'live' })}
                            </Text>
                            <Text type='p' className={cls.metaLine}>
                                {t('currentPrediction.page.meta.selectedMode', { mode: currentScopeMeta.label })}
                            </Text>
                            <Text type='p' className={cls.metaLine}>
                                {t('currentPrediction.page.meta.trainingModel', {
                                    model: trainingLabel ?? t('currentPrediction.page.meta.trainingModelFallback')
                                })}
                            </Text>
                            {livePublication && (
                                <Text type='p' className={cls.metaLine}>
                                    {t('currentPrediction.page.meta.publishedPredictionDay', {
                                        dateUtc: livePublication.publishedPredictionDateUtc
                                    })}
                                </Text>
                            )}
                        </div>

                        <SectionErrorBoundary
                            name='CurrentPredictionReport'
                            fallback={({ error: sectionError, reset }) => (
                                <ErrorBlock
                                    code='CLIENT'
                                    title={t('currentPrediction.page.clientError.title')}
                                    description={t('currentPrediction.page.clientError.description')}
                                    details={sectionError.message}
                                    onRetry={reset}
                                />
                            )}>
                            <ReportDocumentView report={sanitizedReport ?? data} freshness={documentFreshness} />
                        </SectionErrorBoundary>
                    </>
                )}
            </PageDataState>
        </div>
    )
}

export default function CurrentMLModelPredictionPage(props: CurrentMLModelPredictionProps) {
    const activeMode = useSelector(selectActiveMode)

    if (activeMode === 'tbm_native') {
        return <WalkForwardModeMoneyPanel className={props.className} mode={activeMode} />
    }

    if (activeMode === 'directional_walkforward') {
        return (
            <div className={classNames(cls.CurrentPredictionPage, {}, [props.className ?? ''])}>
                <WalkForwardModeCurrentPredictionPanel mode={activeMode} />
                <WalkForwardModeMoneyPanel mode={activeMode} />
            </div>
        )
    }

    return <DirectionalFixedSplitCurrentPredictionPage {...props} />
}
