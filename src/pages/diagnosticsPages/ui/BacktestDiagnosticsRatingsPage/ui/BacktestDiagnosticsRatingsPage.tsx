import { useMemo } from 'react'
import PageDataBoundary from '@/shared/ui/errors/PageDataBoundary/ui/PageDataBoundary'
import BacktestDiagnosticsPageLayout from '@/pages/diagnosticsPages/shared/BacktestDiagnosticsPageLayout'
import { useBacktestDiagnosticsReportQuery } from '@/shared/api/tanstackQueries/backtestDiagnostics'
import { splitBacktestDiagnosticsSections } from '@/shared/utils/backtestDiagnosticsSections'
import { renderTermTooltipTitle } from '@/shared/ui/TermTooltip'
import { resolveDiagnosticsColumnTooltipPublic } from '@/shared/utils/reportTooltips'

/*
    BacktestDiagnosticsRatingsPage — рейтинги и топы по бэктесту.

    Зачем:
        - Сосредоточиться на лучших/худших сделках и днях.
        - Быстро находить «что работает» и «что ломает PnL».
*/
const renderRatingColumnTitle = (title: string) =>
    renderTermTooltipTitle(title, resolveDiagnosticsColumnTooltipPublic(title))

export default function BacktestDiagnosticsRatingsPage() {
    const { data, isPending, isError, error, refetch } = useBacktestDiagnosticsReportQuery()

    const tableSections = useMemo(
        () =>
            (data?.sections ?? []).filter(
                section => Array.isArray((section as any).columns) && Array.isArray((section as any).rows)
            ),
        [data]
    )
    const split = useMemo(() => splitBacktestDiagnosticsSections(tableSections), [tableSections])

    return (
        <PageDataBoundary
            isLoading={isPending}
            isError={isError}
            error={error}
            hasData={Boolean(data)}
            onRetry={refetch}
            errorTitle='Не удалось загрузить рейтинги бэктест-диагностики'>
            {data && (
                <BacktestDiagnosticsPageLayout
                    report={data}
                    sections={split.ratings}
                    pageTitle='Рейтинги полисов'
                    pageSubtitle='Лучшие и худшие сделки/дни, а также сводный Equity/DD по топ-3 политикам.'
                    emptyMessage='В отчёте нет таблиц рейтингов.'
                    renderColumnTitle={renderRatingColumnTitle}
                />
            )}
        </PageDataBoundary>
    )
}

