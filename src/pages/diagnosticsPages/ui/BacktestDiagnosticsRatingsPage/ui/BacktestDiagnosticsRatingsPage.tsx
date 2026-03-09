import { useMemo } from 'react'
import PageDataBoundary from '@/shared/ui/errors/PageDataBoundary/ui/PageDataBoundary'
import BacktestDiagnosticsPageLayout from '@/pages/diagnosticsPages/shared/BacktestDiagnosticsPageLayout'
import { useBacktestDiagnosticsReportQuery } from '@/shared/api/tanstackQueries/backtestDiagnostics'
import { splitBacktestDiagnosticsSections } from '@/shared/utils/backtestDiagnosticsSections'
import { renderTermTooltipTitle } from '@/shared/ui/TermTooltip'
import { resolveDiagnosticsColumnTooltipPublic } from '@/shared/utils/reportTooltips'
import { buildBacktestDiagnosticsQueryArgsFromSearchParams } from '@/shared/utils/backtestDiagnosticsQuery'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'

/*
    BacktestDiagnosticsRatingsPage — рейтинги и топы по бэктесту.

    Зачем:
        - Сосредоточиться на лучших/худших сделках и днях.
        - Быстро находить «что работает» и «что ломает PnL».
*/
const renderRatingColumnTitle = (title: string) =>
    renderTermTooltipTitle(title, resolveDiagnosticsColumnTooltipPublic(title))

export default function BacktestDiagnosticsRatingsPage() {
    const { t } = useTranslation('reports')
    const [searchParams] = useSearchParams()
    const { data, isPending, isError, error, refetch } = useBacktestDiagnosticsReportQuery(
        buildBacktestDiagnosticsQueryArgsFromSearchParams(searchParams)
    )

    const tableSections = useMemo(
        () =>
            (data?.sections ?? []).filter(
                section => Array.isArray((section as any).columns) && Array.isArray((section as any).rows)
            ),
        [data]
    )
    const split = useMemo(() => splitBacktestDiagnosticsSections(tableSections), [tableSections])

    return (
        <PageDataBoundary
            isLoading={isPending}
            isError={isError}
            error={error}
            hasData={Boolean(data)}
            onRetry={refetch}
            errorTitle={t('diagnosticsReport.pages.ratings.errorTitle')}>
            {data && (
                <BacktestDiagnosticsPageLayout
                    report={data}
                    sections={split.ratings}
                    pageTitle={t('diagnosticsReport.pages.ratings.title')}
                    pageSubtitle={t('diagnosticsReport.pages.ratings.subtitle')}
                    emptyMessage={t('diagnosticsReport.pages.ratings.empty')}
                    renderColumnTitle={renderRatingColumnTitle}
                />
            )}
        </PageDataBoundary>
    )
}
