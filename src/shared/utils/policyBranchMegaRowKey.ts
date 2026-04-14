export const POLICY_BRANCH_MEGA_ROW_KEY_SEPARATOR = '\u001e'
export const POLICY_BRANCH_MEGA_SL_MODE_COLUMN_NAME = 'SL Mode'

export function buildPolicyBranchMegaRowKey(policy: string, branch: string, slModeLabel: string | null): string {
    return slModeLabel === null ?
            `${policy}${POLICY_BRANCH_MEGA_ROW_KEY_SEPARATOR}${branch}`
        :   `${policy}${POLICY_BRANCH_MEGA_ROW_KEY_SEPARATOR}${branch}${POLICY_BRANCH_MEGA_ROW_KEY_SEPARATOR}${slModeLabel}`
}

export function resolvePolicyBranchMegaRenderedRowKey(
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

    const slModeIdx = columns.indexOf(POLICY_BRANCH_MEGA_SL_MODE_COLUMN_NAME)
    const slModeLabel = slModeIdx >= 0 ? String(row[slModeIdx] ?? '').trim() || null : null
    return buildPolicyBranchMegaRowKey(policy, branch, slModeLabel)
}
