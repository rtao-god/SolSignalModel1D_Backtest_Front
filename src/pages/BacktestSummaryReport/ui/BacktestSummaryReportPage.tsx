import classNames from '@/shared/lib/helpers/classNames'
import cls from './BacktestSummaryReportPage.module.scss'
import { Text } from '@/shared/ui'
import type BacktestSummaryReportProps from './types'
import { ReportDocumentView } from '@/shared/ui/ReportDocumentView/ui/ReportDocumentView'
import { useBacktestBaselineSummaryReportQuery } from '@/shared/api/tanstackQueries/backtest'
import PageDataBoundary from '@/shared/ui/errors/PageDataBoundary/ui/PageDataBoundary'

/*
	BacktestSummaryReportPage — сводный отчёт бэктеста.

	Зачем:
		- Показывает общий отчёт baseline-бэктеста.
		- Рендерит секции через ReportDocumentView.

	Источники данных и сайд-эффекты:
		- useBacktestBaselineSummaryReportQuery() (TanStack Query).

	Контракты:
		- ReportDocumentView получает валидный report.
*/
export default function BacktestSummaryReportPage({ className }: BacktestSummaryReportProps) {
    const { data, isError, error, refetch } = useBacktestBaselineSummaryReportQuery()

    const rootClassName = classNames(cls.BacktestSummaryPage, {}, [className ?? ''])

    return (
        <PageDataBoundary
            isError={isError}
            error={error}
            hasData={Boolean(data)}
            onRetry={refetch}
            errorTitle='Не удалось загрузить сводку бэктеста'>
            {data && (
                <div className={rootClassName}>
                    <header className={cls.header}>
                        <Text type='h1'>{data.title}</Text>
                        <Text>ID отчёта: {data.id}</Text>
                        <Text>Тип: {data.kind}</Text>
                        <Text>
                            Сгенерировано (UTC):{' '}
                            {(() => {
                                const generatedUtc = data.generatedAtUtc ? new Date(data.generatedAtUtc) : null
                                return generatedUtc ?
                                        generatedUtc.toISOString().replace('T', ' ').replace('Z', ' UTC')
                                    :   '—'
                            })()}
                        </Text>
                        <Text>
                            Сгенерировано (локальное время):{' '}
                            {data.generatedAtUtc ? new Date(data.generatedAtUtc).toLocaleString() : '—'}
                        </Text>
                    </header>

                    <div className={cls.sections}>
                        <ReportDocumentView report={data} />
                    </div>
                </div>
            )}
        </PageDataBoundary>
    )
}
