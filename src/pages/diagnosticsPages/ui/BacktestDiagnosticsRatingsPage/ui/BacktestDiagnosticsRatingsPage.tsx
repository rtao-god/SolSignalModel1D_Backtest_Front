import { useMemo } from 'react'
import BacktestDiagnosticsPageLayout from '@/pages/diagnosticsPages/shared/BacktestDiagnosticsPageLayout'
import { BACKTEST_DIAGNOSTICS_QUERY_SCOPES } from '@/shared/api/tanstackQueries/backtestDiagnostics'
import { splitBacktestDiagnosticsSections } from '@/shared/utils/backtestDiagnosticsSections'
import { BACKTEST_DIAGNOSTICS_FULL_CONTROL_AXES } from '@/shared/utils/backtestDiagnosticsPageAxes'
import { useTranslation } from 'react-i18next'
import { useBacktestDiagnosticsPublishedPageQuery } from '@/pages/diagnosticsPages/shared/useBacktestDiagnosticsPublishedPageQuery'

/*
    BacktestDiagnosticsRatingsPage — рейтинги и топы по бэктесту.

    Зачем:
        - Сосредоточиться на лучших/худших сделках и днях.
        - Быстро находить «что работает» и «что ломает PnL».
*/
export default function BacktestDiagnosticsRatingsPage() {
    const { t } = useTranslation('reports')
    const { data, variantCatalog, isPending, isError, error, refetch } = useBacktestDiagnosticsPublishedPageQuery(
        BACKTEST_DIAGNOSTICS_QUERY_SCOPES.ratingsPage
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
        <BacktestDiagnosticsPageLayout
            report={data ?? null}
            sections={split.ratings}
            availableAxes={BACKTEST_DIAGNOSTICS_FULL_CONTROL_AXES}
            variantCatalog={variantCatalog}
            pageTitle={t('diagnosticsReport.pages.ratings.title')}
            pageSubtitle={t('diagnosticsReport.pages.ratings.subtitle')}
            emptyMessage={t('diagnosticsReport.pages.ratings.empty')}
            errorTitle={t('diagnosticsReport.pages.ratings.errorTitle')}
            isLoading={isPending}
            error={isError ? error : undefined}
            onRetry={refetch}
        />
    )
}
