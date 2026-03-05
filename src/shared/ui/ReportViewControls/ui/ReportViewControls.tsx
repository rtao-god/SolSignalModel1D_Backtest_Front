import classNames from '@/shared/lib/helpers/classNames'
import { Btn, TermTooltip, Text, TpSlModeToggle } from '@/shared/ui'
import { enrichTermTooltipDescription } from '@/shared/ui/TermTooltip'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type {
    PolicyBranchMegaBucketMode,
    PolicyBranchMegaMetricMode,
    PolicyBranchMegaSlMode,
    PolicyBranchMegaTpSlMode,
    PolicyBranchMegaZonalMode
} from '@/shared/utils/policyBranchMegaTabs'
import type { ReportViewCapabilities } from '@/shared/utils/reportViewCapabilities'
import cls from './ReportViewControls.module.scss'

interface ReportViewControlsProps {
    bucket: PolicyBranchMegaBucketMode
    metric: PolicyBranchMegaMetricMode
    tpSlMode: PolicyBranchMegaTpSlMode
    slMode?: PolicyBranchMegaSlMode
    zonalMode?: PolicyBranchMegaZonalMode
    capabilities: ReportViewCapabilities
    onBucketChange: (next: PolicyBranchMegaBucketMode) => void
    onMetricChange: (next: PolicyBranchMegaMetricMode) => void
    onTpSlModeChange: (next: PolicyBranchMegaTpSlMode) => void
    onSlModeChange?: (next: PolicyBranchMegaSlMode) => void
    onZonalModeChange?: (next: PolicyBranchMegaZonalMode) => void
    metricDiffMessage?: string | null
    className?: string
}

interface ControlOption {
    value: string
    label: LocalizedText
    tooltip: LocalizedText
    tooltipExcludeTerms?: string[]
    tooltipExcludeRuleIds?: string[]
}

type UiLocale = 'ru' | 'en'

interface LocalizedText {
    ru: string
    en: string
}

function resolveUiLocale(language: string | null | undefined): UiLocale {
    const normalized = (language ?? '').trim().toLowerCase()
    return normalized.startsWith('ru') ? 'ru' : 'en'
}

function resolveLocalizedText(text: LocalizedText, locale: UiLocale): string {
    return locale === 'ru' ? text.ru : text.en
}

