import { POSITION_DESCRIPTION } from '@/shared/consts/tooltipDomainTerms'
import {
    COMMON_BRANCH_DESCRIPTION_EN,
    COMMON_MAX_DD_DESCRIPTION_EN,
    COMMON_POLICY_DESCRIPTION_EN,
    COMMON_TOTAL_PNL_DESCRIPTION_EN,
    COMMON_TRADES_DESCRIPTION_EN
} from '@/shared/terms/common'

export const BACKTEST_SUMMARY_COLUMNS_EN: Record<string, string> = {
    Name: 'Policy name from the active configuration.',
    Type: 'Policy logic type (how the strategy makes entry/exit decisions). Used for grouping.',
    Leverage: 'Configured leverage value: fixed number or dynamic if policy computes leverage internally.',
    MarginMode: 'Trade margin mode: Cross (shared wallet) or Isolated (risk limited to position margin).',
    Policy: COMMON_POLICY_DESCRIPTION_EN,
    Margin: 'Margin mode (Cross/Isolated) used by this policy in backtest output.',
    Branch: COMMON_BRANCH_DESCRIPTION_EN,
    StopLoss: 'Whether this branch uses daily stop-loss: WITH_SL or NO_SL.',
    TotalPnlPct:
        'Total policy return for the period, in %. Higher is better, but it must be read together with risk (MaxDD%).',
    MaxDdPct: 'Maximum equity drawdown in % from local peak. Shows how painful the equity curve was.',
    Trades: 'Total trade count for this policy over the period. Larger samples are usually statistically more reliable.',
    WithdrawnTotal:
        'Amount of withdrawn profit in USD (if equity exceeded base capital). This is realized withdrawn gain.',
    HadLiquidation: 'Whether liquidation occurred in this branch (yes/no). Critical risk flag.',
    TradesBySource:
        'Trade split by signal source (Daily/DelayedA/DelayedB). Helps identify what actually generates activity.'
}

export const BACKTEST_SUMMARY_KEYS_EN: Record<string, string> = {
    FromDateUtc: 'Backtest window start date (UTC). All metrics are computed inside this range.',
    ToDateUtc: 'Backtest window end date (UTC).',
    SignalDays: 'Number of signal/record days included in calculations.',
    PolicyCount: 'Number of policies included in backtest.',
    BestTotalPnlPct: 'Best total return across policies for this period.',
    WorstMaxDdPct: 'Worst (largest) drawdown across policies.',
    PoliciesWithLiquidation: 'How many policies had at least one liquidation.',
    TotalTrades: 'Total trade count across all policies.',
    DailyStopPct: 'Base daily stop-loss (%). Dynamic overlay scales it only for days that pass confidence constraints.',
    DailyTpPct:
        'Base daily take-profit (%). Dynamic overlay scales it only for days with sufficient confidence evidence.',
    DynamicTpPctMin: 'Lower bound for final dynamic TP after all multipliers.',
    DynamicTpPctMax: 'Upper bound for final dynamic TP after all multipliers.',
    DynamicSlPctMin: 'Lower bound for final dynamic SL after all multipliers.',
    DynamicSlPctMax: 'Upper bound for final dynamic SL after all multipliers.',
    DynamicEvidenceMinBucketSamples: 'Minimum historical confidence-bucket samples required to enable dynamic TP/SL.',
    DynamicEvidenceMinBucketWinRate: 'Minimum historical confidence-bucket win-rate required to enable dynamic TP/SL.',
    DynamicOutOfRangeBehavior:
        'Behavior for invalid confidence: NoTrade skips the day, MinRisk uses minimum-risk profile.'
}

Object.assign(BACKTEST_SUMMARY_COLUMNS_EN, {
    Name:
        'Name is the system identifier of the trading setup inside the active policy set.\n\nWhat it shows:\nit is not a performance verdict and not a market label. It identifies which exact entry, exit, and risk configuration produced the current row.\n\nHow to read it:\nuse Name as the key for matching the row with Policy, Branch, and risk metrics rather than as a quality score.\n\nExample:\ntwo rows with similar returns but different Name values can still represent materially different rule sets.',
    Type:
        'Type is the class of trading logic this row belongs to.\n\nWhat it shows:\nit groups policies by the style of decision-making: fixed-risk logic, more adaptive logic, or another rule family.\n\nHow to read it:\nType is useful for grouping similar policies before comparison, but it does not say which one is better by itself.\n\nExample:\ntwo policies of the same Type can still differ strongly in drawdown and liquidation behavior.',
    Leverage:
        'Leverage is the working leverage regime used by the policy.\n\nWhat it shows:\nit tells whether the row uses a fixed leverage value or a leverage path built by internal policy rules.\n\nHow to read it:\nhigher leverage increases capital sensitivity to the same price move and must be read together with MarginMode and MaxDdPct.\n\nExample:\na return earned at 3x and the same return earned at 15x do not imply the same risk profile.',
    MarginMode:
        'MarginMode is the margin regime under which the policy is simulated.\n\nWhat it shows:\nit separates isolated risk from cross-balance risk and therefore changes the meaning of liquidation damage.\n\nHow to read it:\nIsolated limits the loss to trade collateral, while Cross can pull on the whole bucket balance.\n\nExample:\nthe same bad direction can be survivable in isolated mode and much more dangerous in cross mode.',
    Margin:
        'Margin is the trade margin mode used by this policy in the backtest output.\n\nWhat it shows:\nit tells which collateral model stands behind the result row: cross or isolated.\n\nHow to read it:\nthis field is about the loss-absorption rule, not about trade size or dollars at risk.\n\nExample:\nwhen Margin says Cross, the meaning of liquidation changes because the whole bucket balance can be affected.',
    StopLoss:
        'StopLoss shows which stop-loss regime the branch used in the simulation.\n\nWhat it shows:\nWITH SL means the protective stop-loss was active; NO SL means the trade stayed open until take-profit, liquidation, or the end-of-window close.\n\nHow to read it:\nNO SL usually implies fatter tail risk and must be judged together with MaxDdPct and HadLiquidation.\n\nExample:\ntwo policies with equal total return can still have radically different risk if one of them trades without stop-loss.',
    TotalPnlPct:
        'TotalPnlPct is the total policy return over the selected period in percent.\n\nWhat it shows:\nit is the final growth or loss result of the policy inside the report window.\n\nHow to read it:\nhigher is better only when the path to that result is also acceptable in drawdown and liquidation terms.\n\nExample:\n+40% with extreme drawdown can be less usable than +22% with stable capital behavior.',
    MaxDdPct:
        'MaxDdPct is the deepest equity drawdown of the policy in percent.\n\nWhat it shows:\nit is the worst fall from a local equity peak to the next low inside the period.\n\nHow to read it:\nthis field answers how painful the path was, not how the strategy ended.\n\nExample:\na policy can finish positive overall and still show a very destructive MaxDdPct during the journey.',
    Trades:
        'Trades is the total number of executed trades for the policy inside the selected window.\n\nWhat it shows:\nit is the amount of factual trading material behind the result row.\n\nHow to read it:\nlarger samples usually make the row more statistically informative than tiny trade counts.\n\nExample:\na 3-trade winner is much less persuasive than a 500-trade result with similar return.',
    WithdrawnTotal:
        'WithdrawnTotal is the realized profit that was already withdrawn from active trading balance.\n\nWhat it shows:\nit separates cash already taken out from equity still left inside the bucket curve.\n\nHow to read it:\nit matters when reading wealth-like outcomes because a policy may have locked in gains even if current balance later shrank.\n\nExample:\na row with large WithdrawnTotal can still have lower active equity while remaining economically successful overall.',
    HadLiquidation:
        'HadLiquidation shows whether the policy experienced at least one liquidation in the selected period.\n\nWhat it shows:\nit is a tail-risk flag, not the count of all liquidation trades.\n\nHow to read it:\ntrue means the strategy hit an exchange-forced emergency close at least once and therefore carries liquidation risk in its realized history.\n\nExample:\na profitable row with HadLiquidation=true still needs careful risk interpretation.',
    TradesBySource:
        'TradesBySource is the split of executed trades by signal source inside the selected summary.\n\nWhat it shows:\nit separates how much activity came from the main Daily path and how much came from delayed execution channels such as DelayedA or DelayedB.\n\nHow to read it:\nthis field helps identify which execution source really generates volume, and whether the headline result depends on one narrow source or on a broader mix.\n\nExample:\na policy with most trades coming from delayed channels behaves differently from a policy whose result is built mostly by the main Daily source.'
})

Object.assign(BACKTEST_SUMMARY_KEYS_EN, {
    FromDateUtc:
        'FromDateUtc is the left boundary of the backtest window in UTC.\n\nWhat it shows:\nall policies in the summary are evaluated only inside this date range.\n\nHow to read it:\nreturns and drawdowns are only comparable when the compared summaries use the same date window.\n\nExample:\nchanging the start date changes the market regime under which the same policy is judged.',
    ToDateUtc:
        'ToDateUtc is the right boundary of the backtest window in UTC.\n\nWhat it shows:\nit is the last date included in the summary calculation.\n\nHow to read it:\nread it together with FromDateUtc because both dates define the market regime and period length behind the row.\n\nExample:\na later ToDateUtc means the summary includes more recent market behavior.',
    SignalDays:
        'SignalDays is how many trading days with valid signal context entered the summary.\n\nWhat it shows:\nit counts day-level history, not only executed trades and not the number of policies.\n\nHow to read it:\nmore SignalDays means a wider historical base for comparing policies.\n\nExample:\na summary built on 20 signal days is much thinner than one built on 700 signal days.',
    PolicyCount:
        'PolicyCount is how many policies are compared inside the current summary.\n\nWhat it shows:\nit is the size of the candidate set evaluated under one period and one calculation regime.\n\nHow to read it:\nthe field shows the scale of the comparison, not the quality of the set.\n\nExample:\na high PolicyCount means the summary is comparing many candidates, but it does not mean they are all good.',
    BestTotalPnlPct:
        'BestTotalPnlPct is the highest total return reached by any policy in the current summary.\n\nWhat it shows:\nit is the upper boundary of outcome inside this report window, not the average policy quality.\n\nHow to read it:\nthis is a maximum reference point and must be judged together with worst drawdown and liquidation distribution.\n\nExample:\na very high best return can still come from one policy with extreme tail risk.',
    WorstMaxDdPct:
        'WorstMaxDdPct is the deepest drawdown observed among all policies in the current summary.\n\nWhat it shows:\nit is the lower boundary of capital pain inside the compared set.\n\nHow to read it:\nif this value is very severe, at least part of the policy family carries destructive downside even when the best winner looks strong.\n\nExample:\na summary can contain one excellent winner and still hide one catastrophic loser through this metric.',
    PoliciesWithLiquidation:
        'PoliciesWithLiquidation is how many policies had at least one liquidation event.\n\nWhat it shows:\nit is a policy-level tail-risk count, not the number of liquidation trades.\n\nHow to read it:\nrising values mean liquidation risk is structural inside the family rather than isolated to one rare row.\n\nExample:\n1 policy with liquidation is different from 14 policies with liquidation in the same report.',
    TotalTrades:
        'TotalTrades is the total number of executed trades across all policies in the summary.\n\nWhat it shows:\nit is the full amount of factual trade material behind the report.\n\nHow to read it:\nlarger trade volume means the aggregate comparison rests on a broader evidence base.\n\nExample:\nTotalTrades=25,000 means the summary is built on a very large historical trade set.',
    DailyStopPct:
        'DailyStopPct is the base daily stop-loss distance in percent.\n\nWhat it shows:\nit is the starting protective stop level before dynamic risk layers adjust it.\n\nHow to read it:\nthis is the baseline stop reference, not always the final stop of every individual trade.\n\nExample:\na dynamic trade can still end with a different final stop, but DailyStopPct remains the source baseline.',
    DailyTpPct:
        'DailyTpPct is the base daily take-profit distance in percent.\n\nWhat it shows:\nit is the starting profit target before dynamic risk adjustments.\n\nHow to read it:\nthis field defines the baseline exit ambition and must be judged together with dynamic TP bounds.\n\nExample:\na policy with a small base TP aims to lock profit earlier than one with a far target.',
    DynamicTpPctMin:
        'DynamicTpPctMin is the lower working bound of final dynamic take-profit.\n\nWhat it shows:\nafter confidence multipliers and clamps, the final TP cannot fall below this value.\n\nHow to read it:\nit protects the dynamic regime from collapsing into unrealistically tight profit targets.\n\nExample:\neven under weak confidence, the final TP still cannot shrink below this floor.',
    DynamicTpPctMax:
        'DynamicTpPctMax is the upper working bound of final dynamic take-profit.\n\nWhat it shows:\nafter scaling, the final TP cannot rise above this value.\n\nHow to read it:\nit stops the dynamic regime from becoming unrealistically greedy.\n\nExample:\nvery strong confidence still cannot push TP beyond this cap.',
    DynamicSlPctMin:
        'DynamicSlPctMin is the lower working bound of final dynamic stop-loss.\n\nWhat it shows:\nafter scaling, the final stop-loss cannot move closer than this floor.\n\nHow to read it:\nit protects the strategy from an unrealistically tight stop that would be hit by noise rather than by a real scenario break.\n\nExample:\neven in a defensive day the final stop cannot shrink below this minimum distance.',
    DynamicSlPctMax:
        'DynamicSlPctMax is the upper working bound of final dynamic stop-loss.\n\nWhat it shows:\nafter multipliers, the final stop-loss cannot move farther than this ceiling.\n\nHow to read it:\nit prevents dynamic risk from stretching acceptable loss too far.\n\nExample:\nvery high confidence still cannot widen the stop beyond this maximum bound.',
    DynamicEvidenceMinBucketSamples:
        'DynamicEvidenceMinBucketSamples is the minimum number of historical trades required in the confidence bucket before dynamic risk is allowed to activate.\n\nWhat it shows:\nit is the evidence threshold of maturity for dynamic adaptation.\n\nHow to read it:\nbelow this count the system refuses to trust the bucket enough for adaptive TP/SL changes.\n\nExample:\na bucket with 12 trades is still too young if the threshold requires 30 samples.',
    DynamicEvidenceMinBucketWinRate:
        'DynamicEvidenceMinBucketWinRate is the minimum historical win-rate required in the confidence bucket before dynamic risk can activate.\n\nWhat it shows:\nit is the quality threshold on top of the sample-size threshold.\n\nHow to read it:\nample history is not enough by itself; the bucket must also show acceptable past quality.\n\nExample:\na bucket with many samples but weak win-rate still fails the dynamic admission rule.',
    DynamicOutOfRangeBehavior:
        'DynamicOutOfRangeBehavior defines what the engine does when confidence falls outside the valid dynamic regime.\n\nWhat it shows:\nNoTrade means the day is skipped; MinRisk means the engine keeps the day alive only under the most defensive profile.\n\nHow to read it:\nthis field defines how harshly the system handles invalid confidence rather than letting the strategy behave as if nothing happened.\n\nExample:\na NoTrade policy will drop the day completely, while MinRisk still allows a trade under minimal risk settings.'
})

