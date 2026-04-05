import i18n from '@/shared/configs/i18n/i18n'

type ReportUiLocale = 'ru' | 'en'

interface DescriptionRule {
    match: RegExp
    ru: string
    en: string
}

function normalizeTitle(title: string | undefined): string {
    if (!title) return ''
    return title
        .replace(/^=+\s*/, '')
        .replace(/\s*=+$/, '')
        .trim()
}

function stripSegmentPrefix(title: string): string {
    return title.replace(/^\[[^\]]+\]\s*/, '').trim()
}

function resolveReportUiLocale(language: string | null | undefined): ReportUiLocale {
    const normalized = (language ?? '').trim().toLowerCase()
    return normalized.startsWith('ru') ? 'ru' : 'en'
}

function resolveRuleDescription(rule: DescriptionRule, locale: ReportUiLocale): string {
    return locale === 'ru' ? rule.ru : rule.en
}

const PFI_REPORT_KINDS = new Set(['pfi_per_model', 'pfi_sl_model', 'pfi_per_model_feature_detail'])

function isPfiReportKind(reportKind: string | undefined): boolean {
    return reportKind ? PFI_REPORT_KINDS.has(reportKind) : false
}

const BACKTEST_SUMMARY_RULES: DescriptionRule[] = [
    {
        match: /^(Общие параметры бэктеста|Backtest summary parameters)/i,
        ru: 'Общие параметры окна бэктеста: диапазон дат, число торговых дней и сколько политик участвовало. Здесь же сводные метрики по лучшей доходности и худшей просадке — это быстрый ориентир перед чтением таблиц ниже.',
        en: 'High-level backtest window settings: date range, trading-day count, and how many policies participated. This section also shows best-return and worst-drawdown summary metrics as a quick orientation before detailed tables.'
    },
    {
        match: /^Backtest config \(baseline\)/i,
        ru: 'Конфиг baseline и what-if: базовые дневные TP/SL, dynamic confidence-risk overlay, risk-budget и ограничения dynamic TP/SL (клампы, confidence-gate, историческая проверка bucket samples/win-rate). Dynamic TP/SL активируется не в каждый день: только если confidence-условия выполняются.',
        en: 'Baseline and what-if config: base daily TP/SL, dynamic confidence-risk overlay, risk budget, and dynamic TP/SL bounds (clamps, confidence gate, historical bucket samples/win-rate checks). Dynamic TP/SL is not enabled every day; it is applied only when confidence conditions are satisfied.'
    },
    {
        match: /^Policies \(baseline config\)/i,
        ru: 'Список политик из активного конфига (const/risk_aware/ultra_safe/dynamic/spot) с типом и плечом. Если имя политики уже содержит Cross или Isolated, режим маржи читается из самого имени и не дублируется отдельным столбцом.',
        en: 'Policy list from the active config (const/risk_aware/ultra_safe/dynamic/spot) with policy type and leverage. When the policy name already contains Cross or Isolated, the margin regime is read from the name itself and is not duplicated in a separate column.'
    },
    {
        match: /^(Политики бэктеста|Backtest policies)/i,
        ru: 'Сводная таблица результатов по политикам и веткам (BASE/ANTI‑D) с вариантами WITH-SL/NO-SL. NO-SL отключает защитный стоп-лосс: для isolated-маржи это повышает шанс потерять весь залог сделки, а для cross-маржи — весь баланс бакета. Поэтому TotalPnl% обязательно читается вместе с MaxDD%, HadLiq и AccRuin.',
        en: 'Policy result summary by branch (BASE/ANTI-D) and SL mode (WITH-SL/NO-SL). NO-SL disables the protective stop-loss: in isolated margin it raises the chance of losing the full trade margin, and in cross margin it raises the chance of losing the whole bucket balance. Therefore TotalPnl% must be interpreted together with MaxDD%, HadLiq, and AccRuin.'
    }
]

