import type { CommonReportColumnTooltipMap } from './types'

export const COMMON_POLICY_DESCRIPTION_EN =
    'Policy is the name of one trading-rule set.\n\nWhat Policy includes:\ndaily entry conditions, position direction choice, the base level of risk, exit rules, and the overall trading style on history.\n\nHow to read it:\nPolicy is not a quality verdict by itself. Comparison starts in the numbers: TotalPnl%, OnExch%, MaxDD%, HadLiquidation, AccountRuinCount, Recovered, RecovDays, and ReqGain%.\n\nReading guide:\n- higher TotalPnl% is better for the final outcome;\n- OnExch% shows how much capital still remains in the market;\n- shallower MaxDD% is better;\n- the best case is HadLiquidation=0 and AccountRuinCount=0;\n- better when Recovered=true while RecovDays and ReqGain% stay lower.\n\nExample:\nif Policy A delivers TotalPnl% +48 with MaxDD -18, and Policy B delivers TotalPnl% +55 with MaxDD -52, the business will often prefer A as the more robust configuration.'

export const COMMON_BRANCH_DESCRIPTION_EN =
    'Branch is the execution scenario of the same Policy.\n\nBASE keeps the original signal direction for the day.\n\nANTI-D uses the same base direction, and only when anti-direction conditions fire does it flip the trade to the opposite side. If they do not fire, ANTI-D keeps the BASE direction instead of turning the day into no-trade.\n\nHow to read it:\nBranch must be compared only inside the same Policy and the same mode slice. Risk is evaluated first through MaxDD%, HadLiquidation, and AccountRuinCount. Only after that does the comparison move to TotalPnl% and OnExch%.\n\nExample:\nif BASE = TotalPnl% 26, MaxDD -44, HadLiquidation 2, AccountRuinCount 1, while ANTI-D = TotalPnl% 22, MaxDD -24, HadLiquidation 0, AccountRuinCount 0, then ANTI-D reduces emergency risk at the cost of 4 p.p. of return.'

export const COMMON_LONG_SHARE_DESCRIPTION_EN =
    'Long% is the share of days where the final entry decision was LONG.\n\nRead it as:\nLong% = count of LONG days / count of all days in the slice * 100.\n\nThis metric must be read together with Short% and NoTrade%. If Long% rises while the others fall, the strategy becomes more biased toward long entries.'

export const COMMON_SHORT_SHARE_DESCRIPTION_EN =
    'Short% is the share of days where the final entry decision was SHORT.\n\nRead it as:\nShort% = count of SHORT days / count of all days in the slice * 100.\n\nThis metric matters together with Long% and NoTrade%. A higher Short% means the strategy is more biased toward short entries.'

export const COMMON_NO_TRADE_SHARE_DESCRIPTION_EN =
    'NoTrade% is the share of days where the strategy did not open a position.\n\nSuch days include missing signal direction, policy-level skip, risk-filter blocks, and days where cap fraction was reduced to zero.\n\nHow to read it:\na higher NoTrade% means the strategy trades less often. That is not automatically bad, but it does mean the sample of executed trades becomes thinner.'

export const COMMON_RISK_DAY_SHARE_DESCRIPTION_EN =
    'RiskDay% is the share of days flagged as elevated-risk by the SL model.\n\nThose days do not automatically become no-trade, but they are the days where risk layers more often cut leverage, reduce cap fraction, or block entry completely.\n\nHow to read it:\na higher RiskDay% means the strategy spends more time in a stricter risk regime, so it should be judged together with MaxDD%, HadLiquidation, and AccountRuinCount.'

export const COMMON_ANTI_D_SHARE_DESCRIPTION_EN =
    'AntiD% is the share of days where anti-direction was actually applied inside the ANTI-D branch.\n\nThe metric shows not only that ANTI-D exists, but that the branch really flipped direction after all of its risk conditions were checked.\n\nHow to read it:\nif AntiD% is low, ANTI-D was present but rarely active. If AntiD% is high, inversion became a meaningful part of the strategy behavior.'

export const COMMON_CAP_AVG_MIN_MAX_DESCRIPTION_EN =
    'Cap avg / min / max is the average, minimum, and maximum cap fraction that was actually used in executed trades.\n\nThis is not just a configured number. It reflects real capital usage after the cap policy and all risk limits were applied.\n\nHow to read it:\nhigher average and especially higher maximum mean more aggressive capital usage, while the minimum shows how deep the risk layers can cut position size.'

export const COMMON_CAP_P50_P90_DESCRIPTION_EN =
    'Cap p50 / p90 is the distribution of cap fraction across executed trades.\n\nP50 shows the typical capital share per trade, while p90 is the threshold above which only the top 10% of executed trades remain.\n\nHow to read it:\nif p90 stands far above p50, the top 10% of executed trades use a materially larger position size than the median trade.'

