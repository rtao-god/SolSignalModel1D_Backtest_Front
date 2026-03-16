import i18n from '@/shared/configs/i18n/i18n'

type ReportUiLocale = 'ru' | 'en'

interface DescriptionRule {
    match: RegExp
    ru: string
    en: string
}

const RULES: DescriptionRule[] = [
    {
        match: /^Policy Branch RiskDay/i,
        ru: 'Главная сводка по каждой политике и ветке за всю историю. Показывает активность (TradeDays%, Trades), распределение направлений (Long/Short/NoTrade), риск‑дни и итоговые финрезультаты (TotalPnl%, MaxDD%, ликвидации). Используйте как «паспорт» стратегии: сначала смотрим активность, затем риск.',
        en: 'Primary all-history summary by policy and branch. Shows activity (TradeDays%, Trades), direction mix (Long/Short/NoTrade), risk-day share, and final performance (TotalPnl%, MaxDD%, liquidations). Use it as a strategy passport: first activity, then risk.'
    },
    {
        match: /^Policy Branch Mega/i,
        ru: 'Расширенная таблица по политике и ветке с большим набором метрик: полный итог wealth, капитал в рынке, просадки, ликвидации, восстановление, средние доходности и прочие диагностические показатели. Используется для глубокого анализа, когда базовой сводки недостаточно.',
        en: 'Extended policy/branch table with a broad metric set: full wealth result, capital left in the market, drawdowns, liquidations, recovery, average returns, and additional diagnostics. Used for deeper analysis when the compact summary is not enough.'
    },
    {
        match: /^Market DayType Distribution/i,
        ru: 'Распределение самих рыночных дней по типам (UP/DOWN/FLAT). Это про рынок, а не про стратегию: помогает понять, нет ли перекоса выборки и насколько сложный режим доминирует.',
        en: 'Distribution of market days by type (UP/DOWN/FLAT). This is a market profile, not a strategy metric; it helps detect sampling skew and dominant regimes.'
    },
    {
        match: /^Policy PnL by DayType/i,
        ru: 'Доходность и число сделок по типам дней. Позволяет увидеть, где стратегия действительно зарабатывает, а где регулярно «сливает» (например, в боковике).',
        en: 'PnL and trade count by day type. Shows where the strategy actually earns and where it systematically underperforms (for example in FLAT days).'
    },
    {
        match: /^Policy NoTrade\/Opportunity by DayType/i,
        ru: 'Сколько пропусков и упущенной возможности по типам дней. Показывает цену селективности: что мы теряем, когда не торгуем.',
        en: 'No-trade frequency and missed opportunity by day type. Quantifies the cost of selectivity when the strategy stays out of the market.'
    },
    {
        match: /^Policy WinRate by DayType/i,
        ru: 'WinRate по типам дней. Важно для оценки качества входов в каждом режиме рынка, отдельно от общей доходности.',
        en: 'WinRate by day type. Useful for evaluating entry quality per market regime separately from aggregate return.'
    },
    {
        match: /^Policy Opposite-Direction \(ALL HISTORY/i,
        ru: 'Доля сделок, открытых против фактического направления дня. Высокие значения означают систематическое несоответствие сигналов рынку.',
        en: 'Share of trades opened against the actual day direction. High values indicate a systematic mismatch between signals and market direction.'
    },
    {
        match: /^Policy Opposite-Direction by DayType/i,
        ru: 'Разложение противоположных сделок по типам дней (UP/DOWN/FLAT). Помогает найти режимы, где модель чаще всего ошибается.',
        en: 'Breakdown of opposite-direction trades by day type (UP/DOWN/FLAT). Helps identify regimes where model decisions fail most often.'
    },
    {
        match: /^Policy NoTrade by Weekday/i,
        ru: 'Частота NoTrade по дням недели. Помогает поймать системные пропуски (расписание, выходные, проблемы с данными).',
        en: 'NoTrade frequency by weekday. Useful for spotting systemic skips (schedule effects, calendar patterns, data issues).'
    },
    {
        match: /^Policy NoTrade Reasons/i,
        ru: 'Причины NoTrade: отсутствие направления, фильтры политики, нулевой cap, слабый edge, risk‑throttle и т.п. Показывает, какой фильтр реально «душит» торговлю.',
        en: 'NoTrade reason split: no direction, policy filters, zero cap, weak edge, risk throttle, and others. Shows which gate actually suppresses trading.'
    },
    {
        match: /^(Пропуски по дням|Missing days summary)/i,
        ru: 'Сводка пропусков по дням: сколько дней не торговали, где были дырки в данных, где были ликвидации. Важно для сопоставимости периодов.',
        en: 'Missing-day summary: no-trade day count, data gaps, and liquidation presence. Important for period comparability.'
    },
    {
        match: /^Policy Specificity Split/i,
        ru: 'Сравнение поведения политики на «специфичных» и «нормальных» днях. Используется для оценки guardrail: насколько фильтр уместно блокирует плохие режимы.',
        en: 'Policy behavior split between specific and normal days. Used to evaluate whether the guardrail blocks bad regimes appropriately.'
    },
    {
        match: /^Specificity Global Thresholds/i,
        ru: 'Глобальные пороги p90 для |return| и MinMove — базовый ориентир специфичности. Используется как «эталон» для сравнения с rolling‑порогами.',
        en: 'Global p90 thresholds for |return| and MinMove. Serves as a baseline specificity reference against rolling thresholds.'
    },
    {
        match: /^Specificity Rolling Guardrail \(BY YEAR, CAUSAL\)/i,
        ru: 'Causal rolling‑guardrail по годам: пороги считаются только на прошлом, без утечек. Это реалистичная оценка, как guardrail мог работать в онлайне.',
        en: 'Yearly causal rolling guardrail: thresholds are computed only from past data without leakage. This is the realistic online-performance estimate.'
    },
    {
        match: /^Specificity Rolling Guardrail \(BY YEAR\)/i,
        ru: 'Rolling‑пороги по годам без строгого казуального режима. Полезно для анализа дрейфа и сравнений, но не для боевого решения.',
        en: 'Yearly rolling thresholds without strict causality. Useful for drift analysis and comparison, but not for production decision calibration.'
    },
    {
        match: /^Guardrail Confusion \(SPECIFICITY/i,
        ru: 'Confusion matrix для guardrail: TP/FP/TN/FN, Specificity/Sensitivity, доля блокировок и оценка экономического эффекта. Ключевая таблица эффективности фильтра.',
        en: 'Guardrail confusion matrix: TP/FP/TN/FN, Specificity/Sensitivity, block rate, and economic effect estimate. Core filter-effectiveness table.'
    },
    {
        match: /^Guardrail Confusion \(BY YEAR/i,
        ru: 'Та же эффективность guardrail, но по годам. Помогает найти периоды деградации и переобучения.',
        en: 'Same guardrail effectiveness metrics, segmented by year. Helps reveal degradation periods and potential overfitting phases.'
    },
    {
        match: /^Top Trade Days \(WORST/i,
        ru: 'Худшие торговые дни по суммарному PnL. Это приоритетные дни для разборов: какие условия сломали стратегию.',
        en: 'Worst trading days by aggregate PnL. Priority set for investigation of conditions that broke strategy performance.'
    },
    {
        match: /^Top Trade Days \(BEST/i,
        ru: 'Лучшие торговые дни по суммарному PnL. Полезно понять, в каких условиях стратегия раскрывается.',
        en: 'Best trading days by aggregate PnL. Useful for identifying market conditions where the strategy performs strongest.'
    },
    {
        match: /^Policy NoTrade Hotspots/i,
        ru: 'Hotspots пропусков (NoTrade) по политике и ветке. Показывает «пустые зоны», где стратегия почти не торгует.',
        en: 'NoTrade hotspots by policy and branch. Highlights low-activity zones where the strategy rarely executes trades.'
    },
    {
        match: /^Policy Opposite Hotspots/i,
        ru: 'Hotspots противоположных решений: дни/условия, где модель чаще всего идёт против направления рынка.',
        en: 'Opposite-direction hotspots: days/conditions where model decisions most often conflict with market direction.'
    },
    {
        match: /^Policy Low-Coverage Hotspots/i,
        ru: 'Hotspots низкого покрытия — где почти нет сделок. Помогает выявить зоны, в которых стратегия не работает.',
        en: 'Low-coverage hotspots where trades are sparse. Helps locate zones where the strategy is effectively inactive.'
    },
    {
        match: /^Decision Attribution/i,
        ru: 'Кто и почему принял финальное решение (модель, политика, SL и т.д.). Базовый слой для анализа ответственности и причин действий.',
        en: 'Who made the final decision and why (model, policy, SL, etc.). Foundational layer for responsibility and causality analysis.'
    },
    {
        match: /^Model vs Policy Blame Split/i,
        ru: 'Разделение «вины» между моделью и политикой/фильтрами. Помогает понять, что исправлять: сигнал или правила входа.',
        en: 'Blame split between model output and policy/filter logic. Helps decide whether to fix signal quality or execution rules.'
    },
    {
        match: /^Top Decision Days \(Opposite Harm/i,
        ru: 'Дни с максимальным вредом от противоположных решений. Это приоритетные кандидаты для расследования.',
        en: 'Days with the highest harm from opposite-direction decisions. These are priority candidates for root-cause investigation.'
    },
    {
        match: /^Top Decision Days \(Missed Opportunity/i,
        ru: 'Дни с наибольшей упущенной выгодой из-за NoTrade. Помогает оценить «цену» фильтрации.',
        en: 'Days with the largest missed opportunity due to NoTrade. Helps quantify the opportunity cost of filtering.'
    },
    {
        match: /^Data Integrity \(Record Days\)/i,
        ru: 'Проверки целостности данных: разрывы, пропущенные дни, нарушения порядка. В норме значения должны быть низкими.',
        en: 'Data integrity checks: gaps, missing days, and ordering violations. Healthy datasets should keep these values low.'
    },
    {
        match: /^Missing Weekday Details \(Record Days\)/i,
        ru: 'Детализация пропусков по дням недели. Помогает выявить системные проблемы в расписании данных.',
        en: 'Weekday-level breakdown of missing data. Useful for detecting recurring schedule-related ingestion issues.'
    },
    {
        match: /^Policy Commission \/ Leverage Sanity/i,
        ru: 'Санити‑проверки комиссий и плеча. Показывает, не вышли ли издержки/плечо за разумные границы.',
        en: 'Sanity checks for commission and leverage. Verifies that costs and leverage remain within reasonable bounds.'
    },
    {
        match: /^Liquidation Summary/i,
        ru: 'Сводка по ликвидациям и риску «руины». Это первичная оценка, насколько стратегия опасна.',
        en: 'Liquidation and ruin-risk summary. Primary view of strategy danger level under stress.'
    },
    {
        match: /^Liquidation Distance/i,
        ru: 'Дистанция до ликвидации по сделкам и по дням. Чем больше дистанция — тем безопаснее входы.',
        en: 'Distance to liquidation by trade and by day. Larger distance generally means safer entries.'
    },
    {
        match: /^Trade Duration \/ MAE \/ MFE/i,
        ru: 'Длительность сделок и показатели MAE/MFE. Помогает понять риск‑профиль: как глубоко сделки уходят «в минус» и какой потенциал был «в плюс».',
        en: 'Trade duration plus MAE/MFE metrics. Describes risk profile: adverse depth versus favorable potential inside trades.'
    },
    {
        match: /^Policy Leverage\/Cap Quantiles/i,
        ru: 'Квантили плеча и cap‑fraction. Показывают распределение риска по сделкам и насколько часто стратегия использует высокий риск.',
        en: 'Leverage and cap-fraction quantiles. Shows risk distribution across trades and frequency of high-risk exposure.'
    },
    {
        match: /^Equity\/DD Summary/i,
        ru: 'Сводка equity и просадок для top‑3 политик. Быстрый срез эффективности лидеров без углубления в детали.',
        en: 'Equity and drawdown summary for top-3 policies. Fast performance snapshot of leaders without deep drill-down.'
    },
    {
        match: /^Top .* trades by NetPnlUsd/i,
        ru: 'Лучшие и худшие отдельные сделки по $‑результату. Полезно находить экстремальные отклонения и проверять, не было ли ошибок в данных.',
        en: 'Best and worst individual trades by USD result. Useful for spotting extreme outliers and validating data correctness.'
    },
    {
        match: /^Top .* trades by NetReturnPct/i,
        ru: 'Лучшие и худшие сделки по %‑доходности. Сравните с таблицей по $‑результату, чтобы увидеть влияние размера позиции.',
        en: 'Best and worst individual trades by return %. Compare with USD-based ranking to isolate position-size effects.'
    }
]

function normalizeReportTitle(title: string): string {
    if (!title) return ''
    return title
        .replace(/^=+\s*/, '')
        .replace(/\s*=+$/, '')
        .trim()
}

function resolveReportUiLocale(language: string | null | undefined): ReportUiLocale {
    const normalized = (language ?? '').trim().toLowerCase()
    return normalized.startsWith('ru') ? 'ru' : 'en'
}

export function resolveBacktestDiagnosticsDescription(title: string, locale?: ReportUiLocale): string | null {
    if (!title) {
        return null
    }

    const normalized = normalizeReportTitle(title)
    const resolvedLocale = locale ?? resolveReportUiLocale(i18n.resolvedLanguage ?? i18n.language)
    for (const rule of RULES) {
        if (rule.match.test(normalized)) {
            return resolvedLocale === 'ru' ? rule.ru : rule.en
        }
    }

    return null
}
