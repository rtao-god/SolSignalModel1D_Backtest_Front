import { useCallback, useMemo, useState } from 'react'
import classNames from '@/shared/lib/helpers/classNames'
import cls from './CurrentMLModelPredictionPage.module.scss'
import CurrentMLModelPredictionProps from './types'
import { ReportDocumentView } from '@/shared/ui/ReportDocumentView/ui/ReportDocumentView'
import { ErrorBlock } from '@/shared/ui/errors/ErrorBlock/ui/ErrorBlock'
import { SectionErrorBoundary } from '@/shared/ui/errors/SectionErrorBoundary/ui/SectionErrorBoundary'
import {
    useCurrentPredictionBackfilledSplitStats,
    useCurrentPredictionReportQuery
} from '@/shared/api/tanstackQueries/currentPrediction'
import {
    ReportViewControls,
    Text,
    buildCurrentPredictionLiveTrainingScopeDescription,
    buildTrainingScopeControlGroup,
    resolveCurrentPredictionTrainingScopeMeta
} from '@/shared/ui'
import type { CurrentPredictionSet, CurrentPredictionTrainingScope } from '@/shared/api/endpoints/reportEndpoints'
import { resolveTrainingLabel } from '@/shared/utils/reportTraining'
import { localizeReportKeyValue } from '@/shared/utils/reportPresentationLocalization'
import type {
    KeyValueSectionDto,
    ReportDocumentDto,
    ReportSectionDto,
    TableSectionDto
} from '@/shared/types/report.types'
import { useTranslation } from 'react-i18next'
import { SectionDataState } from '@/shared/ui/errors/SectionDataState'
import { renderTermTooltipRichText } from '@/shared/ui/TermTooltip'
import { PredictionPageIntro } from '@/pages/predictions/ui/shared/PredictionPageIntro/PredictionPageIntro'
import { readPredictionPageStringList } from '@/pages/predictions/ui/shared/predictionPageI18n'
import { CURRENT_PREDICTION_POLICY_COLUMN_KEYS } from '@/shared/utils/reportCanonicalKeys'

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

export default function CurrentMLModelPredictionPage({ className }: CurrentMLModelPredictionProps) {
    const { t, i18n } = useTranslation('reports')
    const reportSet: CurrentPredictionSet = 'live'
    const [trainingScope, setTrainingScope] = useState<CurrentPredictionTrainingScope>('full')

    const { data, isLoading, isError, error, refetch } = useCurrentPredictionReportQuery(reportSet, trainingScope)
    const trainingSplitStatsState = useCurrentPredictionBackfilledSplitStats()

    const rootClassName = classNames(cls.CurrentPredictionPage, {}, [className ?? ''])
    const trainingLabel = resolveTrainingLabel(data)
    const currentScopeMeta = resolveCurrentPredictionTrainingScopeMeta(trainingScope)
    const introBullets = useMemo(
        () => readPredictionPageStringList(i18n, 'currentPrediction.page.intro.bullets'),
        [i18n]
    )
    const renderIntroText = useCallback((text: string) => renderTermTooltipRichText(text), [])
    const predictionStatus = resolveCurrentPredictionStatusMeta(data)
    const sanitizedReport = useMemo(() => (data ? sanitizeCurrentPredictionReport(data) : null), [data])
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
            statusTitle: t('currentPrediction.page.reportStatus.title'),
            statusMessage: t('currentPrediction.page.reportStatus.message', { mode: currentScopeMeta.label })
        }),
        [currentScopeMeta.label, t]
    )
    const controlGroups = useMemo(
        () => [
            buildTrainingScopeControlGroup({
                value: trainingScope,
                onChange: setTrainingScope,
                label: t('currentPrediction.page.scopeLabel'),
                ariaLabel: t('currentPrediction.scope.ariaLabel'),
                infoTooltip: buildCurrentPredictionLiveTrainingScopeDescription(trainingSplitStatsState.data),
                splitStats: trainingSplitStatsState.data
            })
        ],
        [setTrainingScope, t, trainingScope, trainingSplitStatsState.data]
    )

    return (
        <div className={rootClassName}>
            {/* Вводный блок рендерится до data-state, чтобы смысл экрана был виден даже при ошибке загрузки live-отчёта. */}
            <PredictionPageIntro
                title={t('currentPrediction.page.intro.title')}
                lead={t('currentPrediction.page.intro.lead')}
                bullets={introBullets}
                renderText={renderIntroText}
            />

            <div className={cls.scopePanel}>
                <ReportViewControls groups={controlGroups} className={cls.scopeControls} />
                <Text type='p' className={cls.scopeHint}>
                    {currentScopeMeta.hint}
                </Text>
            </div>

            <SectionDataState
                isLoading={isLoading}
                isError={isError}
                error={error}
                hasData={Boolean(data)}
                onRetry={refetch}
                title={t('currentPrediction.page.errorTitle')}
                loadingText={t('errors:ui.pageDataBoundary.loading', { defaultValue: 'Loading data' })}
                logContext={{
                    source: 'current-prediction-page',
                    extra: { reportSet, trainingScope }
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

                        <div className={cls.metaPanel}>
                            <Text type='p' className={cls.metaLine}>
                                {t('currentPrediction.page.meta.currentReport', { reportSet })}
                            </Text>
                            <Text type='p' className={cls.metaLine}>
                                {t('currentPrediction.page.meta.selectedMode', { mode: currentScopeMeta.label })}
                            </Text>
                            <Text type='p' className={cls.metaLine}>
                                {t('currentPrediction.page.meta.trainingModel', {
                                    model: trainingLabel ?? t('currentPrediction.page.meta.trainingModelFallback')
                                })}
                            </Text>
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
            </SectionDataState>
        </div>
    )
}
