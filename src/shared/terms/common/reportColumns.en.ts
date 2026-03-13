import type { CommonReportColumnTooltipMap } from './types'

export const COMMON_POLICY_DESCRIPTION_EN =
    'Policy is the name of one trading-rule set.\n\nWhat Policy includes:\ndaily entry conditions, position direction choice, the base level of risk, exit rules, and the overall trading style on history.\n\nHow to read it:\nPolicy is not a quality verdict by itself. Comparison starts in the numbers: TotalPnl%, Wealth%, MaxDD%, HadLiq, AccRuin, Recovered, RecovDays, and ReqGain%.\n\nReading guide:\n- higher TotalPnl% and Wealth% are better;\n- shallower MaxDD% is better;\n- the best case is HadLiq=0 and AccRuin=0;\n- better when Recovered=true while RecovDays and ReqGain% stay lower.\n\nExample:\nif Policy A delivers +48% with MaxDD -18%, and Policy B delivers +55% with MaxDD -52%, the business will often prefer A as the more robust configuration.'

export const COMMON_BRANCH_DESCRIPTION_EN =
    'Branch is the execution scenario of the same Policy.\n\nBASE keeps the original signal direction for the day.\n\nANTI-D checks anti-direction and, when its conditions fire, flips the direction to the opposite side.\n\nHow to read it:\nBranch must be compared only inside the same Policy and the same mode slice. Risk is evaluated first through MaxDD%, HadLiq, and AccRuin. Only after that does the comparison move to TotalPnl% and Wealth%.\n\nExample:\nif BASE = TotalPnl% 26, MaxDD -44, HadLiq 2, AccRuin 1, while ANTI-D = TotalPnl% 22, MaxDD -24, HadLiq 0, AccRuin 0, then ANTI-D reduces emergency risk at the cost of 4 p.p. of return.'

export const COMMON_LONG_SHARE_DESCRIPTION_EN =
    'Long% is the share of days where the final entry decision was LONG.\n\nRead it as:\nLong% = count of LONG days / count of all days in the slice * 100.\n\nThis metric must be read together with Short% and NoTrade%. If Long% rises while the others fall, the strategy becomes more biased toward long entries.'

export const COMMON_SHORT_SHARE_DESCRIPTION_EN =
    'Short% is the share of days where the final entry decision was SHORT.\n\nRead it as:\nShort% = count of SHORT days / count of all days in the slice * 100.\n\nThis metric matters together with Long% and NoTrade%. A higher Short% means the strategy is more biased toward short entries.'

export const COMMON_NO_TRADE_SHARE_DESCRIPTION_EN =
    'NoTrade% is the share of days where the strategy did not open a position.\n\nSuch days include missing signal direction, policy-level skip, risk-filter blocks, and days where cap fraction was reduced to zero.\n\nHow to read it:\na higher NoTrade% means the strategy trades less often. That is not automatically bad, but it does mean the sample of executed trades becomes thinner.'

export const COMMON_RISK_DAY_SHARE_DESCRIPTION_EN =
    'RiskDay% is the share of days flagged as elevated-risk by the SL model.\n\nThose days do not automatically become no-trade, but they are the days where risk layers more often cut leverage, reduce cap fraction, or block entry completely.\n\nHow to read it:\na higher RiskDay% means the strategy spends more time in a stricter risk regime, so it should be judged together with MaxDD%, HadLiq, and AccRuin.'

export const COMMON_ANTI_D_SHARE_DESCRIPTION_EN =
    'AntiD% is the share of days where anti-direction was actually applied inside the ANTI-D branch.\n\nThe metric shows not only that ANTI-D exists, but that the branch really flipped direction after all of its risk conditions were checked.\n\nHow to read it:\nif AntiD% is low, ANTI-D was present but rarely active. If AntiD% is high, inversion became a meaningful part of the strategy behavior.'

export const COMMON_CAP_AVG_MIN_MAX_DESCRIPTION_EN =
    'Cap avg/min/max is the average, minimum, and maximum cap fraction that was actually used in executed trades.\n\nThis is not just a configured number. It reflects real capital usage after the cap policy and all risk limits were applied.\n\nHow to read it:\nhigher average and especially higher maximum mean more aggressive capital usage, while the minimum shows how deep the risk layers can cut position size.'

