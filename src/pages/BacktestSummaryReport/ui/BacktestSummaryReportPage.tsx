import classNames from '@/shared/lib/helpers/classNames'
import cls from './BacktestSummaryReportPage.module.scss'
import { Text } from '@/shared/ui'
import type BacktestSummaryReportProps from './types'
import {
    ReportDocumentView,
    type ReportDocumentFreshnessInfo
} from '@/shared/ui/ReportDocumentView/ui/ReportDocumentView'
import { useBacktestBaselineSummaryReportQuery } from '@/shared/api/tanstackQueries/backtest'
import { PageDataState } from '@/shared/ui/errors/PageDataState'
import { useTranslation } from 'react-i18next'
import { useMemo } from 'react'
import type { KeyValueSectionDto, TableSectionDto } from '@/shared/types/report.types'

export default function BacktestSummaryReportPage({ className }: BacktestSummaryReportProps) {
    const { t } = useTranslation(['reports', 'nav'])
    const { data: report, isLoading, isError, error, refetch } = useBacktestBaselineSummaryReportQuery()
    // Route-level title stays visible without report payload, so local fetch failures do not erase the page shell.
    const pageTitle = report?.title ?? t('route.backtest_summary', { ns: 'nav', defaultValue: 'Backtest summary' })

    const rootClassName = classNames(cls.BacktestSummaryPage, {}, [className ?? ''])
    const documentFreshness = useMemo<ReportDocumentFreshnessInfo>(
        () => ({
            statusMode: 'actual',
            statusTitle: t('backtestSummary.page.status.publishedTitle'),
            statusLines: [
                ...(report ?
                    [
                        {
                            label: t('backtestSummary.page.statusLines.keyValueSections'),
                            value: String(
                                report.sections.filter(
                                    (section): section is KeyValueSectionDto => Array.isArray((section as KeyValueSectionDto).items)
                                ).length
                            )
                        }
                    ]
                :   []),
                ...(report ?
                    [
                        {
                            label: t('backtestSummary.page.statusLines.tableSections'),
                            value: String(
                                report.sections.filter(
                                    (section): section is TableSectionDto =>
                                        Array.isArray((section as TableSectionDto).columns) &&
                                        Array.isArray((section as TableSectionDto).rows)
                                ).length
                            )
                        }
                    ]
                :   [])
            ]
        }),
        [report, t]
    )

    return (
        <div className={rootClassName}>
            <PageDataState
                shell={
                    <header className={cls.header}>
                        <Text type='h1'>{pageTitle}</Text>
                        {report && (
                            <>
                                <Text>{t('backtestSummary.page.reportId', { id: report.id })}</Text>
                                <Text>{t('backtestSummary.page.reportKind', { kind: report.kind })}</Text>
                                <Text>
                                    {t('backtestSummary.page.generatedUtc', {
                                        generatedUtc: (() => {
                                            const generatedUtc = report.generatedAtUtc ? new Date(report.generatedAtUtc) : null
                                            return generatedUtc ?
                                                    generatedUtc.toISOString().replace('T', ' ').replace('Z', ' UTC')
                                                :   '—'
                                        })()
                                    })}
                                </Text>
                                <Text>
                                    {t('backtestSummary.page.generatedLocal', {
                                        generatedLocal:
                                            report.generatedAtUtc ? new Date(report.generatedAtUtc).toLocaleString() : '—'
                                    })}
                                </Text>
                            </>
                        )}
                    </header>
                }
                isLoading={isLoading}
                isError={isError}
                error={error}
                hasData={Boolean(report)}
                onRetry={refetch}
                title={t('backtestSummary.page.errorTitle')}
                loadingText={t('errors:ui.pageDataBoundary.loading', { defaultValue: 'Loading data' })}
                logContext={{ source: 'backtest-summary-report' }}>
                {report && (
                    <div className={cls.sections}>
                        <ReportDocumentView report={report} freshness={documentFreshness} />
                    </div>
                )}
            </PageDataState>
        </div>
    )
}