const BUCKET_OPTIONS: Array<ControlOption & { value: PolicyBranchMegaBucketMode }> = [
    {
        value: 'daily',
        label: {
            ru: 'Daily',
            en: 'Daily'
        },
        tooltip: {
            ru: 'Показываются только сделки [[bucket-daily|daily bucket]].\n\nКак работает:\nв торговый день допускается только одна daily-сделка.\n\nВыход:\n[[first-event|first-event]] (liquidation -> stop-loss -> take-profit) или [[eod|EndOfDay]], если уровни не задеты.\n\nПример:\nесли закрытие произошло в 11:20, повторного daily-входа в этот день не будет.',
            en: 'Shows only daily bucket trades.\n\nEngine behavior: one entry per trading day with first-event exit (liquidation -> stop-loss -> take-profit -> EndOfDay).\n\nExample: if the daily trade closes by TP at 11:20, there is no second daily entry on the same day.'
        },
        tooltipExcludeRuleIds: ['bucket-daily', 'bucket']
    },
    {
        value: 'intraday',
        label: {
            ru: 'Intraday',
            en: 'Intraday'
        },
        tooltip: {
            ru: 'Показываются только сделки [[bucket-intraday|intraday bucket]].\n\nКак работает:\nпосле закрытия сделки возможен новый вход со следующей минуты, пока не наступил [[eod|EndOfDay]] и бакет не остановлен.\n\nВажно:\nнаправление, плечо и доля капитала задаются один раз на день; внутри дня прогноз по минутам не пересчитывается.\n\nПример:\nвыход в 10:17 -> следующий intraday-вход возможен с 10:18.',
            en: 'Shows only intraday bucket trades.\n\nEngine behavior: re-entries are allowed during the day; after a close, next entry can open from the next minute until EndOfDay unless bucket is stopped.\n\nImportant: direction/leverage/cap fraction are fixed once per day before the trade loop; forecast is not recalculated minute-by-minute.\n\nExample: exit at 10:17 -> next entry can open from 10:18.'
        },
        tooltipExcludeRuleIds: ['bucket-intraday', 'bucket']
    },
    {
        value: 'delayed',
        label: {
            ru: 'Delayed',
            en: 'Delayed'
        },
        tooltip: {
            ru: 'Показываются только сделки [[bucket-delayed|delayed bucket]].\n\nКак работает:\nсделка появляется только если [[delayed-signal|delayed-сигнал]] реально исполнился внутри дня.\n\nТочка входа фиксируется во времени [[executed-at-utc|ExecutedAtUtc]].\n\nПример:\nесли сигнал не исполнился, delayed bucket за этот день не содержит сделку.',
            en: 'Shows only delayed bucket trades.\n\nEngine behavior: a trade appears only when delayed signal is actually executed inside the day; entry opens at ExecutedAtUtc.\n\nExample: if delayed signal was not executed, delayed bucket has no trade for that day.'
        },
        tooltipExcludeRuleIds: ['bucket-delayed', 'bucket']
    },
    {
        value: 'total',
        label: {
            ru: 'Σ Все бакеты',
            en: 'Σ All buckets'
        },
        tooltip: {
            ru: 'Показывается [[bucket-total-aggregate|total aggregate]]: сумма результатов daily + intraday + delayed.\n\nЭто не отдельный четвёртый bucket и не отдельная стратегия исполнения.\n\nПример:\nитоговый [[pnl|PnL]] total складывается из трёх независимых бакетов.',
            en: 'Shows total aggregate: sum of daily + intraday + delayed metrics.\n\nThis is not a separate fourth bucket and not an independent execution strategy.\n\nExample: total PnL is the sum of three independent bucket results.'
        },
        tooltipExcludeRuleIds: ['bucket-total-aggregate', 'bucket']
    }
]

const METRIC_OPTIONS: Array<ControlOption & { value: PolicyBranchMegaMetricMode }> = [
    {
        value: 'real',
        label: {
            ru: 'REAL',
            en: 'REAL'
        },
        tooltip: {
            ru: 'Фактический результат симуляции без контрфактических изменений.',
            en: 'Actual simulation result without counterfactual adjustments.'
        }
    },
    {
        value: 'no-biggest-liq-loss',
        label: {
            ru: 'NO BIGGEST LIQ LOSS',
            en: 'NO BIGGEST LIQ LOSS'
        },
        tooltip: {
            ru: 'Контрфакт: из расчёта убирается одна самая убыточная ликвидационная сделка (по [[net-pnl-usd|NetPnl$]]).\n\nПосле удаления пересчитываются [[pnl|PnL]] и [[dd|DD]].\n\nНазначение: анализ хвостового риска. Это не реальный итог.',
            en: 'Counterfactual mode: removes one worst liquidation trade (by NetPnl$) from calculation.\n\nPurpose: tail-risk analysis. This is not a real-world final result.'
        }
    }
]