const CURRENT_PREDICTION_BUCKET_DESCRIPTION_EN =
    'Bucket is an independent execution track with its own starting capital, equity curve, and drawdown.\n\nDaily, intraday, and delayed are calculated separately: loss or ruin in one bucket does not spill into another.\n\nPolicy defines entry and risk rules, Branch defines the direction scenario, and Bucket defines the execution mechanics and the separate balance.\n\nRisk layers work on top of that decision and can further cut risk or block entry.\n\nSwitching bucket changes the trade set and recalculates Tr, TotalPnl%, MaxDD%, HadLiq, AccRuin, Recovered, and recovery.\n\nOn this page:\nthe field shows which bucket actually executed the signal or, instead, failed to turn it into a trade inside the selected Policy.'

const CURRENT_PREDICTION_HAD_LIQ_DESCRIPTION_EN =
    'HadLiq shows whether this [[policy|Policy]] had at least one [[liquidation|liquidation]] inside the selected slice.\n\nEven one positive value means the strategy reached an exchange-forced emergency close at least once instead of finishing trades by its normal risk plan.\n\nHow to read it:\nthis flag must be judged together with [[total-pnl|TotalPnl%]] and [[drawdown|MaxDD%]]. A profitable total result with HadLiq=true still means heavy tail risk.'

const CURRENT_PREDICTION_POSITION_QTY_DESCRIPTION_EN =
    'Position size, qty is how many units of the instrument actually entered the trade.\n\nFor a trading pair this is the physical amount of the base asset inside the position. The value is derived from position notional and entry price.\n\nHow to read it:\nif qty rises at a similar entry price, the strategy controls a larger market amount and becomes more sensitive to each price move.'

const CURRENT_PREDICTION_MARKET_REGIME_DESCRIPTION_EN =
    'Market regime is the current day phase from the risk-model point of view: normal regime or drawdown / stress regime.\n\nIt is not a separate trading signal. It is context for [[risk-layers|risk layers]] and for part of [[policy|Policy]] rules.\n\nHow to read it:\nnormal regime keeps standard risk, while stress regime usually leads to tighter entry limits, lower [[leverage|leverage]], or lower [[cap-fraction|capital share per trade]].'

const CURRENT_PREDICTION_SL_PROBABILITY_DESCRIPTION_EN =
    'Stop-loss trigger probability is the [[sl-model|SL model]] estimate of how likely the trade is to reach [[tp-sl|stop-loss]] quickly after entry into the trade.\n\nIt is a dedicated risk estimate, not a probability of price going up or down.\n\nHow to read it:\nhigher values mean [[risk-layers|risk layers]] should behave more defensively and are more likely to cut [[cap-fraction|capital share per trade]], [[leverage|leverage]], or the entry itself.'

const CURRENT_PREDICTION_CURRENT_PRICE_DESCRIPTION_EN =
    'Current SOL/USDT price is the market price of the pair at forecast time, meaning how many USDT the market currently pays for 1 SOL.\n\nIt is the common working instrument used to compare [[landing-current-prediction|current prediction]], decision history, and [[backtest|backtest]].\n\nHow to read it:\nthis price is the base reference for [[min-move|MinMove]], direction expectation, and entry/exit levels in the Policy table.'

const CURRENT_PREDICTION_MIN_MOVE_DESCRIPTION_EN =
    'Minimum meaningful price move is the MinMove threshold that separates a tradeable move from market noise.\n\nIf the expected move is too small, the system treats the day as weak for a quality trade.\n\nOn this page:\nthe field shows the exact [[min-move|MinMove]] that was available to the model at prediction time, not a post-fact value after the window closed.'

const CURRENT_PREDICTION_MIN_PRICE_24H_DESCRIPTION_EN =
    '24h minimum price is the lowest price the market reached inside the factual 24-hour window after entry.\n\nIt does not show the closing result of the day. It answers how deep price went during the window even if the market later recovered.\n\nHow to read it:\nfor [[position|LONG]] it is the largest move against the position. For [[position|SHORT]] it is the best intraday move in favor of the short.\n\nExample:\nentry at 100 and a minimum of 97.9 mean the market reached as much as -2.1% from entry inside the window.'

const CURRENT_PREDICTION_CLOSE_PRICE_24H_DESCRIPTION_EN =
    '24h close price is the instrument price at the very end of the factual 24-hour window after entry.\n\nIt is the final comparison point for forecast versus fact at close, not the intraday extreme.\n\nHow to read it:\nthis field answers how the day finished by the window close. It must be read together with 24h maximum and minimum so intraday opportunity is not confused with the final close outcome.'

const CURRENT_PREDICTION_FACTOR_TYPE_DESCRIPTION_EN =
    'Type is the [[factor|factor]] category inside the [[landing-explain|explain]] table: the source layer of the influence, such as a model feature, a rule, or another internal signal.\n\nThis field shows where the explanation came from: raw data, the [[landing-explain|explain]] layer, [[landing-pfi|PFI]], or the orchestration logic around the [[current-prediction-model-stack|current prediction models]].\n\nHow to read it:\nif one type dominates the top rows, the forecast is mostly explained by one class of [[factor|factors]] rather than by a balanced mix.'

const CURRENT_PREDICTION_FACTOR_NAME_DESCRIPTION_EN =
    'Name is the exact [[factor|factor]] identifier that entered the top part of the [[landing-explain|explain]] or [[landing-pfi|PFI]] list for this forecast.\n\nIt links the row to a concrete [[current-prediction-model-stack|current prediction model]], feature, or decision rule.\n\nHow to read it:\nfirst identify what this [[factor|factor]] actually refers to, then compare it with the rank and description to understand whether it is the main driver or just supporting context.'

const CURRENT_PREDICTION_FACTOR_VALUE_DESCRIPTION_EN =
    'Value is the actual state of the [[factor|factor]] at prediction time.\n\nIt can be a number, a category, or be empty when the row describes a rule without a standalone numeric value.\n\nHow to read it:\nthis is the current reading of the [[factor|factor]], not the size of its importance. To judge importance, compare the value with the factor rank and the surrounding context.'

const CURRENT_PREDICTION_FACTOR_RANK_DESCRIPTION_EN =
    'Rank is the [[factor|factor]] position inside the current ordered explanation list.\n\nThe smaller the rank, the stronger the contribution of this [[factor|factor]] to the current forecast explanation.\n\nHow to read it:\nRank=1 means the leading explanation [[factor|factor]] on this card, while larger ranks describe secondary or supporting causes.'

function ensureStructuredTooltipDescriptionEn(
    description: string,
    marker: string,
    hint: string
): string {
    return description.includes(marker) ? description : `${description}\n\n${marker}\n${hint}`
}

const CURRENT_PREDICTION_LEVERAGE_DESCRIPTION_EN =
    'Leverage is the final working leverage used by this row after all risk limits were applied.\n\nIt is not only the configured Policy number. Zonal and other risk layers can reduce the effective leverage before the trade is executed.\n\nHow to read it:\nhigher leverage makes the same price move hit capital faster, so the field must be judged together with stake, liquidation distance, and bucket capital.\n\nExample:\nthe same entry with 3x and 12x leverage can end in very different drawdown even when direction is identical.'

const CURRENT_PREDICTION_COMBINED_RESPONSE_DESCRIPTION_EN =
    'Combined response is the final market scenario after the stack combines the Daily layer, the Micro layer, and the SL-risk layer.\n\nIt is not a raw model output from one classifier. It is the interpreted final answer that the trading logic later passes to the Policy table and risk controls.\n\nHow to read it:\nthis field is the main class-level verdict of the card and should be read together with the probability blocks and the realized day outcome.\n\nExample:\nif Daily looked flat but the combined response moved to micro-down, the stacked interpretation found a bearish tilt inside an otherwise flat day.'

const CURRENT_PREDICTION_DAILY_MODEL_DESCRIPTION_EN =
    'Primary model (Daily) is the base three-class answer of the daily model: UP, FLAT, or DOWN.\n\nThis is the first directional layer of the stack before micro refinements and stop-loss risk interpretation are applied.\n\nHow to read it:\nstart here when comparing layers. If later blocks disagree with Daily, the change came from Micro or SL-aware interpretation rather than from the raw daily model alone.'

const CURRENT_PREDICTION_MICRO_MODEL_DESCRIPTION_EN =
    'Micro model is an additional model that activates only after [[current-prediction-daily-layer|Daily]] has classified the day as flat.\n\nWhat it does:\n- it does not touch days where Daily already chose an up or down scenario;\n- it searches for a weak directional tilt inside a sideways day;\n- it passes that refinement into Day + Micro and then into Total.\n\nHow to read it:\nMicro does not replace [[current-prediction-daily-layer|Daily]]. It exists to recover weak directional signals that would otherwise stay inside a flat-looking day.'

const CURRENT_PREDICTION_MODEL_TRAINING_WINDOW_DESCRIPTION_EN =
    'Model training window shows which slice of history was used to build the current prediction stack.\n\nWhat it shows:\nit makes visible the training mode, the covered date range, and the number of observations behind the active forecast.\n\nHow to read it:\nthis field answers how much and what type of history stands behind the forecast. When [[landing-all-history|full history]], [[train-segment|Train]], [[landing-oos|OOS]], and [[landing-recent-tail-history|recent tail]] differ, the explanation starts here.'

const CURRENT_PREDICTION_MODEL_COMMENT_DESCRIPTION_EN =
    'Model comment is the short note attached to the current calculation when the system needs to explain a special forecast mode or why the standard daily result is not ready yet.\n\nWhat it shows:\nit usually carries a human-readable reason such as an unclosed day, a missing daily layer, or another calculation mode that affects the card.\n\nHow to read it:\nit is supporting context for the forecast, not a standalone metric. It explains why the card looks this way, but it does not replace probabilities, the final scenario, or the risk fields.'

