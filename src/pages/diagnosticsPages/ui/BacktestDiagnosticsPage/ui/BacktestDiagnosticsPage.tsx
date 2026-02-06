import { useMemo } from 'react'
import PageDataBoundary from '@/shared/ui/errors/PageDataBoundary/ui/PageDataBoundary'
import BacktestDiagnosticsPageLayout from '@/pages/diagnosticsPages/shared/BacktestDiagnosticsPageLayout'
import { useBacktestDiagnosticsReportQuery } from '@/shared/api/tanstackQueries/backtestDiagnostics'
import { getDiagnosticsGroupSections, splitBacktestDiagnosticsSections } from '@/shared/utils/backtestDiagnosticsSections'
import { renderTermTooltipTitle } from '@/shared/ui/TermTooltip'
import { resolveDiagnosticsColumnTooltipPublic } from '@/shared/utils/reportTooltips'

/*
    BacktestDiagnosticsPage — риск/ликвидации.

    Зачем:
        - Сфокусировать риск‑метрики и ликвидации в отдельной теме.
        - Быстро находить причины слива по Equity/DD и liq‑событиям.
*/

export default function BacktestDiagnosticsPage() {
    const { data, isError, error, refetch } = useBacktestDiagnosticsReportQuery()

    const tableSections = useMemo(
        () =>
            (data?.sections ?? []).filter(
                section => Array.isArray((section as any).columns) && Array.isArray((section as any).rows)
            ),
        [data]
    )
    const split = useMemo(() => splitBacktestDiagnosticsSections(tableSections), [tableSections])
    const diagnosticsSections = useMemo(
        () => [...split.diagnostics, ...split.unknown],
        [split]
    )
    const riskSections = useMemo(
        () => getDiagnosticsGroupSections(diagnosticsSections, 'risk'),
        [diagnosticsSections]
    )
    const renderColumnTitle = (title: string) =>
        renderTermTooltipTitle(title, resolveDiagnosticsColumnTooltipPublic(title))

    return (
        <PageDataBoundary
            isError={isError}
            error={error}
            hasData={Boolean(data)}
            onRetry={refetch}
            errorTitle='Не удалось загрузить диагностику бэктеста'>
            {data && (
                <BacktestDiagnosticsPageLayout
                    report={data}
                    sections={riskSections}
                    pageTitle='Риск и ликвидации'
                    pageSubtitle='Ликвидации, Equity/DD и риск‑метрики. Здесь видно, как глубоко проседал капитал и насколько близко сделки подходили к ликвидации.'
                    emptyMessage='В отчёте нет таблиц по риску и ликвидациям.'
                    renderColumnTitle={renderColumnTitle}
                />
            )}
        </PageDataBoundary>
    )
}