const TP_SL_OPTIONS: Array<ControlOption & { value: PolicyBranchMegaTpSlMode }> = [
    {
        value: 'all',
        label: {
            ru: 'ALL',
            en: 'ALL'
        },
        tooltip: {
            ru: 'Суммарный срез (Mixed): в расчёт одновременно попадают [[dynamic-tp-sl|DYNAMIC]] и [[static-tp-sl|STATIC]] сделки.\n\nИтоговые Tr, [[pnl|PnL]], [[dd|DD]] и recovery считаются по объединённому набору.',
            en: 'Combined slice: both static and dynamic TP/SL trades are included. Final Tr, PnL, DD, and recovery are computed on the merged set.'
        }
    },
    {
        value: 'dynamic',
        label: {
            ru: 'DYNAMIC',
            en: 'DYNAMIC'
        },
        tooltip: {
            ru: 'Только сделки режима [[dynamic-tp-sl|DYNAMIC]] (DynamicOnly).\n\nДень попадает в срез только при подтверждении [[confidence-bucket|confidence-bucket]]: минимум исторических наблюдений и порог win-rate.\n\nПри подтверждении dynamic в движке масштабируются уровни TP/SL и cap fraction.\n\nЕсли подтверждения нет, день становится no-trade.',
            en: 'Only trades where dynamic TP/SL was actually applied.\n\nA day enters dynamic mode only when confidence-bucket has enough history (samples) and win-rate passes the threshold.\n\nThat is why dynamic trade count is usually lower than static.'
        }
    },
    {
        value: 'static',
        label: {
            ru: 'STATIC',
            en: 'STATIC'
        },
        tooltip: {
            ru: 'Только сделки режима [[static-tp-sl|STATIC]] (StaticOnly).\n\nDynamic-оверлей отключён: используются baseline static уровни выхода.\n\nБазовые правила Policy и внешние risk-слои (например ZONAL и risk-day ограничения) продолжают работать.\n\nСрез обычно шире [[dynamic-tp-sl|DYNAMIC]], потому что не требует подтверждения confidence-bucket.',
            en: 'Only trades with fixed TP/SL levels. This mode does not wait for confidence-bucket evidence, so trade coverage is usually broader.'
        }
    }
]

const SL_MODE_OPTIONS: Array<ControlOption & { value: PolicyBranchMegaSlMode }> = [
    {
        value: 'all',
        label: {
            ru: 'ALL',
            en: 'ALL'
        },
        tooltip: {
            ru: 'Показывает вместе строки WITH SL и NO SL для прямого сравнения.',
            en: 'Shows WITH SL and NO SL rows together for direct comparison.'
        }
    },
    {
        value: 'with-sl',
        label: {
            ru: 'WITH SL',
            en: 'WITH SL'
        },
        tooltip: {
            ru: 'Защитный [[tp-sl|stop-loss]] включён: выход по [[first-event|first-event]] цепочке [[liquidation|liquidation]] > [[tp-sl|stop-loss]] > [[tp-sl|take-profit]] > [[eod|EndOfDay]].',
            en: 'Protective [[tp-sl|stop-loss]] is enabled: exit follows [[first-event|first-event]] chain [[liquidation|liquidation]] > [[tp-sl|stop-loss]] > [[tp-sl|take-profit]] > [[eod|EndOfDay]].'
        }
    },
    {
        value: 'no-sl',
        label: {
            ru: 'NO SL',
            en: 'NO SL'
        },
        tooltip: {
            ru: 'Защитный [[tp-sl|stop-loss]] отключён.\n\nСделка закрывается только по [[tp-sl|take-profit]], [[liquidation|liquidation]] или [[eod|EndOfDay]].\n\nРиск внутри дня: пока позиция открыта, убыток не ограничен стоп-лоссом и может дойти до ликвидации.\n\nЭто может обнулить капитал [[bucket|бакета]], а в [[cross-margin|cross]]-марже — весь торговый баланс.\n\nЕсли внутри дня не сработали ни take-profit, ни liquidation, сделка закроется по EndOfDay.',
            en: 'Protective [[tp-sl|stop-loss]] is disabled.\n\nTrade can close only by [[tp-sl|take-profit]], [[liquidation|liquidation]], or [[eod|EndOfDay]].\n\nIntraday risk: while position is open, loss is not bounded by stop-loss and can reach liquidation.\n\nThis can zero out [[bucket|bucket]] capital, and in [[cross-margin|cross]] margin can wipe the full trading balance.\n\nIf neither take-profit nor liquidation triggers intraday, trade closes at EndOfDay.'
        }
    }
]

const ZONAL_OPTIONS: Array<ControlOption & { value: PolicyBranchMegaZonalMode }> = [
    {
        value: 'with-zonal',
        label: {
            ru: 'С зональностью',
            en: 'With zonal'
        },
        tooltip: {
            ru: 'Включено zonal-масштабирование по зонам уверенности (high/mid/low): плечо и cap fraction могут меняться по зоне.',
            en: 'Zonal scaling is enabled by confidence zones (high/mid/low): leverage and cap fraction can change by zone.'
        }
    },
    {
        value: 'without-zonal',
        label: {
            ru: 'Без зональности',
            en: 'Without zonal'
        },
        tooltip: {
            ru: 'Зональное масштабирование отключено: zonal-влияние на плечо и cap fraction убирается, но остальные confidence-механики сохраняются.',
            en: 'Zonal scaling is disabled: zonal impact on leverage and cap fraction is removed, while other confidence mechanics remain active.'
        }
    }
]

