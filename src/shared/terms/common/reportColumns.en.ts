import type { CommonReportColumnTooltipMap } from './types'

export const COMMON_POLICY_DESCRIPTION_EN =
    'Policy is the name of one trading-rule set.\n\nWhat Policy includes:\ndaily entry conditions, position direction choice, the base level of risk, exit rules, and the overall trading style on history.\n\nHow to read it:\nPolicy is not a quality verdict by itself. Comparison starts in the numbers: Wealth%, OnExch%, MaxDD%, HadLiq, AccRuin, Recovered, RecovDays, and ReqGain%.\n\nReading guide:\n- higher Wealth% is better for the final outcome;\n- OnExch% shows how much capital still remains in the market;\n- shallower MaxDD% is better;\n- the best case is HadLiq=0 and AccRuin=0;\n- better when Recovered=true while RecovDays and ReqGain% stay lower.\n\nExample:\nif Policy A delivers Wealth% +48 with MaxDD -18, and Policy B delivers Wealth% +55 with MaxDD -52, the business will often prefer A as the more robust configuration.'

export const COMMON_BRANCH_DESCRIPTION_EN =
    'Branch is the execution scenario of the same Policy.\n\nBASE keeps the original signal direction for the day.\n\nANTI-D uses the same base direction, and only when anti-direction conditions fire does it flip the trade to the opposite side. If they do not fire, ANTI-D keeps the BASE direction instead of turning the day into no-trade.\n\nHow to read it:\nBranch must be compared only inside the same Policy and the same mode slice. Risk is evaluated first through MaxDD%, HadLiq, and AccRuin. Only after that does the comparison move to Wealth% and OnExch%.\n\nExample:\nif BASE = Wealth% 26, MaxDD -44, HadLiq 2, AccRuin 1, while ANTI-D = Wealth% 22, MaxDD -24, HadLiq 0, AccRuin 0, then ANTI-D reduces emergency risk at the cost of 4 p.p. of return.'

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
    'Cap avg / min / max is the average, minimum, and maximum cap fraction that was actually used in executed trades.\n\nThis is not just a configured number. It reflects real capital usage after the cap policy and all risk limits were applied.\n\nHow to read it:\nhigher average and especially higher maximum mean more aggressive capital usage, while the minimum shows how deep the risk layers can cut position size.'

export const COMMON_CAP_P50_P90_DESCRIPTION_EN =
    'Cap p50 / p90 is the distribution of cap fraction across executed trades.\n\nP50 shows the typical capital share per trade, while p90 shows the upper working tail that the strategy still reaches on more aggressive days.\n\nHow to read it:\nif p90 stands far above p50, the strategy sometimes scales position size materially above its typical level.'

export const COMMON_BUCKET_DESCRIPTION_EN =
    'Bucket is an independent simulation track with its own starting capital, equity curve, and drawdown.\n\nDaily, intraday, and delayed are calculated separately: loss or ruin in one bucket does not spill into another.\n\nPolicy defines entry and risk rules, Branch defines the direction scenario, and Bucket defines execution mechanics together with the separate balance.\n\nRisk layers work on top of that decision and can further cut risk or block entry.\n\nHow to read it:\nBucket answers how the trade is executed and where the balance path is accumulated. It is not the same thing as Policy or Branch.\n\nExample:\na delayed bucket can show a different trade path and a different drawdown curve even under the same Policy and Branch.'

export const COMMON_SL_MODE_DESCRIPTION_EN =
    'SL Mode is the switch for the trade-exit mechanism.\n\nWITH SL keeps the protective stop-loss enabled. The trade can close by stop-loss, take-profit, liquidation, or EndOfDay.\n\nNO SL disables the protective stop-loss. The trade then stays open until take-profit, liquidation, or EndOfDay.\n\nThe risk profile is materially different: isolated margin can lose the full position margin, while cross margin can lose the full bucket balance.\n\nHow to read it:\nWITH SL and NO SL should be compared only inside the same Policy / Branch configuration. If NO SL increases MaxDD%, HadLiq, and AccRuin, the extra return was bought at the cost of emergency risk.\n\nExample:\nif NO SL gives slightly higher TotalPnl% but also introduces liquidations or bucket ruin, that return profile becomes operationally unacceptable.'

export const COMMON_ACCOUNT_RUIN_DESCRIPTION_EN =
    'AccRuin is the ruin metric of the bucket working capital.\n\nA bucket is treated as ruined when it is flagged as dead or when current equity falls to 20% or less of starting capital.\n\nHow to read it:\nfor one Policy in one bucket, 0 is rendered as "No, the bucket is still alive" and 1 as "Yes, the bucket exhausted its starting capital". In total aggregate the number shows how many buckets among daily / intraday / delayed exhausted their starting capital.'

