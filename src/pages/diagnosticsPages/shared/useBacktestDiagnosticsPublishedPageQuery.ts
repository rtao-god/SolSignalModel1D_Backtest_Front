import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
    useBacktestDiagnosticsReportQuery,
    type BacktestDiagnosticsQueryScope
} from '@/shared/api/tanstackQueries/backtestDiagnostics'
import { usePublishedReportVariantCatalogQuery } from '@/shared/api/tanstackQueries/reportVariants'
import {
    buildBacktestDiagnosticsQueryArgs,
    resolveBacktestDiagnosticsSearchSelection
} from '@/shared/utils/backtestDiagnosticsQuery'
import { normalizeErrorLike } from '@/shared/lib/errors/normalizeError'
import { useModePageBindingState } from '@/shared/api/tanstackQueries/modePageBinding'
import type { ModePageKey } from '@/entities/mode'

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
    pageKey: ModePageKey,
    scope: BacktestDiagnosticsQueryScope
): UseBacktestDiagnosticsPublishedPageQueryResult {
    const [searchParams] = useSearchParams()
    const bindingState = useModePageBindingState(pageKey, 'directional_fixed_split', 'backtest-diagnostics-page-query')
    const variantFamilyKey = bindingState.binding?.publishedReportFamilyKey ?? null
    const variantFamilyError = useMemo(
        () =>
            bindingState.binding && !variantFamilyKey ?
                normalizeErrorLike(null, 'Diagnostics route binding is missing published report family.', {
                    source: 'diagnostics-page-binding',
                    domain: 'ui_section',
                    owner: 'backtest-diagnostics-page-query',
                    expected: 'The fixed-split diagnostics route binding should publish its report family key in /api/modes.',
                    requiredAction: `Inspect /api/modes page binding for diagnostics pageKey='${pageKey}'.`
                })
            :   null,
        [bindingState.binding, pageKey, variantFamilyKey]
    )
    const catalogQuery = usePublishedReportVariantCatalogQuery(variantFamilyKey ?? '__missing_mode_family__', {
        enabled: Boolean(variantFamilyKey) && !bindingState.error && !variantFamilyError
    })

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
        enabled:
            Boolean(catalogQuery.data) &&
            !catalogQuery.isError &&
            !diagnosticsSelectionState.error &&
            !bindingState.error &&
            !variantFamilyError
    })

    const error =
        bindingState.error ??
        variantFamilyError ??
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
        bindingState.refetch()
        void catalogQuery.refetch()
        void reportQuery.refetch()
    }, [bindingState, catalogQuery, reportQuery])

    return {
        data: reportQuery.data,
        variantCatalog: catalogQuery.data ?? null,
        isPending: catalogQuery.isPending || reportQuery.isPending,
        isError: Boolean(error),
        error,
        refetch
    }
}
