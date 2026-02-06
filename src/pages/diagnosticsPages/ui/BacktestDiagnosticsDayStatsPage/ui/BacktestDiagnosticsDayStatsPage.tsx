import { useMemo } from 'react'
import PageDataBoundary from '@/shared/ui/errors/PageDataBoundary/ui/PageDataBoundary'
import BacktestDiagnosticsPageLayout from '@/pages/diagnosticsPages/shared/BacktestDiagnosticsPageLayout'
import { useBacktestDiagnosticsReportQuery } from '@/shared/api/tanstackQueries/backtestDiagnostics'
import { splitBacktestDiagnosticsSections } from '@/shared/utils/backtestDiagnosticsSections'
import { renderTermTooltipTitle } from '@/shared/ui/TermTooltip'
import { resolveDiagnosticsColumnTooltipPublic } from '@/shared/utils/reportTooltips'

/*
    BacktestDiagnosticsDayStatsPage — статистика по дням.

    Зачем:
        - Разрезы по DayType/weekday и объяснение пропусков.
        - Проверка перекоса рынка и поведения модели.
*/

export default function BacktestDiagnosticsDayStatsPage() {
    const { data, isError, error, refetch } = useBacktestDiagnosticsReportQuery()

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
            isError={isError}
            error={error}
            hasData={Boolean(data)}
            onRetry={refetch}
            errorTitle='Не удалось загрузить статистику по дням'>
            {data && (
                <BacktestDiagnosticsPageLayout
                    report={data}
                    sections={split.dayStats}
                    pageTitle='Статистика по дням'
                    pageSubtitle='Разрезы по DayType/weekday: как рынок распределён и как ведут себя политики в разные режимы.'
                    emptyMessage='В отчёте нет таблиц по дням.'
                    renderColumnTitle={renderColumnTitle}
                />
            )}
        </PageDataBoundary>
    )
}

