import { useModelStatsReportQuery } from '@/shared/api/tanstackQueries/modelStats'
import {
    PUBLISHED_REPORT_VARIANT_FAMILIES,
    resolvePublishedReportVariantSelection,
    usePublishedReportVariantCatalogQuery
} from '@/shared/api/tanstackQueries/reportVariants'
import { normalizeErrorLike } from '@/shared/lib/errors/normalizeError'
import type { ModelStatsPageProps } from './modelStatsTypes'
import { ModelStatsPageInner } from './ModelStatsPageInner'
import { useSearchParams } from 'react-router-dom'
import { useCallback, useMemo } from 'react'

export default function ModelStatsPage({ className, embedded = false, familyFilter = null }: ModelStatsPageProps) {
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
            const safeError = normalizeErrorLike(err, 'Failed to resolve model-stats variant.', {
                source: 'model-stats-page-variant',
                domain: 'ui_section',
                owner: 'model-stats-page',
                expected: 'Model stats page should resolve a published variant from URL params and catalog.',
                requiredAction: 'Inspect model-stats URL params and published variant catalog.'
            })
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
        (variantCatalogQuery.isError ?
            (variantCatalogQuery.error ??
                normalizeErrorLike(null, 'Failed to load model-stats catalog.', {
                    source: 'model-stats-catalog-query',
                    domain: 'ui_section',
                    owner: 'model-stats-page',
                    expected: 'Model stats page should receive a published variant catalog or a detailed API error.',
                    requiredAction: 'Inspect model-stats catalog endpoint and response envelope.'
                }))
        :   null) ??
        (isError ? error : null)
    const handleRetry = useCallback(() => {
        void variantCatalogQuery.refetch()
        void refetch()
    }, [refetch, variantCatalogQuery])

    return (
        <ModelStatsPageInner
            className={className}
            embedded={embedded}
            familyFilter={familyFilter}
            data={data ?? null}
            variantCatalog={variantCatalogQuery.data ?? null}
            isLoading={variantCatalogQuery.isPending || isLoading}
            error={mergedError}
            onRetry={handleRetry}
        />
    )
}
