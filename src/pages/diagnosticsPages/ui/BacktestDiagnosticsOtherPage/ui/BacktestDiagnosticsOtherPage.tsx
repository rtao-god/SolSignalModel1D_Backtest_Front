import { useMemo } from 'react'
import PageDataBoundary from '@/shared/ui/errors/PageDataBoundary/ui/PageDataBoundary'
import BacktestDiagnosticsPageLayout from '@/pages/diagnosticsPages/shared/BacktestDiagnosticsPageLayout'
import { useBacktestDiagnosticsReportQuery } from '@/shared/api/tanstackQueries/backtestDiagnostics'
import {
    getDiagnosticsGroupSections,
    splitBacktestDiagnosticsSections
} from '@/shared/utils/backtestDiagnosticsSections'
import { renderTermTooltipTitle } from '@/shared/ui/TermTooltip'
import { resolveDiagnosticsColumnTooltipPublic } from '@/shared/utils/reportTooltips'
import { useTranslation } from 'react-i18next'

/*
    BacktestDiagnosticsOtherPage — прочие диагностические таблицы.

    Зачем:
        - Сюда попадают редкие/новые таблицы вне основных групп.
        - Позволяет не терять данные при расширении отчёта.
*/
export default function BacktestDiagnosticsOtherPage() {
    const { t } = useTranslation('reports')
    const { data, isPending, isError, error, refetch } = useBacktestDiagnosticsReportQuery()

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
    const renderColumnTitle = (title: string) =>
        renderTermTooltipTitle(title, resolveDiagnosticsColumnTooltipPublic(title))

    return (
        <PageDataBoundary
            isLoading={isPending}
            isError={isError}
            error={error}
            hasData={Boolean(data)}
            onRetry={refetch}
            errorTitle={t('diagnosticsReport.pages.other.errorTitle')}>
            {data && (
                <BacktestDiagnosticsPageLayout
                    report={data}
                    sections={otherSections}
                    pageTitle={t('diagnosticsReport.pages.other.title')}
                    pageSubtitle={t('diagnosticsReport.pages.other.subtitle')}
                    emptyMessage={t('diagnosticsReport.pages.other.empty')}
                    renderColumnTitle={renderColumnTitle}
                />
            )}
        </PageDataBoundary>
    )
}
