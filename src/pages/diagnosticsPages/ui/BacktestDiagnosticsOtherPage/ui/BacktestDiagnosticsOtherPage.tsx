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
    BacktestDiagnosticsOtherPage — прочие диагностические таблицы.

    Зачем:
        - Сюда попадают редкие/новые таблицы вне основных групп.
        - Позволяет не терять данные при расширении отчёта.
*/
export default function BacktestDiagnosticsOtherPage() {
    const { t } = useTranslation('reports')
    const [searchParams] = useSearchParams()
    const { data, isPending, isError, error, refetch } = useBacktestDiagnosticsReportQuery(
        buildBacktestDiagnosticsQueryArgsFromSearchParams(searchParams),
        {
            scope: BACKTEST_DIAGNOSTICS_QUERY_SCOPES.otherPage
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
    const otherSections = useMemo(
        () => getDiagnosticsGroupSections(diagnosticsSections, 'other'),
        [diagnosticsSections]
    )
    return (
        <BacktestDiagnosticsPageLayout
            report={data ?? null}
            sections={otherSections}
            availableAxes={BACKTEST_DIAGNOSTICS_NO_BUCKET_CONTROL_AXES}
            pageTitle={t('diagnosticsReport.pages.other.title')}
            pageSubtitle={t('diagnosticsReport.pages.other.subtitle')}
            emptyMessage={t('diagnosticsReport.pages.other.empty')}
            errorTitle={t('diagnosticsReport.pages.other.errorTitle')}
            isLoading={isPending}
            error={isError ? error : undefined}
            onRetry={refetch}
        />
    )
}
