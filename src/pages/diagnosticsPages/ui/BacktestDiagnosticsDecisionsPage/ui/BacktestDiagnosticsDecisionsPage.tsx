import { useMemo } from 'react'
import BacktestDiagnosticsPageLayout from '@/pages/diagnosticsPages/shared/BacktestDiagnosticsPageLayout'
import {
    getDiagnosticsGroupSections,
    splitBacktestDiagnosticsSections
} from '@/shared/utils/backtestDiagnosticsSections'
import { BACKTEST_DIAGNOSTICS_NO_BUCKET_CONTROL_AXES } from '@/shared/utils/backtestDiagnosticsPageAxes'
import { useTranslation } from 'react-i18next'
import { BACKTEST_DIAGNOSTICS_QUERY_SCOPES } from '@/shared/api/tanstackQueries/backtestDiagnostics'
import { useBacktestDiagnosticsPublishedPageQuery } from '@/pages/diagnosticsPages/shared/useBacktestDiagnosticsPublishedPageQuery'

/*
    BacktestDiagnosticsDecisionsPage — решения/attribution аналитика.

    Зачем:
        - Кто и почему принял финальное решение.
        - Разделение вины модели и политики.
*/
export default function BacktestDiagnosticsDecisionsPage() {
    const { t } = useTranslation('reports')
    const { data, variantCatalog, isPending, isError, error, refetch } = useBacktestDiagnosticsPublishedPageQuery(
        BACKTEST_DIAGNOSTICS_QUERY_SCOPES.decisionsPage
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
    const decisionSections = useMemo(
        () => getDiagnosticsGroupSections(diagnosticsSections, 'decisions'),
        [diagnosticsSections]
    )
    return (
        <BacktestDiagnosticsPageLayout
            report={data ?? null}
            sections={decisionSections}
            availableAxes={BACKTEST_DIAGNOSTICS_NO_BUCKET_CONTROL_AXES}
            variantCatalog={variantCatalog}
            pageTitle={t('diagnosticsReport.pages.decisions.title')}
            pageSubtitle={t('diagnosticsReport.pages.decisions.subtitle')}
            emptyMessage={t('diagnosticsReport.pages.decisions.empty')}
            errorTitle={t('diagnosticsReport.pages.decisions.errorTitle')}
            isLoading={isPending}
            error={isError ? error : undefined}
            onRetry={refetch}
        />
    )
}