const BUCKET_CONTROL_TOOLTIP: LocalizedText = {
    ru: 'Bucket — отдельный контур симуляции со своим капиталом, своей кривой и своими риск-метриками.\n\n[[bucket-daily|daily bucket]]:\nодна сделка на торговый день.\n\n[[bucket-intraday|intraday bucket]]:\nперезаходы внутри дня со следующей минуты после закрытия.\n\n[[bucket-delayed|delayed bucket]]:\nсделка только при реальном исполнении [[delayed-signal|delayed-сигнала]] во времени [[executed-at-utc|ExecutedAtUtc]].\n\n[[bucket-total-aggregate|total aggregate]]:\nсумма результатов daily + intraday + delayed; отдельного четвёртого bucket не существует.\n\nПри переключении bucket меняются набор сделок и все итоговые метрики: Tr, [[pnl|PnL]], [[dd|DD]], ликвидации и recovery.\n\nПочему? (bucket)',
    en: 'Bucket is an independent simulation track with its own capital, drawdown, and result curve.\n\n1) daily bucket\nOne entry per trading day. Exit follows first-event: liquidation -> stop-loss -> take-profit -> EndOfDay.\n\nExample: if a daily trade closes mid-day, no second daily entry is opened on that day.\n\n2) intraday bucket\nIntraday re-entries are allowed: after a close, next entry can open from the next minute.\n\nExample: exit at 10:17, next intraday entry can open from 10:18 while day is still open.\n\n3) delayed bucket\nDelayed entry only when delayed signal is actually executed inside the window.\n\nExample: if delayed signal was not executed, delayed bucket has no trade for that day.\n\n4) total aggregate\nThis is analytical sum of daily + intraday + delayed; there is no separate fourth bucket.\n\nWhen switching bucket, trade set and all final metrics change: TotalPnl%, MaxDD%, liquidations, recovery.'
}

const BUCKET_SELF_TOOLTIP_EXCLUDE_TERMS = [
    'bucket',
    'buckets',
    'бакет',
    'бакета',
    'бакете',
    'бакету',
    'бакетом',
    'бакеты',
    'бакетов',
    'бакетам',
    'бакетах'
]

const BUCKET_CONTROL_TOOLTIP_EXCLUDE_RULE_IDS = [
    'policy',
    'branch',
    'bucket',
    'bucket-daily',
    'bucket-intraday',
    'bucket-delayed',
    'bucket-total-aggregate'
]

const METRIC_CONTROL_TOOLTIP_EXCLUDE_RULE_IDS = ['metric-view']

const TP_SL_CONTROL_TOOLTIP_EXCLUDE_RULE_IDS = ['tp-sl-mode-term', 'tp-sl-combined', 'tp-sl']

const SL_MODE_CONTROL_TOOLTIP_EXCLUDE_RULE_IDS = ['sl-mode-term', 'with-sl-mode', 'no-sl-mode']

const ZONAL_CONTROL_TOOLTIP_EXCLUDE_RULE_IDS = ['zonal-mode-term']

const METRIC_CONTROL_TOOLTIP: LocalizedText = {
    ru: 'Metric View задаёт тип результата.\n\nREAL:\nфактический результат симуляции.\n\nNO BIGGEST LIQ LOSS:\nконтрфакт: из результата удаляется одна самая убыточная ликвидационная сделка (по [[net-pnl-usd|NetPnl$]]), после чего [[pnl|PnL]] и [[dd|DD]] пересчитываются.\n\nНазначение:\nанализ хвостового риска. Это не реальная доходность и не финальная цифра для бизнеса.',
    en: 'Metric View defines result mode.\n\nREAL:\nactual simulation output.\n\nNO BIGGEST LIQ LOSS:\ncounterfactual mode that removes one worst liquidation trade (by NetPnl$), then recalculates PnL and DD.\n\nPurpose:\ntail-risk analysis. This is not a real PnL and not a final business KPI.'
}