export const CURRENT_PREDICTION_COLUMNS_EN: Record<string, string> = {
    Политика: COMMON_POLICY_DESCRIPTION_EN,
    Ветка: COMMON_BRANCH_DESCRIPTION_EN,
    Бакет: CURRENT_PREDICTION_BUCKET_DESCRIPTION_EN,
    Bucket: CURRENT_PREDICTION_BUCKET_DESCRIPTION_EN,
    Сторона: POSITION_DESCRIPTION,
    'Рискованный день':
        'Risk day marks that this day was classified as an [[high-risk-day|elevated-risk day]] by the [[sl-model|SL model]].\n\nThis does not mean entry is automatically forbidden. The day then passes through stricter [[filters|filters]] and [[risk-layers|risk layers]]: [[leverage|leverage]] and [[cap-fraction|capital share per trade]] may be reduced, and some policies may refuse entry completely.\n\nHow to read it:\nif the flag is on, this row must be judged more strictly by risk, [[drawdown|drawdown]], and [[liquidation|liquidation]], not only by forecast direction.',
    'Есть направление':
        'Has direction shows whether the model was able to produce a valid [[signal-direction|signal direction]] for that day.\n\nA yes/true value means the pipeline produced a LONG or SHORT candidate and the row can move to the next risk checks.\n\nA no/false value means the day ended in [[no-direction|no_direction]]: there was no clear edge toward growth or decline, so trade construction stops at this point.\n\nHow to read it:\nif direction is missing, this row should not be interpreted as a ready trade even if service fields below are still populated.',
    Пропущено:
        'Skipped is the final flag that this policy did not open a [[position|position]] on that day.\n\nThe reason may differ: the day could fail [[filters|filters]], lose [[signal-direction|signal direction]], fall into an [[high-risk-day|elevated-risk day]] with blocked entry, or receive zero [[cap-fraction|capital share per trade]].\n\nHow to read it:\nif the flag is on, the row describes a rejected entry rather than an executed trade. In that case the key question is why entry was blocked for this [[policy|Policy]], [[branch|Branch]], and [[bucket|Bucket]].',
    Направление: 'Final trade direction: LONG, SHORT, or no-trade when filters block entry.',
    Плечо: 'Effective leverage applied by policy for entry.',
    'Цена входа': 'Position entry price from report.',
    'Вход, $': 'Position entry price from report.',
    'Цена выхода': 'Actual exit price by first event (TP/SL/liquidation/window close).',
    'Выход, $': 'Actual exit price by first event (TP/SL/liquidation/window close).',
    'Причина выхода': 'First event that closed position: take-profit, stop-loss, liquidation, or forced close.',
    'Выход PnL, %':
        'Exit [[pnl|PnL]], % is the result of this specific trade in percent relative to entry price.\n\nIt shows the raw price move of the trade itself: a larger plus means price moved further in favor of the position, while a deeper minus means stronger adverse movement.\n\nThis is not the same as capital-level outcome after full [[leverage|leverage]] impact and strategy-level aggregation. For overall evaluation, it must be read together with [[total-pnl|TotalPnl%]] and the rest of the risk profile.\n\nHow to read it:\npositive means profitable exit, negative means losing exit. An exit by [[liquidation|liquidation]] can still be very damaging even when the price percent looks small.',
    'SL, %':
        'SL, % shows how far the [[tp-sl|stop-loss]] sits from entry price in percentage terms.\n\nIt answers how much adverse price move the trade is allowed to absorb before defensive exit.\n\nHow to read it:\na smaller value means earlier protection, while a larger value leaves more room for noise but also allows a bigger loss before exit.',
    'TP, %':
        'TP, % shows how far the [[tp-sl|take-profit]] sits from entry price in percentage terms.\n\nIt answers how much favorable price move the trade needs before profit is locked in.\n\nHow to read it:\na smaller target realizes profit sooner, while a larger target requires a stronger market move.',
    'Цена SL':
        'SL price is the exact market level where [[tp-sl|stop-loss]] would trigger.\n\nIt is the absolute-price version of SL, % rather than the percentage distance.\n\nHow to read it:\nit is useful when checking how close the stop sits to entry and to [[liquidation|liquidation]].',
    'Цена TP':
        'TP price is the exact market level where [[tp-sl|take-profit]] would trigger.\n\nIt is the absolute-price version of TP, % rather than the percentage distance.\n\nHow to read it:\nit is useful when comparing the planned profit target with the actual intraday maximum.',
    'SL, $':
        'SL, $ is the instrument price at the [[tp-sl|stop-loss]] level.\n\nIt repeats the meaning of SL price, but in the explicit dollar form used for the trading pair.\n\nHow to read it:\nit is useful when comparing stop placement with entry, liquidation, and the factual intraday minimum.',
    'TP, $':
        'TP, $ is the instrument price at the [[tp-sl|take-profit]] level.\n\nIt repeats the meaning of TP price, but in the explicit dollar form used for the trading pair.\n\nHow to read it:\nit is useful when comparing target placement with the factual intraday maximum and the final exit price.',
    'Номинал позиции, $':
        'Full position notional after leverage. Used for exposure and quantity math; it is not the same as margin.',
    'Размер позиции, qty': CURRENT_PREDICTION_POSITION_QTY_DESCRIPTION_EN,
    'Цена ликвидации': 'Estimated liquidation price for selected leverage.',
    'Цена ликвидации, $': 'Estimated liquidation price for selected leverage.',
    'Дистанция до ликвидации, %': 'Price buffer to liquidation level, in %.',
    'Капитал бакета, $': 'Selected bucket capital at trade calculation time.',
    'Ставка, $': 'How many USD from bucket capital were allocated to this trade.',
    'Ставка, %': 'Share of bucket capital allocated to this trade (Stake$ / BucketCapital$ * 100).',
    Trades: 'How many trades this policy already has in current report window.',
    'TotalPnl%': 'Total policy return in %.',
    'MaxDD%': 'Maximum policy drawdown in %.',
    HadLiq: CURRENT_PREDICTION_HAD_LIQ_DESCRIPTION_EN,
    Withdrawn$:
        'Withdrawn$ is the amount of profit this policy already moved out of active trading balance.\n\nIt is not current on-exchange balance, but profit already taken out of the live equity curve.\n\nHow to read it:\nit matters for wealth interpretation because a strategy may have realized and withdrawn part of its gains even if current balance now looks smaller.',
    Тип: CURRENT_PREDICTION_FACTOR_TYPE_DESCRIPTION_EN,
    Имя: CURRENT_PREDICTION_FACTOR_NAME_DESCRIPTION_EN,
    Значение: CURRENT_PREDICTION_FACTOR_VALUE_DESCRIPTION_EN,
    Ранг: CURRENT_PREDICTION_FACTOR_RANK_DESCRIPTION_EN
}

Object.assign(CURRENT_PREDICTION_COLUMNS_EN, {
    Policy: CURRENT_PREDICTION_COLUMNS_EN['Политика'],
    Branch: CURRENT_PREDICTION_COLUMNS_EN['Ветка'],
    Bucket: CURRENT_PREDICTION_COLUMNS_EN.Bucket,
    Type: CURRENT_PREDICTION_COLUMNS_EN['Тип'],
    Name: CURRENT_PREDICTION_COLUMNS_EN['Имя'],
    Value: CURRENT_PREDICTION_COLUMNS_EN['Значение'],
    Rank: CURRENT_PREDICTION_COLUMNS_EN['Ранг'],
    'Risk day': CURRENT_PREDICTION_COLUMNS_EN['Рискованный день'],
    'Has direction': CURRENT_PREDICTION_COLUMNS_EN['Есть направление'],
    Skipped: CURRENT_PREDICTION_COLUMNS_EN['Пропущено'],
    Direction: CURRENT_PREDICTION_COLUMNS_EN['Направление'],
    Leverage: CURRENT_PREDICTION_COLUMNS_EN['Плечо'],
    'Entry price': CURRENT_PREDICTION_COLUMNS_EN['Цена входа'],
    'Exit price': CURRENT_PREDICTION_COLUMNS_EN['Цена выхода'],
    'Exit reason': CURRENT_PREDICTION_COLUMNS_EN['Причина выхода'],
    'Position notional, $': CURRENT_PREDICTION_COLUMNS_EN['Номинал позиции, $'],
    'Liquidation price': CURRENT_PREDICTION_COLUMNS_EN['Цена ликвидации'],
    'Distance to liquidation, %': CURRENT_PREDICTION_COLUMNS_EN['Дистанция до ликвидации, %'],
    'Bucket capital, $': CURRENT_PREDICTION_COLUMNS_EN['Капитал бакета, $'],
    'Stake, $': CURRENT_PREDICTION_COLUMNS_EN['Ставка, $'],
    'Stake, %': CURRENT_PREDICTION_COLUMNS_EN['Ставка, %'],
    'Total return, %': CURRENT_PREDICTION_COLUMNS_EN['TotalPnl%'],
    'Max drawdown, %': CURRENT_PREDICTION_COLUMNS_EN['MaxDD%'],
    'Had liquidation': CURRENT_PREDICTION_COLUMNS_EN.HadLiq
})