const CURRENT_PREDICTION_RULES: DescriptionRule[] = [
    {
        match: /^(Общие параметры прогноза|Prediction summary|Prediction summary parameters)/i,
        ru: 'Контекст формирования прогноза: карточка относится к текущему дню или к прошлой дате с уже известным исходом, как система обращается с пропусками, где начинаются и заканчиваются 24 часа прогноза и до какой границы данных модель могла видеть рынок. Этот блок нужен, чтобы понимать, на каком временном срезе построена карточка.',
        en: 'Prediction context: mode (Live or Backfilled), strictness level for missing-data handling, key entry/exit timestamps, and data snapshot markers. This is the prediction passport that explains what data and timing the output is based on.'
    },
    {
        match: /^(Вероятности прогноза|Prediction probabilities)/i,
        ru: 'Вероятности трёх классов (рост/боковик/падение) для трёх слоёв прогноза: базовый Daily, слой Daily + Micro и итоговый Total с учётом SL. Этот блок нужен для чтения уверенности модели и того, как дополнительные слои меняют исходный сценарий дня.',
        en: 'Three-class probabilities (up/flat/down) for three layers: base Day, Day+Micro, and final Total including SL overlay. These values describe model confidence, not a direct expected-return percentage.'
    },
    {
        match: /^(Диапазон цены за 24 часа|24h price range \(historical baseline\)|Price range for 24 hours)/i,
        ru: 'Исторический baseline для понимания диапазона цены на 24 часа вперёд. Это справочная статистика по прошлым данным, а не прямой прогноз сегодняшней цены.',
        en: 'Historical baseline for the next-24h price range. It is reference statistics from past data, not a direct forecast of today’s exact price.'
    },
    {
        match: /^(Почему модель дала такой прогноз|Why the model produced this forecast \(top factors\)|Why the model gave this prediction)/i,
        ru: 'Топ [[factor|факторов]] (фичей/сигналов), которые сильнее всего повлияли на решение. Колонки показывают тип [[factor|фактора]], его имя, краткое описание, значение и ранг важности.',
        en: 'Top [[factor|factors]] (features/signals) that contributed most to the decision. Columns show [[factor|factor]] type, name, short description, current value, and importance rank.'
    },
    {
        match: /^(Факт дня и расхождение с прогнозом|Actual day outcome vs forecast|Day outcome and prediction mismatch)/i,
        ru: 'Сводка post-factum по backfilled-дню: что реально случилось, совпал ли итоговый прогноз с фактом, как отличились MinMove и диапазон цены, и какой [[factor|фактор]] из слоя пояснений / PFI был ключевым. Эти данные появляются только после закрытия окна и не используются в causal/live решении.',
        en: 'Post-factum summary for a backfilled day: actual outcome, whether Total prediction matched the fact, MinMove and range deviations, and the key explain/PFI [[factor|factor]]. These fields appear only after window close and are not used in causal/live decision-making.'
    },
    {
        match: /^(Политики плеча|Leverage policies|Policy по веткам BASE и ANTI-D)/i,
        ru: 'Торговый план по каждой Policy и ветке: направление, плечо, цены входа, уровни выхода, размер позиции и риск ликвидации. Это прикладной слой, который показывает, как разные Policy читают один и тот же прогноз.',
        en: 'Execution plan per Policy and branch: direction, leverage, entry and exit levels, position size, and liquidation risk. This is the practical layer that shows how different Policies interpret the same forecast.'
    }
]

const MODEL_STATS_RULES: DescriptionRule[] = [
    {
        match: /^Models overview$/i,
        ru: 'Сводная таблица по моделям и срезам проверки. Она показывает, какая модель открыта, на каком куске истории посчитан AUC и сколько строк лежит под этой оценкой.',
        en: 'Overview table by model and evaluation slice. It shows which model is open, on what history slice AUC was measured, and how many rows stand behind that estimate.'
    },
    {
        match: /^Daily label summary/i,
        ru: 'Краткое объяснение качества дневной модели по каждому классу (UP/DOWN/FLAT). Полезно, чтобы быстро понять, где модель чаще ошибается.',
        en: 'Compact quality summary for the daily model by class (UP/DOWN/FLAT). Useful for quickly spotting where the model misses most often.'
    },
    {
        match: /^Daily label confusion/i,
        ru: 'Полная матрица ошибок дневной модели (TRUE × PRED). Строки — истинный класс, столбцы — предсказанный. Помогает увидеть типичные путаницы (например, FLAT ↔ UP).',
        en: 'Full daily-model confusion matrix (TRUE × PRED). Rows are true classes and columns are predicted classes, making class confusions (for example FLAT ↔ UP) easy to identify.'
    },
    {
        match: /^Trend-direction confusion \((упрощённо|simplified)\)/i,
        ru: 'Сводка по направлению тренда (DOWN vs UP) без детализации по классам. Удобна для быстрого бизнес‑сравнения.',
        en: 'Trend-direction summary (DOWN vs UP) without fine class detail. Convenient for a quick business-level comparison.'
    },
    {
        match: /^Trend-direction confusion \((технически|technical)\)/i,
        ru: 'Техническая версия таблицы направления (DOWN vs UP) с количеством предсказаний и точностью.',
        en: 'Technical version of trend-direction table (DOWN vs UP) with prediction counts and accuracy.'
    },
    {
        match: /^SL-model confusion/i,
        ru: 'Матрица ошибок SL‑модели: как она отличает «TP‑дни» от «SL‑дней» и сколько раз помечает высокий риск.',
        en: 'SL model confusion matrix: how well the model separates TP-days from SL-days and how often it flags high risk.'
    },
    {
        match: /^SL-model metrics/i,
        ru: 'Ключевые метрики SL‑модели: покрытие, TPR/FPR, precision и F1. Показывают, насколько хорошо модель ловит рискованные дни.',
        en: 'Key SL-model metrics: coverage, TPR/FPR, precision, and F1. They show how effectively risky days are detected.'
    },
    {
        match: /^SL threshold sweep/i,
        ru: 'Перебор порогов SL‑модели: как меняются TPR/FPR и доля HIGH‑сигналов при разных thresholds. Используется для выбора порога риска.',
        en: 'SL threshold sweep: how TPR/FPR and HIGH-signal share move across thresholds. Used for practical risk-threshold selection.'
    },
    {
        match: /^SL-model$/i,
        ru: 'Секция SL‑модели отсутствует в отчёте: указана причина, почему данные недоступны.',
        en: 'The SL-model section is absent in this report; the table explains why the data is unavailable.'
    }
]

