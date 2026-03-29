import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
    useBacktestDiagnosticsReportQuery,
    type BacktestDiagnosticsQueryScope
} from '@/shared/api/tanstackQueries/backtestDiagnostics'
import {
    PUBLISHED_REPORT_VARIANT_FAMILIES,
    usePublishedReportVariantCatalogQuery
} from '@/shared/api/tanstackQueries/reportVariants'
import {
    buildBacktestDiagnosticsQueryArgs,
    resolveBacktestDiagnosticsSearchSelection
} from '@/shared/utils/backtestDiagnosticsQuery'
import { normalizeErrorLike } from '@/shared/lib/errors/normalizeError'

interface UseBacktestDiagnosticsPublishedPageQueryResult {
    data: ReturnType<typeof useBacktestDiagnosticsReportQuery>['data']
    variantCatalog: ReturnType<typeof usePublishedReportVariantCatalogQuery>['data'] | null
    isPending: boolean
    isError: boolean
    error: Error | null
    refetch: () => void
}

/**
 * Общий owner-хук diagnostics-страниц.
 * Источник правды для допустимых query-комбинаций теперь идёт только из published catalog.
 */
export function useBacktestDiagnosticsPublishedPageQuery(
    scope: BacktestDiagnosticsQueryScope
): UseBacktestDiagnosticsPublishedPageQueryResult {
    const [searchParams] = useSearchParams()
    const catalogQuery = usePublishedReportVariantCatalogQuery(PUBLISHED_REPORT_VARIANT_FAMILIES.backtestDiagnostics)

    const diagnosticsSelectionState = useMemo(() => {
        if (!catalogQuery.data) {
            return {
                value: null,
                error: null as Error | null
            }
        }

        try {
            return {
                value: resolveBacktestDiagnosticsSearchSelection(searchParams, catalogQuery.data),
                error: null as Error | null
            }
        } catch (err) {
            const safeError = normalizeErrorLike(err, 'Failed to resolve diagnostics selection.', {
                source: 'diagnostics-selection-state',
                domain: 'ui_section',
                owner: 'backtest-diagnostics-page-query',
                expected: 'Diagnostics page query should resolve a published catalog-compatible selection.',
                requiredAction: 'Inspect diagnostics query params and published variant catalog.'
            })
            return {
                value: null,
                error: safeError
            }
        }
    }, [catalogQuery.data, searchParams])

    const queryArgs = useMemo(
        () =>
            diagnosticsSelectionState.value ? buildBacktestDiagnosticsQueryArgs(diagnosticsSelectionState.value) : undefined,
        [diagnosticsSelectionState.value]
    )

    const reportQuery = useBacktestDiagnosticsReportQuery(queryArgs, {
        scope,
        enabled: Boolean(catalogQuery.data) && !catalogQuery.isError && !diagnosticsSelectionState.error
    })

    const error =
        diagnosticsSelectionState.error ??
        (catalogQuery.isError ?
            (catalogQuery.error ??
                normalizeErrorLike(null, 'Failed to load diagnostics catalog.', {
                    source: 'diagnostics-catalog-query',
                    domain: 'ui_section',
                    owner: 'backtest-diagnostics-page-query',
                    expected: 'Diagnostics page query should receive a published diagnostics catalog or a detailed API error.',
                    requiredAction: 'Inspect published diagnostics catalog endpoint and response envelope.'
                }))
        :   null) ??
        (reportQuery.isError ?
            (reportQuery.error ??
                normalizeErrorLike(null, 'Failed to load diagnostics report.', {
                    source: 'diagnostics-report-query',
                    domain: 'ui_section',
                    owner: 'backtest-diagnostics-page-query',
                    expected: 'Diagnostics page query should receive a published diagnostics report or a detailed API error.',
                    requiredAction: 'Inspect diagnostics report endpoint and response envelope.'
                }))
        :   null)

    const refetch = useCallback(() => {
        void catalogQuery.refetch()
        void reportQuery.refetch()
    }, [catalogQuery, reportQuery])

    return {
        data: reportQuery.data,
        variantCatalog: catalogQuery.data ?? null,
        isPending: catalogQuery.isPending || reportQuery.isPending,
        isError: Boolean(error),
        error,
        refetch
    }
}
