import { useMemo } from 'react'
import BacktestDiagnosticsPageLayout from '@/pages/diagnosticsPages/shared/BacktestDiagnosticsPageLayout'
import {
    BACKTEST_DIAGNOSTICS_QUERY_SCOPES,
    useBacktestDiagnosticsReportQuery
} from '@/shared/api/tanstackQueries/backtestDiagnostics'
import { splitBacktestDiagnosticsSections } from '@/shared/utils/backtestDiagnosticsSections'
import { buildBacktestDiagnosticsQueryArgsFromSearchParams } from '@/shared/utils/backtestDiagnosticsQuery'
import { BACKTEST_DIAGNOSTICS_FULL_CONTROL_AXES } from '@/shared/utils/backtestDiagnosticsPageAxes'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'

/*
    BacktestDiagnosticsDayStatsPage — статистика по дням.

    Зачем:
        - Разрезы по DayType/weekday и объяснение пропусков.
        - Проверка перекоса рынка и поведения модели.
*/
export default function BacktestDiagnosticsDayStatsPage() {
    const { t } = useTranslation('reports')
    const [searchParams] = useSearchParams()
    const { data, isPending, isError, error, refetch } = useBacktestDiagnosticsReportQuery(
        buildBacktestDiagnosticsQueryArgsFromSearchParams(searchParams),
        {
            scope: BACKTEST_DIAGNOSTICS_QUERY_SCOPES.dayStatsPage
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
    return (
        <BacktestDiagnosticsPageLayout
            report={data ?? null}
            sections={split.dayStats}
            availableAxes={BACKTEST_DIAGNOSTICS_FULL_CONTROL_AXES}
            pageTitle={t('diagnosticsReport.pages.dayStats.title')}
            pageSubtitle={t('diagnosticsReport.pages.dayStats.subtitle')}
            emptyMessage={t('diagnosticsReport.pages.dayStats.empty')}
            errorTitle={t('diagnosticsReport.pages.dayStats.errorTitle')}
            isLoading={isPending}
            error={isError ? error : undefined}
            onRetry={refetch}
        />
    )
}
