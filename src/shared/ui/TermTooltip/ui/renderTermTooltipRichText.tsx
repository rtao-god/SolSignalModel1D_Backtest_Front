import { ReactNode } from 'react'
import {
    ACTIVE_EQUITY_DESCRIPTION,
    ACCOUNT_RUIN_DESCRIPTION,
    ANTI_D_NOT_APPLIED_DESCRIPTION,
    ANTI_DIRECTION_DESCRIPTION,
    BACKTEST_DESCRIPTION,
    BRANCH_DESCRIPTION,
    DAILY_BUCKET_DESCRIPTION,
    DELAYED_BUCKET_DESCRIPTION,
    EXECUTED_AT_UTC_DESCRIPTION,
    BUCKET_DEAD_AFTER_LIQ_DESCRIPTION,
    BUCKET_DESCRIPTION,
    CAP_FRACTION_DESCRIPTION,
    CAP_ZERO_DESCRIPTION,
    CONF_BUCKET_DESCRIPTION,
    CONFIDENCE_OUT_OF_RANGE_DESCRIPTION,
    COUNTERFACT_DESCRIPTION,
    CROSS_MARGIN_DESCRIPTION,
    DELAYED_SIGNAL_DESCRIPTION,
    DRAWDOWN_DESCRIPTION,
    EOD_DESCRIPTION,
    FIRST_EVENT_DESCRIPTION,
    FUNDING_DESCRIPTION,
    HIGH_RISK_DAY_DESCRIPTION,
    INTRADAY_BUCKET_DESCRIPTION,
    ISOLATED_MARGIN_DESCRIPTION,
    LEVERAGE_DESCRIPTION,
    LIQUIDATION_DESCRIPTION,
    LOW_EDGE_DESCRIPTION,
    MARGIN_DESCRIPTION,
    MARKET_DESCRIPTION,
    MARKET_NOISE_DESCRIPTION,
    METRIC_VIEW_DESCRIPTION,
    MIN_MOVE_DESCRIPTION,
    NO_DIRECTION_DESCRIPTION,
    NO_SL_MODE_DESCRIPTION,
    NET_RETURN_PCT_DESCRIPTION,
    NET_PNL_USD_DESCRIPTION,
    PNL_DESCRIPTION,
    DD_DESCRIPTION,
    TP_SL_MODE_DESCRIPTION,
    PERCENTAGE_POINTS_DESCRIPTION,
    POLICY_DESCRIPTION,
    RATIO_CURVE_DESCRIPTION,
    REGIME_DOWN_FLAG_DESCRIPTION,
    REQ_GAIN_DESCRIPTION,
    RECOVERED_DESCRIPTION,
    RECOV_DAYS_DESCRIPTION,
    RISK_THROTTLE_DESCRIPTION,
    SIGNAL_DIRECTION_DESCRIPTION,
    SLIPPAGE_DESCRIPTION,
    SL_MODEL_DESCRIPTION,
    SL_MODE_TERM_DESCRIPTION,
    SL_PROB_DESCRIPTION,
    START_BALANCE_DESCRIPTION,
    TOTAL_PNL_DESCRIPTION,
    TOTAL_AGGREGATE_BUCKET_DESCRIPTION,
    TP_SL_DESCRIPTION,
    ULTRA_SAFE_REGIME_DOWN_DESCRIPTION,
    ULTRA_SAFE_SL_PROB_DESCRIPTION,
    WEALTH_PCT_DESCRIPTION,
    WHY_MIN_MOVE_DESCRIPTION,
    WHY_NO_SL_DESCRIPTION,
    WHY_FIRST_EVENT_DESCRIPTION,
    WHY_BUCKET_DESCRIPTION,
    WHY_WEEKENDS_DESCRIPTION,
    WITH_SL_MODE_DESCRIPTION,
    CURRENT_BALANCE_DESCRIPTION,
    DYNAMIC_TP_SL_DESCRIPTION,
    PRICE_MOVE_DESCRIPTION,
    EXPOSURE_DESCRIPTION,
    MARGIN_USED_DESCRIPTION,
    P90_QUANTILE_DESCRIPTION,
    CAP_POLICY_DESCRIPTION,
    TRACE_DESCRIPTION,
    START_CAP_DESCRIPTION,
    STATIC_TP_SL_DESCRIPTION,
    SHARPE_DESCRIPTION,
    SORTINO_DESCRIPTION,
    WITHDRAWN_PROFIT_DESCRIPTION,
    ZONAL_MODE_DESCRIPTION
} from '@/shared/consts/tooltipDomainTerms'
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
import TermTooltip from './TermTooltip'
import cls from './renderTermTooltipRichText.module.scss'
import {
    matchTermTooltips,
    normalizeComparableTerm,
    TermTooltipContextRule,
    TermTooltipRegistryEntry
} from '../lib/termTooltipMatcher'

interface InlineGlossaryRuleDraft {
    id: string
    pattern: RegExp
    description: ReactNode
    title?: string
    aliases?: string[]
    priority?: number
    contexts?: TermTooltipContextRule
    excludeSelf?: boolean
}

const POLICY_SKIP_DESCRIPTION: ReactNode = (
    <>
        policy-skip — policy-level запрет на вход, который срабатывает после проверки направления. В текущей реализации
        он применяется для UltraSafe и имеет две явные причины:{' '}
        <TermTooltip
            term='ultra_safe.regime_down'
            description={ULTRA_SAFE_REGIME_DOWN_DESCRIPTION}
            type='span'
            className={cls.inlineTerm}
        />{' '}
        и{' '}
        <TermTooltip
            term='ultra_safe.sl_prob_gt_threshold'
            description={ULTRA_SAFE_SL_PROB_DESCRIPTION}
            type='span'
            className={cls.inlineTerm}
        />
        .
    </>
)

