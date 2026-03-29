import {
    ATR_INDICATOR_DESCRIPTION,
    DXY_INDEX_DESCRIPTION,
    EMA_200_BTC_SOL_DESCRIPTION,
    EMA_50_SOL_DESCRIPTION,
    EMA_INDICATOR_DESCRIPTION,
    FEAR_GREED_INDEX_DESCRIPTION,
    RSI_INDICATOR_DESCRIPTION,
    SMA_200_BTC_DESCRIPTION,
    SMA_50_BTC_DESCRIPTION,
    SMA_INDICATOR_DESCRIPTION
} from '@/shared/consts/tooltipTechnicalIndicators'

export const ULTRA_SAFE_REGIME_DOWN_DESCRIPTION =
    'ultra_safe.regime_down — внутреннее правило политики UltraSafe, которое запрещает вход в нисходящем режиме рынка.\n\nЧто проверяется:\nесли день помечен флагом [[regime-down-flag|RegimeDownFlag]], UltraSafe не открывает сделку даже при наличии направления.\n\nКак читать:\nэто не ошибка модели и не отсутствие сигнала. Это сознательный запрет Policy на вход в дне, который она считает неблагоприятным для своего защитного режима.'

export const ULTRA_SAFE_SL_PROB_DESCRIPTION =
    'ultra_safe.sl_prob_gt_threshold — внутреннее правило UltraSafe, которое запрещает вход, когда [[sl-prob|SlProb]] превышает 0.6.\n\nЧто это означает:\nполитика считает день слишком опасным с точки зрения быстрого ухода в [[tp-sl|stop-loss]] и не разрешает открывать сделку.\n\nКак читать:\nесли в trace виден этот запрет, причина no-trade лежит не в направлении, а в слишком высокой оценке вероятности стоп-лосса.'

export const FACTOR_DESCRIPTION_RU =
    'Фактор — общий термин для любого элемента, который заметно влияет на итоговый прогноз модели.\n\nЧто может быть фактором:\nэто может быть [[landing-features|признак]], правило, слой модели, режим рынка или другой внутренний сигнал, который сдвигает итоговый ответ в одну из сторон.\n\nКак читать:\nфактор не равен готовой сделке и не равен прибыли сам по себе. Он только объясняет, что именно подтолкнуло прогноз к текущему сценарию.\n\nПример:\nесли главным фактором дня оказался сильный [[landing-features|признак]] волатильности, это означает не «рынок точно пойдёт вверх», а то, что именно этот сигнал сильнее других повлиял на итоговый ответ модели.'

export const FACTOR_DESCRIPTION_EN =
    'Factor is the umbrella term for any element that materially influences the final model forecast.\n\nWhat can be a factor:\nit may be a [[landing-features|feature]], a rule, a model layer, a market regime flag, or another internal signal that pushes the final answer toward one scenario.\n\nHow to read it:\na factor is not a ready trade and not profit by itself. It only explains what pushed the forecast toward the current scenario.\n\nExample:\nif the leading factor of the day is a volatility-related [[landing-features|feature]], that does not mean “the market will definitely go up”. It means this signal influenced the final model answer more than the others.'

export const WHY_MIN_MOVE_DESCRIPTION =
    'Почему нужен MinMove:\nфильтр отсекает дни, где движение цены слишком слабое для устойчивой сделки.\n\nЧто считается шумом:\nесли дневной [[price-move|ход цены]] ниже порога MinMove, система трактует это как [[market-noise|рыночный шум]] и не открывает сделку.\n\nЗачем это нужно:\nбез фильтра растёт доля ложных входов, чаще появляются серии мелких убытков и ухудшается риск-профиль стратегии.'

export const MIN_MOVE_DESCRIPTION =
    'MinMove — минимальный дневной [[price-move|ход цены]], который система считает достаточным для торгового входа в сделку.\n\nЗачем нужен:\nпорог отделяет рабочее движение от [[market-noise|рыночного шума]], чтобы не входить в слабые и быстро ломающиеся движения.\n\nКак считается в движке:\nлокальная волатильность = 0.6 * [[atr-indicator|ATR индикатор]] + 0.4 * dynVol.\n\nДальше применяется EWMA-сглаживание и адаптация квантили по окну 90 дней, после чего итог ограничивается диапазоном 1.5%-8.0%.\n\nКак влияет на симуляцию:\nв intraday/hourly/delayed день считается неторговым, если dayMinMove < 1.8%.\n\nОт dayMinMove также масштабируются уровни TP/SL внутри дня.\n\nКак читать:\nMinMove=2.1% при входе 81.78 означает, что движение меньше ~1.72 USD за день считается шумом для входа в сделку.\n\nРеальный пример:\nsnapshot current-prediction-live-20260219 (дата прогноза 2026-02-19): minMove=0.0210 (2.1%), entry=81.78.\n\n[[why-min-move|Почему?]]'

export {
    ATR_INDICATOR_DESCRIPTION,
    RSI_INDICATOR_DESCRIPTION,
    SMA_50_BTC_DESCRIPTION,
    SMA_200_BTC_DESCRIPTION,
    EMA_50_SOL_DESCRIPTION,
    EMA_200_BTC_SOL_DESCRIPTION,
    FEAR_GREED_INDEX_DESCRIPTION,
    DXY_INDEX_DESCRIPTION,
    SMA_INDICATOR_DESCRIPTION,
    EMA_INDICATOR_DESCRIPTION
}