Object.assign(CURRENT_PREDICTION_COLUMNS_EN, {
    'Сторона':
        'Side is the final trade direction of this row.\n\nWhat it shows:\nLONG means the position was opened for growth, SHORT means it was opened for decline.\n\nHow to read it:\nthis field must be read together with entry, exit, and risk metrics because direction alone does not tell whether the decision was safe or profitable.\n\nExample:\nLONG with a weak liquidation buffer is still an aggressive trade even when the direction later works.',
    Направление:
        'Direction is the final side of the trade after all filters and risk layers.\n\nWhat it shows:\nthis is not a draft market opinion but the actionable result of the pipeline: LONG, SHORT, or no trade.\n\nHow to read it:\nif the day ends without entry, the row should be read as a blocked decision rather than an executed trade.\n\nExample:\nno-trade means the model may still have a view, but the trading stack refused to convert it into a live position.',
    'Цена входа':
        'Entry price is the exact market level where the position was opened in the report.\n\nWhat it shows:\nthis price becomes the base for PnL, stop-loss, take-profit, and liquidation distance.\n\nHow to read it:\nall later percent moves in the row are measured against this level.\n\nExample:\nif entry is 100 and exit is 103, the raw move in favor of the trade is +3%.',
    'Вход, $':
        'Entry price is the exact market level where the position was opened in the report.\n\nWhat it shows:\nthis price becomes the base for PnL, stop-loss, take-profit, and liquidation distance.\n\nHow to read it:\nall later percent moves in the row are measured against this level.\n\nExample:\nif entry is 100 and exit is 103, the raw move in favor of the trade is +3%.',
    'Цена выхода':
        'Exit price is the factual market level where the trade finished in the simulation.\n\nWhat it shows:\nthis is the final price used to turn the position into realized profit, loss, or emergency close.\n\nHow to read it:\nread it together with Exit reason, because the same exit price can still come from take-profit, stop-loss, liquidation, or forced close.\n\nExample:\nan exit at 97 can mean a controlled stop or a far worse liquidation scenario depending on the reason field.',
    'Выход, $':
        'Exit price is the factual market level where the trade finished in the simulation.\n\nWhat it shows:\nthis is the final price used to turn the position into realized profit, loss, or emergency close.\n\nHow to read it:\nread it together with Exit reason, because the same exit price can still come from take-profit, stop-loss, liquidation, or forced close.\n\nExample:\nan exit at 97 can mean a controlled stop or a far worse liquidation scenario depending on the reason field.',
    'Причина выхода':
        'Exit reason is the event that really closed the position.\n\nWhat it shows:\nthe row tells whether the trade ended by take-profit, stop-loss, liquidation, or by a forced close at the end of the window.\n\nHow to read it:\nthe same PnL has a different meaning after stop-loss and after liquidation because the risk quality is not the same.\n\nExample:\na small loss after stop-loss is controlled risk, while the same loss after liquidation points to much weaker protection.',
    'Номинал позиции, $':
        'Position notional, $ is the full market size of the trade after leverage is applied.\n\nWhat it shows:\nthis is larger than margin because it already includes exposure created by leverage.\n\nHow to read it:\nuse it to judge how much market size the trade really controlled, not how much collateral it posted.\n\nExample:\nmargin 500 with 10x leverage creates a position notional near 5,000.',
    'Цена ликвидации':
        'Liquidation price is the market level where the exchange would force-close the position.\n\nWhat it shows:\nthis is the emergency survival boundary of the trade, not a normal planned exit.\n\nHow to read it:\nthe closer liquidation price sits to entry, the more aggressive the trade is.\n\nExample:\na very tight liquidation level means a relatively small move against the trade can already destroy the position.',
    'Цена ликвидации, $':
        'Liquidation price is the market level where the exchange would force-close the position.\n\nWhat it shows:\nthis is the emergency survival boundary of the trade, not a normal planned exit.\n\nHow to read it:\nthe closer liquidation price sits to entry, the more aggressive the trade is.\n\nExample:\na very tight liquidation level means a relatively small move against the trade can already destroy the position.',
    'Дистанция до ликвидации, %':
        'Distance to liquidation, % is the remaining price buffer between entry and liquidation.\n\nWhat it shows:\nthis is one of the strongest direct risk fields in the row because it answers how much adverse move the trade can absorb before emergency close.\n\nHow to read it:\nsmaller values mean thinner safety margin and more fragile leverage-risk combination.\n\nExample:\na 1.2% buffer is much more dangerous than a 6.5% buffer at the same market regime.',
    'Капитал бакета, $':
        'Bucket capital, $ is how much capital the selected bucket had at the moment this trade was built.\n\nWhat it shows:\nthis is the working balance from which stake and risk for the next trade are taken.\n\nHow to read it:\nchanges across rows show how previous trades already altered the balance before the next decision.\n\nExample:\nif bucket capital drops from 20,000 to 15,000, the same stake percentage now risks fewer dollars but on a more damaged account.',
    'Ставка, $':
        'Stake, $ is how many dollars of bucket capital were actually committed to this trade as own collateral.\n\nWhat it shows:\nthis is not the full market exposure, only the capital put at risk before leverage multiplies the position.\n\nHow to read it:\nstake must be judged together with leverage because a small cash stake can still control a large notional exposure.\n\nExample:\na $400 stake with 15x leverage is still a meaningful trade even though the own cash at risk looks modest.',
    'Ставка, %':
        'Stake, % is the share of bucket capital allocated to this trade.\n\nWhat it shows:\nthis is the relative aggressiveness of the entry: 5% and 35% are fundamentally different risk regimes.\n\nHow to read it:\nhigher stake percentages make each error hit the equity curve harder and speed up drawdown.\n\nExample:\nrepeated 25% stakes on losing days will damage the bucket much faster than repeated 5% stakes.',
    'MaxDD%':
        'MaxDD% is the maximum drawdown of the policy from a local equity peak to the next minimum.\n\nWhat it shows:\nit is the deepest capital pain the strategy experienced on the way to its final result.\n\nHow to read it:\na strong TotalPnl% with a very deep MaxDD% still means a difficult path for a real account.\n\nExample:\nTotalPnl%=40 with MaxDD%=-55 is far harder to hold than a lower-return strategy with MaxDD%=-15.'
})

Object.assign(CURRENT_PREDICTION_COLUMNS_EN, {
    Политика: COMMON_POLICY_DESCRIPTION_EN,
    Ветка: COMMON_BRANCH_DESCRIPTION_EN,
    Бакет: ensureStructuredTooltipDescriptionEn(
        CURRENT_PREDICTION_BUCKET_DESCRIPTION_EN,
        'How to read it:',
        'this field identifies which execution track carried the trade and where the resulting capital path is accumulated.'
    ),
    Bucket: ensureStructuredTooltipDescriptionEn(
        CURRENT_PREDICTION_BUCKET_DESCRIPTION_EN,
        'How to read it:',
        'this field identifies which execution track carried the trade and where the resulting capital path is accumulated.'
    ),
    Плечо: CURRENT_PREDICTION_LEVERAGE_DESCRIPTION_EN,
    Trades: COMMON_TRADES_DESCRIPTION_EN,
    'TotalPnl%': COMMON_TOTAL_PNL_DESCRIPTION_EN,
    'MaxDD%': COMMON_MAX_DD_DESCRIPTION_EN,
    Тип: CURRENT_PREDICTION_FACTOR_TYPE_DESCRIPTION_EN,
    Имя: CURRENT_PREDICTION_FACTOR_NAME_DESCRIPTION_EN,
    Значение: CURRENT_PREDICTION_FACTOR_VALUE_DESCRIPTION_EN,
    Ранг: CURRENT_PREDICTION_FACTOR_RANK_DESCRIPTION_EN
})

export const CURRENT_PREDICTION_KEYS_EN: Record<string, string> = {
    Набор:
        'Set is the mode in which the current prediction card is shown.\n\nWhat it shows:\nLive means the forecast is evaluated for the current day before the future window is known. Backfilled means the card is tied to a past date whose factual outcome is already available.\n\nHow to read it:\nthis field changes what can be compared fairly. In Live the future is still unknown, while in Backfilled the card can already be judged against fact.\n\nExample:\na mismatch analysis only makes full sense in Backfilled mode because the realized day outcome is already known.',
    Строгость:
        'Strictness is the rule that defines what the system does when the required data slice is incomplete.\n\nWhat it shows:\na strict mode blocks publication when a mandatory layer is missing, while a softer mode allows the card to exist with a reduced confidence context.\n\nHow to read it:\nthis is not a market metric. It explains how hard the pipeline protects the forecast from missing data risk.\n\nExample:\nthe same date can be shown in one strictness mode and rejected in another if one required layer is missing.',
    'Статус прогноза':
        'Prediction status is an optional note attached to the current card.\n\nWhat it shows:\nit highlights special context around this exact forecast build rather than introducing a new market metric.\n\nHow to read it:\nuse it as a reading hint for the card, not as an independent quantitative signal.',
    'Время генерации отчёта (UTC)':
        'Report generated at (UTC) is the timestamp when this prediction card was assembled.\n\nWhat it shows:\nit tells which concrete run of the pipeline produced the visible card and how fresh that run is.\n\nHow to read it:\nuse this field to distinguish one build of the same forecast date from another, especially when comparing retries or later rebuilds.\n\nExample:\nif two cards target the same day but have different generation timestamps, they were built from different pipeline runs.',
    'Дата прогноза (UTC)':
        'Prediction date (UTC) is the trading day the card is forecasting.\n\nWhat it shows:\nit is the target day of the decision, not the build time of the report.\n\nHow to read it:\nall probabilities, decision layers, and policy rows on the card should be interpreted as belonging to this target date.\n\nExample:\na card generated today can still forecast tomorrow, so generation time and prediction date are not interchangeable.',
    SessionDayKeyUtc:
        'SessionDayKeyUtc is the unique UTC trading-day key of the card.\n\nWhat it shows:\nit links the forecast, the policy block, and the realized outcome to the same session-level day identity.\n\nHow to read it:\nthis field matters for exact joins with history, exports, or debugging traces rather than for business interpretation of the market view itself.\n\nExample:\nif two rows share the same SessionDayKeyUtc, they belong to the same modeled trading day even if other labels differ.',
    EntryUtc:
        'EntryUtc is the start of the factual forward window from which the day is later judged.\n\nWhat it shows:\nit defines the opening point for return, intraday range, and realized outcome calculations.\n\nHow to read it:\nthis field is the anchor of the forward measurement window, so price-based 24h metrics should be read as starting from this timestamp.\n\nExample:\n24h max from entry is always measured relative to the market state at EntryUtc.',
    ExitUtc:
        'ExitUtc is the end of the factual forward window used for comparison with the realized day outcome.\n\nWhat it shows:\nit closes the same window that started at EntryUtc.\n\nHow to read it:\nthis field marks the end of the factual evaluation horizon and should be read together with EntryUtc rather than as a standalone time.\n\nExample:\nif EntryUtc and ExitUtc span one modeled day, the close-based outcome is measured exactly between those two timestamps.',
    AsOfUtc:
        'AsOfUtc is the latest timestamp the model was allowed to know when the forecast was made.\n\nWhat it shows:\nit is the boundary between known past and forbidden future for the causal prediction path.\n\nHow to read it:\nthis field is one of the key anti-leakage guards. Anything later than AsOfUtc must not influence the forecast.\n\nExample:\nif a strong move happened after AsOfUtc, the model should not already reflect it in the forecast.',
    DataCutoffUtc:
        'DataCutoffUtc is the hard upper bound of market data included in the prediction pipeline.\n\nWhat it shows:\nit tells where the pipeline stopped reading source data before building features and probabilities.\n\nHow to read it:\nthis field helps verify that the visible forecast still belongs to the causal path and does not silently use future market information.\n\nExample:\nif DataCutoffUtc moved too far right, a seemingly strong forecast may already contain leakage.',
    'Основная модель (Daily)': CURRENT_PREDICTION_DAILY_MODEL_DESCRIPTION_EN,
    'Микро-модель': CURRENT_PREDICTION_MICRO_MODEL_DESCRIPTION_EN,
    'Общий ответ (интерпретация моделей)': CURRENT_PREDICTION_COMBINED_RESPONSE_DESCRIPTION_EN,
    'Итоговый ответ моделей': CURRENT_PREDICTION_COMBINED_RESPONSE_DESCRIPTION_EN,
    'Обучение моделей (диапазон)': 'Training data scope used for this prediction (scope + range + records).',
    'Режим рынка': CURRENT_PREDICTION_MARKET_REGIME_DESCRIPTION_EN,
    'Вероятность срабатывания стоп-лосса': CURRENT_PREDICTION_SL_PROBABILITY_DESCRIPTION_EN,
    'Сигнал SL-модели': 'Interpreted SL signal (normal risk / high risk).',
    'Текущая цена SOL/USDT': CURRENT_PREDICTION_CURRENT_PRICE_DESCRIPTION_EN,
    'Минимальный осмысленный ход цены': ensureStructuredTooltipDescriptionEn(
        CURRENT_PREDICTION_MIN_MOVE_DESCRIPTION_EN,
        'How to read it:',
        'read it as the forecast-side threshold of movement significance rather than as the realized movement after the fact.'
    ),
    'Комментарий модели': 'Model text comment explaining decision (if present).',
    'Daily (основная модель)': CURRENT_PREDICTION_DAILY_MODEL_DESCRIPTION_EN,
    'Day + Micro':
        'Day + Micro probabilities show the scenario distribution after the base [[current-prediction-daily-layer|Daily]] layer is refined by the [[landing-micro-model|Micro]] layer.\n\nWhat it shows:\nthis is the intermediate probability block between raw Daily output and the final Total stack.\n\nHow to read it:\ncompare it with Daily to see whether the micro layer materially changed a flat-looking day into a weak directional scenario.\n\nExample:\nif Daily looks almost flat but Day + Micro leans micro-down, the refinement layer found a weak bearish tilt inside the broader flat regime.',
    'Total (Day + Micro + SL)':
        'Total (Day + Micro + SL) probabilities are the final scenario distribution after the [[current-prediction-daily-layer|Daily]] layer, the [[landing-micro-model|Micro]] refinement, and the [[sl-model|SL model]] risk interpretation are all combined.\n\nWhat it shows:\nthis is the main probability block the card later compares with the realized day outcome and passes into policy logic.\n\nHow to read it:\nif only one probability block is used for business interpretation, this one should be treated as primary because it is the last stacked verdict.\n\nExample:\na change between Day + Micro and Total means the SL-aware layer materially reshaped the final scenario ranking.',
    'Максимальная цена за 24 часа':
        '24h maximum price is the highest market price reached inside the factual 24-hour window after entry.\n\nIt does not tell where the day closed. It only answers how high the market managed to go during that window, even if price later gave the move back.\n\nHow to read it:\nfor [[position|LONG]] it shows the best upward excursion available during the day. For [[position|SHORT]] it shows the strongest upward move against the short.\n\nExample:\nentry at 100 and a maximum of 104.4 means the market reached as much as +4.4% upward from entry inside the window.',
    'Минимальная цена за 24 часа': CURRENT_PREDICTION_MIN_PRICE_24H_DESCRIPTION_EN,
    'Цена закрытия через 24 часа': CURRENT_PREDICTION_CLOSE_PRICE_24H_DESCRIPTION_EN,
    'Фактический исход дня':
        'Realized 24h outcome after entry (up/flat/down/micro outcome). Present only for backfilled mode.',
    'Прогноз модели (Total)': 'Main class from Total layer (Day + Micro + SL), compared against realized day outcome.',
    'Совпадение с прогнозом': 'Fact vs prediction status: full match, partial match (class only), or mismatch.',
    'Почему отличается': 'Short explanation of mismatch based on Total probabilities and explain layer.',
    'Ключевой фактор слоя пояснений / PFI':
        'Top [[factor|factor]] from [[landing-explain|explain]] or [[landing-pfi|PFI]] most associated with the model-selected scenario.',
    'Доходность к закрытию, %': 'Price change from entry to 24h close: (Close24 / Entry - 1) * 100.',
    'Максимальная цена за торговый день (факт)':
        'Actual 24h max price is the highest price reached inside the factual 24h window after entry.\n\nIt shows how high the market managed to go during the day even if it later gave the move back.\n\nHow to read it:\nfor [[position|LONG]] this is the best upward excursion; for [[position|SHORT]] it is the maximum adverse bounce.',
    'Минимальная цена за торговый день (факт)':
        'Actual 24h min price is the lowest price reached inside the factual 24h window after entry.\n\nIt shows how deep the market dipped during the day even if it later recovered.\n\nHow to read it:\nfor [[position|LONG]] this is the maximum adverse move; for [[position|SHORT]] it is the strongest favorable drop.',
    'Максимум за 24ч от входа, %': 'Maximum upward move vs entry during 24h window.',
    'Минимум за 24ч от входа, %': 'Maximum downward move vs entry during 24h window.',
    'Диапазон high-low за 24ч, %': 'Range width MaxHigh24 - MinLow24 vs entry price, in %.',
    'Факт MinMove за 24ч':
        'Realized MinMove over forward window (omniscient/backfilled). Not used in causal/live path.',
    'Прогнозный MinMove (causal)': 'MinMove value available to model at prediction time (causal, no future data).',
    'Δ MinMove (факт - прогноз)': 'Difference between realized and predicted MinMove, in percentage points.',
    'Вероятность фактического исхода (Total)':
        'Total-layer probability assigned by model to the class that actually happened.',
    'Источник факта':
        'Fact source is backfilled/omniscient after 24h window closes and is not mixed into causal/live decisions.'
}