export const COMMON_BUCKET_DESCRIPTION_EN =
    'Bucket is an independent simulation track with its own starting capital, equity curve, and drawdown.\n\nDaily, intraday, and delayed are calculated separately: loss or ruin in one bucket does not spill into another.\n\nPolicy defines entry and risk rules, Branch defines the direction scenario, and Bucket defines execution mechanics together with the separate balance.\n\nRisk layers work on top of that decision and can further cut risk or block entry.\n\nHow to read it:\nBucket answers how the trade is executed and where the balance path is accumulated. It is not the same thing as Policy or Branch.\n\nExample:\na delayed bucket can show a different trade path and a different drawdown curve even under the same Policy and Branch.'

export const COMMON_SL_MODE_DESCRIPTION_EN =
    'SL Mode is the switch for the trade-exit mechanism.\n\nWITH SL keeps the protective stop-loss enabled. The trade can close by stop-loss, take-profit, liquidation, or EndOfDay.\n\nNO SL disables the protective stop-loss. The trade then stays open until take-profit, liquidation, or EndOfDay.\n\nThe risk profile is materially different: isolated margin can lose the full position margin, while cross margin can lose the full bucket balance.\n\nHow to read it:\nWITH SL and NO SL should be compared only inside the same Policy / Branch configuration. If NO SL increases MaxDD%, HadLiquidation, and AccountRuinCount, the extra return was bought at the cost of emergency risk.\n\nExample:\nif NO SL gives slightly higher TotalPnl% but also introduces liquidations or bucket ruin, that return profile becomes operationally unacceptable.'

export const COMMON_ACCOUNT_RUIN_DESCRIPTION_EN =
    'AccountRuinCount is the ruin metric of the bucket working capital.\n\nA bucket is treated as ruined when it is flagged as dead or when current equity falls to 20% or less of starting capital.\n\nHow to read it:\nfor one Policy in one bucket, 0 is rendered as "No, the bucket is still alive" and 1 as "Yes, the bucket exhausted its starting capital". In total aggregate the number shows how many buckets among daily / intraday / delayed exhausted their starting capital.'

export const COMMON_RECOVERED_DESCRIPTION_EN =
    'Recovered is the flag showing whether the capital returned above the pre-drawdown peak after the worst drawdown.\n\ntrue means the previous peak was recovered inside the selected period.\n\nfalse means the period ended before that recovery happened.'

export const COMMON_RECOV_DAYS_DESCRIPTION_EN =
    'RecovDays is the number of calendar days from the bottom of MaxDD to the day when capital finally returned to the peak that existed before that drawdown.\n\nSmaller values mean faster recovery, while large values mean the capital stayed underwater for a long time.'

export const COMMON_REQ_GAIN_DESCRIPTION_EN =
    'ReqGain% is the growth required from the MaxDD bottom to recover the capital back to the pre-drawdown peak.\n\nThe deeper the drawdown, the more nonlinear this value becomes: a 50% drawdown already needs a 100% gain to recover.'

export const COMMON_CURRENT_BALANCE_DESCRIPTION_EN =
    'EquityNowUsd is the active capital that still remains in the strategy after the selected slice, excluding already withdrawn profit.\n\nWhat it shows:\n1) this is the working balance that still sits in the market after the slice ends;\n2) it is not the full result on its own, because part of the profit can already be in WithdrawnTotalUsd.\n\nHow to read it:\nread EquityNowUsd together with OnExch%, WithdrawnTotalUsd, and TotalPnl% to see how much money still remains in active balance and how much was already taken out.'

export const COMMON_START_CAP_DESCRIPTION_EN =
    'StartCapitalUsd is the money baseline used for return, drawdown, and exposure calculations.\n\nWhat it shows:\n1) this is not the current balance after trades, but the initial reference point of the selected slice;\n2) in Policy Branch Mega one standalone bucket usually starts with 20,000 USD, while total aggregate usually starts with 60,000 USD across three buckets.\n\nHow to read it:\n1) percentage fields such as [[total-pnl|TotalPnl%]], [[on-exchange-pct|OnExch%]], [[drawdown|MaxDD%]], and [[exposure|Exposure%]] are all measured against this base;\n2) without that starting base, dollar results and risk size cannot be compared honestly across rows.\n\nExample:\nif StartCapitalUsd = 20,000 and [[total-pnl|TotalPnl%]] = 25%, the slice produced about 5,000 USD of result.'

export const COMMON_MARGIN_USED_DESCRIPTION_EN =
    'MarginUsed is the actual margin committed to a trade before leverage is applied.\n\nIt is not the full position notional. Full position size is MarginUsed multiplied by leverage.'

