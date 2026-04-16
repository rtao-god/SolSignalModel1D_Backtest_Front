import { useMemo } from 'react'
import BacktestDiagnosticsPageLayout from '@/pages/diagnosticsPages/shared/BacktestDiagnosticsPageLayout'
import {
    getDiagnosticsGroupSections,
    splitBacktestDiagnosticsSections
} from '@/shared/utils/backtestDiagnosticsSections'
import { BACKTEST_DIAGNOSTICS_FULL_CONTROL_AXES } from '@/shared/utils/backtestDiagnosticsPageAxes'
import { useTranslation } from 'react-i18next'
import { BACKTEST_DIAGNOSTICS_QUERY_SCOPES } from '@/shared/api/tanstackQueries/backtestDiagnostics'
import { useBacktestDiagnosticsPublishedPageQuery } from '@/pages/diagnosticsPages/shared/useBacktestDiagnosticsPublishedPageQuery'

/*
    BacktestDiagnosticsPage — риск/ликвидации.

    Зачем:
        - Сфокусировать риск‑метрики и ликвидации в отдельной теме.
        - Быстро находить причины слива по Equity/DD и liq‑событиям.
*/
function FixedSplitBacktestDiagnosticsPage() {
    const { t } = useTranslation('reports')
    const { data, variantCatalog, isPending, isError, error, refetch } = useBacktestDiagnosticsPublishedPageQuery(
        'diagnostics_backtest',
        BACKTEST_DIAGNOSTICS_QUERY_SCOPES.backtestPage
    )

    const tableSections = useMemo(
        () =>
            (data?.sections ?? []).filter(
                section => Array.isArray((section as any).columns) && Array.isArray((section as any).rows)
            ),
        [data]
    )
    const split = useMemo(() => splitBacktestDiagnosticsSections(tableSections), [tableSections])
    const diagnosticsSections = useMemo(() => [...split.diagnostics, ...split.unknown], [split])
    const riskSections = useMemo(() => getDiagnosticsGroupSections(diagnosticsSections, 'risk'), [diagnosticsSections])
    return (
        <BacktestDiagnosticsPageLayout
            report={data ?? null}
            sections={riskSections}
            availableAxes={BACKTEST_DIAGNOSTICS_FULL_CONTROL_AXES}
            variantCatalog={variantCatalog}
            pageTitle={t('diagnosticsReport.pages.risk.title')}
            pageSubtitle={t('diagnosticsReport.pages.risk.subtitle')}
            emptyMessage={t('diagnosticsReport.pages.risk.empty')}
            errorTitle={t('diagnosticsReport.pages.risk.errorTitle')}
            isLoading={isPending}
            error={isError ? error : undefined}
            onRetry={refetch}
        />
    )
}

export default function BacktestDiagnosticsPage() {
    return <FixedSplitBacktestDiagnosticsPage />
}
