import classNames from '@/shared/lib/helpers/classNames'
import cls from './BacktestSummaryReportPage.module.scss'
import { Text } from '@/shared/ui'
import type BacktestSummaryReportProps from './types'
import {
    ReportDocumentView,
    type ReportDocumentFreshnessInfo
} from '@/shared/ui/ReportDocumentView/ui/ReportDocumentView'
import { useBacktestBaselineSummaryReportWithFreshnessQuery } from '@/shared/api/tanstackQueries/backtest'
import { SectionDataState } from '@/shared/ui/errors/SectionDataState'
import { useTranslation } from 'react-i18next'
import { useMemo } from 'react'

export default function BacktestSummaryReportPage({ className }: BacktestSummaryReportProps) {
    const { t } = useTranslation(['reports', 'nav'])
    const { data, isLoading, isError, error, refetch } = useBacktestBaselineSummaryReportWithFreshnessQuery()
    const report = data?.report ?? null
    const freshness = data?.freshness ?? null
    // Route-level title stays visible without report payload, so local fetch failures do not erase the page shell.
    const pageTitle = report?.title ?? t('route.backtest_summary', { ns: 'nav', defaultValue: 'Backtest summary' })

    const rootClassName = classNames(cls.BacktestSummaryPage, {}, [className ?? ''])
    const documentFreshness = useMemo<ReportDocumentFreshnessInfo>(
        () => ({
            statusMode: freshness?.sourceMode === 'actual' ? 'actual' : 'debug',
            statusTitle:
                freshness?.sourceMode === 'actual' ?
                    t('backtestSummary.page.status.actualTitle')
                :   t('backtestSummary.page.status.debugTitle'),
            statusMessage: freshness?.message ?? t('backtestSummary.page.status.unavailableMessage'),
            statusLines: [
                ...(freshness?.keyValueSectionCount !== null && freshness?.keyValueSectionCount !== undefined ?
                    [
                        {
                            label: t('backtestSummary.page.statusLines.keyValueSections'),
                            value: String(freshness.keyValueSectionCount)
                        }
                    ]
                :   []),
                ...(freshness?.tableSectionCount !== null && freshness?.tableSectionCount !== undefined ?
                    [
                        {
                            label: t('backtestSummary.page.statusLines.tableSections'),
                            value: String(freshness.tableSectionCount)
                        }
                    ]
                :   [])
            ]
        }),
        [freshness, t]
    )

    return (
        <div className={rootClassName}>
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

            <SectionDataState
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
            </SectionDataState>
        </div>
    )
}