const FILTERS_DESCRIPTION: ReactNode = (
    <>
        Фильтры — это проверки перед входом. Если любая проверка не пройдена, день становится no-trade. Основные причины
        в отчёте:{' '}
        <TermTooltip
            term='no_direction'
            description={NO_DIRECTION_DESCRIPTION}
            type='span'
            className={cls.inlineTerm}
        />
        ,{' '}
        <TermTooltip
            term='направление сигнала'
            description={SIGNAL_DIRECTION_DESCRIPTION}
            type='span'
            className={cls.inlineTerm}
        />
        ,{' '}
        <TermTooltip term='policy-skip' description={POLICY_SKIP_DESCRIPTION} type='span' className={cls.inlineTerm} />,{' '}
        <TermTooltip term='cap_zero' description={CAP_ZERO_DESCRIPTION} type='span' className={cls.inlineTerm} />,{' '}
        <TermTooltip
            term='повышенный риск дня'
            description={HIGH_RISK_DAY_DESCRIPTION}
            type='span'
            className={cls.inlineTerm}
        />
        ,{' '}
        <TermTooltip
            term='cap fraction'
            description={CAP_FRACTION_DESCRIPTION}
            type='span'
            className={cls.inlineTerm}
        />
        ,{' '}
        <TermTooltip
            term='confidence_out_of_range'
            description={CONFIDENCE_OUT_OF_RANGE_DESCRIPTION}
            type='span'
            className={cls.inlineTerm}
        />
        , <TermTooltip term='low_edge' description={LOW_EDGE_DESCRIPTION} type='span' className={cls.inlineTerm} />,{' '}
        <TermTooltip
            term='risk_throttle'
            description={RISK_THROTTLE_DESCRIPTION}
            type='span'
            className={cls.inlineTerm}
        />
        ,{' '}
        <TermTooltip
            term='bucket_dead_after_liquidation'
            description={BUCKET_DEAD_AFTER_LIQ_DESCRIPTION}
            type='span'
            className={cls.inlineTerm}
        />
        ,{' '}
        <TermTooltip
            term='anti_d_not_applied'
            description={ANTI_D_NOT_APPLIED_DESCRIPTION}
            type='span'
            className={cls.inlineTerm}
        />
        .
    </>
)

const POSITION_TOOLTIP_DESCRIPTION: ReactNode = (
    <>
        Позиция — открытая сделка.
        {'\n\n'}
        LONG — ставка на рост цены.
        {'\n\n'}
        SHORT — ставка на падение цены.
        {'\n\n'}
        Если <TermTooltip term='фильтры' description={FILTERS_DESCRIPTION} type='span' className={cls.inlineTerm} /> не
        пропускают день, позиция не открывается (no-trade).
    </>
)