export const COMMON_RECOVERED_DESCRIPTION_EN =
    'Recovered is the flag showing whether the capital returned above the pre-drawdown peak after the worst drawdown.\n\ntrue means the previous peak was recovered inside the selected period.\n\nfalse means the period ended before that recovery happened.'

export const COMMON_RECOV_DAYS_DESCRIPTION_EN =
    'RecovDays is the number of calendar days from the bottom of MaxDD to the day when capital finally returned to the peak that existed before that drawdown.\n\nSmaller values mean faster recovery, while large values mean the capital stayed underwater for a long time.'

export const COMMON_REQ_GAIN_DESCRIPTION_EN =
    'ReqGain% is the growth required from the MaxDD bottom to recover the capital back to the pre-drawdown peak.\n\nThe deeper the drawdown, the more nonlinear this value becomes: a 50% drawdown already needs a 100% gain to recover.'

export const COMMON_START_CAP_DESCRIPTION_EN =
    'Starting capital (StartCap$) is the money baseline used for return, drawdown, and exposure calculations.\n\nWhat it shows:\n1) this is not the current balance after trades, but the initial reference point of the selected slice;\n2) in Policy Branch Mega one standalone bucket usually starts with 20,000 USD, while total aggregate usually starts with 60,000 USD across three buckets.\n\nHow to read it:\n1) percentage fields such as [[total-pnl|TotalPnl%]], [[wealth-pct|Wealth%]], [[drawdown|MaxDD%]], and [[exposure|Exposure%]] are all measured against this base;\n2) without that starting base, dollar results and risk size cannot be compared honestly across rows.\n\nExample:\nif StartCap$ = 20,000 and [[total-pnl|TotalPnl%]] = 25%, the slice produced about 5,000 USD of result.'

export const COMMON_MARGIN_USED_DESCRIPTION_EN =
    'MarginUsed is the actual margin committed to a trade before leverage is applied.\n\nIt is not the full position notional. Full position size is MarginUsed multiplied by leverage.'

export const COMMON_MIN_MOVE_DESCRIPTION_EN =
    'MinMove is the minimum meaningful daily price move that the system treats as large enough for a tradeable day.\n\nIt separates tradeable movement from market noise and therefore changes whether a day is treated as directional or too weak for entry.'

export const COMMON_TRADES_DESCRIPTION_EN =
    'Trades is the number of executed trades in the selected slice.\n\nOne trade means one fully formed position, not just one model signal.\n\nHow to read it:\nwhen the trade count is small, every single trade has a larger impact on the final result and the slice is statistically thinner.'

export const COMMON_TOTAL_PNL_DESCRIPTION_EN =
    'TotalPnl% is the headline total return of the selected slice in percent.\n\nFormula:\n1) money result = ([[current-balance|current balance]] + [[withdrawn-profit|withdrawn profit]]) - [[start-cap|starting capital]];\n2) TotalPnl% = money result / [[start-cap|starting capital]] * 100.\n\nWhat it shows:\n1) the metric captures the full money result of the row against the starting base;\n2) it already includes both the capital still on exchange and the profit that was withdrawn from trading balance;\n3) for that reason TotalPnl% and [[wealth-pct|Wealth%]] produce the same result percentage and differ only by reading emphasis.\n\nHow to read it:\n1) TotalPnl% works well as the main outcome number of the row;\n2) read it together with [[wealth-pct|Wealth%]], [[withdrawn-profit|Withdrawn$]], and [[current-balance|OnExch$]] to see where that result currently sits;\n3) the same TotalPnl% can still come through very different [[drawdown|MaxDD%]], [[liquidation|liquidation]] count, and [[account-ruin|bucket ruin]] risk.'

export const COMMON_WEALTH_PCT_DESCRIPTION_EN =
    'Wealth% is the final strategy return on the full wealth base.\n\nFormula:\nWealth% = (([[current-balance|current balance]] + [[withdrawn-profit|withdrawn profit]]) - [[start-cap|starting capital]]) / [[start-cap|starting capital]] * 100.\n\nWhat it shows:\n1) this is the full accumulated outcome of the strategy, not just the money still sitting on exchange;\n2) withdrawn profit is already included and must not disappear from the interpretation.\n\nHow to read it:\n1) Wealth% is the main result percentage in the mega table;\n2) read it together with [[on-exchange-pct|OnExch%]], [[withdrawn-profit|Withdrawn$]], and [[current-balance|OnExch$]] to separate total accumulated outcome from the capital still in the market;\n3) read risk separately through [[drawdown|MaxDD%]], [[liquidation|HadLiq]], and [[account-ruin|AccRuin]].'