export const COMMON_CAP_P50_P90_DESCRIPTION_EN =
    'Cap p50/p90 is the distribution of cap fraction across executed trades.\n\nP50 shows the typical capital share per trade, while p90 shows the upper working tail that the strategy still reaches on more aggressive days.\n\nHow to read it:\nif p90 stands far above p50, the strategy sometimes scales position size materially above its typical level.'

export const COMMON_BUCKET_DESCRIPTION_EN =
    'Bucket is an independent simulation track with its own starting capital, equity curve, and drawdown.\n\nDaily, intraday, and delayed are calculated separately: loss or ruin in one bucket does not spill into another.\n\nPolicy defines entry and risk rules, Branch defines the direction scenario, and Bucket defines execution mechanics together with the separate balance.\n\nRisk layers work on top of that decision and can further cut risk or block entry.\n\nHow to read it:\nBucket answers how the trade is executed and where the balance path is accumulated. It is not the same thing as Policy or Branch.\n\nExample:\na delayed bucket can show a different trade path and a different drawdown curve even under the same Policy and Branch.'

export const COMMON_SL_MODE_DESCRIPTION_EN =
    'SL Mode is the switch for the trade-exit mechanism.\n\nWITH SL keeps the protective stop-loss enabled. The trade can close by stop-loss, take-profit, liquidation, or EndOfDay.\n\nNO SL disables the protective stop-loss. The trade then stays open until take-profit, liquidation, or EndOfDay.\n\nThe risk profile is materially different: isolated margin can lose the full position margin, while cross margin can lose the full bucket balance.\n\nHow to read it:\nWITH SL and NO SL should be compared only inside the same Policy / Branch row. If NO SL increases MaxDD%, HadLiq, and AccRuin, the extra return was bought at the cost of emergency risk.\n\nExample:\nif NO SL gives slightly higher TotalPnl% but also introduces liquidations or bucket ruin, that return profile becomes operationally unacceptable.'

export const COMMON_ACCOUNT_RUIN_DESCRIPTION_EN =
    'AccRuin is the ruin metric of the bucket working capital.\n\nA bucket is treated as ruined when it is flagged as dead or when current equity falls to 20% or less of starting capital.\n\nHow to read it:\n0 means the bucket stayed alive in this slice; 1 means the working capital effectively collapsed.'

export const COMMON_RECOVERED_DESCRIPTION_EN =
    'Recovered is the flag showing whether the capital returned above the pre-drawdown peak after the worst drawdown.\n\ntrue means the previous peak was recovered inside the selected period.\n\nfalse means the period ended before that recovery happened.'

export const COMMON_RECOV_DAYS_DESCRIPTION_EN =
    'RecovDays is the number of calendar days from the bottom of MaxDD to the day when capital finally returned to the peak that existed before that drawdown.\n\nSmaller values mean faster recovery, while large values mean the capital stayed underwater for a long time.'

export const COMMON_REQ_GAIN_DESCRIPTION_EN =
    'ReqGain% is the growth required from the MaxDD bottom to recover the capital back to the pre-drawdown peak.\n\nThe deeper the drawdown, the more nonlinear this value becomes: a 50% drawdown already needs a 100% gain to recover.'

export const COMMON_START_CAP_DESCRIPTION_EN =
    'StartCap is the starting capital of the selected slice in dollars.\n\nIt is the base reference for percentage return, drawdown, exposure, and recovery metrics.'

export const COMMON_MARGIN_USED_DESCRIPTION_EN =
    'MarginUsed is the actual margin committed to a trade before leverage is applied.\n\nIt is not the full position notional. Full position size is MarginUsed multiplied by leverage.'

export const COMMON_MIN_MOVE_DESCRIPTION_EN =
    'MinMove is the minimum meaningful daily price move that the system treats as large enough for a tradeable day.\n\nIt separates tradeable movement from market noise and therefore changes whether a day is treated as directional or too weak for entry.'