const TERM_TOOLTIP_REGISTRY_DRAFT: InlineGlossaryRuleDraft[] = [
    {
        id: 'sl-mode-term',
        pattern: /SL Mode|режим\s+SL/i,
        title: 'SL Mode',
        description: SL_MODE_TERM_DESCRIPTION,
        aliases: ['SL Mode', 'режим SL'],
        priority: 140
    },
    {
        id: 'tp-sl-mode-term',
        pattern: /TP\/SL mode|режим\s+TP\/SL/i,
        title: 'TP/SL mode',
        description: TP_SL_MODE_DESCRIPTION,
        aliases: ['TP/SL mode', 'режим TP/SL'],
        priority: 140
    },
    {
        id: 'zonal-mode-term',
        pattern: /\bZONAL\b|with-zonal|without-zonal|зональн(?:ый|ого|ом)?\s+фильтр/i,
        title: 'ZONAL',
        description: ZONAL_MODE_DESCRIPTION,
        aliases: ['ZONAL', 'with-zonal', 'without-zonal', 'зональный фильтр'],
        priority: 110
    },
    {
        id: 'with-sl-mode',
        pattern: /\bWITH(?:[-‑_\s]+)SL\b/i,
        title: 'WITH-SL',
        description: WITH_SL_MODE_DESCRIPTION,
        aliases: ['WITH-SL', 'WITH SL'],
        priority: 160
    },
    {
        id: 'no-sl-mode',
        pattern: /\bNO(?:[-‑_\s]+)SL\b/i,
        title: 'NO-SL',
        description: NO_SL_MODE_DESCRIPTION,
        aliases: ['NO-SL', 'NO SL'],
        priority: 160
    },
    {
        id: 'total-pnl',
        pattern: /TotalPnl%|TotalPnlPct/i,
        title: 'TotalPnl%',
        description: TOTAL_PNL_DESCRIPTION
    },
    {
        id: 'wealth-pct',
        pattern: /Wealth%/i,
        title: 'Wealth%',
        description: WEALTH_PCT_DESCRIPTION
    },
    {
        id: 'percentage-points',
        pattern: /\bп\.п\.?/i,
        title: 'Процентные пункты',
        description: PERCENTAGE_POINTS_DESCRIPTION,
        aliases: ['п.п.', 'п.п', 'процентные пункты'],
        priority: 200
    },
    {
        id: 'backtest',
        pattern: /бэктест(?:е|а|у|ом|ы|ов|ам|ами|ах)?|backtest/i,
        title: 'Бэктест',
        description: BACKTEST_DESCRIPTION,
        aliases: ['бэктест', 'backtest'],
        priority: 175
    },
    {
        id: 'why-weekends',
        pattern: /Почему\?\s*\(выходные\)/i,
        title: 'Почему? (выходные)',
        description: WHY_WEEKENDS_DESCRIPTION
    },
    {
        id: 'why-bucket',
        pattern: /Почему\?\s*\(bucket\)/i,
        title: 'Почему? (bucket)',
        description: WHY_BUCKET_DESCRIPTION
    },
    {
        id: 'why-no-sl',
        pattern: /Почему\?\s*\(NO(?:[-‑\s]?SL)\)/i,
        title: 'Почему? (NO-SL)',
        description: WHY_NO_SL_DESCRIPTION
    },
    {
        id: 'why-first-event',
        pattern: /Почему\?\s*\(first[-‑\s]?event\)/i,
        title: 'Почему? (first-event)',
        description: WHY_FIRST_EVENT_DESCRIPTION
    },
    {
        id: 'why-min-move',
        pattern: /Почему\?\s*\(MinMove\)/i,
        title: 'Почему? (MinMove)',
        description: WHY_MIN_MOVE_DESCRIPTION
    },
    {
        id: 'sl-model',
        pattern: /SL(?:[-‑\s]?модел[а-яё]*)|\bsl[-‑\s]?model\b|SlHighDecision\b/i,
        title: 'SL-модель',
        description: SL_MODEL_DESCRIPTION,
        aliases: ['SL-модель', 'SL модель', 'sl model', 'SlHighDecision'],
        priority: 260
    },
    {
        id: 'anti-direction',
        pattern: /anti[-‑\s]?direction|анти-?направлен|инверси[яи]\s+направлени/i,
        title: 'anti-direction',
        description: ANTI_DIRECTION_DESCRIPTION,
        aliases: ['anti-direction', 'анти-направление', 'инверсия направления'],
        priority: 180
    },
    {
        id: 'dynamic-tp-sl',
        pattern:
            /\bDynTP\/SL\b|dynamic\s*TP\/SL|\bDYNAMIC\b|динам(?:ический|ические|ических|ическим)\s*TP\/SL|динам(?:ический|ическая)\s+режим/i,
        title: 'DYNAMIC',
        description: DYNAMIC_TP_SL_DESCRIPTION,
        aliases: ['DYNAMIC', 'DynTP/SL', 'dynamic TP/SL', 'Dynamic TP/SL'],
        priority: 240
    },
    {
        id: 'static-tp-sl',
        pattern:
            /\bStatTP\/SL\b|static\s*TP\/SL|\bSTATIC\b|стат(?:ический|ические|ических|ическим)\s*TP\/SL|стат(?:ический|ическая)\s+режим/i,
        title: 'STATIC',
        description: STATIC_TP_SL_DESCRIPTION,
        aliases: ['STATIC', 'StatTP/SL', 'static TP/SL', 'Static TP/SL'],
        priority: 240
    },
    {
        id: 'tp-sl-combined',
        pattern:
            /(?:тейк-?профит[а-яё]*|take-profit|\bTP\b)\s*(?:\([^)]*\))?\s*(?:\/|,|;|:|\s+и\s+)\s*(?:стоп-?лосс[а-яё]*|stop-loss|\bSL\b)\s*(?:\([^)]*\))?|(?:стоп-?лосс[а-яё]*|stop-loss|\bSL\b)\s*(?:\([^)]*\))?\s*(?:\/|,|;|:|\s+и\s+)\s*(?:тейк-?профит[а-яё]*|take-profit|\bTP\b)\s*(?:\([^)]*\))?|\bTP\/SL\b|\bSL\/TP\b/i,
        title: 'TP/SL',
        description: TP_SL_DESCRIPTION,
        aliases: ['TP/SL', 'SL/TP'],
        priority: 220
    },
    {
        id: 'net-pnl-usd',
        pattern: /\bNetPnl\$/i,
        title: 'NetPnl$',
        description: NET_PNL_USD_DESCRIPTION
    },
    {
        id: 'pnl',
        pattern: /\bPnL\b/i,
        title: 'PnL',
        description: PNL_DESCRIPTION,
        aliases: ['PnL'],
        priority: 170
    },
    {
        id: 'dd',
        pattern: /\bDD\b/i,
        title: 'DD',
        description: DD_DESCRIPTION,
        aliases: ['DD'],
        priority: 170
    },
    {
        id: 'net-return-pct',
        pattern: /\bNetReturnPct\b|\bNetReturnPc\b|чист(?:ая|ой)\s+доходност[ьи]\s+сделк[аи]/i,
        title: 'NetReturnPct',
        description: NET_RETURN_PCT_DESCRIPTION,
        aliases: ['NetReturnPct', 'NetReturnPc'],
        priority: 210
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
        }
    },
    {
        id: 'account-ruin',
        pattern: /AccRuin|account\s*ruin|руин[аы]?\s+(?:аккаунта|сч[её]та|бакета)/i,
        title: 'AccRuin',
        description: ACCOUNT_RUIN_DESCRIPTION
    },
    {
        id: 'recovered',
        pattern: /\bRecovered\b|восстановлен(?:ие|а|о)?/i,
        title: 'Recovered',
        description: RECOVERED_DESCRIPTION
    },
    {
        id: 'recov-days',
        pattern: /\bRecovDays\b|дней\s+до\s+восстановлен/i,
        title: 'RecovDays',
        description: RECOV_DAYS_DESCRIPTION
    },
    {
        id: 'req-gain',
        pattern: /\bReqGain%\b|\bReqGain\b|требуем(?:ый|ого)\s+рост/i,
        title: 'ReqGain%',
        description: REQ_GAIN_DESCRIPTION
    },
    {
        id: 'liquidation',
        pattern: /ликвидац|liquidation|HadLiq|RealLiq/i,
        title: 'Ликвидация',
        description: LIQUIDATION_DESCRIPTION
    },
    {
        id: 'isolated-margin',
        pattern: /isolated|изолированн(?:ая|ой)\s+марж/i,
        title: 'Isolated маржа',
        description: ISOLATED_MARGIN_DESCRIPTION
    },
    {
        id: 'cross-margin',
        pattern: /\bcross\b|кросс-?марж/i,
        title: 'Cross маржа',
        description: CROSS_MARGIN_DESCRIPTION
    },
    {
        id: 'leverage',
        pattern: /плечо|leverage/i,
        title: 'Плечо',
        description: LEVERAGE_DESCRIPTION
    },
    {
        id: 'margin',
        pattern: /маржа|залог/i,
        title: 'Маржа',
        description: MARGIN_DESCRIPTION
    },
    {
        id: 'position',
        pattern: /(?<![A-Za-zА-Яа-яЁё0-9_])(?:LONG|SHORT|позиц(?:ия|ии|ию|ией|иями|иях|иям))(?![A-Za-zА-Яа-яЁё0-9_])/i,
        title: 'Позиция',
        description: POSITION_TOOLTIP_DESCRIPTION
    },
    {
        id: 'exposure',
        pattern: /экспозици(?:я|и|ю|ей|ями|ях)|Exposure%?|high exposure/i,
        title: 'Экспозиция',
        description: EXPOSURE_DESCRIPTION,
        aliases: ['экспозиция', 'Exposure', 'Exposure%'],
        priority: 145
    },
    {
        id: 'drawdown',
        pattern: /просадк|MaxDD|DD70/i,
        title: 'Просадка',
        description: DRAWDOWN_DESCRIPTION
    },
    {
        id: 'ratio-curve',
        pattern: /ratio[-‑\s]?крив|ratio[-‑\s]?curve|ratio[-‑\s]?series/i,
        title: 'ratio-кривая',
        description: RATIO_CURVE_DESCRIPTION,
        aliases: ['ratio-кривая', 'ratio curve'],
        priority: 176
    },
    {
        id: 'sharpe-ratio',
        pattern: /\bSharpe\b|коэффиц(?:иент)?\s+шарпа/i,
        title: 'Sharpe',
        description: SHARPE_DESCRIPTION,
        aliases: ['Sharpe', 'коэффициент Шарпа'],
        priority: 176
    },
    {
        id: 'sortino-ratio',
        pattern: /\bSortino\b|коэффиц(?:иент)?\s+сортино/i,
        title: 'Sortino',
        description: SORTINO_DESCRIPTION,
        aliases: ['Sortino', 'коэффициент Сортино'],
        priority: 176
    },
    {
        id: 'policy',
        pattern: /\bpolicy\b/i,
        title: 'Policy',
        description: POLICY_DESCRIPTION
    },
    {
        id: 'branch',
        pattern: /\bbranch\b|\bANTI-D\b|\bBASE\b/i,
        title: 'Branch',
        description: BRANCH_DESCRIPTION
    },
    {
        id: 'bucket-daily',
        pattern: /\bdaily bucket\b|бакет\s+daily/i,
        title: 'daily bucket',
        description: DAILY_BUCKET_DESCRIPTION
    },
    {
        id: 'bucket-intraday',
        pattern: /\bintraday bucket\b|бакет\s+intraday/i,
        title: 'intraday bucket',
        description: INTRADAY_BUCKET_DESCRIPTION
    },
    {
        id: 'bucket-delayed',
        pattern: /\bdelayed bucket\b|бакет\s+delayed/i,
        title: 'delayed bucket',
        description: DELAYED_BUCKET_DESCRIPTION
    },
    {
        id: 'executed-at-utc',
        pattern: /\bExecutedAtUtc\b/i,
        title: 'ExecutedAtUtc',
        description: EXECUTED_AT_UTC_DESCRIPTION,
        aliases: ['ExecutedAtUtc'],
        priority: 260
    },
    {
        id: 'delayed-signal',
        pattern: /delayed[-‑\s]?сигнал|delayed signal|DelayedExecution/i,
        title: 'delayed-сигнал',
        description: DELAYED_SIGNAL_DESCRIPTION
    },
    {
        id: 'bucket-total-aggregate',
        pattern: /\btotal aggregate\b|total-aggregate|агрегат\s+всех\s+бакетов/i,
        title: 'total aggregate',
        description: TOTAL_AGGREGATE_BUCKET_DESCRIPTION
    },
    {
        id: 'bucket',
        pattern: /\bbucket\b|бакет/i,
        title: 'Bucket',
        description: BUCKET_DESCRIPTION
    },
    {
        id: 'metric-view',
        pattern: /metric view|режим метрик|no biggest liq loss/i,
        title: 'Metric View',
        description: METRIC_VIEW_DESCRIPTION
    },
    {
        id: 'funding',
        pattern: /funding|фандинг/i,
        title: 'Funding',
        description: FUNDING_DESCRIPTION
    },
    {
        id: 'slippage',
        pattern: /проскальзывани|slippage|price impact/i,
        title: 'Проскальзывание',
        description: SLIPPAGE_DESCRIPTION
    },
    {
        id: 'eod',
        pattern: /EndOfDay|end[-‑\s]?of[-‑\s]?day|\bEOD\b/i,
        title: 'EOD (EndOfDay)',
        description: EOD_DESCRIPTION,
        aliases: ['EndOfDay', 'EOD', 'end of day'],
        priority: 130
    },
    {
        id: 'first-event',
        pattern: /first[-‑\s]?event|first event|цепочк[аи]\s+событий/i,
        title: 'first-event',
        description: FIRST_EVENT_DESCRIPTION,
        aliases: ['first-event', 'first event', 'first-event цепочка'],
        priority: 170
    },
    {
        id: 'counterfact',
        pattern: /контрфакт|counterfactual/i,
        title: 'Контрфакт',
        description: COUNTERFACT_DESCRIPTION
    },
    {
        id: 'market',
        pattern: /рынок|рынка|рынке/i,
        title: 'Рынок',
        description: MARKET_DESCRIPTION
    },
    {
        id: 'active-equity',
        pattern: /active equity|active[-\s]?equity|активн(?:ая|ой)\s+equity/i,
        title: 'Active equity',
        description: ACTIVE_EQUITY_DESCRIPTION,
        aliases: ['active equity', 'active-equity'],
        priority: 150
    },
    {
        id: 'start-balance',
        pattern: /стартов(?:ый|ого)\s+баланс|start(?:ing)?\s+balance|StartCapital/i,
        title: 'Стартовый баланс',
        description: START_BALANCE_DESCRIPTION,
        aliases: ['стартовый баланс', 'StartCapital'],
        priority: 155
    },
    {
        id: 'start-cap',
        pattern: /\bStartCap\$?\b|StartCapital|стартов(?:ый|ого)\s+капитал/i,
        title: 'StartCap',
        description: START_CAP_DESCRIPTION,
        aliases: ['StartCap', 'StartCap$', 'стартовый капитал'],
        priority: 165
    },
    {
        id: 'withdrawn-profit',
        pattern: /выведенн(?:ая|ой)\s+прибыл(?:ь|и)|withdrawn/i,
        title: 'Выведенная прибыль',
        description: WITHDRAWN_PROFIT_DESCRIPTION,
        aliases: ['выведенная прибыль', 'withdrawn'],
        priority: 172
    },
    {
        id: 'margin-used',
        pattern: /\bMarginUsed\b|margin used|использованн(?:ая|ого)\s+марж(?:а|и)|использованн(?:ый|ого)\s+залог/i,
        title: 'MarginUsed',
        description: MARGIN_USED_DESCRIPTION,
        aliases: ['MarginUsed', 'margin used', 'использованная маржа'],
        priority: 165
    },
    {
        id: 'p90-quantile',
        pattern: /\bp90\b/i,
        title: 'p90',
        description: P90_QUANTILE_DESCRIPTION,
        aliases: ['p90'],
        priority: 180
    },
    {
        id: 'cap-policy',
        pattern: /cap[-\s]?политик(?:а|и|е)?|cap policy/i,
        title: 'cap-политика',
        description: CAP_POLICY_DESCRIPTION,
        aliases: ['cap-политика', 'cap-политики', 'cap policy'],
        priority: 170
    },
    {
        id: 'trace',
        pattern: /\btrace\b|трейс/i,
        title: 'trace',
        description: TRACE_DESCRIPTION,
        aliases: ['trace', 'трейс'],
        priority: 170
    },
    {
        id: 'current-balance',
        pattern: /текущ(?:ий|его)\s+баланс|current\s+balance|EquityNow/i,
        title: 'Текущий баланс',
        description: CURRENT_BALANCE_DESCRIPTION,
        aliases: ['текущий баланс', 'EquityNow'],
        priority: 155
    },
    {
        id: 'price-move',
        pattern: /ход\s+цены|движени[ея]\s+цены|price\s+move/i,
        title: 'Ход цены',
        description: PRICE_MOVE_DESCRIPTION,
        aliases: ['ход цены', 'price move'],
        priority: 150
    },
    {
        id: 'market-noise',
        pattern: /рыночн(?:ый|ого)\s+шум|market\s+noise/i,
        title: 'Рыночный шум',
        description: MARKET_NOISE_DESCRIPTION,
        aliases: ['рыночный шум', 'market noise'],
        priority: 150
    },
    {
        id: 'atr-indicator',
        pattern: /ATR(?:\s+индикатор)?|Average True Range/i,
        title: 'ATR индикатор',
        description: ATR_INDICATOR_DESCRIPTION
    },
    {
        id: 'rsi-indicator',
        pattern: /RSI(?:\s+индикатор)?|Relative Strength Index/i,
        title: 'RSI индикатор',
        description: RSI_INDICATOR_DESCRIPTION
    },
    {
        id: 'sma-50-btc',
        pattern: /SMA\s*50(?:\s+по\s+Bitcoin|\s+BTC)?|SMA50(?:\s*BTC)?/i,
        title: 'SMA 50 по Bitcoin',
        description: SMA_50_BTC_DESCRIPTION
    },
    {
        id: 'sma-200-btc',
        pattern: /SMA\s*200(?:\s+по\s+Bitcoin|\s+BTC)?|SMA200(?:\s*BTC)?/i,
        title: 'SMA 200 по Bitcoin',
        description: SMA_200_BTC_DESCRIPTION
    },
    {
        id: 'ema-50-sol',
        pattern: /EMA\s*50(?:\s+по\s+Solana|\s+SOL)?|EMA50(?:\s*SOL)?/i,
        title: 'EMA 50 по Solana',
        description: EMA_50_SOL_DESCRIPTION
    },
    {
        id: 'ema-200-btc-sol',
        pattern:
            /EMA\s*200(?:\s+по\s+(?:Bitcoin\/Solana|BTC\/SOL|Bitcoin|Solana|BTC|SOL))?|EMA200(?:\s*(?:BTC\/SOL|BTC|SOL))?/i,
        title: 'EMA 200 по Bitcoin/Solana',
        description: EMA_200_BTC_SOL_DESCRIPTION
    },
    {
        id: 'sma-indicator',
        pattern: /SMA(?:\s+индикатор)?|Simple Moving Average/i,
        title: 'SMA индикатор',
        description: SMA_INDICATOR_DESCRIPTION
    },
    {
        id: 'ema-indicator',
        pattern: /EMA(?:\s+индикатор)?|Exponential Moving Average/i,
        title: 'EMA индикатор',
        description: EMA_INDICATOR_DESCRIPTION
    },
    {
        id: 'min-move',
        pattern: /\bMinMove\b|min[-\s]?move|минимальн(?:ый|ого)\s+ход\s+цены/i,
        title: 'MinMove',
        description: MIN_MOVE_DESCRIPTION
    },
    {
        id: 'sl-prob',
        pattern: /\bSlProb\b|sl[_\s-]?prob|вероятност[ьи]\s+срабатывания\s+SL/i,
        title: 'SlProb',
        description: SL_PROB_DESCRIPTION
    },
    {
        id: 'regime-down-flag',
        pattern: /\bRegimeDownFlag\b|regime[_\s-]?down|нисходящ(?:ий|его)\s+режим/i,
        title: 'RegimeDownFlag',
        description: REGIME_DOWN_FLAG_DESCRIPTION
    },
    {
        id: 'filters',
        pattern: /фильтр|фильтры/i,
        title: 'Фильтры',
        description: FILTERS_DESCRIPTION
    },
    {
        id: 'no-direction',
        pattern: /\bno_direction\b|без направления|нет направления/i,
        title: 'no_direction',
        description: NO_DIRECTION_DESCRIPTION
    },
    {
        id: 'signal-direction',
        pattern: /направлени[ея]\s+сигнала|без направления/i,
        title: 'Направление сигнала',
        description: SIGNAL_DIRECTION_DESCRIPTION
    },
    {
        id: 'policy-skip',
        pattern: /\bpolicy[-_ ]skip\b/i,
        title: 'policy-skip',
        description: POLICY_SKIP_DESCRIPTION
    },
    {
        id: 'ultra-safe-regime-down',
        pattern: /\bultra_safe\.regime_down\b/i,
        title: 'ultra_safe.regime_down',
        description: ULTRA_SAFE_REGIME_DOWN_DESCRIPTION
    },
    {
        id: 'ultra-safe-sl-prob',
        pattern: /\bultra_safe\.sl_prob_gt_threshold\b|slprob/i,
        title: 'ultra_safe.sl_prob_gt_threshold',
        description: ULTRA_SAFE_SL_PROB_DESCRIPTION
    },
    {
        id: 'high-risk-day',
        pattern: /повышенн(?:ый|ого)\s+риск(?:а|ом)?(?:\s+дня)?|риск-?дн(?:я|и|ей)/i,
        title: 'Риск-день',
        description: HIGH_RISK_DAY_DESCRIPTION
    },
    {
        id: 'cap-fraction',
        pattern: /\bcap fraction\b|доля капитала на сделку/i,
        title: 'Cap fraction',
        description: CAP_FRACTION_DESCRIPTION
    },
    {
        id: 'cap-zero',
        pattern: /\bcap_zero\b|cap\s*=\s*0/i,
        title: 'cap_zero',
        description: CAP_ZERO_DESCRIPTION
    },
    {
        id: 'confidence-out-of-range',
        pattern: /\bconfidence_out_of_range\b|out_of_range/i,
        title: 'confidence_out_of_range',
        description: CONFIDENCE_OUT_OF_RANGE_DESCRIPTION
    },
    {
        id: 'low-edge',
        pattern: /\blow_edge\b/i,
        title: 'low_edge',
        description: LOW_EDGE_DESCRIPTION
    },
    {
        id: 'risk-throttle',
        pattern: /\brisk_throttle\b/i,
        title: 'risk_throttle',
        description: RISK_THROTTLE_DESCRIPTION
    },
    {
        id: 'bucket-dead-after-liq',
        pattern: /\bbucket_dead_after_liquidation\b/i,
        title: 'bucket_dead_after_liquidation',
        description: BUCKET_DEAD_AFTER_LIQ_DESCRIPTION
    },
    {
        id: 'anti-d-not-applied',
        pattern: /\banti_d_not_applied\b/i,
        title: 'anti_d_not_applied',
        description: ANTI_D_NOT_APPLIED_DESCRIPTION
    },
    {
        id: 'conf-bucket',
        pattern: /confBucket|confidence[-\s]?bucket|bucket samples|bucket win-?rate/i,
        title: 'confidence-bucket',
        description: CONF_BUCKET_DESCRIPTION
    }
]

