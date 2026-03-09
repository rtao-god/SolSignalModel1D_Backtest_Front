import type { SharedTermTooltipRuleDraft } from '@/shared/terms/types'
import {
    BACKTEST_DESCRIPTION,
    BRANCH_DESCRIPTION,
    BUCKET_DESCRIPTION,
    COUNTERFACT_DESCRIPTION,
    DAILY_BUCKET_DESCRIPTION,
    DD_DESCRIPTION,
    DELAYED_BUCKET_DESCRIPTION,
    DELAYED_SIGNAL_DESCRIPTION,
    EOD_DESCRIPTION,
    EXECUTED_AT_UTC_DESCRIPTION,
    FILTERS_DESCRIPTION,
    FIRST_EVENT_DESCRIPTION,
    FUNDING_DESCRIPTION,
    INTRADAY_BUCKET_DESCRIPTION,
    MARKET_NOISE_DESCRIPTION,
    METRIC_VIEW_DESCRIPTION,
    NET_PNL_USD_DESCRIPTION,
    NO_BIGGEST_LIQ_LOSS_DESCRIPTION,
    NO_DIRECTION_DESCRIPTION,
    NO_SL_MODE_DESCRIPTION,
    PERCENTAGE_POINTS_DESCRIPTION,
    PNL_DESCRIPTION,
    POLICY_DESCRIPTION,
    POLICY_SKIP_DESCRIPTION,
    POSITION_TOOLTIP_DESCRIPTION,
    PRICE_MOVE_DESCRIPTION,
    REAL_METRIC_DESCRIPTION,
    SIGNAL_DIRECTION_DESCRIPTION,
    SLIPPAGE_DESCRIPTION,
    TOTAL_AGGREGATE_BUCKET_DESCRIPTION,
    TOTAL_PNL_DESCRIPTION,
    TP_SL_DESCRIPTION,
    TRADE_COUNT_DESCRIPTION,
    WEALTH_PCT_DESCRIPTION,
    WHY_BUCKET_DESCRIPTION,
    WHY_FIRST_EVENT_DESCRIPTION,
    WHY_NO_BIGGEST_LIQ_LOSS_DESCRIPTION,
    WHY_WEEKENDS_DESCRIPTION,
    WITH_SL_MODE_DESCRIPTION,
    WITHDRAWN_PROFIT_DESCRIPTION
} from './trading'
import {
    ACCOUNT_RUIN_DESCRIPTION,
    ACTIVE_EQUITY_DESCRIPTION,
    ANTI_D_NOT_APPLIED_DESCRIPTION,
    ANTI_DIRECTION_DESCRIPTION,
    CAP_FRACTION_DESCRIPTION,
    CAP_POLICY_DESCRIPTION,
    CAP_ZERO_DESCRIPTION,
    CONF_BUCKET_DESCRIPTION,
    CONFIDENCE_OUT_OF_RANGE_DESCRIPTION,
    CROSS_MARGIN_DESCRIPTION,
    CURRENT_BALANCE_DESCRIPTION,
    DRAWDOWN_DESCRIPTION,
    DYNAMIC_TP_SL_DESCRIPTION,
    EXPOSURE_DESCRIPTION,
    HIGH_RISK_DAY_DESCRIPTION,
    ISOLATED_MARGIN_DESCRIPTION,
    LEVERAGE_DESCRIPTION,
    LIQUIDATION_DESCRIPTION,
    LOW_EDGE_DESCRIPTION,
    MARGIN_DESCRIPTION,
    MARGIN_USED_DESCRIPTION,
    NET_RETURN_PCT_DESCRIPTION,
    P90_QUANTILE_DESCRIPTION,
    RATIO_CURVE_DESCRIPTION,
    RECOVERED_DESCRIPTION,
    RECOV_DAYS_DESCRIPTION,
    RECOVERY_DESCRIPTION,
    REGIME_DOWN_FLAG_DESCRIPTION,
    REQ_GAIN_DESCRIPTION,
    RISK_LAYERS_DESCRIPTION,
    RISK_THROTTLE_DESCRIPTION,
    SHARPE_DESCRIPTION,
    SL_MODEL_DESCRIPTION,
    SL_MODE_TERM_DESCRIPTION,
    SL_PROB_DESCRIPTION,
    SORTINO_DESCRIPTION,
    START_BALANCE_DESCRIPTION,
    START_CAP_DESCRIPTION,
    STATIC_TP_SL_DESCRIPTION,
    TP_SL_MODE_DESCRIPTION,
    TRACE_DESCRIPTION,
    WHY_NO_SL_DESCRIPTION,
    WITHOUT_ZONAL_MODE_DESCRIPTION,
    WITH_ZONAL_MODE_DESCRIPTION,
    ZONAL_MODE_DESCRIPTION,
    BUCKET_DEAD_AFTER_LIQ_DESCRIPTION
} from './risk'
import {
    ATR_INDICATOR_DESCRIPTION,
    EMA_200_BTC_SOL_DESCRIPTION,
    EMA_50_SOL_DESCRIPTION,
    EMA_INDICATOR_DESCRIPTION,
    MIN_MOVE_DESCRIPTION,
    RSI_INDICATOR_DESCRIPTION,
    SMA_200_BTC_DESCRIPTION,
    SMA_50_BTC_DESCRIPTION,
    SMA_INDICATOR_DESCRIPTION,
    ULTRA_SAFE_REGIME_DOWN_DESCRIPTION,
    ULTRA_SAFE_SL_PROB_DESCRIPTION,
    WHY_MIN_MOVE_DESCRIPTION
} from './modeling'

