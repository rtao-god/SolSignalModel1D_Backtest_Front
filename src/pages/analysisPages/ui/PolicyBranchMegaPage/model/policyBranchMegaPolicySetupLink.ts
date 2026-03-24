import { ROUTE_PATH } from '@/app/providers/router/config/consts'
import { AppRoute } from '@/app/providers/router/config/types'
import type { PolicyRowEvaluationMapDto } from '@/shared/types/policyEvaluation.types'

export interface PolicySetupCellState {
    detailPath: string | null
}

export function resolveMegaRenderedRowKey(
    row: readonly unknown[] | null | undefined,
    columns: readonly string[]
): string | null {
    if (!row || !columns || columns.length === 0) {
        return null
    }

    const policyIdx = columns.indexOf('Policy')
    const branchIdx = columns.indexOf('Branch')
    if (policyIdx < 0 || branchIdx < 0) {
        return null
    }

    const policy = String(row[policyIdx] ?? '').trim()
    const branch = String(row[branchIdx] ?? '').trim()
    if (!policy || !branch) {
        return null
    }

    const slModeIdx = columns.indexOf('SL Mode')
    const slModeLabel = slModeIdx >= 0 ? String(row[slModeIdx] ?? '').trim() || null : null
    return buildMegaRowKey(policy, branch, slModeLabel)
}

/**
 * Ссылка на policy setup строится только из опубликованного row-evaluation.
 * Если setupId ещё не опубликован, строка остаётся обычным текстом без аварийного состояния.
 */
export function resolvePolicySetupCellStateForMegaRow(args: {
    row: readonly unknown[] | null | undefined
    columns: readonly string[]
    rowEvaluationMap: PolicyRowEvaluationMapDto['rows'] | undefined
    evaluationMapReady: boolean
}): PolicySetupCellState {
    const { row, columns, rowEvaluationMap } = args
    if (!row || columns.length === 0) {
        return { detailPath: null }
    }

    const rowKey = resolveMegaRenderedRowKey(row, columns)
    if (!rowKey || !args.evaluationMapReady || !rowEvaluationMap) {
        return { detailPath: null }
    }

    const evaluation = rowEvaluationMap[rowKey]
    const setupId = evaluation?.policySetupId ?? null
    if (!setupId) {
        return { detailPath: null }
    }

    return { detailPath: `${ROUTE_PATH[AppRoute.BACKTEST_POLICY_SETUPS]}/${encodeURIComponent(setupId)}` }
}

function buildMegaRowKey(policy: string, branch: string, slModeLabel: string | null): string {
    if (slModeLabel === null) {
        return `${policy}\u001e${branch}`
    }

    return `${policy}\u001e${branch}\u001e${slModeLabel}`
}