const PFI_RULES: DescriptionRule[] = [
    {
        match: /^Model quality by section$/i,
        ru: 'Сравнение общего качества модели по каждой секции и источнику оценки. Этот блок нужен, чтобы понять, на каком наборе данных модель вообще держит сильный прогноз, а где базовое качество уже проседает само по себе.',
        en: 'Compares overall model quality across sections and score scopes. Use this block to see where the model itself remains strong before interpreting feature-level behavior.'
    },
    {
        match: /^Local feature contribution by section$/i,
        ru: 'Локальный вклад выбранного признака в сам прогноз модели. Таблица показывает, как часто признак толкает прогноз вверх или вниз и как часто входит в главные причины решения внутри каждой секции.',
        en: 'Local contribution of the selected feature to the model output. The table shows how often the feature pushes the prediction up or down and how often it becomes one of the main drivers within each section.'
    },
    {
        match: /^Value buckets and prediction quality$/i,
        ru: 'Разбор признака по диапазонам значений. Здесь видно, какие зоны значения чаще совпадают с сильным прогнозом, где модель переоценивает вероятность и в каких диапазонах вклад признака становится слабее.',
        en: 'Breakdown of the feature by value ranges. This section shows which ranges align with stronger prediction quality, where probabilities become overstated, and where the feature contribution fades.'
    },
    {
        match: /^PFI by models \(feature detail\)$/i,
        ru: 'Главная сводка важности признака по моделям и источникам оценки. Здесь видно, насколько сильно перестановка признака портит качество прогноза и как меняется его ранг между секциями.',
        en: 'Main feature-importance summary across models and score scopes. It shows how much prediction quality drops after permutation and how the feature rank changes across sections.'
    },
    {
        match: /^Top features \(section context\)$/i,
        ru: 'Контекст соседних признаков внутри той же секции. Блок помогает понять, кто находится рядом с выбранным признаком по рангу и где вокруг него уже есть более сильные или близкие по полезности признаки.',
        en: 'Section-level peer context for the selected feature. This block shows nearby ranked features and helps reveal where stronger or closely competing neighbors already surround it.'
    }
]

const PFI_DESCRIPTION: Record<ReportUiLocale, string> = {
    ru: 'Permutation Feature Importance (PFI) по одной модели: показываем, насколько ухудшается качество (AUC), если перемешать фичу. Чем выше ΔAUC, тем важнее признак. ΔMean и корреляции помогают понять направление влияния.',
    en: 'Permutation Feature Importance (PFI) for a single model: shows quality degradation (AUC drop) when each feature is shuffled. Higher ΔAUC means higher feature importance. ΔMean and correlation fields help interpret directional effect.'
}

export function resolveReportSectionDescription(
    reportKind: string | undefined,
    sectionTitle: string | undefined,
    locale?: ReportUiLocale
): string | null {
    const normalized = normalizeTitle(sectionTitle)
    if (!normalized) return null
    const resolvedLocale = locale ?? resolveReportUiLocale(i18n.resolvedLanguage ?? i18n.language)

    if (reportKind === 'backtest_summary') {
        for (const rule of BACKTEST_SUMMARY_RULES) {
            if (rule.match.test(normalized)) return resolveRuleDescription(rule, resolvedLocale)
        }
    }

    if (reportKind?.startsWith('current_prediction')) {
        for (const rule of CURRENT_PREDICTION_RULES) {
            if (rule.match.test(normalized)) return resolveRuleDescription(rule, resolvedLocale)
        }
    }

    if (reportKind === 'backtest_model_stats') {
        const withoutPrefix = stripSegmentPrefix(normalized)
        for (const rule of MODEL_STATS_RULES) {
            if (rule.match.test(withoutPrefix)) return resolveRuleDescription(rule, resolvedLocale)
        }
    }

    if (isPfiReportKind(reportKind)) {
        const withoutPrefix = stripSegmentPrefix(normalized)
        for (const rule of PFI_RULES) {
            if (rule.match.test(withoutPrefix)) return resolveRuleDescription(rule, resolvedLocale)
        }

        return PFI_DESCRIPTION[resolvedLocale]
    }

    return null
}