const TP_SL_CONTROL_TOOLTIP: LocalizedText = {
            ru: 'TP/SL-срез задаёт режим отбора сделок по confidence-dynamic.\n\nALL (Mixed):\nв расчёт попадают и [[dynamic-tp-sl|DYNAMIC]], и [[static-tp-sl|STATIC]] сделки.\n\nDYNAMIC (DynamicOnly):\nдень попадает в срез только после подтверждения [[confidence-bucket|confidence-bucket]] (минимум наблюдений и порог win-rate).\n\nПри подтверждении dynamic масштабируются уровни TP/SL и cap fraction.\n\nSTATIC (StaticOnly):\ndynamic-оверлей отключён, используются baseline static уровни выхода.\n\nЧто меняется при переключении:\nсостав сделок и пересчёт Tr, [[pnl|PnL]], [[dd|DD]], recovery.',
    en: 'TP/SL slice controls which trades are included.\n\nALL:\ndynamic + static.\n\nDYNAMIC:\nonly trades where dynamic TP/SL was actually applied.\n\nSTATIC:\nonly trades with fixed TP/SL levels.\n\nWhy dynamic is usually smaller:\ndynamic requires confidence-bucket evidence (minimum samples and minimum win-rate).\n\nWhat changes when toggled:\ntrade composition and recalculated Tr, PnL, DD, recovery.'
}

const SL_MODE_CONTROL_TOOLTIP: LocalizedText = {
    ru: 'SL-режим задаёт механику выхода из сделки.\n\nWITH SL:\nвыход по [[first-event|first-event]] цепочке [[liquidation|liquidation]] -> [[tp-sl|stop-loss]] -> [[tp-sl|take-profit]] -> [[eod|EndOfDay]].\n\nNO SL:\nзащитный стоп-лосс отключён, поэтому закрытие только по [[tp-sl|take-profit]], [[liquidation|liquidation]] или [[eod|EndOfDay]].\n\nРиск NO SL внутри дня:\nпока сделка открыта, убыток не ограничен стоп-лоссом и может дойти до ликвидации.\n\nРиск режима NO SL:\nвозможен ноль по капиталу выбранного [[bucket|бакета]], а в [[cross-margin|cross]]-марже — ноль по всему торговому балансу.\n\nЕсли внутри дня не сработали ни take-profit, ни liquidation, сделка закрывается по EndOfDay.\n\nЧто меняется в таблице:\nпересчитываются [[drawdown|MaxDD%]], [[liquidation|HadLiq]], [[account-ruin|AccRuin]], [[recovered|Recovered]], [[recov-days|RecovDays]], [[req-gain|ReqGain%]] и [[total-pnl|TotalPnl%]].',
    en: 'SL mode defines trade-exit mechanics.\n\nWITH SL:\nexit follows [[first-event|first-event]] chain [[liquidation|liquidation]] -> [[tp-sl|stop-loss]] -> [[tp-sl|take-profit]] -> [[eod|EndOfDay]].\n\nNO SL:\nprotective stop-loss is disabled, so trade closes only by [[tp-sl|take-profit]], [[liquidation|liquidation]], or [[eod|EndOfDay]].\n\nIntraday NO SL risk:\nwhile trade is open, downside is not bounded by stop-loss and can reach liquidation.\n\nNO SL mode risk:\ncan wipe selected [[bucket|bucket]] capital, and in [[cross-margin|cross]] margin can wipe full trading balance.\n\nIf neither take-profit nor liquidation triggers intraday, trade closes by EndOfDay.\n\nWhat changes in table:\nrecalculates [[drawdown|MaxDD%]], [[liquidation|HadLiq]], [[account-ruin|AccRuin]], [[recovered|Recovered]], [[recov-days|RecovDays]], [[req-gain|ReqGain%]], and [[total-pnl|TotalPnl%]].'
}

