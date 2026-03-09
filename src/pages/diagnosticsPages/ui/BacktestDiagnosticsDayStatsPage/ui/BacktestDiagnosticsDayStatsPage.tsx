import { useMemo } from 'react'
import PageDataBoundary from '@/shared/ui/errors/PageDataBoundary/ui/PageDataBoundary'
import BacktestDiagnosticsPageLayout from '@/pages/diagnosticsPages/shared/BacktestDiagnosticsPageLayout'
import { useBacktestDiagnosticsReportQuery } from '@/shared/api/tanstackQueries/backtestDiagnostics'
import { splitBacktestDiagnosticsSections } from '@/shared/utils/backtestDiagnosticsSections'
import { buildBacktestDiagnosticsQueryArgsFromSearchParams } from '@/shared/utils/backtestDiagnosticsQuery'
import { renderTermTooltipTitle } from '@/shared/ui/TermTooltip'
import { resolveDiagnosticsColumnTooltipPublic } from '@/shared/utils/reportTooltips'
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
    const renderColumnTitle = (title: string) =>
        renderTermTooltipTitle(title, resolveDiagnosticsColumnTooltipPublic(title))

    return (
        <PageDataBoundary
            isLoading={isPending}
            isError={isError}
            error={error}
            hasData={Boolean(data)}
            onRetry={refetch}
            errorTitle={t('diagnosticsReport.pages.dayStats.errorTitle')}>
            {data && (
                <BacktestDiagnosticsPageLayout
                    report={data}
                    sections={split.dayStats}
                    pageTitle={t('diagnosticsReport.pages.dayStats.title')}
                    pageSubtitle={t('diagnosticsReport.pages.dayStats.subtitle')}
                    emptyMessage={t('diagnosticsReport.pages.dayStats.empty')}
                    renderColumnTitle={renderColumnTitle}
                />
            )}
        </PageDataBoundary>
    )
}
