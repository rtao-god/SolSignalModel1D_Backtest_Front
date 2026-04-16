import { useModelStatsReportQuery } from '@/shared/api/tanstackQueries/modelStats'
import {
    resolvePublishedReportVariantSelection,
    usePublishedReportVariantCatalogQuery
} from '@/shared/api/tanstackQueries/reportVariants'
import { useModePageBindingState } from '@/shared/api/tanstackQueries/modePageBinding'
import { normalizeErrorLike } from '@/shared/lib/errors/normalizeError'
import type { ModelStatsPageProps } from './modelStatsTypes'
import { ModelStatsPageInner } from './ModelStatsPageInner'
import { useSearchParams } from 'react-router-dom'
import { useCallback, useMemo } from 'react'

function FixedSplitModelStatsPage({ className, embedded = false, familyFilter = null }: ModelStatsPageProps) {
    const [searchParams] = useSearchParams()
    const bindingState = useModePageBindingState('model_stats', 'directional_fixed_split', 'model-stats-page')
    const variantFamilyKey = bindingState.binding?.publishedReportFamilyKey ?? null
    const variantFamilyError = useMemo(
        () =>
            bindingState.binding && !variantFamilyKey ?
                normalizeErrorLike(null, 'Model stats route binding is missing published report family.', {
                    source: 'model-stats-page-binding',
                    domain: 'ui_section',
                    owner: 'model-stats-page',
                    expected: 'The fixed-split model stats route binding should publish its report family key in /api/modes.',
                    requiredAction: 'Inspect /api/modes page binding for model_stats.'
                })
            :   null,
        [bindingState.binding, variantFamilyKey]
    )
    const variantCatalogQuery = usePublishedReportVariantCatalogQuery(variantFamilyKey ?? '__missing_mode_family__', {
        enabled: Boolean(variantFamilyKey) && !bindingState.error && !variantFamilyError
    })
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
            enabled:
                Boolean(variantCatalogQuery.data) &&
                !variantCatalogQuery.isError &&
                !variantResolutionState.error &&
                !bindingState.error &&
                !variantFamilyError
        }
    )
    const mergedError =
        bindingState.error ??
        variantFamilyError ??
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
        bindingState.refetch()
        void variantCatalogQuery.refetch()
        void refetch()
    }, [bindingState, refetch, variantCatalogQuery])

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

export default function ModelStatsPage(props: ModelStatsPageProps) {
    return <FixedSplitModelStatsPage {...props} />
}
