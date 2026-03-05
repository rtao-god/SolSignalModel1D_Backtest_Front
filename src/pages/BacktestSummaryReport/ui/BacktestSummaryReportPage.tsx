import classNames from '@/shared/lib/helpers/classNames'
import cls from './BacktestSummaryReportPage.module.scss'
import { Text } from '@/shared/ui'
import type BacktestSummaryReportProps from './types'
import { ReportDocumentView } from '@/shared/ui/ReportDocumentView/ui/ReportDocumentView'
import { useBacktestBaselineSummaryReportQuery } from '@/shared/api/tanstackQueries/backtest'
import PageDataBoundary from '@/shared/ui/errors/PageDataBoundary/ui/PageDataBoundary'
import { useTranslation } from 'react-i18next'

export default function BacktestSummaryReportPage({ className }: BacktestSummaryReportProps) {
    const { t } = useTranslation('reports')
    const { data, isError, error, refetch } = useBacktestBaselineSummaryReportQuery()

    const rootClassName = classNames(cls.BacktestSummaryPage, {}, [className ?? ''])

    return (
        <PageDataBoundary
            isError={isError}
            error={error}
            hasData={Boolean(data)}
            onRetry={refetch}
            errorTitle={t('backtestSummary.page.errorTitle')}>
            {data && (
                <div className={rootClassName}>
                    <header className={cls.header}>
                        <Text type='h1'>{data.title}</Text>
                        <Text>{t('backtestSummary.page.reportId', { id: data.id })}</Text>
                        <Text>{t('backtestSummary.page.reportKind', { kind: data.kind })}</Text>
                        <Text>
                            {t('backtestSummary.page.generatedUtc', {
                                generatedUtc: (() => {
                                    const generatedUtc = data.generatedAtUtc ? new Date(data.generatedAtUtc) : null
                                    return generatedUtc ?
                                            generatedUtc.toISOString().replace('T', ' ').replace('Z', ' UTC')
                                        :   '—'
                                })()
                            })}
                        </Text>
                        <Text>
                            {t('backtestSummary.page.generatedLocal', {
                                generatedLocal:
                                    data.generatedAtUtc ? new Date(data.generatedAtUtc).toLocaleString() : '—'
                            })}
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
