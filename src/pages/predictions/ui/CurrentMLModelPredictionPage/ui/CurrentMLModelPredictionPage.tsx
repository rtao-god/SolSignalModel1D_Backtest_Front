import classNames from '@/shared/lib/helpers/classNames'
import cls from './CurrentMLModelPrediction.module.scss'
import CurrentMLModelPredictionProps from './types'
import { resolveAppError } from '@/shared/lib/errors/resolveAppError'
import { ReportDocumentView } from '@/shared/ui/ReportDocumentView/ui/ReportDocumentView'
import { ErrorBlock } from '@/shared/ui/errors/ErrorBlock/ui/ErrorBlock'
import { SectionErrorBoundary } from '@/shared/ui/errors/SectionErrorBoundary/ui/SectionErrorBoundary'
import { useCurrentPredictionReportQuery } from '@/shared/api/tanstackQueries/currentPrediction'

export default function CurrentMLModelPredictionPage({ className }: CurrentMLModelPredictionProps) {
    const { data, isError, error } = useCurrentPredictionReportQuery()

    const rootClassName = classNames(cls.CurrentPredictionPage, {}, [className ?? ''])

    if (isError || !data) {
        const resolved = isError ? resolveAppError(error) : undefined

        return (
            <div className={rootClassName}>
                <ErrorBlock
                    code={resolved?.code ?? 'UNKNOWN'}
                    title={resolved?.title ?? 'Не удалось загрузить текущий прогноз'}
                    description={
                        resolved?.description ??
                        'Попробуйте обновить страницу. Если проблема повторяется — проверьте, что бэкенд запущен и отчёт по текущему прогнозу действительно генерируется.'
                    }
                    details={resolved?.rawMessage}
                />
            </div>
        )
    }

    return (
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
    )
}