function buildDefaultAliases(rule: InlineGlossaryRuleDraft): string[] {
    const aliases = new Set<string>()

    if (rule.title) {
        aliases.add(rule.title)
    }

    if (rule.aliases) {
        rule.aliases.forEach(alias => {
            if (alias && alias.trim().length > 0) {
                aliases.add(alias)
            }
        })
    }

    return [...aliases]
}

const TERM_TOOLTIP_REGISTRY: TermTooltipRegistryEntry[] = TERM_TOOLTIP_REGISTRY_DRAFT.map(rule => ({
    id: rule.id,
    title: rule.title,
    description: rule.description,
    aliases: buildDefaultAliases(rule),
    priority: rule.priority ?? 100,
    contexts: rule.contexts,
    excludeSelf: rule.excludeSelf ?? true,
    pattern: rule.pattern
}))

const TERM_TOOLTIP_REGISTRY_BY_ID = new Map(TERM_TOOLTIP_REGISTRY.map(rule => [rule.id, rule]))

interface RenderTermTooltipRichTextOptions {
    excludeTerms?: string[]
    excludeRuleIds?: string[]
    excludeRuleTitles?: string[]
    recursionDepth?: number
    maxRecursionDepth?: number
}

function normalizeOrderedListParagraphs(text: string): string {
    let next = text

    // ".... 1) ... 2) ..." -> каждый пункт с новой строки и пустой строкой между пунктами.
    // Важно: не разбиваем "0)" (например в диапазонах/идентификаторах), чтобы не появлялись лишние абзацы.
    next = next.replace(/([^\n])\s+([1-9]\d*\))/g, '$1\n\n$2')
    // "... \n2) ..." -> добавляем пустую строку перед пунктом, если её нет.
    next = next.replace(/([^\n])\n([1-9]\d*\))/g, '$1\n\n$2')
    // ".... Пример: ..." -> переносим пример в отдельный абзац.
    next = next.replace(/([^\n])\s+(Пример:)/g, '$1\n\n$2')
    // ".... Ориентир чтения: ..." -> отдельный абзац для блока интерпретации.
    next = next.replace(/([^\n])\s+(Ориентир чтения:)/g, '$1\n\n$2')
    // ".... Как читать: ..." -> отдельный абзац для читаемости.
    next = next.replace(/([^\n])\s+(Как читать:)/g, '$1\n\n$2')
    // ".... true:/false: ..." -> отдельные смысловые блоки.
    next = next.replace(/([^\n])\s+(true:|false:)/g, '$1\n\n$2')

    return next
}

