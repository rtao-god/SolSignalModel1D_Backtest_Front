import classNames from '@/shared/lib/helpers/classNames'
import cls from './CurrentMLModelPrediction.module.scss'
import CurrentMLModelPredictionProps from './types'
import { ReportDocumentView } from '@/shared/ui/ReportDocumentView/ui/ReportDocumentView'
import { ErrorBlock } from '@/shared/ui/errors/ErrorBlock/ui/ErrorBlock'
import { SectionErrorBoundary } from '@/shared/ui/errors/SectionErrorBoundary/ui/SectionErrorBoundary'
import { useCurrentPredictionReportQuery } from '@/shared/api/tanstackQueries/currentPrediction'
import PageDataBoundary from '@/shared/ui/errors/PageDataBoundary/ui/PageDataBoundary'

export default function CurrentMLModelPredictionPage({ className }: CurrentMLModelPredictionProps) {
    const { data, isError, error, refetch } = useCurrentPredictionReportQuery()

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