export const COMMON_TRADES_DESCRIPTION_EN =
    'Trades is the number of executed trades in the selected slice.\n\nOne trade means one fully formed position, not just one model signal.\n\nHow to read it:\nwhen the trade count is small, every single trade has a larger impact on the final result and the slice is statistically thinner.'

export const COMMON_TOTAL_PNL_DESCRIPTION_EN =
    'TotalPnl% is the total return of the strategy in percent inside the selected slice.\n\nIt is the headline result metric, but it should never be read alone.\n\nHow to read it:\nthe same return can come with very different MaxDD%, HadLiq, and AccRuin profiles, so the field only makes sense together with the risk columns.\n\nExample:\n+30% with shallow drawdown is operationally different from +30% that required liquidation tails to get there.'

export const COMMON_MAX_DD_DESCRIPTION_EN =
    'MaxDD% is the maximum drawdown of capital from a local peak to the next trough.\n\nThis metric answers how painful the path to the final result was.\n\nHow to read it:\nhigher return with a much deeper MaxDD% is not automatically better, because the strategy required a heavier capital drawdown to get there.'

export const COMMON_HAD_LIQ_DESCRIPTION_EN =
    'HadLiq is the liquidation flag for the selected slice.\n\nEven one liquidation means the strategy reached an emergency exchange close instead of finishing a trade through its normal risk plan.\n\nHow to read it:\nthis metric must be judged together with TotalPnl%, MaxDD%, and AccRuin, because one liquidation can erase the profit of many ordinary trading days.'

export const COMMON_WITHDRAWN_DESCRIPTION_EN =
    'Withdrawn$ is profit that was already withdrawn from the trading balance and is therefore no longer sitting inside current equity.\n\nThis metric matters because a strategy can show moderate on-exchange capital while still having already extracted a meaningful amount of money out of the slice.'

// Английская ветка держится в том же owner-слое, чтобы diagnostics/summary/current-prediction
// не расходились по смыслу относительно русских канонических report-терминов.
export const COMMON_REPORT_COLUMN_TOOLTIPS_EN: CommonReportColumnTooltipMap = {
    Policy: COMMON_POLICY_DESCRIPTION_EN,
    Branch: COMMON_BRANCH_DESCRIPTION_EN,
    'Long%': COMMON_LONG_SHARE_DESCRIPTION_EN,
    'Short%': COMMON_SHORT_SHARE_DESCRIPTION_EN,
    'NoTrade%': COMMON_NO_TRADE_SHARE_DESCRIPTION_EN,
    'RiskDay%': COMMON_RISK_DAY_SHARE_DESCRIPTION_EN,
    'AntiD%': COMMON_ANTI_D_SHARE_DESCRIPTION_EN,
    'Cap avg/min/max': COMMON_CAP_AVG_MIN_MAX_DESCRIPTION_EN,
    'Cap p50/p90': COMMON_CAP_P50_P90_DESCRIPTION_EN,
    Bucket: COMMON_BUCKET_DESCRIPTION_EN,
    'SL Mode': COMMON_SL_MODE_DESCRIPTION_EN,
    AccRuin: COMMON_ACCOUNT_RUIN_DESCRIPTION_EN,
    Recovered: COMMON_RECOVERED_DESCRIPTION_EN,
    RecovDays: COMMON_RECOV_DAYS_DESCRIPTION_EN,
    'ReqGain%': COMMON_REQ_GAIN_DESCRIPTION_EN,
    StartCap$: COMMON_START_CAP_DESCRIPTION_EN,
    MarginUsed: COMMON_MARGIN_USED_DESCRIPTION_EN,
    MinMove: COMMON_MIN_MOVE_DESCRIPTION_EN,
    Trades: COMMON_TRADES_DESCRIPTION_EN,
    'TotalPnl%': COMMON_TOTAL_PNL_DESCRIPTION_EN,
    'MaxDD%': COMMON_MAX_DD_DESCRIPTION_EN,
    HadLiq: COMMON_HAD_LIQ_DESCRIPTION_EN,
    Withdrawn$: COMMON_WITHDRAWN_DESCRIPTION_EN
}
