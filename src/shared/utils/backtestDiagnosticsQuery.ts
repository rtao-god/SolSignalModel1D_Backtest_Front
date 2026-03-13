import type { BacktestDiagnosticsReportQueryArgs } from '@/shared/api/tanstackQueries/backtestDiagnostics'
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

export function resolveBacktestDiagnosticsSearchSelection(
    searchParams: URLSearchParams
): BacktestDiagnosticsSearchSelection {
    if (!(searchParams instanceof URLSearchParams)) {
        throw new Error('[backtest-diagnostics] searchParams must be URLSearchParams.')
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
    const selection = resolveBacktestDiagnosticsSearchSelection(searchParams)

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
