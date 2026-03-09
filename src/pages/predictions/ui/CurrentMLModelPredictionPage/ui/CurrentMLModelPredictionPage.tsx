import { useMemo, useState } from 'react'
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
import PageDataBoundary from '@/shared/ui/errors/PageDataBoundary/ui/PageDataBoundary'
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
import type { KeyValueSectionDto, ReportDocumentDto } from '@/shared/types/report.types'
import { useTranslation } from 'react-i18next'

const PREVIEW_STATUS_PREFIX = 'PREVIEW_'
const PREVIEW_STATUS_ITEM_KEY = 'preview_status'

interface CurrentPredictionStatusMeta {
    key: string
    text: string
    isPreview: boolean
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

export default function CurrentMLModelPredictionPage({ className }: CurrentMLModelPredictionProps) {
    const { t, i18n } = useTranslation('reports')
    const reportSet: CurrentPredictionSet = 'live'
    const [trainingScope, setTrainingScope] = useState<CurrentPredictionTrainingScope>('full')

    const { data, isError, error, refetch } = useCurrentPredictionReportQuery(reportSet, trainingScope)
    const trainingSplitStatsState = useCurrentPredictionBackfilledSplitStats()

    const rootClassName = classNames(cls.CurrentPredictionPage, {}, [className ?? ''])
    const trainingLabel = resolveTrainingLabel(data)
    const currentScopeMeta = resolveCurrentPredictionTrainingScopeMeta(trainingScope)
    const predictionStatus = resolveCurrentPredictionStatusMeta(data)
    const localizedPredictionStatusText =
        predictionStatus ?
            localizeReportKeyValue(data?.kind, predictionStatus.key, predictionStatus.text, i18n.resolvedLanguage ?? i18n.language)
        :   null
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
        <PageDataBoundary
            isError={isError}
            error={error}
            hasData={Boolean(data)}
            onRetry={refetch}
            errorTitle={t('currentPrediction.page.errorTitle')}>
            {data && (
                <div className={rootClassName}>
                    <div className={cls.scopePanel}>
                        <ReportViewControls groups={controlGroups} className={cls.scopeControls} />
                        <Text type='p' className={cls.scopeHint}>
                            {currentScopeMeta.hint}
                        </Text>
                    </div>

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
                        <ReportDocumentView report={data} />
                    </SectionErrorBoundary>
                </div>
            )}
        </PageDataBoundary>
    )
}