Object.assign(CURRENT_PREDICTION_KEYS_EN, {
    Set: CURRENT_PREDICTION_KEYS_EN['Набор'],
    Strictness: CURRENT_PREDICTION_KEYS_EN['Строгость'],
    'Prediction status': CURRENT_PREDICTION_KEYS_EN['Статус прогноза'],
    'Report generated at (UTC)': CURRENT_PREDICTION_KEYS_EN['Время генерации отчёта (UTC)'],
    'Prediction date (UTC)': CURRENT_PREDICTION_KEYS_EN['Дата прогноза (UTC)'],
    'Primary model (Daily)': CURRENT_PREDICTION_KEYS_EN['Основная модель (Daily)'],
    'Micro model': CURRENT_PREDICTION_KEYS_EN['Микро-модель'],
    'Combined response (model interpretation)': CURRENT_PREDICTION_KEYS_EN['Итоговый ответ моделей'],
    'Model training window': CURRENT_PREDICTION_KEYS_EN['Обучение моделей (диапазон)'],
    'Market regime': CURRENT_PREDICTION_KEYS_EN['Режим рынка'],
    'Stop-loss trigger probability': CURRENT_PREDICTION_KEYS_EN['Вероятность срабатывания стоп-лосса'],
    'SL model signal': CURRENT_PREDICTION_KEYS_EN['Сигнал SL-модели'],
    'Current SOL/USDT price': CURRENT_PREDICTION_KEYS_EN['Текущая цена SOL/USDT'],
    'Minimum meaningful price move': CURRENT_PREDICTION_KEYS_EN['Минимальный осмысленный ход цены'],
    'Model comment': CURRENT_PREDICTION_KEYS_EN['Комментарий модели'],
    '24h max price': CURRENT_PREDICTION_KEYS_EN['Максимальная цена за 24 часа'],
    '24h min price': CURRENT_PREDICTION_KEYS_EN['Минимальная цена за 24 часа'],
    '24h close price': CURRENT_PREDICTION_KEYS_EN['Цена закрытия через 24 часа'],
    'Actual day outcome': CURRENT_PREDICTION_KEYS_EN['Фактический исход дня'],
    'Model forecast (Total)': CURRENT_PREDICTION_KEYS_EN['Прогноз модели (Total)'],
    'Match vs forecast': CURRENT_PREDICTION_KEYS_EN['Совпадение с прогнозом'],
    'Why it differs': CURRENT_PREDICTION_KEYS_EN['Почему отличается'],
    'Key explain/PFI factor': CURRENT_PREDICTION_KEYS_EN['Ключевой фактор слоя пояснений / PFI'],
    'Return to close, %': CURRENT_PREDICTION_KEYS_EN['Доходность к закрытию, %'],
    'Actual 24h max price': CURRENT_PREDICTION_KEYS_EN['Максимальная цена за торговый день (факт)'],
    'Actual 24h min price': CURRENT_PREDICTION_KEYS_EN['Минимальная цена за торговый день (факт)'],
    '24h max from entry, %': CURRENT_PREDICTION_KEYS_EN['Максимум за 24ч от входа, %'],
    '24h min from entry, %': CURRENT_PREDICTION_KEYS_EN['Минимум за 24ч от входа, %'],
    '24h high-low range, %': CURRENT_PREDICTION_KEYS_EN['Диапазон high-low за 24ч, %'],
    'Actual MinMove over 24h': CURRENT_PREDICTION_KEYS_EN['Факт MinMove за 24ч'],
    'Forecast MinMove (causal)': CURRENT_PREDICTION_KEYS_EN['Прогнозный MinMove (causal)'],
    'Delta MinMove (actual - forecast)': CURRENT_PREDICTION_KEYS_EN['Δ MinMove (факт - прогноз)'],
    'Probability of actual outcome (Total)': CURRENT_PREDICTION_KEYS_EN['Вероятность фактического исхода (Total)']
})

Object.assign(CURRENT_PREDICTION_KEYS_EN, {
    Набор:
        'Set is the mode in which the current prediction card is shown.\n\nWhat it shows:\nLive means the forecast is evaluated for the current day before the future window is known. Backfilled means the card is tied to a past date whose factual outcome is already available.\n\nHow to read it:\nthis field changes what can be compared fairly. In Live the future is still unknown, while in Backfilled the card can already be judged against fact.\n\nExample:\na mismatch analysis only makes full sense in Backfilled mode because the realized day outcome is already known.',
    Строгость:
        'Strictness is the rule that defines what the system does when the required data slice is incomplete.\n\nWhat it shows:\na strict mode blocks publication when a mandatory layer is missing, while a softer mode allows the card to exist with a reduced confidence context.\n\nHow to read it:\nthis is not a market metric. It explains how hard the pipeline protects the forecast from missing data risk.\n\nExample:\nthe same date can be shown in one strictness mode and rejected in another if one required layer is missing.',
    'Время генерации отчёта (UTC)':
        'Report generated at (UTC) is the timestamp when this prediction card was assembled.\n\nWhat it shows:\nit tells which concrete run of the pipeline produced the visible card and how fresh that run is.\n\nHow to read it:\nuse this field to distinguish one build of the same forecast date from another, especially when comparing retries or later rebuilds.\n\nExample:\nif two cards target the same day but have different generation timestamps, they were built from different pipeline runs.',
    'Дата прогноза (UTC)':
        'Prediction date (UTC) is the trading day the card is forecasting.\n\nWhat it shows:\nit is the target day of the decision, not the build time of the report.\n\nHow to read it:\nall probabilities, decision layers, and policy rows on the card should be interpreted as belonging to this target date.\n\nExample:\na card generated today can still forecast tomorrow, so generation time and prediction date are not interchangeable.',
    SessionDayKeyUtc:
        'SessionDayKeyUtc is the unique UTC trading-day key of the card.\n\nWhat it shows:\nit links the forecast, the policy block, and the realized outcome to the same session-level day identity.\n\nHow to read it:\nthis field matters for exact joins with history, exports, or debugging traces rather than for business interpretation of the market view itself.\n\nExample:\nif two rows share the same SessionDayKeyUtc, they belong to the same modeled trading day even if other labels differ.',
    EntryUtc:
        'EntryUtc is the start of the factual forward window from which the day is later judged.\n\nWhat it shows:\nit defines the opening point for return, intraday range, and realized outcome calculations.\n\nHow to read it:\nthis field is the anchor of the forward measurement window, so price-based 24h metrics should be read as starting from this timestamp.\n\nExample:\n24h max from entry is always measured relative to the market state at EntryUtc.',
    ExitUtc:
        'ExitUtc is the end of the factual forward window used for comparison with the realized day outcome.\n\nWhat it shows:\nit closes the same window that started at EntryUtc.\n\nHow to read it:\nthis field marks the end of the factual evaluation horizon and should be read together with EntryUtc rather than as a standalone time.\n\nExample:\nif EntryUtc and ExitUtc span one modeled day, the close-based outcome is measured exactly between those two timestamps.',
    AsOfUtc:
        'AsOfUtc is the latest timestamp the model was allowed to know when the forecast was made.\n\nWhat it shows:\nit is the boundary between known past and forbidden future for the causal prediction path.\n\nHow to read it:\nthis field is one of the key anti-leakage guards. Anything later than AsOfUtc must not influence the forecast.\n\nExample:\nif a strong move happened after AsOfUtc, the model should not already reflect it in the forecast.',
    DataCutoffUtc:
        'DataCutoffUtc is the hard upper bound of market data included in the prediction pipeline.\n\nWhat it shows:\nit tells where the pipeline stopped reading source data before building features and probabilities.\n\nHow to read it:\nthis field helps verify that the visible forecast still belongs to the causal path and does not silently use future market information.\n\nExample:\nif DataCutoffUtc moved too far right, a seemingly strong forecast may already contain leakage.',
    'Основная модель (Daily)': CURRENT_PREDICTION_DAILY_MODEL_DESCRIPTION_EN,
    'Микро-модель': CURRENT_PREDICTION_MICRO_MODEL_DESCRIPTION_EN,
    'Общий ответ (интерпретация моделей)': CURRENT_PREDICTION_COMBINED_RESPONSE_DESCRIPTION_EN,
    'Обучение моделей (диапазон)': CURRENT_PREDICTION_MODEL_TRAINING_WINDOW_DESCRIPTION_EN,
    'Сигнал SL-модели':
        'SL model signal is the interpreted risk verdict of the stop-loss model for the current day.\n\nWhat it shows:\nit says whether the day is treated as a normal-risk or elevated-risk case from the stop-loss perspective.\n\nHow to read it:\nthis field is about trade danger, not about market direction. Elevated risk usually means stricter leverage, stake, or entry constraints.\n\nExample:\na day can still point upward directionally and at the same time carry a high stop-loss risk signal.',
    'Комментарий модели': CURRENT_PREDICTION_MODEL_COMMENT_DESCRIPTION_EN,
    'Фактический исход дня':
        'Actual day outcome is the realized market scenario after the factual forward window closes.\n\nWhat it shows:\nit is the post-fact classification of what really happened, not what the model expected.\n\nHow to read it:\nthis field is the ground truth used to judge the final Total forecast, so it only becomes fully meaningful in Backfilled mode.\n\nExample:\nif the model expected flat but the actual day outcome is micro-down, the error sits in the final scenario ranking.',
    'Прогноз модели (Total)':
        'Model forecast (Total) is the final class chosen by the combined prediction stack.\n\nWhat it shows:\nit is the final scenario after Daily, Micro, and SL-aware interpretation have already been merged.\n\nHow to read it:\nthis is the main forecast verdict of the card and should be compared directly with the realized day outcome.\n\nExample:\nif Total says micro-down while Daily alone said flat, the stacked interpretation tightened the final scenario.',
    'Совпадение с прогнозом':
        'Match vs forecast is the verdict of how the realized day compares with the final Total forecast.\n\nWhat it shows:\nit distinguishes full match, partial match, and mismatch rather than raw probability size.\n\nHow to read it:\nuse this field as the first summary of forecast quality, then move to probabilities and explain [[factor|factors]] to understand why the card matched or failed.\n\nExample:\na partial match usually means the broad class was correct but the finer micro scenario was not.',
    'Почему отличается':
        'Why it differs is the short explanation of why the realized outcome diverged from the forecast.\n\nWhat it shows:\nit usually points to low probability mass of the realized scenario, weak confidence separation, or a dominant explain [[factor|factor]] that pulled the stack toward another class.\n\nHow to read it:\nthis is the first diagnostic hint for forecast error, not a full post-mortem by itself.\n\nExample:\nif the note says the actual scenario had low weight, the model did not rank that outcome as a serious alternative in advance.',
    'Ключевой фактор слоя пояснений / PFI':
        'Key explain/PFI [[factor|factor]] is the strongest visible [[factor|factor]] associated with the chosen forecast scenario.\n\nWhat it shows:\nit highlights the main driver that pulled the prediction toward the visible class, either through explain or through PFI.\n\nHow to read it:\nthis field helps connect the final scenario to one dominant explanatory signal, but it should still be read together with the wider [[factor|factor]] table.\n\nExample:\na strong daily-model [[factor|factor]] may dominate even when several weaker micro [[factor|factors]] point elsewhere.',
    'Доходность к закрытию, %':
        'Return to close, % is the factual price change from entry to the close of the forward window.\n\nWhat it shows:\nit answers what the day delivered by the window close if the position were simply held to the end.\n\nHow to read it:\nthis metric is useful for directional judgment, but it does not describe the full intraday stress or opportunity path.\n\nExample:\na day can close only +1% while still having offered a much larger intraday move earlier.',
    'Максимум за 24ч от входа, %':
        '24h max from entry, % is the largest upward move relative to entry during the forward window.\n\nWhat it shows:\nit is the best intraday upward excursion, even if the market later gave the move back.\n\nHow to read it:\nthis field helps separate a day that never moved in favor from a day that moved correctly but failed to hold the gain by close.\n\nExample:\na +5% maximum with a flat close means the opportunity existed but was not preserved to the end of the window.',
    'Минимум за 24ч от входа, %':
        '24h min from entry, % is the deepest downward move relative to entry during the forward window.\n\nWhat it shows:\nit is the strongest adverse excursion of the day from the trade anchor point.\n\nHow to read it:\nthis field matters for stress interpretation because a day can still close green after first going through a deep drawdown.\n\nExample:\na day that closed +2% after first reaching -4% was much harsher than the close alone suggests.',
    'Диапазон high-low за 24ч, %':
        '24h high-low range, % is the full width of the intraday range between the highest and lowest point of the forward window.\n\nWhat it shows:\nit measures day volatility by amplitude rather than by final direction.\n\nHow to read it:\nhigher values mean the day was harder to manage and more dependent on correct risk settings even when the final directional call was right.\n\nExample:\na flat close with a very large range still describes a highly volatile day.',
    'Факт MinMove за 24ч':
        'Actual MinMove over 24h is the realized minimum meaningful move after the forward window has already played out.\n\nWhat it shows:\nit is the post-fact version of move significance that becomes visible only after the day is over.\n\nHow to read it:\ncompare it with the forecast MinMove to see whether the model underestimated or overestimated the real movement strength of the day.\n\nExample:\na much larger realized MinMove means the market became more directional than the model expected in advance.',
    'Прогнозный MinMove (causal)':
        'Forecast MinMove (causal) is the MinMove estimate that was available to the model at prediction time without future leakage.\n\nWhat it shows:\nit is the honest causal view of expected move significance before the day unfolds.\n\nHow to read it:\nthis field is the forecast-side counterpart of realized MinMove and shows whether the model expected a strong or weak trading day.\n\nExample:\na low causal MinMove suggests the model initially saw the day as weak even if the market later became highly active.',
    'Δ MinMove (факт - прогноз)':
        'Delta MinMove (actual - forecast) is the gap between realized MinMove and the causal MinMove available at forecast time.\n\nWhat it shows:\npositive values mean the market turned out more active than expected, while negative values mean the model expected more movement than the day actually delivered.\n\nHow to read it:\nthis field is useful for judging whether forecast misses came from poor direction ranking or from poor movement-strength estimation.\n\nExample:\na large positive delta means the market accelerated beyond the model’s original expectation.',
    'Вероятность фактического исхода (Total)':
        'Probability of actual outcome (Total) is the probability that the final Total layer assigned to the scenario that later happened in reality.\n\nWhat it shows:\nit answers whether the realized outcome was already one of the model’s serious alternatives or almost absent from its probability mass.\n\nHow to read it:\nhigh probability with a top-1 miss means the problem was ranking, while very low probability means the model barely considered the realized outcome.\n\nExample:\na 0.41 probability for the realized class is very different from 0.03 even if both rows ended as forecast misses.',
    'Источник факта':
        'Fact source shows where the post-fact outcome came from for backfilled comparison.\n\nWhat it shows:\nit separates the realized historical outcome from the causal information that was available at decision time.\n\nHow to read it:\nthis field is a control on data provenance rather than a trading metric. It helps verify that future information was not blended into the live prediction path.\n\nExample:\nif the fact source is historical/backfilled, the result belongs to post-close evaluation rather than to the decision-time model state.'
})

