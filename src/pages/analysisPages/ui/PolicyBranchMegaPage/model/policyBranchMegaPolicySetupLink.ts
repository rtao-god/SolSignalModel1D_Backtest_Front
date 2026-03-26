import { ROUTE_PATH } from '@/app/providers/router/config/consts'
import { AppRoute } from '@/app/providers/router/config/types'
import type { PolicyRowEvaluationMapDto } from '@/shared/types/policyEvaluation.types'

export interface PolicySetupCellState {
    detailPath: string | null
}

export interface PolicySetupLinkAlertSummary {
    expectedLinkCount: number
    resolvedLinkCount: number
    missingLinkCount: number
    sampleLabels: string[]
    sampleDetails: string[]
    error: Error | null
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

/**
 * Собирает одно верхнее предупреждение для таблицы policy_branch_mega.
 * Либо карта оценок строки не опубликована/упала, либо часть строк не получила setupId.
 * В обоих случаях предупреждение должно жить над таблицей, а не в каждой ячейке.
 */
export function resolvePolicySetupLinkAlertSummaryForMegaRows(args: {
    rows: readonly unknown[][] | null | undefined
    columns: readonly string[]
    rowEvaluationMap: PolicyRowEvaluationMapDto['rows'] | undefined
    evaluationMapReady: boolean
    rowEvaluationError: Error | null
}): PolicySetupLinkAlertSummary | null {
    const { rows, columns, rowEvaluationMap, evaluationMapReady, rowEvaluationError } = args
    const expectedLinkCount = rows?.length ?? 0

    if (rowEvaluationError) {
        return {
            expectedLinkCount,
            resolvedLinkCount: 0,
            missingLinkCount: expectedLinkCount,
            sampleLabels: [],
            sampleDetails: [],
            error: rowEvaluationError
        }
    }

    if (!evaluationMapReady || !rowEvaluationMap || !rows || rows.length === 0) {
        return null
    }

    const missingLabels: string[] = []
    const missingDetails: string[] = []
    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
        const row = rows[rowIndex]
        const cellState = resolvePolicySetupCellStateForMegaRow({
            row,
            columns,
            rowEvaluationMap,
            evaluationMapReady
        })

        if (cellState.detailPath) {
            continue
        }

        missingLabels.push(buildMegaRowAlertLabel(row, columns, rowIndex))
        missingDetails.push(
            buildMegaRowAlertDetail(row, columns, rowIndex, rowEvaluationMap, evaluationMapReady)
        )
    }

    if (missingLabels.length === 0) {
        return null
    }

    return {
        expectedLinkCount,
        resolvedLinkCount: expectedLinkCount - missingLabels.length,
        missingLinkCount: missingLabels.length,
        sampleLabels: missingLabels.slice(0, 3),
        sampleDetails: missingDetails.slice(0, 3),
        error: null
    }
}

function buildMegaRowKey(policy: string, branch: string, slModeLabel: string | null): string {
    if (slModeLabel === null) {
        return `${policy}\u001e${branch}`
    }

    return `${policy}\u001e${branch}\u001e${slModeLabel}`
}

function buildMegaRowAlertLabel(
    row: readonly unknown[] | null | undefined,
    columns: readonly string[],
    rowIndex: number
): string {
    if (!row || columns.length === 0) {
        return `строка ${rowIndex + 1}`
    }

    const policyIdx = columns.indexOf('Policy')
    const branchIdx = columns.indexOf('Branch')
    const slModeIdx = columns.indexOf('SL Mode')

    const policy = policyIdx >= 0 ? String(row[policyIdx] ?? '').trim() : ''
    const branch = branchIdx >= 0 ? String(row[branchIdx] ?? '').trim() : ''
    const slMode = slModeIdx >= 0 ? String(row[slModeIdx] ?? '').trim() : ''

    const parts = [policy, branch, slMode].filter(Boolean)
    if (parts.length === 0) {
        return `строка ${rowIndex + 1}`
    }

    return parts.join(' · ')
}

function buildMegaRowAlertDetail(
    row: readonly unknown[] | null | undefined,
    columns: readonly string[],
    rowIndex: number,
    rowEvaluationMap: PolicyRowEvaluationMapDto['rows'] | undefined,
    evaluationMapReady: boolean
): string {
    const label = buildMegaRowAlertLabel(row, columns, rowIndex)
    if (!evaluationMapReady || !rowEvaluationMap) {
        return `${label} — опубликованная карта оценок строк ещё не готова`
    }

    const rowKey = resolveMegaRenderedRowKey(row, columns)
    if (!rowKey) {
        return `${label} — ключ строки не удалось восстановить`
    }

    const evaluation = rowEvaluationMap[rowKey]
    if (!evaluation) {
        return `${label} — опубликованная оценка строки отсутствует`
    }

    const reasonText =
        evaluation.reasons.length > 0 ?
            evaluation.reasons
                .slice(0, 3)
                .map(reason => `${reason.code}: ${reason.message}`)
                .join(' · ')
        :   'список причин пуст'

    const marginModeText = evaluation.metrics.marginMode ?? 'marginMode=null'
    const setupIdText = evaluation.policySetupId ?? 'policySetupId=null'

    return `${label} — ${setupIdText}; ${marginModeText}; ${reasonText}`
}
