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

export default function CurrentMLModelPredictionPage({ className }: CurrentMLModelPredictionProps) {
    const reportSet: CurrentPredictionSet = 'live'
    const [trainingScope, setTrainingScope] = useState<CurrentPredictionTrainingScope>('full')

    const { data, isError, error, refetch } = useCurrentPredictionReportQuery(reportSet, trainingScope)

    const rootClassName = classNames(cls.CurrentPredictionPage, {}, [className ?? ''])
    const trainingLabel = resolveTrainingLabel(data)
    const currentScopeMeta = resolveCurrentPredictionTrainingScopeMeta(trainingScope)

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