interface ExplicitTermMarkupSegmentText {
    type: 'text'
    value: string
}

interface ExplicitTermMarkupSegmentTerm {
    type: 'term'
    termId: string
    label: string
}

type ExplicitTermMarkupSegment = ExplicitTermMarkupSegmentText | ExplicitTermMarkupSegmentTerm

function parseExplicitTermMarkupSegments(text: string): ExplicitTermMarkupSegment[] {
    const pattern = /\[\[([a-z0-9_-]+)\|([^\]]+)\]\]/gi
    const segments: ExplicitTermMarkupSegment[] = []

    let lastIndex = 0
    let next = pattern.exec(text)

    while (next) {
        const full = next[0] ?? ''
        const termId = next[1]?.trim() ?? ''
        const label = next[2]?.trim() ?? ''
        const start = next.index ?? 0

        if (start > lastIndex) {
            segments.push({
                type: 'text',
                value: text.slice(lastIndex, start)
            })
        }

        if (termId && label) {
            segments.push({
                type: 'term',
                termId,
                label
            })
        } else if (full) {
            segments.push({
                type: 'text',
                value: full
            })
        }

        lastIndex = start + full.length
        next = pattern.exec(text)
    }

    if (lastIndex < text.length) {
        segments.push({
            type: 'text',
            value: text.slice(lastIndex)
        })
    }

    return segments.length > 0 ? segments : [{ type: 'text', value: text }]
}

