import { useMemo } from 'react'
import PageDataBoundary from '@/shared/ui/errors/PageDataBoundary/ui/PageDataBoundary'
import BacktestDiagnosticsPageLayout from '@/pages/diagnosticsPages/shared/BacktestDiagnosticsPageLayout'
import { useBacktestDiagnosticsReportQuery } from '@/shared/api/tanstackQueries/backtestDiagnostics'
import { getDiagnosticsGroupSections, splitBacktestDiagnosticsSections } from '@/shared/utils/backtestDiagnosticsSections'
import { renderTermTooltipTitle } from '@/shared/ui/TermTooltip'
import { resolveDiagnosticsColumnTooltipPublic } from '@/shared/utils/reportTooltips'

/*
    BacktestDiagnosticsDecisionsPage — решения/attribution аналитика.

    Зачем:
        - Кто и почему принял финальное решение.
        - Разделение вины модели и политики.
*/
export default function BacktestDiagnosticsDecisionsPage() {
    const { data, isPending, isError, error, refetch } = useBacktestDiagnosticsReportQuery()

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
    const decisionSections = useMemo(
        () => getDiagnosticsGroupSections(diagnosticsSections, 'decisions'),
        [diagnosticsSections]
    )
    const renderColumnTitle = (title: string) =>
        renderTermTooltipTitle(title, resolveDiagnosticsColumnTooltipPublic(title))

    return (
        <PageDataBoundary
            isLoading={isPending}
            isError={isError}
            error={error}
            hasData={Boolean(data)}
            onRetry={refetch}
            errorTitle='Не удалось загрузить анализ решений'>
            {data && (
                <BacktestDiagnosticsPageLayout
                    report={data}
                    sections={decisionSections}
                    pageTitle='Решения и Attribution'
                    pageSubtitle='Почему принимается действие: разложение по актёрам, причинам и blame‑split для поиска «виновника» ошибок.'
                    emptyMessage='В отчёте нет таблиц по решениям и attribution.'
                    renderColumnTitle={renderColumnTitle}
                />
            )}
        </PageDataBoundary>
    )
}

