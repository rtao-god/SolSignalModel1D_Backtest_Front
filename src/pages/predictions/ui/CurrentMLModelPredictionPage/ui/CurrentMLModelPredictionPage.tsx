import { useState } from 'react'
import classNames from '@/shared/lib/helpers/classNames'
import cls from './CurrentMLModelPredictionPage.module.scss'
import CurrentMLModelPredictionProps from './types'
import { ReportDocumentView } from '@/shared/ui/ReportDocumentView/ui/ReportDocumentView'
import { ErrorBlock } from '@/shared/ui/errors/ErrorBlock/ui/ErrorBlock'
import { SectionErrorBoundary } from '@/shared/ui/errors/SectionErrorBoundary/ui/SectionErrorBoundary'
import { useCurrentPredictionReportQuery } from '@/shared/api/tanstackQueries/currentPrediction'
import PageDataBoundary from '@/shared/ui/errors/PageDataBoundary/ui/PageDataBoundary'
import { CurrentPredictionTrainingScopeToggle, Text, resolveCurrentPredictionTrainingScopeMeta } from '@/shared/ui'
import type { CurrentPredictionSet, CurrentPredictionTrainingScope } from '@/shared/api/endpoints/reportEndpoints'
import { resolveTrainingLabel } from '@/shared/utils/reportTraining'
import type { KeyValueSectionDto, ReportDocumentDto } from '@/shared/types/report.types'

const PREVIEW_STATUS_PREFIX = 'PREVIEW_'

interface CurrentPredictionStatusMeta {
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
            if (item.key.trim().toLowerCase() !== 'статус прогноза') {
                continue
            }

            const text = item.value.trim()
            if (!text) {
                return null
            }

            return {
                text,
                isPreview: text.toUpperCase().startsWith(PREVIEW_STATUS_PREFIX)
            }
        }
    }

    return null
}

export default function CurrentMLModelPredictionPage({ className }: CurrentMLModelPredictionProps) {
    const reportSet: CurrentPredictionSet = 'live'
    const [trainingScope, setTrainingScope] = useState<CurrentPredictionTrainingScope>('full')

    const { data, isError, error, refetch } = useCurrentPredictionReportQuery(reportSet, trainingScope)

    const rootClassName = classNames(cls.CurrentPredictionPage, {}, [className ?? ''])
    const trainingLabel = resolveTrainingLabel(data)
    const currentScopeMeta = resolveCurrentPredictionTrainingScopeMeta(trainingScope)
    const predictionStatus = resolveCurrentPredictionStatusMeta(data)

    return (
        <PageDataBoundary
            isError={isError}
            error={error}
            hasData={Boolean(data)}
            onRetry={refetch}
            errorTitle='Не удалось загрузить текущий прогноз'>
            {data && (
                <div className={rootClassName}>
                    <div className={cls.scopePanel}>
                        <Text type='p' className={cls.scopeLabel}>
                            Режим обучения:
                        </Text>
                        <CurrentPredictionTrainingScopeToggle
                            value={trainingScope}
                            onChange={setTrainingScope}
                            className={cls.scopeToggle}
                        />
                        <Text type='p' className={cls.scopeHint}>
                            {currentScopeMeta.hint}
                        </Text>
                    </div>

                    {predictionStatus && (
                        <div
                            className={classNames(cls.statusPanel, {
                                [cls.statusPanelPreview]: predictionStatus.isPreview,
                                [cls.statusPanelNormal]: !predictionStatus.isPreview
                            })}
                        >
                            <Text type='p' className={cls.statusLabel}>
                                Статус прогноза:
                            </Text>
                            <Text type='p' className={cls.statusValue}>
                                {predictionStatus.text}
                            </Text>
                        </div>
                    )}

                    <div className={cls.metaPanel}>
                        <Text type='p' className={cls.metaLine}>
                            Текущий отчёт: {reportSet}
                        </Text>
                        <Text type='p' className={cls.metaLine}>
                            Выбранный режим: {currentScopeMeta.label}
                        </Text>
                        <Text type='p' className={cls.metaLine}>
                            Модель обучения:{' '}
                            {trainingLabel ?? 'нет данных (проверь секцию обучения в отчёте)'}
                        </Text>
                    </div>

                    <SectionErrorBoundary
                        name='CurrentPredictionReport'
                        fallback={({ error: sectionError, reset }) => (
                            <ErrorBlock
                                code='CLIENT'
                                title='Ошибка при отображении отчёта'
                                description='При отрисовке текущего прогноза произошла ошибка на клиенте. Остальная часть приложения продолжает работать.'
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