function resolveRegistryForRender(
    excludedRuleIds: Set<string>,
    excludedRuleTitles: Set<string>
): TermTooltipRegistryEntry[] {
    const excludedIds = new Set(excludedRuleIds)

    if (excludedRuleTitles.size > 0) {
        TERM_TOOLTIP_REGISTRY.forEach(rule => {
            if (!rule.title) {
                return
            }

            const normalizedTitle = normalizeComparableTerm(rule.title)
            if (normalizedTitle && excludedRuleTitles.has(normalizedTitle)) {
                excludedIds.add(rule.id)
            }
        })
    }

    return TERM_TOOLTIP_REGISTRY.filter(rule => !excludedIds.has(rule.id))
}

function buildNestedDescription(
    rule: TermTooltipRegistryEntry,
    matchedValue: string,
    excludedRuleIds: Set<string>,
    recursionDepth: number,
    maxRecursionDepth: number
): ReactNode {
    if (typeof rule.description !== 'string' || recursionDepth >= maxRecursionDepth) {
        return rule.description
    }

    const selfExclusions = [matchedValue]
    if (rule.title) {
        selfExclusions.push(rule.title)
    }

    return renderTermTooltipRichText(rule.description, {
        excludeTerms: selfExclusions,
        excludeRuleIds: [...excludedRuleIds, rule.id],
        excludeRuleTitles: rule.title ? [rule.title] : [],
        recursionDepth: recursionDepth + 1,
        maxRecursionDepth
    })
}

