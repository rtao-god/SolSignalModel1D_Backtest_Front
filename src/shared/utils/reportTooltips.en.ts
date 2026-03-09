import { POSITION_DESCRIPTION } from '@/shared/consts/tooltipDomainTerms'

export const BACKTEST_SUMMARY_COLUMNS_EN: Record<string, string> = {
    Name: 'Policy name from the active configuration.',
    Type: 'Policy logic type (how the strategy makes entry/exit decisions). Used for grouping.',
    Leverage: 'Configured leverage value: fixed number or dynamic if policy computes leverage internally.',
    MarginMode: 'Trade margin mode: Cross (shared wallet) or Isolated (risk limited to position margin).',
    Policy: 'Policy/strategy name this result row belongs to.',
    Margin: 'Margin mode (Cross/Isolated) used by this policy in backtest output.',
    Branch: 'Simulation branch: BASE is baseline logic, ANTI-D flips direction on risk trigger.',
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

const CURRENT_PREDICTION_BUCKET_DESCRIPTION_EN =
    'Bucket is an independent execution track with its own starting capital, equity curve, and drawdown.\n\nDaily, intraday, and delayed are calculated separately: loss or ruin in one bucket does not spill into another.\n\nPolicy defines entry and risk rules, Branch defines the direction scenario, and Bucket defines the execution mechanics and the separate balance.\n\nRisk layers work on top of that decision and can further cut risk or block entry.\n\nSwitching bucket changes the trade set and recalculates Tr, TotalPnl%, MaxDD%, HadLiq, AccRuin, Recovered, and recovery.\n\nOn this page:\nthe field shows which bucket actually executed the signal or, instead, failed to turn it into a trade inside the selected Policy.'

const CURRENT_PREDICTION_HAD_LIQ_DESCRIPTION_EN =
    'HadLiq shows whether this [[policy|Policy]] had at least one [[liquidation|liquidation]] inside the selected slice.\n\nEven one positive value means the strategy reached an exchange-forced emergency close at least once instead of finishing trades by its normal risk plan.\n\nHow to read it:\nthis flag must be judged together with [[total-pnl|TotalPnl%]] and [[drawdown|MaxDD%]]. A profitable итог with HadLiq=true still means heavy tail risk.'

const CURRENT_PREDICTION_POSITION_QTY_DESCRIPTION_EN =
    'Position size, qty is how many units of the instrument actually entered the trade.\n\nFor a trading pair this is the physical amount of the base asset inside the position. The value is derived from position notional and entry price.\n\nHow to read it:\nif qty rises at a similar entry price, the strategy controls a larger market amount and becomes more sensitive to each price move.'

const CURRENT_PREDICTION_MARKET_REGIME_DESCRIPTION_EN =
    'Market regime is the current day phase from the risk-model point of view: normal regime or drawdown / stress regime.\n\nIt is not a separate trading signal. It is context for [[risk-layers|risk layers]] and for part of [[policy|Policy]] rules.\n\nHow to read it:\nnormal regime keeps standard risk, while stress regime usually leads to tighter entry limits, lower [[leverage|leverage]], or lower [[cap-fraction|cap fraction]].'

const CURRENT_PREDICTION_SL_PROBABILITY_DESCRIPTION_EN =
    'Stop-loss trigger probability is the [[sl-model|SL model]] estimate of how likely the trade is to reach [[tp-sl|stop-loss]] quickly after entry.\n\nIt is a dedicated risk estimate, not a probability of price going up or down.\n\nHow to read it:\nhigher values mean [[risk-layers|risk layers]] should behave more defensively and are more likely to cut [[cap-fraction|cap fraction]], [[leverage|leverage]], or the entry itself.'

const CURRENT_PREDICTION_CURRENT_PRICE_DESCRIPTION_EN =
    'Current SOL/USDT price is the exchange price of the trading pair, meaning how many USDT the market currently pays for 1 SOL.\n\nIt is not a separate "Solana mode" and not the main value of the product by itself. It is the common working instrument used to compare [[landing-current-prediction|current prediction]], decision history, and [[backtest|backtest]].\n\nHow to read it:\nthis price is the base reference for [[min-move|MinMove]], direction expectation, and entry/exit levels in the policy table.'

const CURRENT_PREDICTION_MIN_MOVE_DESCRIPTION_EN =
    'Minimum meaningful price move is the MinMove threshold that separates a tradeable move from market noise.\n\nIf the expected move is too small, the system treats the day as weak for a quality trade.\n\nOn this page:\nthe field shows the exact [[min-move|MinMove]] that was available to the model at prediction time, not a post-fact value after the window closed.'

const CURRENT_PREDICTION_MIN_PRICE_24H_DESCRIPTION_EN =
    '24h minimum price is the lowest price the market reached inside the factual 24-hour window after entry.\n\nIt does not show the closing result of the day. It answers how deep price went during the window even if the market later recovered.\n\nHow to read it:\nfor [[position|LONG]] it is the largest move against the position. For [[position|SHORT]] it is the best intraday move in favor of the short.\n\nExample:\nentry at 100 and a minimum of 97.9 mean the market reached as much as -2.1% from entry inside the window.'

const CURRENT_PREDICTION_CLOSE_PRICE_24H_DESCRIPTION_EN =
    '24h close price is the instrument price at the very end of the factual 24-hour window after entry.\n\nIt is the final comparison point for forecast versus fact at close, not the intraday extreme.\n\nHow to read it:\nthis field answers how the day finished by the window close. It must be read together with 24h maximum and minimum so intraday opportunity is not confused with the final close outcome.'

export const CURRENT_PREDICTION_COLUMNS_EN: Record<string, string> = {
    Политика: 'Trading policy/strategy name. Identifies which decision logic produced this row.',
    Ветка: 'BASE is baseline branch, ANTI-D is anti-direction branch on risk trigger.',
    Бакет: CURRENT_PREDICTION_BUCKET_DESCRIPTION_EN,
    Bucket: CURRENT_PREDICTION_BUCKET_DESCRIPTION_EN,
    Сторона: POSITION_DESCRIPTION,
    'Рискованный день':
        'Risk day marks that this day was classified as an [[high-risk-day|elevated-risk day]] by the [[sl-model|SL model]].\n\nThis does not mean entry is automatically forbidden. The day then passes through stricter [[filters|filters]] and [[risk-layers|risk layers]]: [[leverage|leverage]] and [[cap-fraction|cap fraction]] may be reduced, and some policies may refuse entry completely.\n\nHow to read it:\nif the flag is on, this row must be judged more strictly by risk, [[drawdown|drawdown]], and [[liquidation|liquidation]], not only by forecast direction.',
    'Есть направление':
        'Has direction shows whether the model was able to produce a valid [[signal-direction|signal direction]] for that day.\n\nA yes/true value means the pipeline produced a LONG or SHORT candidate and the row can move to the next risk checks.\n\nA no/false value means the day ended in [[no-direction|no_direction]]: there was no clear edge toward growth or decline, so trade construction stops at this point.\n\nHow to read it:\nif direction is missing, this row should not be interpreted as a ready trade even if service fields below are still populated.',
    Пропущено:
        'Skipped is the final flag that this policy did not open a [[position|position]] on that day.\n\nThe reason may differ: the day could fail [[filters|filters]], lose [[signal-direction|signal direction]], fall into an [[high-risk-day|elevated-risk day]] with blocked entry, or receive zero [[cap-fraction|cap fraction]].\n\nHow to read it:\nif the flag is on, the row describes a rejected entry rather than an executed trade. In that case the key question is why entry was blocked for this [[policy|Policy]], [[branch|Branch]], and [[bucket|Bucket]].',
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
    'Номинал позиции, $': 'Full position notional after leverage. Used for exposure and quantity math; it is not the same as margin.',
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
    Тип: 'Factor type in explanation block (feature, rule, signal, etc.).',
    Имя: 'Factor/feature name affecting the decision.',
    Описание: 'Human-readable explanation of factor role.',
    Значение: 'Current factor value (if available).',
    Ранг: 'Importance rank in explanation list: lower means stronger impact.'
}

Object.assign(CURRENT_PREDICTION_COLUMNS_EN, {
    Policy: CURRENT_PREDICTION_COLUMNS_EN['Политика'],
    Branch: CURRENT_PREDICTION_COLUMNS_EN['Ветка'],
    Bucket: CURRENT_PREDICTION_COLUMNS_EN.Bucket,
    Type: CURRENT_PREDICTION_COLUMNS_EN['Тип'],
    Name: CURRENT_PREDICTION_COLUMNS_EN['Имя'],
    Description: CURRENT_PREDICTION_COLUMNS_EN['Описание'],
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

export const CURRENT_PREDICTION_KEYS_EN: Record<string, string> = {
    Набор: 'Dataset mode: Live is current-day forecast, Backfilled is historical recomputation.',
    Строгость: 'Pipeline strictness level (how aggressively missing data is filtered).',
    'Статус прогноза': 'Optional status note for the current prediction snapshot.',
    'Время генерации отчёта (UTC)': 'Report generation timestamp (UTC).',
    'Дата прогноза (UTC)': 'Forecast date this prediction targets.',
    SessionDayKeyUtc: 'Session day key (UTC) used as unique trading-day identifier.',
    EntryUtc: 'Expected entry time (UTC).',
    ExitUtc: 'Expected exit time (UTC).',
    AsOfUtc: 'Data snapshot timestamp used for prediction.',
    DataCutoffUtc: 'Data cutoff time (what data was available to model).',
    'Основная модель (Daily)': 'Main daily-model output (3 classes: UP/FLAT/DOWN).',
    'Микро-модель': 'Micro-model output (used inside flat regime handling).',
    'Общий ответ (интерпретация моделей)': 'Final interpretation with micro and SL overlays applied.',
    'Обучение моделей (диапазон)': 'Training data scope used for this prediction (scope + range + records).',
    'Режим рынка': CURRENT_PREDICTION_MARKET_REGIME_DESCRIPTION_EN,
    'Вероятность срабатывания стоп-лосса': CURRENT_PREDICTION_SL_PROBABILITY_DESCRIPTION_EN,
    'Сигнал SL-модели': 'Interpreted SL signal (normal risk / high risk).',
    'Текущая цена SOL/USDT': CURRENT_PREDICTION_CURRENT_PRICE_DESCRIPTION_EN,
    'Минимальный осмысленный ход цены': CURRENT_PREDICTION_MIN_MOVE_DESCRIPTION_EN,
    'Комментарий модели': 'Model text comment explaining decision (if present).',
    'Daily (основная модель)': 'UP/FLAT/DOWN probabilities for base daily model.',
    'Day + Micro': 'Probabilities after micro-model overlay.',
    'Total (Day + Micro + SL)': 'Probabilities after SL overlay on top of Day+Micro.',
    'Максимальная цена за 24 часа':
        '24h maximum price is the highest market price reached inside the factual 24-hour window after entry.\n\nIt does not tell where the day closed. It only answers how high the market managed to go during that window, even if price later gave the move back.\n\nHow to read it:\nfor [[position|LONG]] it shows the best upward excursion available during the day. For [[position|SHORT]] it shows the strongest upward move against the short.\n\nExample:\nentry at 100 and a maximum of 104.4 means the market reached as much as +4.4% upward from entry inside the window.',
    'Минимальная цена за 24 часа': CURRENT_PREDICTION_MIN_PRICE_24H_DESCRIPTION_EN,
    'Цена закрытия через 24 часа': CURRENT_PREDICTION_CLOSE_PRICE_24H_DESCRIPTION_EN,
    'Фактический исход дня':
        'Realized 24h outcome after entry (up/flat/down/micro outcome). Present only for backfilled mode.',
    'Прогноз модели (Total)': 'Main class from Total layer (Day + Micro + SL), compared against realized day outcome.',
    'Совпадение с прогнозом': 'Fact vs prediction status: full match, partial match (class only), or mismatch.',
    'Почему отличается': 'Short explanation of mismatch based on Total probabilities and explain layer.',
    'Ключевой фактор explain/PFI': 'Top explain/PFI factor most associated with model-selected scenario.',
    'Доходность к закрытию, %': 'Price change from entry to 24h close: (Close24 / Entry - 1) * 100.',
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
    'Combined response (model interpretation)': CURRENT_PREDICTION_KEYS_EN['Общий ответ (интерпретация моделей)'],
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
    'Key explain/PFI factor': CURRENT_PREDICTION_KEYS_EN['Ключевой фактор explain/PFI'],
    'Return to close, %': CURRENT_PREDICTION_KEYS_EN['Доходность к закрытию, %'],
    '24h max from entry, %': CURRENT_PREDICTION_KEYS_EN['Максимум за 24ч от входа, %'],
    '24h min from entry, %': CURRENT_PREDICTION_KEYS_EN['Минимум за 24ч от входа, %'],
    '24h high-low range, %': CURRENT_PREDICTION_KEYS_EN['Диапазон high-low за 24ч, %'],
    'Actual MinMove over 24h': CURRENT_PREDICTION_KEYS_EN['Факт MinMove за 24ч'],
    'Forecast MinMove (causal)': CURRENT_PREDICTION_KEYS_EN['Прогнозный MinMove (causal)'],
    'Delta MinMove (actual - forecast)': CURRENT_PREDICTION_KEYS_EN['Δ MinMove (факт - прогноз)'],
    'Probability of actual outcome (Total)': CURRENT_PREDICTION_KEYS_EN['Вероятность фактического исхода (Total)']
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
    'day type': 'Day type by outcome: TP-day or SL-day.',
    'pred LOW': 'How many times model predicted LOW risk.',
    'pred HIGH': 'How many times model predicted HIGH risk.',
    metric: 'Metric name.',
    value: 'Metric value.',
    Порог: 'SL-model threshold used for metric calculation.',
    'TPR(SL), %': 'True Positive Rate on SL-days: share of correct HIGH flags on SL-days.',
    'FPR(TP), %': 'False Positive Rate on TP-days: share of false HIGH flags on TP-days.',
    'pred HIGH, %': 'Share of HIGH predictions at this threshold.',
    'high / total': 'HIGH prediction count out of total days.'
}

export const DIAGNOSTICS_EXACT_EN: Record<string, string> = {
    Policy: 'Trading policy/strategy name.',
    Branch: 'Simulation branch: BASE (baseline) or ANTI-D (anti-direction).',
    Margin: 'Trade margin mode (Cross/Isolated).',
    Days: 'Number of days in this sample/group (not trade count).',
    StartDay: 'Period start date (UTC).',
    EndDay: 'Period end date (UTC).',
    StopReason: 'Period stop reason for policy (if applicable).',
    MissingDays: 'How many days are missing between StartDay and EndDay.',
    'TradeDays%': 'Share of days with trades.',
    'Long%': 'Share of days with long trades.',
    'Short%': 'Share of days with short trades.',
    'NoTrade%': 'Share of no-trade days.',
    'RiskDay%': 'Share of days marked as risky by SL logic.',
    'AntiD%': 'Share of days where anti-direction was applied.',
    'Cap avg/min/max': 'Average/min/max cap fraction used in trades, in % of bucket capital.',
    'Cap p50/p90': 'Cap-fraction quantiles p50/p90 (median and upper tail).',
    CapApplied: 'How many days cap filter was applied (position size was limited).',
    CapSkipped: 'How many days cap filter was skipped (no size limitation).',
    Trades: 'Trade count in this group.',
    'TotalPnl%': 'Total return in % over period (margin-based).',
    'MaxDD%': 'Maximum equity drawdown in %.',
    'MaxDD_NoLiq%': 'Maximum drawdown excluding liquidation events.',
    HadLiq: 'Whether liquidation occurred (yes/no).',
    Withdrawn$: 'Withdrawn profit in USD (if equity exceeded base capital).',
    inv_liq_mismatch: 'Diagnostic count of liquidation-invariant mismatches.',
    minutes_anomaly: 'Diagnostic count of minute-level data anomalies (gaps/errors).',
    Date: 'Trade date (UTC) by trading day/signal.',
    Day: 'UTC day key for aggregated stats.',
    Side: POSITION_DESCRIPTION,
    IsLong: 'Direction flag: true = long, false = short.',
    Lev: 'Effective leverage used in this trade.',
    Margin$: 'Margin used in trade, USD.',
    NetPnl$: 'Net trade PnL in USD after commissions.',
    'Gross%': 'Gross return before commissions.',
    'NetPnl%': 'Net trade return in % of used margin.',
    'NetRet%': 'Net trade return in % (after commissions).',
    Cap: 'Cap fraction used in trade.',
    Comm$: 'Trade commissions in USD (entry + exit).',
    'MAE%': 'Max Adverse Excursion in %.',
    'MFE%': 'Max Favorable Excursion in %.',
    LiqPx: 'Backtest liquidation price used for modeled close.',
    LiqBacktest: 'Backtest liquidation price (conservative, closer to entry).',
    RealLiq: 'Real-liquidation flag: price reached backtest liquidation level.',
    IsLiq: 'Model liquidation flag (bucket wipe or liquidation event).',
    IsRealLiq: 'Strict real-liquidation flag (backtest level reached).',
    Source: 'Signal source: Daily / DelayedA / DelayedB.',
    DayType: 'Market day type: UP / DOWN / FLAT.',
    'AbsRet%': 'Absolute daily market return |return| in %.',
    MinMove: 'Minimum meaningful daily price-move threshold.',
    'MaxAdv%': 'Maximum adverse move within trade, %.',
    StartEq$: 'Equity at period start.',
    EndEq$: 'Equity at period end.',
    MinEq$: 'Minimum equity within period.',
    MaxEq$: 'Maximum equity within period.',
    'LiqDays#': 'Number of days with liquidation.',
    'RealLiq#': 'Number of real liquidations (backtest-level reached).',
    FirstLiqDay: 'First liquidation date.',
    LastLiqDay: 'Last liquidation date.',
    MinDistPct: 'Minimum liquidation distance, % (liqDist - adverse).',
    DistTrade_Min: 'Minimum liquidation distance by trade.',
    'DistTrade_P10/P50/P90': 'Liquidation-distance quantiles by trade (p10/p50/p90).',
    DistDay_Min: 'Minimum liquidation distance by day.',
    'DistDay_P10/P50/P90': 'Liquidation-distance quantiles by day (p10/p50/p90).',
    data_anomaly_gap_count: 'Number of detected data gaps.',
    data_anomaly_max_gap: 'Maximum detected data gap, in minutes.',
    data_anomaly_missing_days: 'Number of fully missing days.',
    data_anomaly_missing_weekday: 'Number of missing weekdays.',
    data_anomaly_missing_weekend: 'Number of missing weekend days.',
    data_anomaly_order_violation: 'Number of chronological-order violations in day records.',
    AbsRetP90: 'Global p90 of |return| used as specificity baseline.',
    MinMoveP90: 'Global p90 of MinMove used as specificity baseline.',
    AbsRetP90_Last: 'Most recent rolling p90 of |return|.',
    MinMoveP90_Last: 'Most recent rolling p90 of MinMove.',
    'AbsP90_vs_global_delta%': 'Relative deviation of rolling p90(|return|) from global baseline, in %.',
    'MinMoveP90_vs_global_delta%': 'Relative deviation of rolling p90(MinMove) from global baseline, in %.',
    Defined: 'Whether specificity threshold is defined for this slice (yes/no).',
    DefinedDays: 'Number of days with a defined specificity threshold.',
    LastSamples: 'Sample size used for the latest threshold estimate.',
    MinSamples: 'Minimum sample size required to define specificity threshold.',
    Samples: 'Sample size used for threshold calculation.',
    SpecUndefined: 'Number of days with undefined specificity threshold (insufficient sample size).',
    SpecDays: 'Number of days classified as specific.',
    'SpecTrade%': 'Share of trading days among specific days.',
    'SpecNoTrade%': 'Share of no-trade days among specific days.',
    'SpecOpp%': 'Share of opposite-direction decisions among specific days.',
    NormDays: 'Number of days classified as normal (non-specific).',
    'NormTrade%': 'Share of trading days among normal days.',
    'NormNoTrade%': 'Share of no-trade days among normal days.',
    'NormOpp%': 'Share of opposite-direction decisions among normal days.',
    Specific: 'Specific-day flag (yes/no).',
    'Specific%': 'Share of specific days in this sample.',
    'SpecDefined%': 'Share of days with defined specificity threshold.',
    Specificity: 'Specificity = TN / (TN + FP) for guardrail on BAD-days.',
    Sensitivity: 'Sensitivity (TPR) for guardrail: share of captured BAD-days.',
    PrecisionBad: 'Precision for BAD-days: among blocked days, share that is truly BAD.',
    BlockRate: 'Share of days blocked by guardrail.',
    TradeRate: 'Share of days allowed for trading by guardrail.',
    AvoidedLoss$: 'Estimated avoided losses, USD.',
    MissedProfit$: 'Estimated missed profit, USD.',
    NetBenefit$: 'Avoided losses minus missed profit, USD.',
    'AvoidedLoss%': 'Estimated avoided losses, %.',
    'MissedProfit%': 'Estimated missed profit, %.',
    'NetBenefit%': 'Guardrail net effect in %, AvoidedLoss% - MissedProfit%.',
    TP: 'True Positive (BAD-day correctly blocked).',
    FP: 'False Positive (good day blocked).',
    TN: 'True Negative (good day allowed).',
    FN: 'False Negative (bad day missed).',
    BaseTradeDays: 'How many days base policy wanted to trade.',
    Actor: 'Primary decision actor (model/policy/SL/etc.).',
    PrimaryActor: 'Primary actor of final decision.',
    Reason: 'Reason/code for chosen decision.',
    Action: 'Final action (trade / no-trade / block, etc.).',
    Bucket: 'Outcome bucket in blame split.',
    Count: 'Number of rows/days in this group.',
    'Rate%': 'Group share of total, %.',
    'CorrectDir%': 'Share of correct trade direction among trading days.',
    'Opposite%': 'Share of opposite-direction decisions (against day direction).',
    'AvgAbsRet%': 'Average market |return| in this group, in %.',
    'P90AbsRet%': 'p90 of market |return| in this group, in %.',
    'OppHarmSum%': 'Total harm from opposite-direction decisions, in %.',
    'MissedOppSum%': 'Total missed opportunity due to no-trade, in %.',
    'OOD%': 'Share of OOD days in this group.',
    'OOD_severe%': 'Share of severe OOD days in this group.',
    Weekday: 'Weekday (Mon..Sun).',
    Причина: 'Aggregated NoTrade/Skip reason.',
    'Share%': 'Share of this group from parent total, in %.',
    'ShareAll%': 'Share from total across all days, in %.',
    'ShareSkipped%': 'Share among skipped days, in %.',
    'NoDir%': 'Share of days with no model direction signal.',
    'PolicySkip%': 'Share of skips caused by policy rules.',
    'CapZero%': 'Share of skips caused by zero cap fraction.',
    'LowEdge%': 'Share of skips caused by low edge.',
    'RiskThrottle%': 'Share of skips caused by risk throttling.',
    'Unknown%': 'Share of skips with unknown reason.',
    OOD: 'OOD category (out-of-distribution).',
    'Trade%': 'Share of trading days.',
    'OppDir%': 'Share of trades against day direction (UP->SHORT or DOWN->LONG).',
    OppDirDays: 'Number of days with opposite-direction trades.',
    'OppHarmAvg%': 'Average harm from opposite-direction decisions, in %.',
    'NoTradeOppAvg%': 'Average missed opportunity due to no-trade, in %.',
    'NoTradeOppSum%': 'Total missed opportunity due to no-trade, in %.',
    UpTrades: 'Trade count on UP days.',
    DownTrades: 'Trade count on DOWN days.',
    FlatTrades: 'Trade count on FLAT days.',
    'UpWin%': 'WinRate on UP days.',
    'DownWin%': 'WinRate on DOWN days.',
    'FlatWin%': 'WinRate on FLAT days.',
    'UpPnL%': 'Total return on UP days.',
    'DownPnL%': 'Total return on DOWN days.',
    'FlatPnL%': 'Total return on FLAT days.',
    'UpNoTrade%': 'No-trade share on UP days.',
    'DownNoTrade%': 'No-trade share on DOWN days.',
    'FlatNoTrade%': 'No-trade share on FLAT days.',
    'UpOpp%': 'Opposite-direction decision share on UP days.',
    'DownOpp%': 'Opposite-direction decision share on DOWN days.',
    'FlatOppAvg%': 'Average harm from opposite-direction decisions on FLAT days.',
    'FlatOppSum%': 'Total harm from opposite-direction decisions on FLAT days.',
    'DownOppAvg%': 'Average harm from opposite-direction decisions on DOWN days.',
    'DownOppSum%': 'Total harm from opposite-direction decisions on DOWN days.',
    'UpOppAvg%': 'Average harm from opposite-direction decisions on UP days.',
    'UpOppSum%': 'Total harm from opposite-direction decisions on UP days.',
    DayOfWeek: 'Weekday key used for NoTrade/skip aggregation.',
    Policies: 'Number of policies in this group.',
    Type: 'Aggregate row type/category.',
    Mode: 'Decision layer/mode.',
    ModelRaw: 'Raw model output before policy filters.',
    Detail: 'Additional reason detail field.',
    UndefinedReason: 'Reason why value/label is unavailable.'
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