export const COMMON_ON_EXCHANGE_PCT_DESCRIPTION_EN =
    'OnExch% is the return of the capital that remains on exchange after the selected slice finishes.\n\nFormula:\nOnExch% = ([[current-balance|current balance]] - [[start-cap|starting capital]]) / [[start-cap|starting capital]] * 100.\n\nWhat it shows:\n1) this is not the full strategy outcome, but the state of working capital without already withdrawn profit;\n2) the metric answers how much money is still left in the market relative to the start.\n\nHow to read it:\n1) always read OnExch% together with [[wealth-pct|Wealth%]] and [[withdrawn-profit|Withdrawn$]];\n2) if Wealth% is high while OnExch% is materially lower, a meaningful share of the result has already been withdrawn from trading balance;\n3) if both numbers are close, most of the result is still sitting in the market.'

export const COMMON_MAX_DD_DESCRIPTION_EN =
    'MaxDD% is the maximum drawdown of capital from a local peak to the next trough.\n\nThis metric answers how painful the path to the final result was.\n\nHow to read it:\nhigher return with a much deeper MaxDD% is not automatically better, because the strategy required a heavier capital drawdown to get there.'

export const COMMON_HAD_LIQ_DESCRIPTION_EN =
    'HadLiq is the liquidation flag for the selected slice.\n\nEven one liquidation means the strategy reached an emergency exchange close instead of finishing a trade through its normal risk plan.\n\nHow to read it:\nthis metric must be judged together with TotalPnl%, MaxDD%, and AccRuin, because one liquidation can erase the profit of many ordinary trading days.'

export const COMMON_WITHDRAWN_DESCRIPTION_EN =
    'Withdrawn$ is profit that was already withdrawn from the trading balance and is therefore no longer sitting inside current equity.\n\nThis metric matters because a strategy can show moderate on-exchange capital while still having already extracted a meaningful amount of money out of the slice.\n\nHow to read it:\nread Withdrawn$ together with TotalPnl%, current bucket capital, and drawdown. A moderate live balance does not mean the slice earned little if a meaningful share of profit was already moved out of trading capital.'

export const COMMON_CALMAR_DESCRIPTION_EN =
    'Calmar is the ratio of annualized growth [[cagr-ratio|CAGR]] to the maximum capital [[drawdown|drawdown]].\n\nWhat it shows:\nit answers how much annual growth the strategy gets per unit of the worst capital drop. The metric matters when two strategies earn similarly, but one reaches that result through a much deeper hole.\n\nHow to read it:\na higher Calmar means the result is achieved more cleanly relative to the worst drawdown. A low Calmar means the return was bought with too deep a capital drawdown.\n\nExample:\nif one strategy has [[cagr-ratio|CAGR]] = 24% and [[drawdown|MaxDD%]] = 12%, while another has CAGR = 24% and MaxDD% = 40%, the first strategy will have the higher Calmar because it reaches the same growth through a shallower drawdown.'

export const COMMON_CAGR_DESCRIPTION_EN =
    'CAGR is the average annual compound growth rate of capital over the selected horizon.\n\nWhat it shows:\nit converts the whole capital path into one annual growth speed, as if the strategy had grown smoothly at a constant compound rate. It is not the simple average of daily returns and not just a sum of yearly results.\n\nHow to read it:\nCAGR helps compare slices of different length on one annualized growth scale. But it should not be read separately from [[drawdown|MaxDD%]], [[calmar-ratio|Calmar]], and [[trade-count|Trades]], because the same annual growth can be achieved through very different risk profiles.\n\nExample:\nCAGR = 18% means that if capital had grown smoothly at a constant compound rate on this horizon, its annual growth speed would be about 18%.'

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
    'Starting capital': COMMON_START_CAP_DESCRIPTION_EN,
    MarginUsed: COMMON_MARGIN_USED_DESCRIPTION_EN,
    MinMove: COMMON_MIN_MOVE_DESCRIPTION_EN,
    Trades: COMMON_TRADES_DESCRIPTION_EN,
    'TotalPnl%': COMMON_TOTAL_PNL_DESCRIPTION_EN,
    'Wealth%': COMMON_WEALTH_PCT_DESCRIPTION_EN,
    'OnExch%': COMMON_ON_EXCHANGE_PCT_DESCRIPTION_EN,
    'MaxDD%': COMMON_MAX_DD_DESCRIPTION_EN,
    Calmar: COMMON_CALMAR_DESCRIPTION_EN,
    CAGR: COMMON_CAGR_DESCRIPTION_EN,
    'CAGR%': COMMON_CAGR_DESCRIPTION_EN,
    HadLiq: COMMON_HAD_LIQ_DESCRIPTION_EN,
    Withdrawn$: COMMON_WITHDRAWN_DESCRIPTION_EN
}