function renderAutolinkedTextSegment(
    text: string,
    registry: TermTooltipRegistryEntry[],
    excludedTerms: Set<string>,
    excludedRuleIds: Set<string>,
    recursionDepth: number,
    maxRecursionDepth: number,
    keyPrefix: string
): ReactNode[] {
    const matches = matchTermTooltips(text, registry, excludedRuleIds, excludedTerms)
    if (matches.length === 0) {
        return [text]
    }

    const nodes: ReactNode[] = []
    let cursor = 0

    matches.forEach((match, index) => {
        if (match.start > cursor) {
            nodes.push(text.slice(cursor, match.start))
        }

        const nestedDescription = buildNestedDescription(
            match.rule,
            match.value,
            excludedRuleIds,
            recursionDepth,
            maxRecursionDepth
        )

        nodes.push(
            <TermTooltip
                key={`${keyPrefix}-${match.rule.id}-${index}-${match.start}`}
                term={match.value}
                tooltipTitle={match.rule.title}
                description={nestedDescription}
                type='span'
                className={cls.inlineTerm}
            />
        )

        cursor = match.end
    })

    if (cursor < text.length) {
        nodes.push(text.slice(cursor))
    }

    return nodes
}

interface MatcherFixture {
    id: string
    text: string
    expectedRuleIds: string[]
}

