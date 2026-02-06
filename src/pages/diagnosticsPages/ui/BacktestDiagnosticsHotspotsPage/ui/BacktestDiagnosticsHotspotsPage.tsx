import { useMemo } from 'react'
import PageDataBoundary from '@/shared/ui/errors/PageDataBoundary/ui/PageDataBoundary'
import BacktestDiagnosticsPageLayout from '@/pages/diagnosticsPages/shared/BacktestDiagnosticsPageLayout'
import { useBacktestDiagnosticsReportQuery } from '@/shared/api/tanstackQueries/backtestDiagnostics'
import { getDiagnosticsGroupSections, splitBacktestDiagnosticsSections } from '@/shared/utils/backtestDiagnosticsSections'
import { renderTermTooltipTitle } from '@/shared/ui/TermTooltip'
import { resolveDiagnosticsColumnTooltipPublic } from '@/shared/utils/reportTooltips'

/*
    BacktestDiagnosticsHotspotsPage — hotspots по NoTrade/coverage/opposite.

    Зачем:
        - Где именно модель «проваливается» или не торгует.
        - Быстро найти зоны низкого покрытия.
*/

export default function BacktestDiagnosticsHotspotsPage() {
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
    const hotspotSections = useMemo(
        () => getDiagnosticsGroupSections(diagnosticsSections, 'hotspots'),
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
            errorTitle='Не удалось загрузить hotspots‑диагностику'>
            {data && (
                <BacktestDiagnosticsPageLayout
                    report={data}
                    sections={hotspotSections}
                    pageTitle='Hotspots / NoTrade'
                    pageSubtitle='Hotspots по NoTrade, противоположным решениям и низкому покрытию — где стратегия «теряет» дни.'
                    emptyMessage='В отчёте нет таблиц по hotspots.'
                    renderColumnTitle={renderColumnTitle}
                />
            )}
        </PageDataBoundary>
    )
}

