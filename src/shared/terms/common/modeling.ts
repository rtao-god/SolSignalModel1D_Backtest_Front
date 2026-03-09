import {
    ATR_INDICATOR_DESCRIPTION,
    EMA_200_BTC_SOL_DESCRIPTION,
    EMA_50_SOL_DESCRIPTION,
    EMA_INDICATOR_DESCRIPTION,
    RSI_INDICATOR_DESCRIPTION,
    SMA_200_BTC_DESCRIPTION,
    SMA_50_BTC_DESCRIPTION,
    SMA_INDICATOR_DESCRIPTION
} from '@/shared/consts/tooltipTechnicalIndicators'

export const ULTRA_SAFE_REGIME_DOWN_DESCRIPTION =
    'ultra_safe.regime_down: правило UltraSafe запрещает вход, когда день помечен как нисходящий режим (RegimeDown=true).'

export const ULTRA_SAFE_SL_PROB_DESCRIPTION =
    'ultra_safe.sl_prob_gt_threshold: правило UltraSafe запрещает вход, когда SlProb выше 0.6. Это защита от входа в день с повышенной вероятностью быстро дойти до SL.'

export const WHY_MIN_MOVE_DESCRIPTION =
    'Почему нужен MinMove:\nфильтр отсекает дни, где движение цены слишком слабое для устойчивой сделки.\n\nЧто считается шумом:\nесли дневной [[price-move|ход цены]] ниже порога MinMove, система трактует это как [[market-noise|рыночный шум]] и не открывает сделку.\n\nЗачем это нужно:\nбез фильтра растёт доля ложных входов, чаще появляются серии мелких убытков и ухудшается риск-профиль стратегии.'

export const MIN_MOVE_DESCRIPTION =
    'MinMove — минимальный дневной [[price-move|ход цены]], который система считает достаточным для торгового входа.\n\nЗачем нужен:\nпорог отделяет рабочее движение от [[market-noise|рыночного шума]], чтобы не входить в слабые и быстро ломающиеся движения.\n\nКак считается в движке:\nлокальная волатильность = 0.6 * [[atr-indicator|ATR индикатор]] + 0.4 * dynVol.\n\nДальше применяется EWMA-сглаживание и адаптация квантили по окну 90 дней, после чего итог ограничивается диапазоном 1.5%-8.0%.\n\nКак влияет на симуляцию:\nв intraday/hourly/delayed день считается неторговым, если dayMinMove < 1.8%.\n\nОт dayMinMove также масштабируются уровни TP/SL внутри дня.\n\nКак читать:\nMinMove=2.1% при входе 81.78 означает, что движение меньше ~1.72 USD за день считается шумом для входа.\n\nРеальный пример:\nsnapshot current-prediction-live-20260219 (дата прогноза 2026-02-19): minMove=0.0210 (2.1%), entry=81.78.\n\n[[why-min-move|Почему?]]'

export {
    ATR_INDICATOR_DESCRIPTION,
    RSI_INDICATOR_DESCRIPTION,
    SMA_50_BTC_DESCRIPTION,
    SMA_200_BTC_DESCRIPTION,
    EMA_50_SOL_DESCRIPTION,
    EMA_200_BTC_SOL_DESCRIPTION,
    SMA_INDICATOR_DESCRIPTION,
    EMA_INDICATOR_DESCRIPTION
}