const TERM_TOOLTIP_MATCHER_FIXTURES: MatcherFixture[] = [
    {
        id: 'sl-model-priority',
        text: 'день помечен как риск-день по SL-модели',
        expectedRuleIds: ['sl-model']
    },
    {
        id: 'percentage-points',
        text: 'цена улучшения — 4 п.п. доходности',
        expectedRuleIds: ['percentage-points']
    },
    {
        id: 'first-event',
        text: 'выход по first-event цепочке',
        expectedRuleIds: ['first-event']
    },
    {
        id: 'tp-sl-mode',
        text: 'TP/SL mode — фильтр по типу уровней выхода',
        expectedRuleIds: ['tp-sl-mode-term']
    },
    {
        id: 'exposure-not-position',
        text: 'рост экспозиции увеличивает хвостовой риск',
        expectedRuleIds: ['exposure']
    },
    {
        id: 'dynamic-tp-sl-priority',
        text: 'DynTP/SL PnL% зависит от числа dynamic-сделок',
        expectedRuleIds: ['dynamic-tp-sl']
    },
    {
        id: 'executed-at-utc',
        text: 'вход открылся в момент ExecutedAtUtc',
        expectedRuleIds: ['executed-at-utc']
    },
    {
        id: 'why-first-event',
        text: 'Почему? (first-event)',
        expectedRuleIds: ['why-first-event']
    },
    {
        id: 'why-bucket',
        text: 'Почему? (bucket)',
        expectedRuleIds: ['why-bucket']
    }
]

let didValidateMatcherFixtures = false

function validateMatcherFixturesOrThrow(): void {
    if (didValidateMatcherFixtures) {
        return
    }

    TERM_TOOLTIP_MATCHER_FIXTURES.forEach(fixture => {
        const found = matchTermTooltips(fixture.text, TERM_TOOLTIP_REGISTRY, new Set<string>(), new Set<string>()).map(
            match => match.rule.id
        )

        const missing = fixture.expectedRuleIds.filter(expected => !found.includes(expected))
        if (missing.length > 0) {
            throw new Error(
                `[term-tooltip] matcher fixture failed: ${fixture.id}. Missing rules: ${missing.join(', ')}. Found: ${found.join(', ')}.`
            )
        }
    })

    didValidateMatcherFixtures = true
}

export function renderTermTooltipRichText(text: string, options?: RenderTermTooltipRichTextOptions): ReactNode {
    if (!text || text.trim().length === 0) {
        return text
    }

    if (import.meta.env.DEV) {
        validateMatcherFixturesOrThrow()
    }

    const normalizedText = normalizeOrderedListParagraphs(text)

    const excludedTerms = new Set(
        (options?.excludeTerms ?? []).map(item => normalizeComparableTerm(item)).filter(item => item.length > 0)
    )
    const excludedRuleIds = new Set(
        (options?.excludeRuleIds ?? []).map(item => item.trim()).filter(item => item.length > 0)
    )
    const excludedRuleTitles = new Set(
        (options?.excludeRuleTitles ?? []).map(item => normalizeComparableTerm(item)).filter(item => item.length > 0)
    )
    const recursionDepth = options?.recursionDepth ?? 0
    const maxRecursionDepth = options?.maxRecursionDepth ?? 2

    const registry = resolveRegistryForRender(excludedRuleIds, excludedRuleTitles)
    const segments = parseExplicitTermMarkupSegments(normalizedText)
    const nodes: ReactNode[] = []
    let segmentKey = 0

    segments.forEach(segment => {
        if (segment.type === 'term') {
            const rule = TERM_TOOLTIP_REGISTRY_BY_ID.get(segment.termId)
            if (!rule || excludedRuleIds.has(rule.id)) {
                nodes.push(segment.label)
                return
            }

            const nestedDescription = buildNestedDescription(
                rule,
                segment.label,
                excludedRuleIds,
                recursionDepth,
                maxRecursionDepth
            )

            nodes.push(
                <TermTooltip
                    key={`explicit-${rule.id}-${segmentKey}`}
                    term={segment.label}
                    tooltipTitle={rule.title}
                    description={nestedDescription}
                    type='span'
                    className={cls.inlineTerm}
                />
            )
            segmentKey += 1
            return
        }

        if (!segment.value) {
            return
        }

        nodes.push(
            ...renderAutolinkedTextSegment(
                segment.value,
                registry,
                excludedTerms,
                excludedRuleIds,
                recursionDepth,
                maxRecursionDepth,
                `segment-${segmentKey}`
            )
        )
        segmentKey += 1
    })

    return <>{nodes}</>
}