export const PFI_COLUMNS_EN: Record<string, string> = {
    '#': 'Feature rank index inside table ordering.',
    Index: 'Feature index in source feature list.',
    Фича: 'Feature name passed into model.',
    FeatureName: 'Technical feature name.',
    'Важность (ΔAUC)':
        'AUC drop when feature is permuted (Permutation importance). Higher means more important feature.',
    'ImportanceAuc (abs ΔAUC)': 'Absolute AUC drop when feature is permuted.',
    'ΔAUC (сырое)': 'Raw ΔAUC = baseline AUC - permuted AUC.',
    'DeltaAuc (baseline - perm)': 'Raw ΔAUC (baseline - permuted).',
    'ΔMean (1-0)': 'Difference of feature means between class 1 and class 0 (MeanPos - MeanNeg).',
    'MeanPos - MeanNeg': 'Difference of feature means between class 1 and class 0.',
    'MeanPos (Label=1)': 'Mean feature value for positive class.',
    'MeanNeg (Label=0)': 'Mean feature value for negative class.',
    'Mean[1]': 'Mean feature value for positive class.',
    'Mean[0]': 'Mean feature value for negative class.',
    'Corr(score)': 'Feature correlation with model score (Pearson).',
    'CorrScore (Pearson)': 'Feature correlation with model score (Pearson).',
    'Corr(label)': 'Feature correlation with target label (Pearson).',
    'CorrLabel (Pearson)': 'Feature correlation with target label (Pearson).',
    'Support (pos/neg)': 'Number of examples per class: pos/neg.',
    'CountPos / CountNeg': 'Count of class-1 and class-0 samples.'
}

export const MODEL_STATS_COLUMNS_EN: Record<string, string> = {
    Class: 'True-label class (UP/DOWN/FLAT).',
    Summary: 'Short quality summary for this class (hits/misses).',
    TRUE: 'True label class.',
    'Pred DOWN': 'How many rows were predicted as DOWN (for this TRUE row).',
    'Pred FLAT': 'How many rows were predicted as FLAT (for this TRUE row).',
    'Pred UP': 'How many rows were predicted as UP (for this TRUE row).',
    'Hit %': 'Share of correct predictions for this row (accuracy).',
    'Тип дня': 'True trend direction for row (UP/DOWN).',
    'True trend': 'True trend direction (UP/DOWN).',
    'pred DOWN': 'Prediction count for DOWN class.',
    'pred UP': 'Prediction count for UP class.',
    correct: 'Number of correct predictions.',
    total: 'Total sample count in row.',
    'Точность, %': 'Accuracy percentage for this row.',
    'Accuracy, %': 'Accuracy percentage for this row.',
    'Day type': 'Day type by outcome: TP-day or SL-day.',
    'day type': 'Day type by outcome: TP-day or SL-day.',
    'pred LOW': 'How many times model predicted LOW risk.',
    'pred HIGH': 'How many times model predicted HIGH risk.',
    metric: 'Metric name.',
    value: 'Metric value.',
    Порог: 'SL-model threshold used for metric calculation.',
    Threshold: 'SL-model threshold used for metric calculation.',
    'TPR(SL), %': 'True Positive Rate on SL-days: share of correct HIGH flags on SL-days.',
    'Stop-loss day recall, %': 'True Positive Rate on SL-days: share of correct HIGH flags on SL-days.',
    'FPR(TP), %': 'False Positive Rate on TP-days: share of false HIGH flags on TP-days.',
    'pred HIGH, %': 'Share of HIGH predictions at this threshold.',
    'High-risk prediction rate, %': 'Share of HIGH predictions at this threshold.',
    'high / total': 'HIGH prediction count out of total days.'
}

function buildPfiColumnDescriptionEn(key: string): string | null {
    switch (key) {
        case '#':
            return '# is the row order inside the PFI table.\n\nWhat it shows:\nit is the position of the feature in the already ranked importance list, not an independent model metric.\n\nHow to read it:\nsmaller numbers mean the feature stands higher in the final importance ranking.\n\nExample:\n#=1 means the leading [[factor|factor]] in the current PFI table.'
        case 'Index':
            return 'Index is the original feature index inside the full feature pool.\n\nWhat it shows:\nit is a technical reference to the feature position before the table was sorted by importance.\n\nHow to read it:\nthis field is useful for matching the row with feature configs and exports, but it does not measure influence by itself.\n\nExample:\nIndex=57 means the row points to feature number 57 in the source set.'
        case 'Фича':
        case 'FeatureName':
            return 'Feature is the concrete input signal that was fed into the model and then appeared in the PFI table.\n\nWhat it shows:\nit names the signal whose importance, correlations, and class means are shown across the row.\n\nHow to read it:\nfirst understand what the feature measures, then read its influence through ΔAUC, mean gaps, and correlations.\n\nExample:\nif the same feature stays near the top across runs, it is one of the strongest stable drivers of model quality.'
        case 'Важность (ΔAUC)':
        case 'ImportanceAuc (abs ΔAUC)':
            return 'Importance (ΔAUC) is how much the model AUC falls when only this feature is permuted.\n\nWhat it shows:\na stronger drop means the model truly depends on the information carried by this feature.\n\nHow to read it:\nhigher values mean stronger contribution; values near zero mean the feature adds little unique signal.\n\nExample:\nif two features have ΔAUC of 0.041 and 0.003, the first one is materially more important.'
        case 'ΔAUC (сырое)':
        case 'DeltaAuc (baseline - perm)':
            return 'ΔAUC is the raw difference between baseline AUC and AUC after permuting one feature.\n\nWhat it shows:\nit is the direct quality loss caused by destroying the structure of that single signal.\n\nHow to read it:\na larger positive ΔAUC means a more useful feature; a value near zero means weak or almost neutral contribution.\n\nFormula:\nΔAUC = baseline AUC - permuted AUC.'
        case 'ΔMean (1-0)':
        case 'MeanPos - MeanNeg':
            return 'ΔMean (1-0) is the difference between feature means in the positive and negative classes.\n\nWhat it shows:\nit answers how far the feature separates the two classes even before the model layer is considered.\n\nHow to read it:\na larger absolute gap means the feature itself already distinguishes the classes more clearly.\n\nFormula:\nMeanPos - MeanNeg.'
        case 'MeanPos (Label=1)':
        case 'Mean[1]':
            return 'MeanPos is the average feature value over rows of the positive class.\n\nWhat it shows:\nit is the typical level of the feature where the target equals 1.\n\nHow to read it:\nread it together with MeanNeg, because the gap between the two tells how the feature shifts across classes.\n\nExample:\nif MeanPos is much higher than MeanNeg, higher feature values are more associated with the positive class.'
        case 'MeanNeg (Label=0)':
        case 'Mean[0]':
            return 'MeanNeg is the average feature value over rows of the negative class.\n\nWhat it shows:\nit is the typical level of the feature where the target equals 0.\n\nHow to read it:\ncompare it with MeanPos to understand the direction of the class split.\n\nExample:\nif MeanNeg is much higher than MeanPos, large feature values are more often linked to the negative class.'
        case 'Corr(score)':
        case 'CorrScore (Pearson)':
            return 'Corr(score) is the Pearson correlation between the feature and the model score.\n\nWhat it shows:\nit answers whether score tends to rise with the feature, fall with it, or remain only weakly linked.\n\nHow to read it:\nthe sign gives the direction of the relation and the absolute value gives its linear strength.\n\nExample:\na correlation of +0.42 means a meaningful positive association between feature and score.'
        case 'Corr(label)':
        case 'CorrLabel (Pearson)':
            return 'Corr(label) is the Pearson correlation between the feature and the target label.\n\nWhat it shows:\nit is a more direct relation to the target than Corr(score), because it bypasses the model score layer.\n\nHow to read it:\nvalues farther from zero mean a stronger linear relation to the target, and the sign shows the direction.\n\nExample:\na correlation of -0.31 means the feature tends to rise on negative-class rows.'
        case 'Support (pos/neg)':
        case 'CountPos / CountNeg':
            return 'Support is how many positive and negative samples stand behind the statistics of the row.\n\nWhat it shows:\nit is the evidence size used for means, correlations, and permutation importance.\n\nHow to read it:\nsmall support makes every other number more fragile; larger support makes the row more trustworthy.\n\nExample:\nSupport 18/14 is much thinner and less stable than 480/510.'
        default:
            return null
    }
}

