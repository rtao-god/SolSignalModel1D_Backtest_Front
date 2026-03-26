import { useModelStatsReportQuery } from '@/shared/api/tanstackQueries/modelStats'
import {
    PUBLISHED_REPORT_VARIANT_FAMILIES,
    resolvePublishedReportVariantSelection,
    usePublishedReportVariantCatalogQuery
} from '@/shared/api/tanstackQueries/reportVariants'
import type { ModelStatsPageProps } from './modelStatsTypes'
import { ModelStatsPageInner } from './ModelStatsPageInner'
import { useSearchParams } from 'react-router-dom'
import { useCallback, useMemo } from 'react'

export default function ModelStatsPage({ className }: ModelStatsPageProps) {
    const [searchParams] = useSearchParams()
    const variantCatalogQuery = usePublishedReportVariantCatalogQuery(PUBLISHED_REPORT_VARIANT_FAMILIES.backtestModelStats)
    const variantResolutionState = useMemo(() => {
        if (!variantCatalogQuery.data) {
            return {
                value: null,
                error: null as Error | null
            }
        }

        try {
            return {
                value: resolvePublishedReportVariantSelection(variantCatalogQuery.data, {
                    segment: searchParams.get('segment'),
                    view: searchParams.get('view')
                }),
                error: null as Error | null
            }
        } catch (err) {
            const safeError = err instanceof Error ? err : new Error('Failed to resolve model-stats variant.')
            return {
                value: null,
                error: safeError
            }
        }
    }, [searchParams, variantCatalogQuery.data])
    const { data, isLoading, isError, error, refetch } = useModelStatsReportQuery(
        {
            segment: variantResolutionState.value?.selection.segment ?? null,
            view: variantResolutionState.value?.selection.view ?? null
        },
        {
            enabled: Boolean(variantCatalogQuery.data) && !variantCatalogQuery.isError && !variantResolutionState.error
        }
    )
    const mergedError =
        (variantCatalogQuery.isError ? variantCatalogQuery.error ?? new Error('Failed to load model-stats catalog.') : null) ??
        (isError ? error : null)
    const handleRetry = useCallback(() => {
        void variantCatalogQuery.refetch()
        void refetch()
    }, [refetch, variantCatalogQuery])

    return (
        <ModelStatsPageInner
            className={className}
            data={data ?? null}
            variantCatalog={variantCatalogQuery.data ?? null}
            isLoading={variantCatalogQuery.isPending || isLoading}
            error={mergedError}
            onRetry={handleRetry}
        />
    )
}
