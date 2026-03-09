import { useMemo } from 'react'
import PageDataBoundary from '@/shared/ui/errors/PageDataBoundary/ui/PageDataBoundary'
import BacktestDiagnosticsPageLayout from '@/pages/diagnosticsPages/shared/BacktestDiagnosticsPageLayout'
import { useBacktestDiagnosticsReportQuery } from '@/shared/api/tanstackQueries/backtestDiagnostics'
import {
    getDiagnosticsGroupSections,
    splitBacktestDiagnosticsSections
} from '@/shared/utils/backtestDiagnosticsSections'
import { buildBacktestDiagnosticsQueryArgsFromSearchParams } from '@/shared/utils/backtestDiagnosticsQuery'
import { renderTermTooltipTitle } from '@/shared/ui/TermTooltip'
import { resolveDiagnosticsColumnTooltipPublic } from '@/shared/utils/reportTooltips'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'

/*
    BacktestDiagnosticsGuardrailPage — guardrail/specificity аналитика.

    Зачем:
        - Метрики Specificity/Guardrail и их влияние на сделки.
        - Контроль дрейфа и эффективности фильтра.
*/
export default function BacktestDiagnosticsGuardrailPage() {
    const { t } = useTranslation('reports')
    const [searchParams] = useSearchParams()
    const { data, isPending, isError, error, refetch } = useBacktestDiagnosticsReportQuery(
        buildBacktestDiagnosticsQueryArgsFromSearchParams(searchParams)
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
    const guardrailSections = useMemo(
        () => getDiagnosticsGroupSections(diagnosticsSections, 'guardrail'),
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
            errorTitle={t('diagnosticsReport.pages.guardrail.errorTitle')}>
            {data && (
                <BacktestDiagnosticsPageLayout
                    report={data}
                    sections={guardrailSections}
                    pageTitle={t('diagnosticsReport.pages.guardrail.title')}
                    pageSubtitle={t('diagnosticsReport.pages.guardrail.subtitle')}
                    emptyMessage={t('diagnosticsReport.pages.guardrail.empty')}
                    renderColumnTitle={renderColumnTitle}
                />
            )}
        </PageDataBoundary>
    )
}