const ZONAL_CONTROL_TOOLTIP: LocalizedText = {
    ru: 'ZONAL управляет confidence-zonal слоем риска.\n\nWITH ZONAL:\nдень попадает в зону high/mid/low, и профиль зоны масштабирует leverage и cap fraction.\n\nВ базовом профиле:\nhigh от 0.62, mid от 0.56, risk-day mid от 0.60;\nmid-зона: leverage *0.65 и cap *0.60 (cap <= 0.60),\nlow-зона: leverage *0.20 и cap *0.10 (cap <= 0.15).\n\nWITHOUT ZONAL:\nотключается только zonal scaling.\n\nНейтральные параметры: high=1.0, mid=0.0, scale=1.0, capMax=1.0, risk-day zonal override=0/0.\n\nЧто меняется при переключении:\nменяются leverage/cap, состав сделок и итоговые метрики риска.\n\nЧто не меняется:\ndynamic TP/SL, confidence evidence-gate и линейные confidence-множители.',
    en: 'ZONAL controls confidence-zonal risk layer.\n\nWITH ZONAL:\nday is classified into high/mid/low zone, and zone profile scales leverage and cap fraction.\n\nBase profile:\nhigh from 0.62, mid from 0.56, risk-day mid from 0.60;\nmid-zone: leverage *0.65 and cap *0.60 (cap <= 0.60),\nlow-zone: leverage *0.20 and cap *0.10 (cap <= 0.15).\n\nWITHOUT ZONAL:\nonly zonal scaling is disabled.\n\nNeutral settings: high=1.0, mid=0.0, scale=1.0, capMax=1.0, risk-day zonal override=0/0.\n\nWhat changes when toggled:\nleverage/cap, trade composition, and final risk metrics.\n\nWhat does not change:\ndynamic TP/SL, confidence evidence-gate, and linear confidence multipliers.'
}

const BUCKET_CONTROL_LABEL: LocalizedText = {
    ru: 'Бакет капитала',
    en: 'Capital bucket'
}

const METRIC_CONTROL_LABEL: LocalizedText = {
    ru: 'Режим метрик',
    en: 'Metric mode'
}

const TP_SL_CONTROL_LABEL: LocalizedText = {
    ru: 'Срез TP/SL',
    en: 'TP/SL slice'
}

const TP_SL_ARIA_LABEL: LocalizedText = {
    ru: 'Срез TP/SL для отчёта',
    en: 'TP/SL report slice'
}

const SL_MODE_CONTROL_LABEL: LocalizedText = {
    ru: 'SL-режим',
    en: 'SL mode'
}

const ZONAL_CONTROL_LABEL: LocalizedText = {
    ru: 'Confidence-zonal',
    en: 'Confidence-zonal'
}

