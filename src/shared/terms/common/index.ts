import { normalizeComparableTerm } from '@/shared/ui/TermTooltip/lib/termTooltipMatcher'
import {
    ACCOUNT_RUIN_DESCRIPTION,
    ANTI_D_SHARE_DESCRIPTION,
    CAP_AVG_MIN_MAX_DESCRIPTION,
    CAP_P50_P90_DESCRIPTION,
    DRAWDOWN_DESCRIPTION,
    LIQUIDATION_DESCRIPTION,
    MARGIN_USED_DESCRIPTION,
    RECOVERED_DESCRIPTION,
    RECOV_DAYS_DESCRIPTION,
    REQ_GAIN_DESCRIPTION,
    RISK_DAY_SHARE_DESCRIPTION,
    SL_MODE_TERM_DESCRIPTION,
    START_CAP_DESCRIPTION
} from './risk'
import { MIN_MOVE_DESCRIPTION } from './modeling'
import {
    BRANCH_DESCRIPTION,
    BUCKET_DESCRIPTION,
    LONG_SHARE_DESCRIPTION,
    NO_TRADE_SHARE_DESCRIPTION,
    POLICY_DESCRIPTION,
    SHORT_SHARE_DESCRIPTION,
    TOTAL_PNL_DESCRIPTION,
    TRADE_COUNT_DESCRIPTION,
    WITHDRAWN_PROFIT_DESCRIPTION
} from './trading'
import { COMMON_REPORT_COLUMN_TOOLTIPS_EN } from './reportColumns.en'
import type { CommonReportColumnTooltipMap } from './types'

export * from './trading'
export * from './risk'
export * from './modeling'
export * from './tooltipRegistry'
export * from './reportColumns.en'
export * from './types'

export type CommonReportTooltipLocale = 'ru' | 'en'

// Этот owner-layer хранит канонические tooltip для report-терминов,
// которые повторяются на нескольких страницах и не должны расходиться по формулировке.
const COMMON_REPORT_COLUMN_TOOLTIPS: CommonReportColumnTooltipMap = {
    Policy: POLICY_DESCRIPTION,
    Branch: BRANCH_DESCRIPTION,
    'Long%': LONG_SHARE_DESCRIPTION,
    'Short%': SHORT_SHARE_DESCRIPTION,
    'NoTrade%': NO_TRADE_SHARE_DESCRIPTION,
    'RiskDay%': RISK_DAY_SHARE_DESCRIPTION,
    'AntiD%': ANTI_D_SHARE_DESCRIPTION,
    'Cap avg/min/max': CAP_AVG_MIN_MAX_DESCRIPTION,
    'Cap p50/p90': CAP_P50_P90_DESCRIPTION,
    Bucket: BUCKET_DESCRIPTION,
    'SL Mode': SL_MODE_TERM_DESCRIPTION,
    AccRuin: ACCOUNT_RUIN_DESCRIPTION,
    Recovered: RECOVERED_DESCRIPTION,
    RecovDays: RECOV_DAYS_DESCRIPTION,
    'ReqGain%': REQ_GAIN_DESCRIPTION,
    StartCap$: START_CAP_DESCRIPTION,
    MarginUsed: MARGIN_USED_DESCRIPTION,
    MinMove: MIN_MOVE_DESCRIPTION,
    Trades: TRADE_COUNT_DESCRIPTION,
    'TotalPnl%': TOTAL_PNL_DESCRIPTION,
    'MaxDD%': DRAWDOWN_DESCRIPTION,
    HadLiq: LIQUIDATION_DESCRIPTION,
    Withdrawn$: WITHDRAWN_PROFIT_DESCRIPTION
}

export const COMMON_REPORT_COLUMN_TOOLTIP_KEYS = Object.freeze(
    Object.keys(COMMON_REPORT_COLUMN_TOOLTIPS) as (keyof typeof COMMON_REPORT_COLUMN_TOOLTIPS)[]
)

function buildNormalizedCommonTooltipMap(source: CommonReportColumnTooltipMap): Map<string, string> {
    return new Map(Object.entries(source).map(([title, description]) => [normalizeComparableTerm(title), description]))
}

const NORMALIZED_COMMON_REPORT_COLUMN_TOOLTIPS_RU = buildNormalizedCommonTooltipMap(COMMON_REPORT_COLUMN_TOOLTIPS)
const NORMALIZED_COMMON_REPORT_COLUMN_TOOLTIPS_EN = buildNormalizedCommonTooltipMap(COMMON_REPORT_COLUMN_TOOLTIPS_EN)

export function resolveCommonReportColumnTooltipOrNull(
    title: string | undefined,
    locale: CommonReportTooltipLocale = 'ru'
): string | null {
    const normalizedTitle = normalizeComparableTerm(title ?? '')
    if (!normalizedTitle) {
        return null
    }

    return (
        (locale === 'en' ?
            NORMALIZED_COMMON_REPORT_COLUMN_TOOLTIPS_EN
        :   NORMALIZED_COMMON_REPORT_COLUMN_TOOLTIPS_RU
        ).get(normalizedTitle) ?? null
    )
}