export const COMMON_TERM_TOOLTIP_REGISTRY: SharedTermTooltipRuleDraft[] = [
    {
        id: 'sl-mode-term',
        pattern: /SL Mode|режим\s+SL/i,
        title: 'SL Mode',
        description: SL_MODE_TERM_DESCRIPTION,
        aliases: ['SL Mode', 'режим SL'],
        priority: 140,
        scope: 'common'
    },
    {
        id: 'tp-sl-mode-term',
        pattern: /TP\/SL mode|режим\s+TP\/SL|dynamic[-\s]?risk\s+mode|режим\s+dynamic[-\s]?risk/i,
        title: 'Dynamic-risk mode',
        description: TP_SL_MODE_DESCRIPTION,
        aliases: ['TP/SL mode', 'режим TP/SL', 'Dynamic-risk mode', 'режим dynamic-risk'],
        priority: 140,
        scope: 'common'
    },
    {
        id: 'zonal-mode-term',
        pattern: /\bZONAL\b|зональн(?:ый|ого|ом)?\s+фильтр/i,
        title: 'ZONAL',
        description: ZONAL_MODE_DESCRIPTION,
        aliases: ['ZONAL', 'зональный фильтр'],
        priority: 110,
        scope: 'common'
    },
    {
        id: 'with-zonal-mode',
        pattern: /\bWITH(?:[-‑_\s]+)ZONAL\b|с\s+зональност/i,
        title: 'WITH ZONAL',
        description: WITH_ZONAL_MODE_DESCRIPTION,
        aliases: ['WITH ZONAL', 'WITH-ZONAL', 'С зональностью'],
        priority: 160,
        scope: 'common'
    },
    {
        id: 'without-zonal-mode',
        pattern: /\bWITHOUT(?:[-‑_\s]+)ZONAL\b|без\s+зональност/i,
        title: 'WITHOUT ZONAL',
        description: WITHOUT_ZONAL_MODE_DESCRIPTION,
        aliases: ['WITHOUT ZONAL', 'WITHOUT-ZONAL', 'Без зональности'],
        priority: 160,
        scope: 'common'
    },
    {
        id: 'with-sl-mode',
        pattern: /\bWITH(?:[-‑_\s]+)SL\b/i,
        title: 'WITH-SL',
        description: WITH_SL_MODE_DESCRIPTION,
        aliases: ['WITH-SL', 'WITH SL'],
        priority: 160,
        scope: 'common'
    },
    {
        id: 'no-sl-mode',
        pattern: /\bNO(?:[-‑_\s]+)SL\b/i,
        title: 'NO-SL',
        description: NO_SL_MODE_DESCRIPTION,
        aliases: ['NO-SL', 'NO SL'],
        priority: 160,
        scope: 'common'
    },
    {
        id: 'total-pnl',
        pattern: /TotalPnl%|TotalPnlPct/i,
        title: 'TotalPnl%',
        description: TOTAL_PNL_DESCRIPTION,
        scope: 'common'
    },
    {
        id: 'wealth-pct',
        pattern: /Wealth%/i,
        title: 'Wealth%',
        description: WEALTH_PCT_DESCRIPTION,
        scope: 'common'
    },
    {
        id: 'percentage-points',
        pattern: /\bп\.п\.?/i,
        title: 'Процентные пункты',
        description: PERCENTAGE_POINTS_DESCRIPTION,
        aliases: ['п.п.', 'п.п', 'процентные пункты'],
        priority: 200,
        scope: 'common'
    },
    {
        id: 'backtest',
        pattern: /бэктест(?:е|а|у|ом|ы|ов|ам|ами|ах)?|backtest/i,
        title: 'Бэктест',
        description: BACKTEST_DESCRIPTION,
        aliases: ['бэктест', 'backtest'],
        priority: 175,
        scope: 'common'
    },
    {
        id: 'why-weekends',
        pattern: /Почему\?\s*\(выходные\)/i,
        title: 'Почему?',
        description: WHY_WEEKENDS_DESCRIPTION,
        autolink: false,
        scope: 'common'
    },
    {
        id: 'why-bucket',
        pattern: /Почему\?\s*\(bucket\)/i,
        title: 'Почему?',
        description: WHY_BUCKET_DESCRIPTION,
        autolink: false,
        scope: 'common'
    },
    {
        id: 'why-no-sl',
        pattern: /Почему\?\s*\(NO(?:[-‑\s]?SL)\)/i,
        title: 'Почему?',
        description: WHY_NO_SL_DESCRIPTION,
        autolink: false,
        scope: 'common'
    },
    {
        id: 'why-no-biggest-liq-loss',
        pattern: /Почему\?\s*\(NO\s+BIGGEST\s+LIQ\s+LOSS\)/i,
        title: 'Почему?',
        description: WHY_NO_BIGGEST_LIQ_LOSS_DESCRIPTION,
        autolink: false,
        scope: 'common'
    },
    {
        id: 'why-first-event',
        pattern: /Почему\?\s*\(first[-‑\s]?event\)/i,
        title: 'Почему?',
        description: WHY_FIRST_EVENT_DESCRIPTION,
        autolink: false,
        scope: 'common'
    },
    {
        id: 'why-min-move',
        pattern: /Почему\?\s*\(MinMove\)/i,
        title: 'Почему?',
        description: WHY_MIN_MOVE_DESCRIPTION,
        autolink: false,
        scope: 'common'
    },
    {
        id: 'sl-model',
        pattern: /SL(?:[-‑\s]?модел[а-яё]*)|\bsl[-‑\s]?model\b|SlHighDecision\b/i,
        title: 'SL-модель',
        description: SL_MODEL_DESCRIPTION,
        aliases: ['SL-модель', 'SL модель', 'sl model', 'SlHighDecision'],
        priority: 260,
        scope: 'common'
    },
    {
        id: 'anti-direction',
        pattern: /anti[-‑\s]?direction|анти-?направлен|инверси[яи]\s+направлени/i,
        title: 'anti-direction',
        description: ANTI_DIRECTION_DESCRIPTION,
        aliases: ['anti-direction', 'анти-направление', 'инверсия направления'],
        priority: 180,
        scope: 'common'
    },
    {
        id: 'dynamic-tp-sl',
        pattern:
            /\bDynTP\/SL\b|dynamic\s*TP\/SL|dynamic[-\s]?risk|\bDYNAMIC(?:\s+RISK)?\b|динам(?:ический|ические|ических|ическим)\s*TP\/SL|динам(?:ический|ическая)\s+режим/i,
        title: 'DYNAMIC risk',
        description: DYNAMIC_TP_SL_DESCRIPTION,
        aliases: ['DYNAMIC', 'DYNAMIC risk', 'DynTP/SL', 'dynamic TP/SL', 'Dynamic TP/SL', 'dynamic risk'],
        priority: 240,
        scope: 'common'
    },
    {
        id: 'static-tp-sl',
        pattern:
            /\bStatTP\/SL\b|static\s*TP\/SL|static[-\s]?base|\bSTATIC(?:\s+BASE)?\b|стат(?:ический|ические|ических|ическим)\s*TP\/SL|стат(?:ический|ическая)\s+режим/i,
        title: 'STATIC base',
        description: STATIC_TP_SL_DESCRIPTION,
        aliases: ['STATIC', 'STATIC base', 'StatTP/SL', 'static TP/SL', 'Static TP/SL', 'static base'],
        priority: 240,
        scope: 'common'
    },
    {
        id: 'tp-sl-combined',
        pattern:
            /(?:тейк-?профит[а-яё]*|take-profit|\bTP\b)\s*(?:\([^)]*\))?\s*(?:\/|,|;|:|\s+и\s+)\s*(?:стоп-?лосс[а-яё]*|stop-loss|\bSL\b)\s*(?:\([^)]*\))?|(?:стоп-?лосс[а-яё]*|stop-loss|\bSL\b)\s*(?:\([^)]*\))?\s*(?:\/|,|;|:|\s+и\s+)\s*(?:тейк-?профит[а-яё]*|take-profit|\bTP\b)\s*(?:\([^)]*\))?|\bTP\/SL\b|\bSL\/TP\b/i,
        title: 'TP/SL',
        description: TP_SL_DESCRIPTION,
        aliases: ['TP/SL', 'SL/TP'],
        priority: 220,
        autolink: false,
        scope: 'common'
    },
    {
        id: 'net-pnl-usd',
        pattern: /\bNetPnl\$/i,
        title: 'NetPnl$',
        description: NET_PNL_USD_DESCRIPTION,
        scope: 'common'
    },
    {
        id: 'pnl',
        pattern: /\bPnL\b/i,
        title: 'PnL',
        description: PNL_DESCRIPTION,
        aliases: ['PnL'],
        priority: 170,
        scope: 'common'
    },
    {
        id: 'dd',
        pattern: /\bDD\b/i,
        title: 'DD',
        description: DD_DESCRIPTION,
        aliases: ['DD'],
        priority: 170,
        scope: 'common'
    },
    {
        id: 'trade-count',
        pattern: /\bTr\b|trade[-\s]?count|числ(?:о|а)\s+сделок|количеств(?:о|а)\s+сделок/i,
        title: 'Tr',
        description: TRADE_COUNT_DESCRIPTION,
        aliases: ['Tr', 'trade count', 'число сделок', 'количество сделок'],
        priority: 175,
        scope: 'common'
    },
    {
        id: 'recovery',
        pattern: /\brecovery\b|восстановлени(?:е|я|ю|ем|и)\b/i,
        title: 'recovery',
        description: RECOVERY_DESCRIPTION,
        aliases: ['recovery', 'восстановление'],
        priority: 165,
        scope: 'common'
    },
    {
        id: 'net-return-pct',
        pattern: /\bNetReturnPct\b|\bNetReturnPc\b|чист(?:ая|ой)\s+доходност[ьи]\s+сделк[аи]/i,
        title: 'NetReturnPct',
        description: NET_RETURN_PCT_DESCRIPTION,
        aliases: ['NetReturnPct', 'NetReturnPc'],
        priority: 210,
        scope: 'common'
    },
    {
        id: 'tp-sl',
        pattern: /\bTP\/SL\b|\bSL\/TP\b|тейк-?профит[а-яё]*|take-profit|стоп-?лосс[а-яё]*|stop-loss|\bTP\b|\bSL\b/i,
        title: 'TP/SL',
        description: TP_SL_DESCRIPTION,
        aliases: ['TP/SL', 'SL/TP', 'тейк-профит', 'take-profit', 'стоп-лосс', 'stop-loss'],
        priority: 30,
        contexts: {
            blockedBeforeWords: ['with', 'no', 'режим', 'dynamic', 'static', 'dyn', 'stat'],
            blockedAfterWords: ['mode', 'режим', 'модель', 'модели', 'моделью', 'моделях', 'моделям', 'моделей']
        },
        scope: 'common'
    },
    {
        id: 'account-ruin',
        pattern: /AccRuin|account\s*ruin|руин[аы]?\s+(?:аккаунта|сч[её]та|бакета)/i,
        title: 'AccRuin',
        description: ACCOUNT_RUIN_DESCRIPTION,
        scope: 'common'
    },
    {
        id: 'recovered',
        pattern: /\bRecovered\b|Recovered\s*=\s*(?:true|false)|флаг\s+восстановлени(?:я|е)/i,
        title: 'Recovered',
        description: RECOVERED_DESCRIPTION,
        scope: 'common'
    },
    {
        id: 'recov-days',
        pattern: /\bRecovDays\b|дней\s+до\s+восстановлен/i,
        title: 'RecovDays',
        description: RECOV_DAYS_DESCRIPTION,
        scope: 'common'
    },
    {
        id: 'req-gain',
        pattern: /\bReqGain%\b|\bReqGain\b|требуем(?:ый|ого)\s+рост/i,
        title: 'ReqGain%',
        description: REQ_GAIN_DESCRIPTION,
        scope: 'common'
    },
    {
        id: 'liquidation',
        pattern: /ликвидац|liquidation|HadLiq|RealLiq/i,
        title: 'Ликвидация',
        description: LIQUIDATION_DESCRIPTION,
        scope: 'common'
    },
    {
        id: 'isolated-margin',
        pattern: /isolated|изолированн(?:ая|ой)\s+марж/i,
        title: 'Isolated маржа',
        description: ISOLATED_MARGIN_DESCRIPTION,
        scope: 'common'
    },
    {
        id: 'cross-margin',
        pattern: /\bcross\b|кросс-?марж/i,
        title: 'Cross маржа',
        description: CROSS_MARGIN_DESCRIPTION,
        scope: 'common'
    },
    {
        id: 'leverage',
        pattern: /плечо|leverage/i,
        title: 'Плечо',
        description: LEVERAGE_DESCRIPTION,
        scope: 'common'
    },
    {
        id: 'margin',
        pattern: /маржа|залог/i,
        title: 'Маржа',
        description: MARGIN_DESCRIPTION,
        scope: 'common'
    },
    {
        id: 'position',
        pattern: /(?<![A-Za-zА-Яа-яЁё0-9_])(?:LONG|SHORT|позиц(?:ия|ии|ию|ией|иями|иях|иям))(?![A-Za-zА-Яа-яЁё0-9_])/i,
        title: 'Позиция',
        description: POSITION_TOOLTIP_DESCRIPTION,
        scope: 'common'
    },
    {
        id: 'exposure',
        pattern: /экспозици(?:я|и|ю|ей|ями|ях)|Exposure%?|high exposure/i,
        title: 'Экспозиция',
        description: EXPOSURE_DESCRIPTION,
        aliases: ['экспозиция', 'Exposure', 'Exposure%'],
        priority: 145,
        scope: 'common'
    },
    {
        id: 'drawdown',
        pattern: /просадк|MaxDD|DD70/i,
        title: 'Просадка',
        description: DRAWDOWN_DESCRIPTION,
        scope: 'common'
    },
    {
        id: 'ratio-curve',
        pattern: /ratio[-‑\s]?крив|ratio[-‑\s]?curve|ratio[-‑\s]?series/i,
        title: 'ratio-кривая',
        description: RATIO_CURVE_DESCRIPTION,
        aliases: ['ratio-кривая', 'ratio curve'],
        priority: 176,
        scope: 'common'
    },
    {
        id: 'sharpe-ratio',
        pattern: /\bSharpe\b|коэффиц(?:иент)?\s+шарпа/i,
        title: 'Sharpe',
        description: SHARPE_DESCRIPTION,
        aliases: ['Sharpe', 'коэффициент Шарпа'],
        priority: 176,
        scope: 'common'
    },
    {
        id: 'sortino-ratio',
        pattern: /\bSortino\b|коэффиц(?:иент)?\s+сортино/i,
        title: 'Sortino',
        description: SORTINO_DESCRIPTION,
        aliases: ['Sortino', 'коэффициент Сортино'],
        priority: 176,
        scope: 'common'
    },
    {
        id: 'policy',
        pattern: /\bpolicy\b/i,
        title: 'Policy',
        description: POLICY_DESCRIPTION,
        scope: 'common'
    },
    {
        id: 'branch',
        pattern: /\bbranch\b|\bANTI-D\b|\bBASE\b/i,
        title: 'Branch',
        description: BRANCH_DESCRIPTION,
        scope: 'common'
    },
    {
        id: 'risk-layers',
        pattern:
            /risk[-\s]?сло(?:й|и|я|ю|ем|е|ев|ёв|ям|ями|ях)|risk[-\s]?layers?|сло(?:й|и|я|ю|ем|е)\s+риска/i,
        title: 'Risk-слои',
        description: RISK_LAYERS_DESCRIPTION,
        aliases: ['risk-слои', 'risk-слой', 'risk layers', 'risk layer', 'слои риска'],
        priority: 188,
        scope: 'common'
    },
    {
        id: 'bucket-daily',
        pattern: /\bdaily bucket\b|бакет\s+daily/i,
        title: 'daily bucket',
        description: DAILY_BUCKET_DESCRIPTION,
        scope: 'common'
    },
    {
        id: 'bucket-intraday',
        pattern: /\bintraday bucket\b|бакет\s+intraday/i,
        title: 'intraday bucket',
        description: INTRADAY_BUCKET_DESCRIPTION,
        scope: 'common'
    },
    {
        id: 'bucket-delayed',
        pattern: /\bdelayed bucket\b|бакет\s+delayed/i,
        title: 'delayed bucket',
        description: DELAYED_BUCKET_DESCRIPTION,
        scope: 'common'
    },
    {
        id: 'executed-at-utc',
        pattern: /\bExecutedAtUtc\b/i,
        title: 'ExecutedAtUtc',
        description: EXECUTED_AT_UTC_DESCRIPTION,
        aliases: ['ExecutedAtUtc'],
        priority: 260,
        scope: 'common'
    },
    {
        id: 'delayed-signal',
        pattern: /delayed[-‑\s]?сигнал|delayed signal|DelayedExecution/i,
        title: 'delayed-сигнал',
        description: DELAYED_SIGNAL_DESCRIPTION,
        scope: 'common'
    },
    {
        id: 'bucket-total-aggregate',
        pattern: /\btotal aggregate\b|total-aggregate|агрегат\s+всех\s+бакетов/i,
        title: 'total aggregate',
        description: TOTAL_AGGREGATE_BUCKET_DESCRIPTION,
        scope: 'common'
    },
    {
        id: 'bucket',
        pattern: /\bbucket\b|бакет/i,
        title: 'Bucket',
        description: BUCKET_DESCRIPTION,
        scope: 'common'
    },
    {
        id: 'metric-view',
        pattern: /metric view|режим метрик/i,
        title: 'Metric View',
        description: METRIC_VIEW_DESCRIPTION,
        scope: 'common'
    },
    {
        id: 'real-metric',
        pattern: /\bREAL\b/i,
        title: 'REAL',
        description: REAL_METRIC_DESCRIPTION,
        aliases: ['REAL'],
        priority: 155,
        scope: 'common'
    },
    {
        id: 'no-biggest-liq-loss-metric',
        pattern: /NO\s+BIGGEST\s+LIQ\s+LOSS/i,
        title: 'NO BIGGEST LIQ LOSS',
        description: NO_BIGGEST_LIQ_LOSS_DESCRIPTION,
        aliases: ['NO BIGGEST LIQ LOSS'],
        priority: 156,
        scope: 'common'
    },
    {
        id: 'funding',
        pattern: /funding|фандинг/i,
        title: 'Funding',
        description: FUNDING_DESCRIPTION,
        scope: 'common'
    },
    {
        id: 'slippage',
        pattern: /проскальзывани|slippage|price impact/i,
        title: 'Проскальзывание',
        description: SLIPPAGE_DESCRIPTION,
        scope: 'common'
    },
    {
        id: 'eod',
        pattern: /EndOfDay|end[-‑\s]?of[-‑\s]?day|\bEOD\b/i,
        title: 'EOD (EndOfDay)',
        description: EOD_DESCRIPTION,
        aliases: ['EndOfDay', 'EOD', 'end of day'],
        priority: 130,
        scope: 'common'
    },
    {
        id: 'first-event',
        pattern: /first[-‑\s]?event|first event|цепочк[аи]\s+событий/i,
        title: 'first-event',
        description: FIRST_EVENT_DESCRIPTION,
        aliases: ['first-event', 'first event', 'first-event цепочка'],
        priority: 170,
        scope: 'common'
    },
    {
        id: 'counterfact',
        pattern: /контрфакт|counterfactual/i,
        title: 'Контрфакт',
        description: COUNTERFACT_DESCRIPTION,
        scope: 'common'
    },
    {
        id: 'active-equity',
        pattern: /active equity|active[-\s]?equity|активн(?:ая|ой)\s+equity/i,
        title: 'Active equity',
        description: ACTIVE_EQUITY_DESCRIPTION,
        aliases: ['active equity', 'active-equity'],
        priority: 150,
        scope: 'common'
    },
    {
        id: 'start-balance',
        pattern: /стартов(?:ый|ого)\s+баланс|start(?:ing)?\s+balance|StartCapital/i,
        title: 'Стартовый баланс',
        description: START_BALANCE_DESCRIPTION,
        aliases: ['стартовый баланс', 'StartCapital'],
        priority: 155,
        scope: 'common'
    },
    {
        id: 'start-cap',
        pattern: /\bStartCap\$?\b|StartCapital|стартов(?:ый|ого)\s+капитал/i,
        title: 'StartCap',
        description: START_CAP_DESCRIPTION,
        aliases: ['StartCap', 'StartCap$', 'стартовый капитал'],
        priority: 165,
        scope: 'common'
    },
    {
        id: 'withdrawn-profit',
        pattern: /выведенн(?:ая|ой)\s+прибыл(?:ь|и)|withdrawn/i,
        title: 'Выведенная прибыль',
        description: WITHDRAWN_PROFIT_DESCRIPTION,
        aliases: ['выведенная прибыль', 'withdrawn'],
        priority: 172,
        scope: 'common'
    },
    {
        id: 'margin-used',
        pattern: /\bMarginUsed\b|margin used|использованн(?:ая|ого)\s+марж(?:а|и)|использованн(?:ый|ого)\s+залог/i,
        title: 'MarginUsed',
        description: MARGIN_USED_DESCRIPTION,
        aliases: ['MarginUsed', 'margin used', 'использованная маржа'],
        priority: 165,
        scope: 'common'
    },
    {
        id: 'p90-quantile',
        pattern: /\bp90\b/i,
        title: 'p90',
        description: P90_QUANTILE_DESCRIPTION,
        aliases: ['p90'],
        priority: 180,
        scope: 'common'
    },
    {
        id: 'cap-policy',
        pattern: /cap[-\s]?политик(?:а|и|е)?|cap policy/i,
        title: 'cap-политика',
        description: CAP_POLICY_DESCRIPTION,
        aliases: ['cap-политика', 'cap-политики', 'cap policy'],
        priority: 170,
        scope: 'common'
    },
    {
        id: 'trace',
        pattern: /\btrace\b|трейс/i,
        title: 'trace',
        description: TRACE_DESCRIPTION,
        aliases: ['trace', 'трейс'],
        priority: 170,
        scope: 'common'
    },
    {
        id: 'current-balance',
        pattern: /текущ(?:ий|его)\s+баланс|current\s+balance|EquityNow/i,
        title: 'Текущий баланс',
        description: CURRENT_BALANCE_DESCRIPTION,
        aliases: ['текущий баланс', 'EquityNow'],
        priority: 155,
        scope: 'common'
    },
    {
        id: 'price-move',
        pattern: /ход\s+цены|движени[ея]\s+цены|price\s+move/i,
        title: 'Ход цены',
        description: PRICE_MOVE_DESCRIPTION,
        aliases: ['ход цены', 'price move'],
        priority: 150,
        scope: 'common'
    },
    {
        id: 'market-noise',
        pattern: /рыночн(?:ый|ого)\s+шум|market\s+noise/i,
        title: 'Рыночный шум',
        description: MARKET_NOISE_DESCRIPTION,
        aliases: ['рыночный шум', 'market noise'],
        priority: 150,
        scope: 'common'
    },
    {
        id: 'atr-indicator',
        pattern: /ATR(?:\s+индикатор)?|Average True Range/i,
        title: 'ATR индикатор',
        description: ATR_INDICATOR_DESCRIPTION,
        scope: 'common'
    },
    {
        id: 'rsi-indicator',
        pattern: /RSI(?:\s+индикатор)?|Relative Strength Index/i,
        title: 'RSI индикатор',
        description: RSI_INDICATOR_DESCRIPTION,
        scope: 'common'
    },
    {
        id: 'sma-50-btc',
        pattern: /SMA\s*50(?:\s+по\s+Bitcoin|\s+BTC)?|SMA50(?:\s*BTC)?/i,
        title: 'SMA 50 по Bitcoin',
        description: SMA_50_BTC_DESCRIPTION,
        scope: 'common'
    },
    {
        id: 'sma-200-btc',
        pattern: /SMA\s*200(?:\s+по\s+Bitcoin|\s+BTC)?|SMA200(?:\s*BTC)?/i,
        title: 'SMA 200 по Bitcoin',
        description: SMA_200_BTC_DESCRIPTION,
        scope: 'common'
    },
    {
        id: 'ema-50-sol',
        pattern: /EMA\s*50(?:\s+по\s+Solana|\s+SOL)?|EMA50(?:\s*SOL)?/i,
        title: 'EMA 50 по Solana',
        description: EMA_50_SOL_DESCRIPTION,
        scope: 'common'
    },
    {
        id: 'ema-200-btc-sol',
        pattern:
            /EMA\s*200(?:\s+по\s+(?:Bitcoin\/Solana|BTC\/SOL|Bitcoin|Solana|BTC|SOL))?|EMA200(?:\s*(?:BTC\/SOL|BTC|SOL))?/i,
        title: 'EMA 200 по Bitcoin/Solana',
        description: EMA_200_BTC_SOL_DESCRIPTION,
        scope: 'common'
    },
    {
        id: 'sma-indicator',
        pattern: /SMA(?:\s+индикатор)?|Simple Moving Average/i,
        title: 'SMA индикатор',
        description: SMA_INDICATOR_DESCRIPTION,
        scope: 'common'
    },
    {
        id: 'ema-indicator',
        pattern: /EMA(?:\s+индикатор)?|Exponential Moving Average/i,
        title: 'EMA индикатор',
        description: EMA_INDICATOR_DESCRIPTION,
        scope: 'common'
    },
    {
        id: 'min-move',
        pattern: /\bMinMove\b|min[-\s]?move|минимальн(?:ый|ого)\s+ход\s+цены/i,
        title: 'MinMove',
        description: MIN_MOVE_DESCRIPTION,
        scope: 'common'
    },
    {
        id: 'sl-prob',
        pattern: /\bSlProb\b|sl[_\s-]?prob|вероятност[ьи]\s+срабатывания\s+SL/i,
        title: 'SlProb',
        description: SL_PROB_DESCRIPTION,
        scope: 'common'
    },
    {
        id: 'regime-down-flag',
        pattern: /\bRegimeDownFlag\b|regime[_\s-]?down|нисходящ(?:ий|его)\s+режим/i,
        title: 'RegimeDownFlag',
        description: REGIME_DOWN_FLAG_DESCRIPTION,
        scope: 'common'
    },
    {
        id: 'filters',
        pattern: /фильтр|фильтры/i,
        title: 'Фильтры',
        description: FILTERS_DESCRIPTION,
        scope: 'common'
    },
    {
        id: 'no-direction',
        pattern: /\bno_direction\b|без направления|нет направления/i,
        title: 'no_direction',
        description: NO_DIRECTION_DESCRIPTION,
        scope: 'common'
    },
    {
        id: 'signal-direction',
        pattern: /направлени[ея]\s+сигнала|без направления/i,
        title: 'Направление сигнала',
        description: SIGNAL_DIRECTION_DESCRIPTION,
        scope: 'common'
    },
    {
        id: 'policy-skip',
        pattern: /\bpolicy[-_ ]skip\b/i,
        title: 'policy-skip',
        description: POLICY_SKIP_DESCRIPTION,
        scope: 'common'
    },
    {
        id: 'ultra-safe-regime-down',
        pattern: /\bultra_safe\.regime_down\b/i,
        title: 'ultra_safe.regime_down',
        description: ULTRA_SAFE_REGIME_DOWN_DESCRIPTION,
        scope: 'common'
    },
    {
        id: 'ultra-safe-sl-prob',
        pattern: /\bultra_safe\.sl_prob_gt_threshold\b|slprob/i,
        title: 'ultra_safe.sl_prob_gt_threshold',
        description: ULTRA_SAFE_SL_PROB_DESCRIPTION,
        scope: 'common'
    },
    {
        id: 'high-risk-day',
        pattern: /повышенн(?:ый|ого)\s+риск(?:а|ом)?(?:\s+дня)?|риск-?дн(?:я|и|ей)/i,
        title: 'Риск-день',
        description: HIGH_RISK_DAY_DESCRIPTION,
        scope: 'common'
    },
    {
        id: 'cap-fraction',
        pattern: /\bcap fraction\b|доля капитала на сделку/i,
        title: 'Cap fraction',
        description: CAP_FRACTION_DESCRIPTION,
        scope: 'common'
    },
    {
        id: 'cap-zero',
        pattern: /\bcap_zero\b|cap\s*=\s*0/i,
        title: 'cap_zero',
        description: CAP_ZERO_DESCRIPTION,
        scope: 'common'
    },
    {
        id: 'confidence-out-of-range',
        pattern: /\bconfidence_out_of_range\b|out_of_range/i,
        title: 'confidence_out_of_range',
        description: CONFIDENCE_OUT_OF_RANGE_DESCRIPTION,
        scope: 'common'
    },
    {
        id: 'low-edge',
        pattern: /\blow_edge\b/i,
        title: 'low_edge',
        description: LOW_EDGE_DESCRIPTION,
        scope: 'common'
    },
    {
        id: 'risk-throttle',
        pattern: /\brisk_throttle\b/i,
        title: 'risk_throttle',
        description: RISK_THROTTLE_DESCRIPTION,
        scope: 'common'
    },
    {
        id: 'bucket-dead-after-liq',
        pattern: /\bbucket_dead_after_liquidation\b/i,
        title: 'bucket_dead_after_liquidation',
        description: BUCKET_DEAD_AFTER_LIQ_DESCRIPTION,
        scope: 'common'
    },
    {
        id: 'anti-d-not-applied',
        pattern: /\banti_d_not_applied\b/i,
        title: 'anti_d_not_applied',
        description: ANTI_D_NOT_APPLIED_DESCRIPTION,
        scope: 'common'
    },
    {
        id: 'conf-bucket',
        pattern: /confBucket|confidence[-\s]?bucket|bucket samples|bucket win-?rate/i,
        title: 'confidence-bucket',
        description: CONF_BUCKET_DESCRIPTION,
        scope: 'common'
    }
]
