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
    BacktestDiagnosticsOtherPage — прочие диагностические таблицы.

    Зачем:
        - Сюда попадают редкие/новые таблицы вне основных групп.
        - Позволяет не терять данные при расширении отчёта.
*/
export default function BacktestDiagnosticsOtherPage() {
    const { t } = useTranslation('reports')
    const { data, variantCatalog, isPending, isError, error, refetch } = useBacktestDiagnosticsPublishedPageQuery(
        'diagnostics_other',
        BACKTEST_DIAGNOSTICS_QUERY_SCOPES.otherPage
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
            variantCatalog={variantCatalog}
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