function buildModelStatsColumnDescriptionEn(key: string): string | null {
    switch (key) {
        case 'Class':
        case 'TRUE':
        case 'Тип дня':
        case 'True trend':
        case 'Day type':
        case 'day type':
            return 'Class is the factual day or row class on which this part of the report is built.\n\nWhat it shows:\nit is the realized outcome, not the model forecast. It defines the row of the confusion-style block or threshold table.\n\nHow to read it:\nall neighboring counts and percentages in the row relate to this factual class.\n\nExample:\nif the row is DOWN, the cells to the right show how the model behaved on truly down days.'
        case 'Summary':
            return 'Summary is a compressed quality note for the current class or block.\n\nWhat it shows:\nit is a short textual digest of the statistics nearby, not a new independent metric.\n\nHow to read it:\nuse Summary as a quick entry point, then verify the message by looking at hits, misses, and shares in the same row.\n\nExample:\na weak Summary should be confirmed by low Hit % or by a visibly imbalanced confusion row.'
        case 'Pred DOWN':
        case 'Pred FLAT':
        case 'Pred UP':
        case 'pred DOWN':
        case 'pred UP':
        case 'pred LOW':
        case 'pred HIGH':
        case 'high / total':
            return 'Pred-* is how many times the model emitted a specific prediction inside the current statistics row.\n\nWhat it shows:\nit is the count of predicted classes under a fixed true class or under a fixed threshold setting.\n\nHow to read it:\na large count alone does not imply good quality; it only becomes meaningful relative to the row’s true class and sample size.\n\nExample:\nif TRUE=DOWN but Pred UP dominates, the model systematically misses down days.'
        case 'Hit %':
        case 'Точность, %':
        case 'Accuracy, %':
            return 'Hit % is the share of correct predictions inside the current row or slice.\n\nWhat it shows:\nit is a local accuracy number for one class, day type, or threshold, not the global quality of the whole model.\n\nHow to read it:\nhigher values mean the model hit the right answer more often inside this exact subgroup.\n\nExample:\nHit %=82 means about 82 out of 100 observations in this slice were classified correctly.'
        case 'correct':
            return 'correct is how many observations in the current row were classified correctly.\n\nWhat it shows:\nit is the absolute numerator behind accuracy and similar shares, not a percentage.\n\nHow to read it:\nits meaning appears only together with total. A large correct on a very small sample can still be less convincing than a moderate correct on a large one.\n\nExample:\ncorrect=18 with total=20 is stronger evidence than correct=4 with total=4.'
        case 'total':
            return 'total is how many observations entered the current statistics row.\n\nWhat it shows:\nit is the sample size behind the percentages and hit counts of the row.\n\nHow to read it:\nsmall totals make high percentages easier to overread, so quality claims should be softer on thin slices.\n\nExample:\ntotal=9 is too thin for strong conclusions even if Hit % is high.'
        case 'metric':
            return 'metric is the name of the measure shown in the neighboring value column.\n\nWhat it shows:\nit is the label of the statistic, not the statistic itself.\n\nHow to read it:\nmetric tells which meaning the current number carries: threshold, rate, count, or share.\n\nExample:\nif metric is TPR(SL), the value to the right is the true-positive rate on stop-loss days.'
        case 'value':
            return 'value is the numeric value of the metric named in the neighboring metric column.\n\nWhat it shows:\nit can be a percentage, a raw count, or a threshold depending on the row.\n\nHow to read it:\nvalue must always be interpreted through metric, because the same number can mean accuracy, HIGH share, or threshold depending on context.\n\nExample:\nvalue=0.74 with metric=TPR(SL) means 74% of stop-loss days were correctly flagged.'
        case 'Порог':
        case 'Threshold':
            return 'Threshold is the cut-off used by the SL model to separate LOW and HIGH risk days.\n\nWhat it shows:\nit is the working decision boundary: above it the day becomes HIGH, below it the day stays LOW.\n\nHow to read it:\nchanging threshold shifts the balance between sensitivity and false alarms.\n\nExample:\na lower threshold usually raises TPR(SL) but often increases FPR(TP) as well.'
        case 'TPR(SL), %':
        case 'Stop-loss day recall, %':
            return 'TPR(SL), % is the share of stop-loss days that the model correctly labeled as HIGH risk.\n\nWhat it shows:\nit is the sensitivity of the SL model on harmful days.\n\nHow to read it:\nhigher TPR(SL) means the model catches more truly dangerous stop-loss days in advance.\n\nFormula:\nTP / (TP + FN).'
        case 'FPR(TP), %':
            return 'FPR(TP), % is the share of take-profit days that the model incorrectly labeled as HIGH risk.\n\nWhat it shows:\nit is the price of excessive caution on good days.\n\nHow to read it:\nlower FPR(TP) means fewer profitable days were damaged by a false high-risk warning.\n\nFormula:\nFP / (FP + TN).'
        case 'pred HIGH, %':
        case 'High-risk prediction rate, %':
            return 'pred HIGH, % is the share of cases where the model emitted HIGH risk under the current threshold.\n\nWhat it shows:\nit is the overall aggressiveness of the HIGH flag on the whole evaluated sample.\n\nHow to read it:\nvery high values mean the model sees danger almost everywhere; very low values mean HIGH remains rare and may miss real problems.\n\nExample:\na HIGH share of 80% means the model treats the majority of days as elevated risk.'
        default:
            return null
    }
}

Object.assign(
    PFI_COLUMNS_EN,
    Object.fromEntries(Object.keys(PFI_COLUMNS_EN).map(key => [key, buildPfiColumnDescriptionEn(key) ?? PFI_COLUMNS_EN[key]]))
)

Object.assign(
    MODEL_STATS_COLUMNS_EN,
    Object.fromEntries(
        Object.keys(MODEL_STATS_COLUMNS_EN).map(key => [key, buildModelStatsColumnDescriptionEn(key) ?? MODEL_STATS_COLUMNS_EN[key]])
    )
)