export const COMMON_MIN_MOVE_DESCRIPTION_EN =
    'MinMove is the minimum meaningful daily move threshold that the system treats as large enough for a tradeable day.\n\nIts owner unit is log-space rather than simple percent, while the UI may additionally show equivalent +up / -down price barriers from entry.\n\nIt separates tradeable movement from market noise and therefore changes whether a day is treated as directional or too weak for entry.'

export const COMMON_TRADES_DESCRIPTION_EN =
    'TradesCount is the number of executed trades in the selected slice.\n\nOne trade means one fully formed position, not just one model signal.\n\nHow to read it:\nwhen the trade count is small, every single trade has a larger impact on the final result and the slice is statistically thinner.'

export const COMMON_TOTAL_PNL_DESCRIPTION_EN =
    'TotalPnl% is the main profit or loss result of the selected slice in percent.\n\nFormula:\n1) money result = ([[current-balance|current balance]] + [[withdrawn-profit|withdrawn profit]]) - [[start-cap|starting capital]];\n2) TotalPnl% = money result / [[start-cap|starting capital]] * 100.\n\nWhat it shows:\n1) this is the main answer to how much the strategy earned or lost versus its starting base;\n2) it already includes both the money still sitting in active balance and the money that was already withdrawn from trading;\n3) that is why TotalPnl% is the most logical primary profit column.\n\nHow to read it:\n1) read TotalPnl% first as the headline result;\n2) then break that result down through [[on-exchange-pct|OnExch%]], [[current-balance|EquityNowUsd]], and [[withdrawn-profit|WithdrawnTotalUsd]];\n3) the same profit result can still come through very different [[drawdown|MaxDD%]], liquidation count, and [[account-ruin|bucket ruin]] risk.\n\nExample:\nif [[start-cap|starting capital]] = 20,000, the active balance still holds 20,000 after the period, and [[withdrawn-profit|withdrawn profit]] = 5,000, the money result is 5,000 and TotalPnl% = 25%.'

export const COMMON_ON_EXCHANGE_PCT_DESCRIPTION_EN =
    'OnExch% is the return of the capital that remains on exchange after the selected slice finishes.\n\nFormula:\nOnExch% = ([[current-balance|current balance]] - [[start-cap|starting capital]]) / [[start-cap|starting capital]] * 100.\n\nWhat it shows:\n1) this is not the full strategy outcome, but the state of working capital without already withdrawn profit;\n2) the metric answers how much money is still left in the market relative to the start.\n\nHow to read it:\n1) always read OnExch% together with [[total-pnl|TotalPnl%]] and [[withdrawn-profit|WithdrawnTotalUsd]];\n2) if TotalPnl% is materially higher than OnExch%, a meaningful share of the result has already been withdrawn from trading balance;\n3) if both numbers are close, most of the result is still sitting in the market.'

export const COMMON_MAX_DD_DESCRIPTION_EN =
    'MaxDD% is the maximum drawdown of capital from a local peak to the next trough.\n\nThis metric answers how painful the path to the final result was.\n\nHow to read it:\nhigher return with a much deeper MaxDD% is not automatically better, because the strategy required a heavier capital drawdown to get there.'

export const COMMON_HAD_LIQ_DESCRIPTION_EN =
    'HadLiquidation is the liquidation flag for the selected slice.\n\nEven one liquidation means the strategy reached an emergency exchange close instead of finishing a trade through its normal risk plan.\n\nHow to read it:\nthis metric must be judged together with TotalPnl%, MaxDD%, and AccountRuinCount, because one liquidation can erase the profit of many ordinary trading days.'

export const COMMON_WITHDRAWN_DESCRIPTION_EN =
    'WithdrawnTotalUsd is profit that was already withdrawn from the trading balance and is therefore no longer sitting inside current equity.\n\nThis metric matters because a strategy can show moderate on-exchange capital while still having already extracted a meaningful amount of money out of the slice.\n\nHow to read it:\nread WithdrawnTotalUsd together with TotalPnl%, current bucket capital, and drawdown. A moderate live balance does not mean the slice earned little if a meaningful share of profit was already moved out of trading capital.'

export const COMMON_SUM_FUNDING_NET_USD_DESCRIPTION_EN =
    'FundingNetUsd is the net funding cash result of the selected slice, in USD.\n\nFormula:\ntotal funding received minus total funding paid.\n\nHow to read it:\n1) a positive value means funding added money to the result overall;\n2) a negative value means funding reduced profit or deepened loss;\n3) this column is best read next to the final strategy result to separate the price move from the separate funding cash layer.\n\nExample:\nFundingNetUsd = -320 means funding worsened the result by 320 USD overall.'

