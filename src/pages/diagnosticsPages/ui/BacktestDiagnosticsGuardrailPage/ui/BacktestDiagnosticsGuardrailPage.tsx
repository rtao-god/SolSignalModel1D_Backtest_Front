import { useMemo } from 'react'
import PageDataBoundary from '@/shared/ui/errors/PageDataBoundary/ui/PageDataBoundary'
import BacktestDiagnosticsPageLayout from '@/pages/diagnosticsPages/shared/BacktestDiagnosticsPageLayout'
import { useBacktestDiagnosticsReportQuery } from '@/shared/api/tanstackQueries/backtestDiagnostics'
import { getDiagnosticsGroupSections, splitBacktestDiagnosticsSections } from '@/shared/utils/backtestDiagnosticsSections'
import { renderTermTooltipTitle } from '@/shared/ui/TermTooltip'
import { resolveDiagnosticsColumnTooltipPublic } from '@/shared/utils/reportTooltips'

/*
    BacktestDiagnosticsGuardrailPage — guardrail/specificity аналитика.

    Зачем:
        - Метрики Specificity/Guardrail и их влияние на сделки.
        - Контроль дрейфа и эффективности фильтра.
*/

export default function BacktestDiagnosticsGuardrailPage() {
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
    const guardrailSections = useMemo(
        () => getDiagnosticsGroupSections(diagnosticsSections, 'guardrail'),
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
            errorTitle='Не удалось загрузить guardrail-диагностику'>
            {data && (
                <BacktestDiagnosticsPageLayout
                    report={data}
                    sections={guardrailSections}
                    pageTitle='Guardrail / Specificity'
                    pageSubtitle='Guardrail‑метрики: специфичность, чувствительность, rolling‑пороги и экономический эффект блокировок.'
                    emptyMessage='В отчёте нет таблиц guardrail/specificity.'
                    renderColumnTitle={renderColumnTitle}
                />
            )}
        </PageDataBoundary>
    )
}

