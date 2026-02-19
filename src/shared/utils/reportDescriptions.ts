

function normalizeTitle(title: string | undefined): string {
    if (!title) return ''
    return title.replace(/^=+\s*/, '').replace(/\s*=+$/, '').trim()
}

function stripSegmentPrefix(title: string): string {
    return title.replace(/^\[[^\]]+\]\s*/, '').trim()
}

const BACKTEST_SUMMARY_RULES: { match: RegExp; description: string }[] = [
    {
        match: /^Общие параметры бэктеста/i,
        description:
            'Общие параметры окна бэктеста: диапазон дат, число торговых дней и сколько политик участвовало. Здесь же сводные метрики по лучшей доходности и худшей просадке — это быстрый ориентир перед чтением таблиц ниже.'
    },
    {
        match: /^Backtest config \(baseline\)/i,
        description:
            'Конфиг baseline и what-if: базовые дневные TP/SL, dynamic confidence-risk overlay, risk-budget и ограничения dynamic TP/SL (клампы, confidence-gate, историческая проверка bucket samples/win-rate). Dynamic TP/SL активируется не в каждый день: только если confidence-условия выполняются.'
    },
    {
        match: /^Policies \(baseline config\)/i,
        description:
            'Список политик из активного конфига (const/risk_aware/ultra_safe/dynamic/spot) с типом, плечом и режимом маржи.'
    },
    {
        match: /^Политики бэктеста/i,
        description:
            'Сводная таблица результатов по политикам и веткам (BASE/ANTI‑D) с вариантом SL/NO SL. Смотрите TotalPnl% и MaxDD% как ключевые показатели доходности и риска, а Trades/TradesBySource показывают активность.'
    }
]

const CURRENT_PREDICTION_RULES: { match: RegExp; description: string }[] = [
    {
        match: /^Общие параметры прогноза/i,
        description:
            'Контекст формирования прогноза: режим (Live или Backfilled), строгие/мягкие правила обработки пропусков, ключевые временные метки входа/выхода и срез данных. Это «паспорт» прогноза, чтобы понимать на каких данных он построен.'
    },
    {
        match: /^Вероятности прогноза/i,
        description:
            'Вероятности трёх классов (рост/боковик/падение) для трёх слоёв: базовый Day, Day+Micro и итоговый Total с учётом SL. Нужны для оценки уверенности модели, а не для «точного процента дохода».'
    },
    {
        match: /^Диапазон цены за 24 часа/i,
        description:
            'Исторический baseline для понимания диапазона цены на 24 часа вперёд. Это справочная статистика по прошлым данным, а не прямой прогноз сегодняшней цены.'
    },
    {
        match: /^Почему модель дала такой прогноз/i,
        description:
            'Топ факторов (фичей/сигналов), которые сильнее всего повлияли на решение. Колонки показывают тип фактора, его имя, краткое описание, значение и ранг важности.'
    },
    {
        match: /^Факт дня и расхождение с прогнозом/i,
        description:
            'Сводка post-factum по backfilled-дню: что реально случилось, совпал ли итоговый прогноз с фактом, как отличились MinMove и диапазон цены, и какой фактор explain/PFI был ключевым. Эти данные появляются только после закрытия окна и не используются в causal/live решении.'
    },
    {
        match: /^Политики плеча/i,
        description:
            'Торговый план по каждой политике и ветке: направление, плечо, цены входа/SL/TP, размер позиции и оценка риска ликвидации. Это прикладная «инструкция», как политики интерпретируют прогноз.'
    }
]

const MODEL_STATS_RULES: { match: RegExp; description: string }[] = [
    {
        match: /^Daily label summary/i,
        description:
            'Краткое объяснение качества дневной модели по каждому классу (UP/DOWN/FLAT). Полезно, чтобы быстро понять, где модель чаще ошибается.'
    },
    {
        match: /^Daily label confusion/i,
        description:
            'Полная матрица ошибок дневной модели (TRUE × PRED). Строки — истинный класс, столбцы — предсказанный. Помогает увидеть типичные путаницы (например, FLAT ↔ UP).'
    },
    {
        match: /^Trend-direction confusion \(упрощённо\)/i,
        description:
            'Сводка по направлению тренда (DOWN vs UP) без детализации по классам. Удобна для быстрого бизнес‑сравнения.'
    },
    {
        match: /^Trend-direction confusion \(технически\)/i,
        description:
            'Техническая версия таблицы направления (DOWN vs UP) с количеством предсказаний и точностью.'
    },
    {
        match: /^SL-model confusion/i,
        description:
            'Матрица ошибок SL‑модели: как она отличает «TP‑дни» от «SL‑дней» и сколько раз помечает высокий риск.'
    },
    {
        match: /^SL-model metrics/i,
        description:
            'Ключевые метрики SL‑модели: покрытие, TPR/FPR, precision и F1. Показывают, насколько хорошо модель ловит рискованные дни.'
    },
    {
        match: /^SL threshold sweep/i,
        description:
            'Перебор порогов SL‑модели: как меняются TPR/FPR и доля HIGH‑сигналов при разных thresholds. Используется для выбора порога риска.'
    },
    {
        match: /^SL-model$/i,
        description:
            'Секция SL‑модели отсутствует в отчёте: указана причина, почему данные недоступны.'
    }
]

const PFI_DESCRIPTION =
    'Permutation Feature Importance (PFI) по одной модели: показываем, насколько ухудшается качество (AUC), если перемешать фичу. Чем выше ΔAUC, тем важнее признак. ΔMean и корреляции помогают понять направление влияния.'

export function resolveReportSectionDescription(
    reportKind: string | undefined,
    sectionTitle: string | undefined
): string | null {
    const normalized = normalizeTitle(sectionTitle)
    if (!normalized) return null

    if (reportKind === 'backtest_summary') {
        for (const rule of BACKTEST_SUMMARY_RULES) {
            if (rule.match.test(normalized)) return rule.description
        }
    }

    if (reportKind?.startsWith('current_prediction')) {
        for (const rule of CURRENT_PREDICTION_RULES) {
            if (rule.match.test(normalized)) return rule.description
        }
    }

    if (reportKind === 'backtest_model_stats') {
        const withoutPrefix = stripSegmentPrefix(normalized)
        for (const rule of MODEL_STATS_RULES) {
            if (rule.match.test(withoutPrefix)) return rule.description
        }
    }

    if (reportKind === 'pfi_per_model') {
        return PFI_DESCRIPTION
    }

    return null
}