export const COMMON_SHARPE_DESCRIPTION_EN =
    'Sharpe is the check of how smoothly the strategy earns relative to the full day-to-day noise in results.\n\nWhat it checks:\n1) whether the average daily result is positive;\n2) whether that result swings too hard from day to day.\n\nHow to read it:\n1) a higher Sharpe means the strategy gets more result per unit of total daily noise;\n2) a low Sharpe means the profit path is too uneven or too small for that amount of fluctuation;\n3) a negative Sharpe means the average daily result of the series is already below zero;\n4) comparison is valid only inside the same historical slice.\n\nFormula:\nSharpe = average daily return / standard deviation of daily returns * sqrt(252).\n\nExample:\nif two strategies end with similar [[total-pnl|TotalPnl%]], but one has Sharpe = 1.4 and the other Sharpe = 0.5, the first one reached that result through a much smoother path.'

export const COMMON_SORTINO_DESCRIPTION_EN =
    'Sortino is the check of how well the strategy pays for bad days rather than for the whole day-to-day noise.\n\nWhat it checks:\n1) whether the average daily result is positive;\n2) how painful the negative days are when the series goes below zero.\n\nHow to read it:\n1) a higher Sortino means the strategy handles losing days better relative to its result;\n2) if Sortino stands materially above [[sharpe-ratio|Sharpe]], the bad side of the series is lighter than the full daily noise suggests;\n3) a low Sortino means negative days are too deep or too frequent for that level of result;\n4) comparison is valid only inside the same historical slice.\n\nFormula:\nSortino = average daily return / downside deviation * sqrt(252), where downside deviation is calculated only from negative daily results.\n\nExample:\nif two strategies finish with similar [[total-pnl|TotalPnl%]], but one goes through losing days much more gently, its Sortino will be higher.'

export const COMMON_CALMAR_DESCRIPTION_EN =
    'Calmar is the check of how much annual growth the strategy gets per unit of its deepest capital drawdown.\n\nWhat it checks:\n1) whether the strategy can grow without falling into too deep a capital hole;\n2) whether the final growth was bought through an overly painful worst drawdown.\n\nHow to read it:\n1) a higher Calmar means the strategy reaches the result more cleanly relative to its worst drawdown;\n2) a low Calmar means the growth was bought with too deep a capital drop;\n3) the metric is especially useful when two strategies look similar by [[cagr-ratio|CAGR]] or [[total-pnl|TotalPnl%]], but very different by drawdown depth;\n4) comparison is valid only inside the same historical slice.\n\nFormula:\nCalmar = [[cagr-ratio|CAGR]] / [[drawdown|MaxDD%]].\n\nExample:\nif one strategy has [[cagr-ratio|CAGR]] = 24% and [[drawdown|MaxDD%]] = 12%, while another has CAGR = 24% and MaxDD% = 40%, the first strategy will have the higher Calmar because it reaches the same growth through a much shallower drawdown.'

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
    AccountRuinCount: COMMON_ACCOUNT_RUIN_DESCRIPTION_EN,
    Recovered: COMMON_RECOVERED_DESCRIPTION_EN,
    RecovDays: COMMON_RECOV_DAYS_DESCRIPTION_EN,
    'ReqGain%': COMMON_REQ_GAIN_DESCRIPTION_EN,
    StartCapitalUsd: COMMON_START_CAP_DESCRIPTION_EN,
    'Starting capital': COMMON_START_CAP_DESCRIPTION_EN,
    EquityNowUsd: COMMON_CURRENT_BALANCE_DESCRIPTION_EN,
    MarginUsed: COMMON_MARGIN_USED_DESCRIPTION_EN,
    MinMove: COMMON_MIN_MOVE_DESCRIPTION_EN,
    TradesCount: COMMON_TRADES_DESCRIPTION_EN,
    'TotalPnl%': COMMON_TOTAL_PNL_DESCRIPTION_EN,
    'OnExch%': COMMON_ON_EXCHANGE_PCT_DESCRIPTION_EN,
    'MaxDD%': COMMON_MAX_DD_DESCRIPTION_EN,
    Sharpe: COMMON_SHARPE_DESCRIPTION_EN,
    Sortino: COMMON_SORTINO_DESCRIPTION_EN,
    Calmar: COMMON_CALMAR_DESCRIPTION_EN,
    'Cagr': COMMON_CAGR_DESCRIPTION_EN,
    HadLiquidation: COMMON_HAD_LIQ_DESCRIPTION_EN,
    WithdrawnTotalUsd: COMMON_WITHDRAWN_DESCRIPTION_EN,
    FundingNetUsd: COMMON_SUM_FUNDING_NET_USD_DESCRIPTION_EN
}
