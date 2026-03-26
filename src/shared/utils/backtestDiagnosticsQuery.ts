import type { BacktestDiagnosticsReportQueryArgs } from '@/shared/api/tanstackQueries/backtestDiagnostics'
import {
    resolvePublishedReportVariantSelection,
    type PublishedReportVariantCatalogDto
} from '@/shared/api/tanstackQueries/reportVariants'
import {
    resolvePolicyBranchMegaBucketFromQuery,
    resolvePolicyBranchMegaSlModeFromQuery,
    resolvePolicyBranchMegaTpSlModeFromQuery,
    resolvePolicyBranchMegaZonalModeFromQuery,
    type PolicyBranchMegaBucketMode,
    type PolicyBranchMegaSlMode,
    type PolicyBranchMegaTpSlMode,
    type PolicyBranchMegaZonalMode
} from '@/shared/utils/policyBranchMegaTabs'

// Analysis и diagnostics используют один search-контракт для bucket-фильтра,
// поэтому owner-default задаётся здесь и автоматически переиспользуется в роутинге и warmup-query.
export const DEFAULT_DIAGNOSTICS_BUCKET_MODE: PolicyBranchMegaBucketMode = 'daily'
export const DEFAULT_DIAGNOSTICS_TP_SL_MODE: PolicyBranchMegaTpSlMode = 'all'
export const DEFAULT_DIAGNOSTICS_SL_MODE: PolicyBranchMegaSlMode = 'all'
export const DEFAULT_DIAGNOSTICS_ZONAL_MODE: PolicyBranchMegaZonalMode = 'with-zonal'

export interface BacktestDiagnosticsSearchSelection {
    bucket: PolicyBranchMegaBucketMode
    tpSlMode: PolicyBranchMegaTpSlMode
    slMode: PolicyBranchMegaSlMode
    zonalMode: PolicyBranchMegaZonalMode
}

export const DEFAULT_BACKTEST_DIAGNOSTICS_SELECTION: BacktestDiagnosticsSearchSelection = {
    bucket: DEFAULT_DIAGNOSTICS_BUCKET_MODE,
    tpSlMode: DEFAULT_DIAGNOSTICS_TP_SL_MODE,
    slMode: DEFAULT_DIAGNOSTICS_SL_MODE,
    zonalMode: DEFAULT_DIAGNOSTICS_ZONAL_MODE
}

export function resolveBacktestDiagnosticsSearchSelection(
    searchParams: URLSearchParams,
    catalog?: PublishedReportVariantCatalogDto
): BacktestDiagnosticsSearchSelection {
    if (!(searchParams instanceof URLSearchParams)) {
        throw new Error('[backtest-diagnostics] searchParams must be URLSearchParams.')
    }

    if (catalog) {
        const resolution = resolvePublishedReportVariantSelection(catalog, {
            bucket: searchParams.get('bucket'),
            tpsl: searchParams.get('tpsl'),
            slmode: searchParams.get('slmode'),
            zonal: searchParams.get('zonal')
        })

        return {
            bucket: resolvePolicyBranchMegaBucketFromQuery(
                resolution.selection.bucket,
                DEFAULT_DIAGNOSTICS_BUCKET_MODE
            ),
            tpSlMode: resolvePolicyBranchMegaTpSlModeFromQuery(
                resolution.selection.tpsl,
                DEFAULT_DIAGNOSTICS_TP_SL_MODE
            ),
            slMode: resolvePolicyBranchMegaSlModeFromQuery(
                resolution.selection.slmode,
                DEFAULT_DIAGNOSTICS_SL_MODE
            ),
            zonalMode: resolvePolicyBranchMegaZonalModeFromQuery(
                resolution.selection.zonal,
                DEFAULT_DIAGNOSTICS_ZONAL_MODE
            )
        }
    }

    return {
        bucket: resolvePolicyBranchMegaBucketFromQuery(searchParams.get('bucket'), DEFAULT_DIAGNOSTICS_BUCKET_MODE),
        tpSlMode: resolvePolicyBranchMegaTpSlModeFromQuery(searchParams.get('tpsl'), DEFAULT_DIAGNOSTICS_TP_SL_MODE),
        slMode: resolvePolicyBranchMegaSlModeFromQuery(searchParams.get('slmode'), DEFAULT_DIAGNOSTICS_SL_MODE),
        zonalMode: resolvePolicyBranchMegaZonalModeFromQuery(searchParams.get('zonal'), DEFAULT_DIAGNOSTICS_ZONAL_MODE)
    }
}

export function buildBacktestDiagnosticsQueryArgsFromSearchParams(
    searchParams: URLSearchParams
): BacktestDiagnosticsReportQueryArgs {
    if (!(searchParams instanceof URLSearchParams)) {
        throw new Error('[backtest-diagnostics] searchParams must be URLSearchParams.')
    }

    const normalize = (raw: string | null): string | null => {
        if (!raw) {
            return null
        }

        const normalized = raw.trim()
        return normalized.length > 0 ? normalized : null
    }

    return {
        bucket: normalize(searchParams.get('bucket')),
        tpSlMode: normalize(searchParams.get('tpsl')),
        slMode: normalize(searchParams.get('slmode')),
        zonalMode: normalize(searchParams.get('zonal'))
    }
}

export function buildBacktestDiagnosticsQueryArgs(
    selection: BacktestDiagnosticsSearchSelection
): BacktestDiagnosticsReportQueryArgs {
    return {
        bucket: selection.bucket,
        tpSlMode: selection.tpSlMode,
        slMode: selection.slMode,
        zonalMode: selection.zonalMode
    }
}

export function buildBacktestDiagnosticsSearchFromSearchParams(searchParams: URLSearchParams): string {
    if (!(searchParams instanceof URLSearchParams)) {
        throw new Error('[backtest-diagnostics] searchParams must be URLSearchParams.')
    }

    const params = new URLSearchParams()

    const bucket = searchParams.get('bucket')
    const tpSlMode = searchParams.get('tpsl')
    const slMode = searchParams.get('slmode')
    const zonalMode = searchParams.get('zonal')

    if (bucket) {
        params.set('bucket', bucket)
    }
    if (tpSlMode) {
        params.set('tpsl', tpSlMode)
    }
    if (slMode) {
        params.set('slmode', slMode)
    }
    if (zonalMode) {
        params.set('zonal', zonalMode)
    }

    const query = params.toString()
    return query ? `?${query}` : ''
}
