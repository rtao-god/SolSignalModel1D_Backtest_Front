import { useMemo } from 'react'
import BacktestDiagnosticsPageLayout from '@/pages/diagnosticsPages/shared/BacktestDiagnosticsPageLayout'
import {
    BACKTEST_DIAGNOSTICS_QUERY_SCOPES,
    useBacktestDiagnosticsReportQuery
} from '@/shared/api/tanstackQueries/backtestDiagnostics'
import {
    getDiagnosticsGroupSections,
    splitBacktestDiagnosticsSections
} from '@/shared/utils/backtestDiagnosticsSections'
import { buildBacktestDiagnosticsQueryArgsFromSearchParams } from '@/shared/utils/backtestDiagnosticsQuery'
import { BACKTEST_DIAGNOSTICS_NO_BUCKET_CONTROL_AXES } from '@/shared/utils/backtestDiagnosticsPageAxes'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'

/*
    BacktestDiagnosticsHotspotsPage — hotspots по NoTrade/coverage/opposite.

    Зачем:
        - Где именно модель «проваливается» или не торгует.
        - Быстро найти зоны низкого покрытия.
*/
export default function BacktestDiagnosticsHotspotsPage() {
    const { t } = useTranslation('reports')
    const [searchParams] = useSearchParams()
    const { data, isPending, isError, error, refetch } = useBacktestDiagnosticsReportQuery(
        buildBacktestDiagnosticsQueryArgsFromSearchParams(searchParams),
        {
            scope: BACKTEST_DIAGNOSTICS_QUERY_SCOPES.hotspotsPage
        }
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
    const hotspotSections = useMemo(
        () => getDiagnosticsGroupSections(diagnosticsSections, 'hotspots'),
        [diagnosticsSections]
    )
    return (
        <BacktestDiagnosticsPageLayout
            report={data ?? null}
            sections={hotspotSections}
            availableAxes={BACKTEST_DIAGNOSTICS_NO_BUCKET_CONTROL_AXES}
            pageTitle={t('diagnosticsReport.pages.hotspots.title')}
            pageSubtitle={t('diagnosticsReport.pages.hotspots.subtitle')}
            emptyMessage={t('diagnosticsReport.pages.hotspots.empty')}
            errorTitle={t('diagnosticsReport.pages.hotspots.errorTitle')}
            isLoading={isPending}
            error={isError ? error : undefined}
            onRetry={refetch}
        />
    )
}