// DIAGNOSTICS_EXACT_EN хранит только diagnostics-специфичные смыслы.
// Общие report-термины обслуживаются через shared common owner-layer.
export const DIAGNOSTICS_EXACT_EN: Record<string, string> = {
    Margin: 'Margin is the trade margin mode: [[cross-margin|cross]] or [[isolated-margin|isolated]].\n\nIt is not the position size and not a money amount. It is the rule that defines which collateral absorbs the loss.\n\nHow to read it:\nin [[isolated-margin|isolated]] mode one trade is limited by its own margin, while in [[cross-margin|cross]] mode the position can pull on the whole bucket balance.',
    Days: 'Days is the number of days included in the current diagnostics slice.\n\nIt is not the number of [[trade-count|trades]] and not only the number of trading days. The count covers all days that belong to the selected group.\n\nHow to read it:\nwhen Days is small, every percentage and share in the row rests on a thinner statistical base.',
    StartDay:
        'StartDay is the first UTC date that actually entered the calculation of this row.\n\nIt defines the left edge of the period used for the current aggregate.\n\nHow to read it:\nStartDay should be judged together with EndDay because period boundaries define whether two rows are directly comparable.',
    EndDay: 'EndDay is the last UTC date that actually entered the calculation of this row.\n\nIf the series stopped early, this field shows the factual stop date rather than the theoretical end of the full report window.\n\nHow to read it:\nEndDay together with StartDay tells which exact period this diagnostics row represents.',
    StopReason:
        'StopReason explains why the current series ended exactly on that date.\n\nWhat the field can show:\n- Through end of period means the series reached the final day of the window; this is the normal completion path.\n- Early stop means the series ended before the full window.\n- Liquidation means the series contained [[liquidation|liquidation]] events.\n- Ruin means the bucket lost its working capital and the [[account-ruin|AccRuin]] scenario fired.\n\nHow to read it:\nif the text contains early stop, the series ended before the full period.\n\nIf it contains liquidation, the stop was accompanied by exchange-forced closes.\n\nIf it contains ruin, the problem is no longer one bad trade but destruction of the bucket working capital.\n\nFor an aggregate of independent buckets, one single StopReason may be not applicable because each bucket can stop for its own reason.',
    MissingDays:
        'MissingDays is the number of calendar days missing inside the interval from StartDay to EndDay.\n\nThis is not a no-trade metric and not an intentional strategy skip. It points to missing data coverage or missing day-level decision trace.\n\nHow to read it:\nfor weekdays the healthy value is usually near zero. Growth here means the slice was built on incomplete coverage and should be interpreted more cautiously.',
    'TradeDays%':
        'TradeDays% is the share of days that actually turned into executed trades inside the current diagnostics slice.\n\nRead it as:\nTradeDays% = count of days with at least one trade / count of all days in the group * 100.\n\nHow to read it:\nthis shows how often the selected logic really reaches execution after filters, risk checks, and policy-level blocks.',
    CapApplied:
        'CapApplied is how many days the engine really applied the [[cap-fraction|capital share per trade]] rule.\n\nIt is not a separate trade type. It counts days where the position size was built with a live non-zero cap instead of being blocked entirely.\n\nHow to read it:\nthe higher CapApplied is relative to trade days, the more often the strategy really entered the market with a working position size.',
    CapSkipped:
        'CapSkipped is how many days were rejected because the primary reason was zero [[cap-fraction|capital share per trade]].\n\nThis is not every no-trade day. In bucket diagnostics it counts only days where cap_zero was the direct blocker of entry.\n\nHow to read it:\nrising CapSkipped means the strategy more often judges the day too weak or too risky even for the minimum working position size.',
    'MaxDD_NoLiq%':
        'MaxDD_NoLiq% is the maximum [[drawdown|drawdown]] after liquidation episodes are removed from the curve.\n\nThis metric separates ordinary losing depth from emergency collapses that came specifically through [[liquidation|liquidation]] events.\n\nHow to read it:\nif MaxDD% is much worse than MaxDD_NoLiq%, the main capital damage came from liquidation tails. If the two values stay close, the weakness is broader and sits in the normal trade logic itself.',
    inv_liq_mismatch:
        'inv_liq_mismatch is how many times diagnostics found a contradiction in [[liquidation|liquidation]] invariants.\n\nThis is not a return metric. It is a consistency check for the trade trace: liquidation reachability, liquidation flags, and related service labels must not disagree with each other.\n\nHow to read it:\nthe healthy value is 0.\n\nAny non-zero value means this slice contains rows where liquidation semantics should be rechecked in data or calculation logic.',
    minutes_anomaly:
        'minutes_anomaly is how many minute-level anomalies were found in the input trace.\n\nThis covers gaps, ordering issues, or other minute-sequence problems that make the intraday path less trustworthy than usual.\n\nHow to read it:\nthe healthy value is 0.\n\nIf it rises, fields such as [[mae-pct|MAE%]], [[mfe-pct|MFE%]], and [[real-liquidation|RealLiq]] should be interpreted more cautiously for that slice.',
    Date: 'Date is the UTC date of a specific trade or signal.\n\nIt belongs to one execution row, not to a period aggregate.\n\nHow to read it:\nit shows which trading day this exact log row is tied to.',
    Day: 'Day is the UTC day key for aggregated statistics.\n\nIt is the group day identifier, not the timestamp of one trade.\n\nHow to read it:\nin an aggregate table this field tells which exact UTC day the whole metrics row belongs to.',
    Side: POSITION_DESCRIPTION,
    IsLong:
        'IsLong is the boolean direction flag of the trade.\n\ntrue means [[position|LONG]], false means [[position|SHORT]]. It is the machine form of the same side meaning that other tables may show as words.\n\nHow to read it:\nthis field is useful for filtering and comparisons, but in domain terms it is still just the side of the position.',
    Lev:
        'Lev is the effective [[leverage|leverage]] that was actually used in this trade.\n\nIt is not only the configured Policy value. It is the final working leverage after all [[risk-layers|risk layers]] that could reduce risk.\n\nHow to read it:\nthe higher Lev is at the same Margin$, the more strongly the same price move changes the trade result.',
    Margin$:
        'Margin$ is how much bucket-owned collateral was actually allocated to this trade.\n\nIt is not the full position notional and not the same thing as [[leverage|leverage]]. The total notional is larger and is built from margin multiplied by leverage.\n\nHow to read it:\nthe larger Margin$ is, the more one trade can move the bucket working capital.\n\nThis field should be read together with [[leverage|leverage]], [[net-pnl-usd|NetPnl$]], and [[liquidation|liquidation]] to judge how expensive the trade risk was.',
    NetPnl$:
        'NetPnl$ is the net cash result of one trade after commissions.\n\nA positive value means the trade added profit in dollars; a negative value means a direct cash loss.\n\nHow to read it:\nthis is not a normalized percent but an absolute effect on bucket capital.\n\nIt should be compared with [[pnl|NetPnl%]], Margin$, and Comm$ to separate raw price move from position size and fee impact.',
    'Gross%':
        'Gross% is trade return before commissions.\n\nIt shows the raw price move relative to entry without subtracting trading costs.\n\nHow to read it:\nif Gross% looks strong but [[pnl|NetPnl%]] is already much weaker, a meaningful part of the move was eaten by commissions.\n\nThis matters most on short intraday trades.',
    'NetPnl%':
        'NetPnl% is the net percentage return of the trade after commissions, measured on used [[margin|margin]].\n\nThis field is a better trade-level percentage result than [[price-move|Gross%]] when the goal is to see the real post-cost outcome.\n\nHow to read it:\npositive means the trade still made money after costs on used margin; negative means a clean loss.',
    'NetRet%':
        'NetRet% is the net percentage return of the trade after commissions.\n\nIn diagnostics this is effectively the same final trade-level percentage outcome, just under an alternative column name used by another report block.\n\nHow to read it:\ninterpret it the same way as [[pnl|NetPnl%]]: positive is net profit, negative is net loss.\n\nIf both fields appear side by side, the goal is not to read two different outcomes but to recognize two labels for the same net-return meaning.',
    Cap: 'Cap is the actual [[cap-fraction|capital share per trade]] used by this entry.\n\nIt shows which part of the bucket working capital the strategy allowed itself to put into this trade after all risk limits were applied.\n\nHow to read it:\na larger Cap means one decision has more influence on the final equity curve.\n\nA small Cap means the system intentionally weakened the stake even though the trade direction was kept.',
    Comm$: 'Comm$ is how many dollars were spent on commissions for this trade.\n\nThe value includes entry and exit costs under the current calculation rules.\n\nHow to read it:\neven a trade with a good price move can end with weak [[net-pnl-usd|NetPnl$]] when the position is small and fees take a meaningful share of the result.\n\nThis field matters most on short intraday moves where trading costs eat a visible part of the edge.',
    'MAE%': 'MAE% is the maximum adverse move against the position during the life of the trade.\n\nFor LONG it is the deepest move down from entry; for SHORT it is the strongest move up against the short.\n\nHow to read it:\nif MAE% was close to [[tp-sl|stop-loss]] or [[liquidation|liquidation]], the trade lived on a very thin safety buffer even if the final outcome later recovered.',
    'MFE%': 'MFE% is the maximum favorable move in the direction of the position during the life of the trade.\n\nFor LONG it is the best intratrade move upward; for SHORT it is the best move downward.\n\nHow to read it:\nif MFE% was large but final [[net-pnl-usd|NetPnl$]] stayed weak, the market gave opportunity that the strategy failed to lock in fully.',
    LiqPx:
        'LiqPx is the backtest [[liquidation|liquidation]] level used for this row as the modeled emergency close price.\n\nIt is not just a theoretical exchange number. It is the working level diagnostics compares against the intratrade price path.\n\nHow to read it:\nif adverse price action reached LiqPx, the row came close to emergency close even if another exit event fired first.',
    LiqBacktest:
        'LiqBacktest is the conservative backtest [[liquidation|liquidation]] price.\n\nIt is intentionally placed closer to entry than a softer theoretical level so the simulation does not look more optimistic than the real risk profile.\n\nHow to read it:\nthis is the main reference for [[real-liquidation|RealLiq]], MinDistPct, and liquidation-distance distributions.',
    RealLiq:
        'RealLiq is the flag that price really reached the backtest [[liquidation|liquidation]] level.\n\nIt is a strict signal of actual liquidation-level contact, not just of a large loss.\n\nHow to read it:\nif the value is true, the trade in the model truly touched the critical liquidation boundary.\n\nThis is still not a standalone money-loss formula: the economic effect must be read through PnL, drawdown, and the rest of the balance metrics on the same row.',
    IsLiq:
        'IsLiq is the broad liquidation-outcome flag in the model.\n\nIt is wider than [[real-liquidation|RealLiq]]: a row can be marked liquidation-related not only when price strictly touched the backtest liquidation level, but also when the bucket effectively died on that trade.\n\nHow to read it:\nif the goal is strict backtest-level contact, use [[real-liquidation|IsRealLiq]] or RealLiq.\n\nIf the goal is the broader emergency outcome, read IsLiq.',
    IsRealLiq:
        'IsRealLiq is the strict boolean flag for a real [[liquidation|liquidation]] at the backtest liquidation price.\n\nIn meaning it is the machine form of the same strict liquidation scenario that later aggregates into [[real-liquidation-count|RealLiq#]].\n\nHow to read it:\ntrue means the critical price level was actually reached by the trade path, not only inferred through bucket death.',
    Source:
        'Source is the execution channel that produced the trade signal.\n\nTypical values here are Daily, DelayedA, and DelayedB.\n\nHow to read it:\nthis field does not show trade quality by itself. It tells which execution mechanism delivered the row into the market.\n\nIt is useful when separating problems of the main daily path from delayed-entry problems.',
    DayType:
        'DayType is the realized market day type: UP, DOWN, or FLAT.\n\nIt is not the model forecast. It is the already known factual day type used later to judge directional quality and opposite-side harm.\n\nHow to read it:\ncompare it with [[signal-direction|position direction]] and [[source|Source]] to see whether the trade went with or against the day.',
    'AbsRet%':
        'AbsRet% is the absolute daily market return, meaning movement size without the sign.\n\nIt answers how strong the market day was by amplitude alone.\n\nHow to read it:\na higher value means a stronger-move day; a lower value means a quieter day.\n\nThis is useful when comparing errors on noisy days versus truly strong days.',
    'MaxAdv%':
        'MaxAdv% is the maximum adverse move against the position in this row.\n\nIn meaning it is the diagnostics variant of [[mae-pct|MAE%]], but some tables expose it under this separate name.\n\nHow to read it:\nthe closer MaxAdv% gets to [[tp-sl|stop-loss]] or [[liquidation|liquidation]], the thinner the safety buffer of the trade was.',
    StartEq$:
        'StartEq$ is the bucket equity at the start of the current period.\n\nIt is not the permanent starting capital of the whole strategy, but the left boundary of the current diagnostics slice.\n\nHow to read it:\nthis field matters as the baseline from which EndEq$, MinEq$, MaxEq$, and the shape of the path should be judged.',
    EndEq$:
        'EndEq$ is the bucket equity at the factual end of the current diagnostics period.\n\nIf the series stopped before the full theoretical window, this field shows the factual end point rather than the end of the complete history.\n\nHow to read it:\ncomparing StartEq$ and EndEq$ gives the final capital change of the slice, but not the path between them.',
    MinEq$:
        'MinEq$ is the minimum bucket equity reached inside the current period.\n\nIt is the bottom of the capital path, not the final result.\n\nHow to read it:\nthe deeper MinEq$ sits below StartEq$, the more painful the intraperiod drawdown was even when EndEq$ later recovered.',
    MaxEq$:
        'MaxEq$ is the maximum bucket equity reached inside the current period.\n\nIt is the top of the capital path from which a later fall to MinEq$ may begin.\n\nHow to read it:\nthis field helps identify whether the strategy first made a local high and then gave it back in a heavy decline.',
    'LiqDays#':
        'LiqDays# is how many days in the current slice contained a liquidation outcome.\n\nThis is a day-level count, not the number of individual trades.\n\nHow to read it:\nrising values mean liquidation tails were not isolated one-trade accidents but repeated across multiple days.',
    'RealLiq#':
        'RealLiq# is how many rows or days reached the strict backtest [[liquidation|liquidation]] level.\n\nIt is the aggregated version of [[real-liquidation|IsRealLiq]] for the current diagnostics slice.\n\nHow to read it:\nif RealLiq# is much lower than total LiqDays#, part of the emergency outcomes came from bucket death without every trade strictly touching liquidation price.',
    FirstLiqDay:
        'FirstLiqDay is the first date on which a [[liquidation|liquidation]] appeared in the current slice.\n\nIt shows how early the liquidation tail started, not how many times it happened.\n\nHow to read it:\nan early date means risk damaged the period almost from the beginning, while a late date means liquidation arrived closer to the tail of the window.',
    LastLiqDay:
        'LastLiqDay is the last date on which a [[liquidation|liquidation]] appeared in the current slice.\n\nIt is the right boundary of the liquidation tail inside the period.\n\nHow to read it:\nif LastLiqDay is close to the end of the window, emergency outcomes stretched almost to the finish of the slice.',
    MinDistPct:
        'MinDistPct is the minimum remaining distance to [[liquidation|liquidation]] after adverse movement is taken into account.\n\nThis field shows how close the trade came to emergency close at its worst point.\n\nHow to read it:\na small positive value means a very thin safety buffer.\n\nZero or negative means the adverse path already reached or crossed the liquidation level.',
    DistTrade_Min:
        'DistTrade_Min is the minimum distance to [[liquidation|liquidation]] across individual trades.\n\nIt finds the single most dangerous trade-level point in the current slice.\n\nHow to read it:\nthis is the worst individual trade by liquidation buffer, so it should be read as the lower safety bound, not as typical behavior.',
    'DistTrade_P10/P50/P90':
        'DistTrade_P10/P50/P90 is the distribution of distance to [[liquidation|liquidation]] across individual trades.\n\nP10 shows the dangerous lower tail, P50 the typical trade-level buffer, and P90 the safer upper tail.\n\nHow to read it:\nif P10 is already close to zero, thin liquidation buffer is not a one-off trade but a recurring risk pattern in the trade set.',
    DistDay_Min:
        'DistDay_Min is the minimum distance to [[liquidation|liquidation]] at the day-aggregate level.\n\nUnlike DistTrade_Min, it shows the most dangerous day rather than the most dangerous single trade.\n\nHow to read it:\nthis field shows whether there were days where the whole day path nearly reached the emergency liquidation tail.',
    'DistDay_P10/P50/P90':
        'DistDay_P10/P50/P90 is the distribution of distance to [[liquidation|liquidation]] across days.\n\nP10 shows the lower tail of dangerous days, P50 the typical day-level buffer, and P90 the calmer upper tail.\n\nHow to read it:\nif even day-level P10 is low, the liquidation-buffer problem is structural and not limited to a few isolated trades.'
}

export const DIAGNOSTICS_DAY_TYPE_PREFIX_EN: Record<string, string> = {
    Up: 'on UP market days',
    Down: 'on DOWN market days',
    Flat: 'on FLAT market days'
}

export const DIAGNOSTICS_DAY_TYPE_METRIC_EN: Record<string, string> = {
    Trades: 'Trade count',
    'Win%': 'Winning-trade share',
    'PnL%': 'Total return, %',
    'NoTrade%': 'No-trade day share',
    'Opp%': 'Opposite-direction decision share',
    'OppAvg%': 'Average harm from opposite decisions, %',
    'OppSum%': 'Total harm from opposite decisions, %',
    'OppDir%': 'Share of trades against day direction',
    OppDirDays: 'Number of days with opposite-direction trades'
}
