import { normalizeComparableTerm } from '@/shared/ui/TermTooltip/lib/termTooltipMatcher'
import {
    ACCOUNT_RUIN_DESCRIPTION,
    MARGIN_USED_DESCRIPTION,
    RECOVERED_DESCRIPTION,
    RECOV_DAYS_DESCRIPTION,
    REQ_GAIN_DESCRIPTION,
    SL_MODE_TERM_DESCRIPTION,
    START_CAP_DESCRIPTION
} from './risk'
import { MIN_MOVE_DESCRIPTION } from './modeling'
import { BRANCH_DESCRIPTION, BUCKET_DESCRIPTION, POLICY_DESCRIPTION } from './trading'

export * from './trading'
export * from './risk'
export * from './modeling'
export * from './tooltipRegistry'

const COMMON_REPORT_COLUMN_TOOLTIPS: Record<string, string> = {
    Policy: POLICY_DESCRIPTION,
    Branch: BRANCH_DESCRIPTION,
    Bucket: BUCKET_DESCRIPTION,
    'SL Mode': SL_MODE_TERM_DESCRIPTION,
    AccRuin: ACCOUNT_RUIN_DESCRIPTION,
    Recovered: RECOVERED_DESCRIPTION,
    RecovDays: RECOV_DAYS_DESCRIPTION,
    'ReqGain%': REQ_GAIN_DESCRIPTION,
    StartCap$: START_CAP_DESCRIPTION,
    MarginUsed: MARGIN_USED_DESCRIPTION,
    MinMove: MIN_MOVE_DESCRIPTION
}

const NORMALIZED_COMMON_REPORT_COLUMN_TOOLTIPS = new Map(
    Object.entries(COMMON_REPORT_COLUMN_TOOLTIPS).map(([title, description]) => [
        normalizeComparableTerm(title),
        description
    ])
)

export function resolveCommonReportColumnTooltipOrNull(title: string | undefined): string | null {
    const normalizedTitle = normalizeComparableTerm(title ?? '')
    if (!normalizedTitle) {
        return null
    }

    return NORMALIZED_COMMON_REPORT_COLUMN_TOOLTIPS.get(normalizedTitle) ?? null
}
