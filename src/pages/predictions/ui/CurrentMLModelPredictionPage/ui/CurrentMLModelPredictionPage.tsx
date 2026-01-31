import classNames from '@/shared/lib/helpers/classNames'
import cls from './CurrentMLModelPrediction.module.scss'
import CurrentMLModelPredictionProps from '../types'
import { ReportDocumentView } from '@/shared/ui/ReportDocumentView/ui/ReportDocumentView'
import { ErrorBlock } from '@/shared/ui/errors/ErrorBlock/ui/ErrorBlock'
import { SectionErrorBoundary } from '@/shared/ui/errors/SectionErrorBoundary/ui/SectionErrorBoundary'
import { useCurrentPredictionReportQuery } from '@/shared/api/tanstackQueries/currentPrediction'
import PageDataBoundary from '@/shared/ui/errors/PageDataBoundary/ui/PageDataBoundary'
import { Text } from '@/shared/ui'
import type { CurrentPredictionSet } from '@/shared/api/endpoints/reportEndpoints'
import { resolveTrainingLabel } from '@/shared/utils/reportTraining'

/*
	CurrentMLModelPredictionPage — текущий прогноз модели.

	Зачем:
		- Показывает актуальный отчёт прогноза модели.
		- Защищает рендер отчёта через SectionErrorBoundary.

	Источники данных и сайд-эффекты:
		- useCurrentPredictionReportQuery() (TanStack Query).

	Контракты:
		- ReportDocumentView получает валидный report.
*/

export default function CurrentMLModelPredictionPage({ className }: CurrentMLModelPredictionProps) {
    // Для текущего прогноза берём live-отчёт (as-of срез).
    const reportSet: CurrentPredictionSet = 'live'
    const { data, isError, error, refetch } = useCurrentPredictionReportQuery(reportSet)

    const rootClassName = classNames(cls.CurrentPredictionPage, {}, [className ?? ''])

    return (
        <PageDataBoundary
            isError={isError}
            error={error}
            hasData={Boolean(data)}
            onRetry={refetch}
            errorTitle='Не удалось загрузить текущий прогноз'>
            {data && (
                <div className={rootClassName}>
                    <div className={cls.metaPanel}>
                        <Text type='p' className={cls.metaLine}>
                            Текущий отчёт: {reportSet}
                        </Text>
                        <Text type='p' className={cls.metaLine}>
                            Модель обучения:{' '}
                            {resolveTrainingLabel(data) ?? 'нет данных (проверь секцию обучения в отчёте)'}
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