export default function ReportViewControls({
    bucket,
    metric,
    tpSlMode,
    slMode,
    zonalMode,
    capabilities,
    onBucketChange,
    onMetricChange,
    onTpSlModeChange,
    onSlModeChange,
    onZonalModeChange,
    metricDiffMessage,
    className
}: ReportViewControlsProps) {
    const { i18n } = useTranslation('reports')
    const locale = useMemo(
        () => resolveUiLocale(i18n.resolvedLanguage ?? i18n.language),
        [i18n.language, i18n.resolvedLanguage]
    )
    const showBucketControls = capabilities.supportsBucketFiltering
    const showMetricControls = capabilities.supportsMetricFiltering
    const showTpSlControls = capabilities.supportsTpSlFiltering
    const showSlModeControls = Boolean(capabilities.supportsSlModeFiltering && slMode && onSlModeChange)
    const showZonalControls = Boolean(capabilities.supportsZonalFiltering && zonalMode && onZonalModeChange)
    const hasAtLeastOneControl =
        showBucketControls || showMetricControls || showTpSlControls || showSlModeControls || showZonalControls

    if (!hasAtLeastOneControl && !metricDiffMessage) {
        return null
    }

    return (
        <div className={classNames(cls.root, {}, [className ?? ''])} data-tooltip-boundary>
            {showBucketControls && (
                <div className={cls.controlBlock}>
                    <div className={cls.controlLabelRow}>
                        <Text className={cls.controlLabel}>{resolveLocalizedText(BUCKET_CONTROL_LABEL, locale)}</Text>
                        <TermTooltip
                            term='?'
                            description={enrichTermTooltipDescription(
                                resolveLocalizedText(BUCKET_CONTROL_TOOLTIP, locale),
                                {
                                    excludeTerms: BUCKET_SELF_TOOLTIP_EXCLUDE_TERMS,
                                    excludeRuleIds: BUCKET_CONTROL_TOOLTIP_EXCLUDE_RULE_IDS
                                }
                            )}
                            type='span'
                        />
                    </div>
                    <div className={cls.buttons}>
                        {BUCKET_OPTIONS.map(option => {
                            const optionLabel = resolveLocalizedText(option.label, locale)
                            const optionTooltip = resolveLocalizedText(option.tooltip, locale)
                            return (
                                <Btn
                                    key={option.value}
                                    size='sm'
                                    className={classNames(
                                        cls.button,
                                        {
                                            [cls.buttonActive]: option.value === bucket
                                        },
                                        []
                                    )}
                                    onClick={() => {
                                        if (option.value !== bucket) {
                                            onBucketChange(option.value)
                                        }
                                    }}
                                    aria-pressed={option.value === bucket}>
                                    <TermTooltip
                                        term={optionLabel}
                                        description={enrichTermTooltipDescription(optionTooltip, {
                                            term: optionLabel,
                                            excludeTerms: option.tooltipExcludeTerms,
                                            excludeRuleIds: option.tooltipExcludeRuleIds
                                        })}
                                        type='span'
                                    />
                                </Btn>
                            )
                        })}
                    </div>
                </div>
            )}

            {showMetricControls && (
                <div className={cls.controlBlock}>
                    <div className={cls.controlLabelRow}>
                        <Text className={cls.controlLabel}>{resolveLocalizedText(METRIC_CONTROL_LABEL, locale)}</Text>
                        <TermTooltip
                            term='?'
                            description={enrichTermTooltipDescription(
                                resolveLocalizedText(METRIC_CONTROL_TOOLTIP, locale),
                                {
                                    excludeRuleIds: METRIC_CONTROL_TOOLTIP_EXCLUDE_RULE_IDS
                                }
                            )}
                            type='span'
                        />
                    </div>
                    <div className={cls.buttons}>
                        {METRIC_OPTIONS.map(option => {
                            const optionLabel = resolveLocalizedText(option.label, locale)
                            const optionTooltip = resolveLocalizedText(option.tooltip, locale)
                            return (
                                <Btn
                                    key={option.value}
                                    size='sm'
                                    className={classNames(
                                        cls.button,
                                        {
                                            [cls.buttonActive]: option.value === metric
                                        },
                                        []
                                    )}
                                    onClick={() => {
                                        if (option.value !== metric) {
                                            onMetricChange(option.value)
                                        }
                                    }}
                                    aria-pressed={option.value === metric}>
                                    <TermTooltip
                                        term={optionLabel}
                                        description={enrichTermTooltipDescription(optionTooltip, {
                                            term: optionLabel,
                                            excludeTerms: option.tooltipExcludeTerms,
                                            excludeRuleIds: option.tooltipExcludeRuleIds
                                        })}
                                        type='span'
                                    />
                                </Btn>
                            )
                        })}
                    </div>
                </div>
            )}

            {showTpSlControls && (
                <div className={cls.controlBlock}>
                    <div className={cls.controlLabelRow}>
                        <Text className={cls.controlLabel}>{resolveLocalizedText(TP_SL_CONTROL_LABEL, locale)}</Text>
                        <TermTooltip
                            term='?'
                            description={enrichTermTooltipDescription(
                                resolveLocalizedText(TP_SL_CONTROL_TOOLTIP, locale),
                                {
                                    excludeRuleIds: TP_SL_CONTROL_TOOLTIP_EXCLUDE_RULE_IDS
                                }
                            )}
                            type='span'
                        />
                    </div>
                    <TpSlModeToggle
                        value={tpSlMode}
                        onChange={onTpSlModeChange}
                        className={cls.tpSlToggle}
                        ariaLabel={resolveLocalizedText(TP_SL_ARIA_LABEL, locale)}
                        options={TP_SL_OPTIONS.map(option => ({
                            value: option.value,
                            label: resolveLocalizedText(option.label, locale),
                            tooltip: enrichTermTooltipDescription(resolveLocalizedText(option.tooltip, locale), {
                                term: resolveLocalizedText(option.label, locale),
                                excludeTerms: option.tooltipExcludeTerms,
                                excludeRuleIds: option.tooltipExcludeRuleIds
                            })
                        }))}
                    />
                </div>
            )}

            {showSlModeControls && slMode && onSlModeChange && (
                <div className={cls.controlBlock}>
                    <div className={cls.controlLabelRow}>
                        <Text className={cls.controlLabel}>{resolveLocalizedText(SL_MODE_CONTROL_LABEL, locale)}</Text>
                        <TermTooltip
                            term='?'
                            description={enrichTermTooltipDescription(
                                resolveLocalizedText(SL_MODE_CONTROL_TOOLTIP, locale),
                                {
                                    excludeRuleIds: SL_MODE_CONTROL_TOOLTIP_EXCLUDE_RULE_IDS
                                }
                            )}
                            type='span'
                        />
                    </div>
                    <div className={cls.buttons}>
                        {SL_MODE_OPTIONS.map(option => {
                            const optionLabel = resolveLocalizedText(option.label, locale)
                            const optionTooltip = resolveLocalizedText(option.tooltip, locale)
                            return (
                                <Btn
                                    key={option.value}
                                    size='sm'
                                    className={classNames(
                                        cls.button,
                                        {
                                            [cls.buttonActive]: option.value === slMode
                                        },
                                        []
                                    )}
                                    onClick={() => {
                                        if (option.value !== slMode) {
                                            onSlModeChange(option.value)
                                        }
                                    }}
                                    aria-pressed={option.value === slMode}>
                                    <TermTooltip
                                        term={optionLabel}
                                        description={enrichTermTooltipDescription(optionTooltip, {
                                            term: optionLabel,
                                            excludeTerms: option.tooltipExcludeTerms,
                                            excludeRuleIds: option.tooltipExcludeRuleIds
                                        })}
                                        type='span'
                                    />
                                </Btn>
                            )
                        })}
                    </div>
                </div>
            )}

            {showZonalControls && zonalMode && onZonalModeChange && (
                <div className={cls.controlBlock}>
                    <div className={cls.controlLabelRow}>
                        <Text className={cls.controlLabel}>{resolveLocalizedText(ZONAL_CONTROL_LABEL, locale)}</Text>
                        <TermTooltip
                            term='?'
                            description={enrichTermTooltipDescription(
                                resolveLocalizedText(ZONAL_CONTROL_TOOLTIP, locale),
                                {
                                    excludeRuleIds: ZONAL_CONTROL_TOOLTIP_EXCLUDE_RULE_IDS
                                }
                            )}
                            type='span'
                        />
                    </div>
                    <div className={cls.buttons}>
                        {ZONAL_OPTIONS.map(option => {
                            const optionLabel = resolveLocalizedText(option.label, locale)
                            const optionTooltip = resolveLocalizedText(option.tooltip, locale)
                            return (
                                <Btn
                                    key={option.value}
                                    size='sm'
                                    className={classNames(
                                        cls.button,
                                        {
                                            [cls.buttonActive]: option.value === zonalMode
                                        },
                                        []
                                    )}
                                    onClick={() => {
                                        if (option.value !== zonalMode) {
                                            onZonalModeChange(option.value)
                                        }
                                    }}
                                    aria-pressed={option.value === zonalMode}>
                                    <TermTooltip
                                        term={optionLabel}
                                        description={enrichTermTooltipDescription(optionTooltip, {
                                            term: optionLabel,
                                            excludeTerms: option.tooltipExcludeTerms,
                                            excludeRuleIds: option.tooltipExcludeRuleIds
                                        })}
                                        type='span'
                                    />
                                </Btn>
                            )
                        })}
                    </div>
                </div>
            )}

            {metricDiffMessage && <Text className={cls.metricDiff}>{metricDiffMessage}</Text>}
        </div>
    )
}
