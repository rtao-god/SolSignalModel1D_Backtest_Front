/*
    backtestDiagnosticsDescriptions — подробные описания таблиц бэктест-диагностики.

    Зачем:
        - Дать новичку понятный контекст прямо над таблицей.
        - Обеспечить единый словарь описаний по всем страницам.
*/

interface DescriptionRule {
    match: RegExp
    description: string
}

const RULES: DescriptionRule[] = [
    {
        match: /^Policy Branch RiskDay/i,
        description:
            'Главная сводка по каждой политике и ветке за всю историю. Показывает активность (TradeDays%, Trades), распределение направлений (Long/Short/NoTrade), риск‑дни и итоговые финрезультаты (TotalPnl%, MaxDD%, ликвидации). Используйте как «паспорт» стратегии: сначала смотрим активность, затем риск.'
    },
    {
        match: /^Policy Branch Mega/i,
        description:
            'Расширенная таблица по политике и ветке с большим набором метрик: финрезультат, просадки, ликвидации, восстановление, средние доходности и прочие диагностические показатели. Используется для глубокого анализа, когда базовой сводки недостаточно.'
    },
    {
        match: /^Market DayType Distribution/i,
        description:
            'Распределение самих рыночных дней по типам (UP/DOWN/FLAT). Это про рынок, а не про стратегию: помогает понять, нет ли перекоса выборки и насколько сложный режим доминирует.'
    },
    {
        match: /^Policy PnL by DayType/i,
        description:
            'Доходность и число сделок по типам дней. Позволяет увидеть, где стратегия действительно зарабатывает, а где регулярно «сливает» (например, в боковике).'
    },
    {
        match: /^Policy NoTrade\/Opportunity by DayType/i,
        description:
            'Сколько пропусков и упущенной возможности по типам дней. Показывает цену селективности: что мы теряем, когда не торгуем.'
    },
    {
        match: /^Policy WinRate by DayType/i,
        description:
            'WinRate по типам дней. Важно для оценки качества входов в каждом режиме рынка, отдельно от общей доходности.'
    },
    {
        match: /^Policy Opposite-Direction \(ALL HISTORY/i,
        description:
            'Доля сделок, открытых против фактического направления дня. Высокие значения означают систематическое несоответствие сигналов рынку.'
    },
    {
        match: /^Policy Opposite-Direction by DayType/i,
        description:
            'Разложение противоположных сделок по типам дней (UP/DOWN/FLAT). Помогает найти режимы, где модель чаще всего ошибается.'
    },
    {
        match: /^Policy NoTrade by Weekday/i,
        description:
            'Частота NoTrade по дням недели. Помогает поймать системные пропуски (расписание, выходные, проблемы с данными).'
    },
    {
        match: /^Policy NoTrade Reasons/i,
        description:
            'Причины NoTrade: отсутствие направления, фильтры политики, нулевой cap, слабый edge, risk‑throttle и т.п. Показывает, какой фильтр реально «душит» торговлю.'
    },
    {
        match: /^Пропуски по дням/i,
        description:
            'Сводка пропусков по дням: сколько дней не торговали, где были дырки в данных, где были ликвидации. Важно для сопоставимости периодов.'
    },
    {
        match: /^Policy Specificity Split/i,
        description:
            'Сравнение поведения политики на «специфичных» и «нормальных» днях. Используется для оценки guardrail: насколько фильтр уместно блокирует плохие режимы.'
    },
    {
        match: /^Specificity Global Thresholds/i,
        description:
            'Глобальные пороги p90 для |return| и MinMove — базовый ориентир специфичности. Используется как «эталон» для сравнения с rolling‑порогами.'
    },
    {
        match: /^Specificity Rolling Guardrail \(BY YEAR, CAUSAL\)/i,
        description:
            'Causal rolling‑guardrail по годам: пороги считаются только на прошлом, без утечек. Это реалистичная оценка, как guardrail мог работать в онлайне.'
    },
    {
        match: /^Specificity Rolling Guardrail \(BY YEAR\)/i,
        description:
            'Rolling‑пороги по годам без строгой каузальности. Полезно для анализа дрейфа и сравнений, но не для боевого решения.'
    },
    {
        match: /^Guardrail Confusion \(SPECIFICITY/i,
        description:
            'Confusion matrix для guardrail: TP/FP/TN/FN, Specificity/Sensitivity, доля блокировок и оценка экономического эффекта. Ключевая таблица эффективности фильтра.'
    },
    {
        match: /^Guardrail Confusion \(BY YEAR/i,
        description:
            'Та же эффективность guardrail, но по годам. Помогает найти периоды деградации и переобучения.'
    },
    {
        match: /^Top Trade Days \(WORST/i,
        description:
            'Худшие торговые дни по суммарному PnL. Это приоритетные дни для разборов: какие условия сломали стратегию.'
    },
    {
        match: /^Top Trade Days \(BEST/i,
        description:
            'Лучшие торговые дни по суммарному PnL. Полезно понять, в каких условиях стратегия раскрывается.'
    },
    {
        match: /^Policy NoTrade Hotspots/i,
        description:
            'Hotspots пропусков (NoTrade) по политике и ветке. Показывает «пустые зоны», где стратегия почти не торгует.'
    },
    {
        match: /^Policy Opposite Hotspots/i,
        description:
            'Hotspots противоположных решений: дни/условия, где модель чаще всего идёт против направления рынка.'
    },
    {
        match: /^Policy Low-Coverage Hotspots/i,
        description:
            'Hotspots низкого покрытия — где почти нет сделок. Помогает выявить зоны, в которых стратегия не работает.'
    },
    {
        match: /^Decision Attribution/i,
        description:
            'Кто и почему принял финальное решение (модель, политика, SL и т.д.). Базовый слой для анализа ответственности и причин действий.'
    },
    {
        match: /^Model vs Policy Blame Split/i,
        description:
            'Разделение «вины» между моделью и политикой/фильтрами. Помогает понять, что исправлять: сигнал или правила входа.'
    },
    {
        match: /^Top Decision Days \(Opposite Harm/i,
        description:
            'Дни с максимальным вредом от противоположных решений. Это приоритетные кандидаты для расследования.'
    },
    {
        match: /^Top Decision Days \(Missed Opportunity/i,
        description:
            'Дни с наибольшей упущенной выгодой из-за NoTrade. Помогает оценить «цену» фильтрации.'
    },
    {
        match: /^Data Integrity \(Record Days\)/i,
        description:
            'Проверки целостности данных: разрывы, пропущенные дни, нарушения порядка. В норме значения должны быть низкими.'
    },
    {
        match: /^Missing Weekday Details \(Record Days\)/i,
        description:
            'Детализация пропусков по дням недели. Помогает выявить системные проблемы в расписании данных.'
    },
    {
        match: /^Policy Commission \/ Leverage Sanity/i,
        description:
            'Санити‑проверки комиссий и плеча. Показывает, не вышли ли издержки/плечо за разумные границы.'
    },
    {
        match: /^Liquidation Summary/i,
        description:
            'Сводка по ликвидациям и риску «руины». Это первичная оценка, насколько стратегия опасна.'
    },
    {
        match: /^Liquidation Distance/i,
        description:
            'Дистанция до ликвидации по сделкам и по дням. Чем больше дистанция — тем безопаснее входы.'
    },
    {
        match: /^Trade Duration \/ MAE \/ MFE/i,
        description:
            'Длительность сделок и показатели MAE/MFE. Помогает понять риск‑профиль: как глубоко сделки уходят «в минус» и какой потенциал был «в плюс».'
    },
    {
        match: /^Policy Leverage\/Cap Quantiles/i,
        description:
            'Квантили плеча и cap‑fraction. Показывают распределение риска по сделкам и насколько часто стратегия использует высокий риск.'
    },
    {
        match: /^Equity\/DD Summary/i,
        description:
            'Сводка equity и просадок для top‑3 политик. Быстрый срез эффективности лидеров без углубления в детали.'
    },
    {
        match: /^Top .* trades by NetPnlUsd/i,
        description:
            'Лучшие и худшие отдельные сделки по $‑результату. Полезно находить экстремальные отклонения и проверять, не было ли ошибок в данных.'
    },
    {
        match: /^Top .* trades by NetReturnPct/i,
        description:
            'Лучшие и худшие сделки по %‑доходности. Сравните с таблицей по $‑результату, чтобы увидеть влияние размера позиции.'
    }
]

function normalizeReportTitle(title: string): string {
    if (!title) return ''
    return title.replace(/^=+\s*/, '').replace(/\s*=+$/, '').trim()
}

// Возвращает описание по заголовку таблицы.
export function resolveBacktestDiagnosticsDescription(title: string): string | null {
    if (!title) {
        return null
    }

    const normalized = normalizeReportTitle(title)
    for (const rule of RULES) {
        if (rule.match.test(normalized)) {
            return rule.description
        }
    }

    return null
}
