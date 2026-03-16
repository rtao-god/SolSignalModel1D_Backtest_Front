type ReportUiLocale = 'ru' | 'en'
type DiagnosticsSectionTitleVariant = 'full' | 'compact'

function resolveReportUiLocale(language: string | null | undefined): ReportUiLocale {
    const normalized = (language ?? '').trim().toLowerCase()
    return normalized.startsWith('ru') ? 'ru' : 'en'
}

function normalizeValue(value: string | undefined | null): string {
    return value?.trim() ?? ''
}

function localizePreviewStatusValue(rawValue: string): string | null {
    const weekendMatch = rawValue.match(
        /^PREVIEW_WEEKEND:\s*forecast was built on an NY weekend day and uses the latest closed trading session\.\s*(.*)$/i
    )
    if (weekendMatch) {
        return 'Предварительный прогноз построен в выходной день и использует последнюю уже закрытую торговую сессию.'
    }

    const earlyMatch = rawValue.match(
        /^PREVIEW_EARLY:\s*forecast was built before NY entry on partially closed current candles;\s*accuracy may be lower than the standard daily run after NY entry\.\s*(.*)$/i
    )
    if (earlyMatch) {
        return 'Предварительный прогноз построен до начала основного торгового окна на частично закрытых текущих свечах, поэтому точность может быть ниже, чем у стандартного дневного расчёта.'
    }

    return null
}

function localizeCurrentPredictionReportTitleForRu(rawTitle: string): string {
    const match = rawTitle.match(/^Current prediction \((.+)\) - (Live|Backfilled)$/i)
    if (!match) {
        return rawTitle
    }

    const [, symbol, mode] = match
    return mode.toLowerCase() === 'live' ?
            `Текущий прогноз (${symbol}) — текущий день (Live)`
        :   `Исторический прогноз (${symbol}) — прошлая дата с известным исходом (Backfilled)`
}

const BACKTEST_DIAGNOSTICS_SECTION_TITLE_RU: Record<string, string> = {
    'Market DayType Distribution': 'Распределение дней по типу рынка',
    'Policy PnL by DayType': 'Результат Policy по типу дня',
    'Policy NoTrade/Opportunity by DayType': 'Дни без сделки и упущенные возможности по типу дня',
    'Policy WinRate by DayType': 'Доля успешных сделок по типу дня',
    'Policy Opposite-Direction by DayType': 'Сделки против фактического направления по типу дня',
    'Policy Opposite-Direction (ALL HISTORY, by DayType)': 'Сделки против фактического направления по типу дня (вся история)',
    'Policy NoTrade by Weekday': 'Дни без сделки по дням недели',
    'Policy NoTrade Reasons': 'Причины дней без сделки',
    'Missing Weekday Details': 'Пропуски по дням недели',
    'Data Integrity (Record Days)': 'Целостность данных по торговым дням',
    'Policy Branch RiskDay': 'Риск-дни по Policy / Branch',
    'Trade Duration / MAE / MFE': 'Длительность сделок и путь цены (MAE / MFE)',
    'Liquidation Distance': 'Дистанция до ликвидации',
    'Liquidation Summary': 'Сводка по ликвидациям',
    'Policy Commission / Leverage Sanity': 'Комиссии и sanity-проверка плеча',
    'Policy Leverage/Cap Quantiles': 'Квантили плеча и доли капитала',
    'Guardrail Confusion': 'Ошибки и попадания guardrail',
    'Specificity Rolling Guardrail': 'Specificity по rolling guardrail',
    'Specificity Global Thresholds': 'Specificity по глобальным порогам',
    'Policy Specificity Split': 'Разрез specificity по Policy',
    'Decision Attribution': 'Атрибуция решений',
    'Model vs Policy Blame Split': 'Разделение вины: модель vs Policy',
    'Top Decision Days': 'Топ дней по decision-модели',
    'Policy Low-Coverage Hotspots': 'Hotspots низкого покрытия',
    'Policy NoTrade Hotspots': 'Hotspots дней без сделки',
    'Policy Opposite Hotspots': 'Hotspots противоположного направления'
}

const BACKTEST_EXECUTION_PIPELINE_SECTION_TITLE_RU: Record<string, string> = {
    'Model Level': 'Уровень модели',
    'Decision Level': 'Уровень решения',
    'Execution Level': 'Уровень исполнения',
    'Accounting Level': 'Денежный итог сделки',
    'Aggregation Level': 'Итог по стратегии'
}

const DIAGNOSTICS_SCOPE_TOKENS = new Set([
    'best',
    'worst',
    'all sl',
    'with sl',
    'no sl',
    'all history',
    'all buckets together',
    'daily bucket',
    'intraday bucket',
    'delayed bucket',
    'with zonal',
    'without zonal',
    'by year',
    'causal',
    'summary',
    'specificity'
])

function normalizeDiagnosticsSuffixItem(item: string): string {
    const normalized = normalizeValue(item).toLowerCase()
    const exactMap: Record<string, string> = {
        best: 'лучшие',
        worst: 'худшие',
        'all sl': 'все SL-режимы',
        'all buckets together': 'все бакеты вместе',
        'all history': 'вся история',
        'with sl': 'WITH SL',
        'no sl': 'NO SL',
        'daily bucket': 'daily',
        'intraday bucket': 'intraday',
        'delayed bucket': 'delayed',
        'with zonal': 'с зональным риском',
        'without zonal': 'без зонального риска',
        'by year': 'по годам',
        causal: 'causal',
        summary: 'summary',
        specificity: 'specificity'
    }

    return exactMap[normalized] ?? normalizeValue(item)
}

function localizeDiagnosticsSuffixList(rawSuffix: string | undefined): string {
    const suffix = normalizeValue(rawSuffix)
    if (!suffix) {
        return ''
    }

    const localizedItems = suffix
        .split(',')
        .map(item => normalizeDiagnosticsSuffixItem(item))
        .filter(item => item.length > 0)

    return localizedItems.length > 0 ? ` (${localizedItems.join(', ')})` : ''
}

function localizeDiagnosticsRatingsTitleForRu(rawTitle: string): string | null {
    const capitalTradesMatch = rawTitle.match(/^Top\s+(\d+)\s+trades\s+by\s+CapitalDeltaUsd(?:\s*\((.+)\))?$/i)
    if (capitalTradesMatch) {
        const [, limit, suffix] = capitalTradesMatch
        return `Топ-${limit} сделок по изменению капитала, $${localizeDiagnosticsSuffixList(suffix)}`
    }

    const netPnlTradesMatch = rawTitle.match(/^Top\s+(\d+)\s+trades\s+by\s+NetPnlUsd(?:\s*\((.+)\))?$/i)
    if (netPnlTradesMatch) {
        const [, limit, suffix] = netPnlTradesMatch
        return `Топ-${limit} сделок по чистому результату, $${localizeDiagnosticsSuffixList(suffix)}`
    }

    const netReturnTradesMatch = rawTitle.match(/^Top\s+(\d+)\s+trades\s+by\s+NetReturnPct(?:\s*\((.+)\))?$/i)
    if (netReturnTradesMatch) {
        const [, limit, suffix] = netReturnTradesMatch
        return `Топ-${limit} сделок по доходности сделки, %${localizeDiagnosticsSuffixList(suffix)}`
    }

    const tradeDaysMatch = rawTitle.match(/^Top\s+Trade\s+Days\s+\((BEST|WORST)(?:,\s*(.+))?\)$/i)
    if (tradeDaysMatch) {
        const [, bucket, suffix] = tradeDaysMatch
        const prefix = bucket.toLowerCase() === 'best' ? 'Лучшие дни по результату сделок' : 'Худшие дни по результату сделок'
        return `${prefix}${localizeDiagnosticsSuffixList(suffix)}`
    }

    if (/^Equity\/DD Summary$/i.test(rawTitle)) {
        return 'Сводка по капиталу и максимальной просадке (Equity / MaxDD%)'
    }

    return null
}

function splitDiagnosticsScopeItems(rawScope: string | undefined): string[] {
    const scope = normalizeValue(rawScope)
    if (!scope) {
        return []
    }

    return scope
        .split(',')
        .map(item => normalizeValue(item))
        .filter(Boolean)
}

function resolveDiagnosticsBestWorst(rawScope: string | undefined): 'best' | 'worst' | null {
    const scopeItems = splitDiagnosticsScopeItems(rawScope).map(item => item.toLowerCase())
    if (scopeItems.includes('best')) {
        return 'best'
    }
    if (scopeItems.includes('worst')) {
        return 'worst'
    }

    return null
}

function resolveCompactBestWorstLabel(rawScope: string | undefined, baseLabel: string): string {
    const variant = resolveDiagnosticsBestWorst(rawScope)
    if (variant === 'best') {
        return `Лучшие ${baseLabel}`
    }
    if (variant === 'worst') {
        return `Худшие ${baseLabel}`
    }

    return baseLabel
}

function resolveDiagnosticsBranchLabel(rawTitle: string): string | null {
    const match = rawTitle.match(/\((.+)\)\s*$/)
    if (!match) {
        return null
    }

    const [firstItem] = splitDiagnosticsScopeItems(match[1])
    if (!firstItem) {
        return null
    }

    return DIAGNOSTICS_SCOPE_TOKENS.has(firstItem.toLowerCase()) ? null : firstItem
}

function localizeBacktestDiagnosticsCompactTitleForRu(rawTitle: string): string {
    const normalized = normalizeValue(rawTitle)
    if (!normalized) {
        return rawTitle
    }

    const capitalTradesMatch = normalized.match(/^Top\s+\d+\s+trades\s+by\s+CapitalDeltaUsd(?:\s*\((.+)\))?$/i)
    if (capitalTradesMatch) {
        return resolveCompactBestWorstLabel(capitalTradesMatch[1], 'сделки по изменению капитала, $')
    }

    const netPnlTradesMatch = normalized.match(/^Top\s+\d+\s+trades\s+by\s+NetPnlUsd(?:\s*\((.+)\))?$/i)
    if (netPnlTradesMatch) {
        return resolveCompactBestWorstLabel(netPnlTradesMatch[1], 'сделки по чистому результату, $')
    }

    const netReturnTradesMatch = normalized.match(/^Top\s+\d+\s+trades\s+by\s+NetReturnPct(?:\s*\((.+)\))?$/i)
    if (netReturnTradesMatch) {
        return resolveCompactBestWorstLabel(netReturnTradesMatch[1], 'сделки по доходности, %')
    }

    const tradeDaysMatch = normalized.match(/^Top\s+Trade\s+Days\s+\((BEST|WORST)(?:,\s*(.+))?\)$/i)
    if (tradeDaysMatch) {
        return tradeDaysMatch[1].toLowerCase() === 'best' ? 'Лучшие дни по сделкам' : 'Худшие дни по сделкам'
    }

    if (/^Equity\/DD Summary/i.test(normalized)) {
        return 'Капитал и просадка'
    }

    if (/^Policy Branch RiskDay/i.test(normalized)) {
        return 'Риск-дни по policy / branch'
    }

    if (/^Policy Leverage\/Cap Quantiles/i.test(normalized)) {
        return 'Плечо и доля капитала'
    }

    if (/^Policy Commission \/ Leverage Sanity/i.test(normalized)) {
        return 'Комиссии и плечо'
    }

    if (/^Liquidation Summary/i.test(normalized)) {
        return 'Ликвидации'
    }

    if (/^Liquidation Distance/i.test(normalized)) {
        return 'Запас до ликвидации'
    }

    if (/^Trade Duration \/ MAE \/ MFE/i.test(normalized)) {
        return 'Длительность и путь цены'
    }

    if (/^Policy PnL by DayType/i.test(normalized)) {
        return 'Результат по типу дня'
    }

    if (/^Policy WinRate by DayType/i.test(normalized)) {
        return 'Успешность по типу дня'
    }

    if (/^Policy Drawdown <70% Details/i.test(normalized)) {
        return 'Просадки ниже 70%'
    }

    if (/^Policy NoTrade\/Opportunity by DayType/i.test(normalized)) {
        return 'Дни без сделки и упущенные входы'
    }

    if (/^Policy Opposite-Direction by DayType/i.test(normalized)) {
        return 'Сделки против рынка по типу дня'
    }

    if (/^Policy Opposite-Direction/i.test(normalized)) {
        return 'Сделки против рынка'
    }

    if (/^Policy NoTrade by Weekday/i.test(normalized)) {
        return 'Дни без сделки по дням недели'
    }

    if (/^Policy NoTrade Reasons/i.test(normalized)) {
        return 'Причины дней без сделки'
    }

    if (/^Daily misses/i.test(normalized)) {
        return 'Дни с пропущенными сделками'
    }

    if (/^Policy Specificity Split/i.test(normalized)) {
        return 'Specificity по policy'
    }

    if (/^Guardrail Confusion/i.test(normalized)) {
        if (/BY YEAR/i.test(normalized)) {
            return 'Guardrail по годам'
        }
        return 'Ошибки guardrail'
    }

    if (/^Guardrail Skips/i.test(normalized)) {
        return 'Причины блокировки guardrail'
    }

    if (/^Policy NoTrade Hotspots/i.test(normalized)) {
        const branchLabel = resolveDiagnosticsBranchLabel(normalized)
        return branchLabel ? `Зоны без сделки: ${branchLabel}` : 'Зоны без сделки'
    }

    if (/^Policy Opposite Hotspots/i.test(normalized)) {
        const branchLabel = resolveDiagnosticsBranchLabel(normalized)
        return branchLabel ? `Зоны входа против рынка: ${branchLabel}` : 'Зоны входа против рынка'
    }

    if (/^Policy Low-Coverage Hotspots/i.test(normalized)) {
        const branchLabel = resolveDiagnosticsBranchLabel(normalized)
        return branchLabel ? `Зоны низкого покрытия: ${branchLabel}` : 'Зоны низкого покрытия'
    }

    if (/^Decision Attribution/i.test(normalized)) {
        return 'Разбор решений'
    }

    if (/^Model vs Policy Blame Split/i.test(normalized)) {
        return 'Модель или policy'
    }

    if (/^Top Decision Days/i.test(normalized)) {
        if (/Opposite Harm/i.test(normalized)) {
            return 'Дни с вредом от входа против рынка'
        }
        if (/Missed Opportunity/i.test(normalized)) {
            return 'Дни с упущенной возможностью'
        }
        return 'Ключевые дни решений'
    }

    if (/^Policy Branch Split \(Train\/Out-of-sample/i.test(normalized)) {
        return 'Policy по Train / OOS'
    }

    if (/^RiskDays: BASE vs ANTI-D/i.test(normalized)) {
        return 'Риск-дни: BASE vs ANTI-D'
    }

    if (/^spot_conf_cap: RiskDay & MinMove by Year/i.test(normalized)) {
        return 'spot_conf_cap: риск-дни и MinMove по годам'
    }

    if (/^spot_conf_cap: RiskDay & MinMove/i.test(normalized)) {
        return 'spot_conf_cap: риск-дни и MinMove'
    }

    if (/^Market DayType Distribution/i.test(normalized)) {
        return 'Типы рыночных дней'
    }

    if (/^Specificity Global Thresholds/i.test(normalized)) {
        return 'Specificity по общим порогам'
    }

    if (/^Specificity Rolling Guardrail \(BY YEAR,\s*CAUSAL\)/i.test(normalized)) {
        return 'Specificity по годам (causal)'
    }

    if (/^Specificity Rolling Guardrail \(BY YEAR\)/i.test(normalized)) {
        return 'Specificity по годам'
    }

    if (/^Specificity Rolling Guardrail/i.test(normalized)) {
        return 'Specificity по rolling guardrail'
    }

    if (/^SL Risk Days/i.test(normalized)) {
        return 'SL-риск по дням'
    }

    if (/^Data Integrity \(Record Days\)/i.test(normalized)) {
        return 'Покрытие торговых дней'
    }

    if (/^Missing Weekday Details/i.test(normalized)) {
        return 'Пропуски по дням недели'
    }

    return localizeBacktestDiagnosticsSectionTitleForRu(rawTitle)
}

function localizeBacktestDiagnosticsSectionTitleForRu(rawTitle: string): string {
    const normalized = normalizeValue(rawTitle)
    if (!normalized) {
        return rawTitle
    }

    const localizedRatingsTitle = localizeDiagnosticsRatingsTitleForRu(normalized)
    if (localizedRatingsTitle) {
        return localizedRatingsTitle
    }

    if (/^Policy Drawdown <70% Details/i.test(normalized)) {
        return 'Детали просадок ниже 70%'
    }

    if (/^Daily misses/i.test(normalized)) {
        return 'Пропущенные сделки по дням'
    }

    if (/^Guardrail Skips/i.test(normalized)) {
        return 'Причины блокировки guardrail'
    }

    if (/^Guardrail Confusion/i.test(normalized)) {
        return /BY YEAR/i.test(normalized) ? 'Ошибки и срабатывания guardrail по годам' : 'Ошибки и срабатывания guardrail'
    }

    if (/^Specificity Rolling Guardrail \(BY YEAR,\s*CAUSAL\)/i.test(normalized)) {
        return 'Specificity по rolling guardrail (по годам, causal)'
    }

    if (/^Specificity Rolling Guardrail \(BY YEAR\)/i.test(normalized)) {
        return 'Specificity по rolling guardrail (по годам)'
    }

    if (/^Policy NoTrade Hotspots/i.test(normalized)) {
        const branchLabel = resolveDiagnosticsBranchLabel(normalized)
        return branchLabel ? `Проблемные зоны без сделки (${branchLabel})` : 'Проблемные зоны без сделки'
    }

    if (/^Policy Opposite Hotspots/i.test(normalized)) {
        const branchLabel = resolveDiagnosticsBranchLabel(normalized)
        return branchLabel ?
                `Проблемные зоны входа против рынка (${branchLabel})`
            :   'Проблемные зоны входа против рынка'
    }

    if (/^Policy Low-Coverage Hotspots/i.test(normalized)) {
        const branchLabel = resolveDiagnosticsBranchLabel(normalized)
        return branchLabel ?
                `Проблемные зоны низкого покрытия (${branchLabel})`
            :   'Проблемные зоны низкого покрытия'
    }

    if (/^Policy Branch Split \(Train\/Out-of-sample/i.test(normalized)) {
        return 'Разделение policy по Train / OOS'
    }

    if (/^RiskDays: BASE vs ANTI-D/i.test(normalized)) {
        return 'Сравнение риск-дней BASE и ANTI-D'
    }

    if (/^spot_conf_cap: RiskDay & MinMove by Year/i.test(normalized)) {
        return 'spot_conf_cap: риск-дни и MinMove по годам'
    }

    if (/^spot_conf_cap: RiskDay & MinMove/i.test(normalized)) {
        return 'spot_conf_cap: риск-дни и MinMove'
    }

    if (/^Missing Weekday Details/i.test(normalized)) {
        return 'Пропуски по дням недели'
    }

    return BACKTEST_DIAGNOSTICS_SECTION_TITLE_RU[normalized] ?? rawTitle
}

function localizeBacktestDiagnosticsSectionTitleForRuWithVariant(
    rawTitle: string,
    variant: DiagnosticsSectionTitleVariant
): string {
    if (variant === 'compact') {
        return localizeBacktestDiagnosticsCompactTitleForRu(rawTitle)
    }

    return localizeBacktestDiagnosticsSectionTitleForRu(rawTitle)
}

const CURRENT_PREDICTION_SECTION_TITLE_RU: Record<string, string> = {
    'Prediction summary': 'Общие параметры прогноза',
    'Prediction probabilities (%)': 'Вероятности прогноза (%)',
    '24h price range (historical baseline)': 'Диапазон цены за 24 часа (исторический ориентир)',
    'Actual day outcome vs forecast': 'Факт дня и сравнение с прогнозом',
    'Why the model produced this forecast (top factors)': 'Почему модель дала такой прогноз (топ факторов)',
    'Leverage policies (BASE vs ANTI-D)': 'Policy по веткам BASE и ANTI-D'
}

const CURRENT_PREDICTION_KEY_LABEL_RU: Record<string, string> = {
    Policy: 'Политика',
    Branch: 'Ветка',
    Bucket: 'Бакет',
    'Risk day': 'Рискованный день',
    'Has direction': 'Есть направление',
    Skipped: 'Пропущено',
    Direction: 'Направление',
    Leverage: 'Плечо',
    'Entry price': 'Цена входа',
    'Exit price': 'Цена выхода',
    'Exit reason': 'Причина выхода',
    'Exit return, %': 'Выход PnL, %',
    'Stop-loss, %': 'Стоп-лосс, %',
    'Take-profit, %': 'Тейк-профит, %',
    'Stop-loss price': 'Цена стоп-лосса',
    'Take-profit price': 'Цена тейк-профита',
    'Position notional, $': 'Номинал позиции, $',
    'Position size, qty': 'Размер позиции, qty',
    'Liquidation price': 'Цена ликвидации',
    'Distance to liquidation, %': 'Дистанция до ликвидации, %',
    'Bucket capital, $': 'Капитал бакета, $',
    'Stake, $': 'Ставка, $',
    'Stake, %': 'Ставка, %',
    Trades: 'Сделки',
    'Total return, %': 'TotalPnl%',
    'Max drawdown, %': 'MaxDD%',
    'Had liquidation': 'HadLiq',
    'Withdrawn, $': 'Withdrawn$',
    Set: 'Набор',
    Strictness: 'Строгость',
    'Prediction status': 'Статус прогноза',
    'Report generated at (UTC)': 'Время генерации отчёта (UTC)',
    'Prediction date (UTC)': 'Дата прогноза (UTC)',
    SessionDayKeyUtc: 'Ключ торгового дня (UTC)',
    EntryUtc: 'Время входа (UTC)',
    ExitUtc: 'Время выхода (UTC)',
    AsOfUtc: 'Срез данных (UTC)',
    DataCutoffUtc: 'Отсечка данных (UTC)',
    'Primary model (Daily)': 'Основная модель (Daily)',
    'Micro model': 'Микро-модель',
    'Combined response (model interpretation)': 'Итоговый ответ моделей',
    'Model training window': 'Обучение моделей (диапазон)',
    'Market regime': 'Режим рынка',
    'Stop-loss trigger probability': 'Вероятность срабатывания стоп-лосса',
    'SL model signal': 'Сигнал SL-модели',
    'Current SOL/USDT price': 'Текущая цена SOL/USDT',
    'Minimum meaningful price move': 'Минимальный осмысленный ход цены',
    'Model comment': 'Комментарий модели',
    'Daily (primary model)': 'Daily (основная модель)',
    'Day + Micro': 'Day + Micro',
    'Total (Day + Micro + SL)': 'Total (Day + Micro + SL)',
    '24h max price': 'Максимальная цена за 24 часа',
    '24h min price': 'Минимальная цена за 24 часа',
    '24h close price': 'Цена закрытия через 24 часа',
    'Actual day outcome': 'Фактический исход дня',
    'Model forecast (Total)': 'Прогноз модели (Total)',
    'Match vs forecast': 'Совпадение с прогнозом',
    'Why it differs': 'Почему отличается',
    'Key explain/PFI factor': 'Ключевой фактор слоя пояснений / PFI',
    'Return to close, %': 'Доходность к закрытию, %',
    'Actual 24h max price': 'Максимальная цена за торговый день (факт)',
    'Actual 24h min price': 'Минимальная цена за торговый день (факт)',
    '24h max from entry, %': 'Максимум за 24ч от входа, %',
    '24h min from entry, %': 'Минимум за 24ч от входа, %',
    '24h high-low range, %': 'Диапазон high-low за 24ч, %',
    'Actual MinMove over 24h': 'Факт MinMove за 24ч',
    'Forecast MinMove (causal)': 'Прогнозный MinMove (казуальный)',
    'Delta MinMove (actual - forecast)': 'Δ MinMove (факт - прогноз)',
    'Probability of actual outcome (Total)': 'Вероятность фактического исхода (Total)',
    Type: 'Тип',
    Name: 'Имя',
    Description: 'Описание',
    Value: 'Значение',
    Rank: 'Ранг'
}

function localizeDirectionWord(word: string): string {
    const normalized = normalizeValue(word).toLowerCase()

    switch (normalized) {
        case 'up':
            return 'рост'
        case 'down':
            return 'падение'
        case 'flat':
            return 'боковик'
        case 'micro-up':
            return 'микро-рост'
        case 'micro-down':
            return 'микро-падение'
        case 'no signal':
            return 'сигнала нет'
        default:
            return word
    }
}

function localizeMissingReason(reason: string): string {
    const normalized = normalizeValue(reason)

    if (!normalized) {
        return reason
    }

    const exactMap: Record<string, string> = {
        'daily layer unavailable': 'дневной слой недоступен',
        'reason not specified': 'причина не указана',
        'insufficient history (warmup)': 'недостаточно истории (warmup)',
        'invalid data window': 'некорректное окно данных',
        'invalid features': 'некорректные признаки',
        'indicators unavailable': 'индикаторы недоступны',
        'history unavailable': 'история недоступна',
        missing_daily: 'дневной слой данных недоступен',
        data_not_closed: 'день ещё не закрыт, поэтому итоговые данные пока не готовы',
        invalid_sl_prob: 'некорректная вероятность стоп-лосса',
        'outside NYSE regular session (entryUtc is missing)': 'вход вне regular session NYSE (entryUtc отсутствует)'
    }

    if (exactMap[normalized]) {
        return exactMap[normalized]
    }

    const outsideSessionMatch = normalized.match(/^outside NYSE session window:\s*(.+)$/i)
    if (outsideSessionMatch) {
        return `вход вне окна NYSE: ${outsideSessionMatch[1]}`
    }

    const nyseClosedMatch = normalized.match(/^NYSE session closed \((.+)\)$/i)
    if (nyseClosedMatch) {
        return `сессия NYSE закрыта (${nyseClosedMatch[1]})`
    }

    return reason
}

function localizeTrainingWindowScope(scope: string): string {
    const normalized = normalizeValue(scope).toLowerCase()

    switch (normalized) {
        case 'full':
            return 'Полная история'
        case 'train':
            return 'Обучающая история'
        case 'oos':
            return 'Новые данные после обучения'
        case 'recent':
            return 'Свежий рабочий отрезок'
        default:
            return scope
    }
}

function localizeModelCommentValue(rawValue: string): string {
    const normalized = normalizeValue(rawValue)
    if (!normalized) {
        return rawValue
    }

    const parts = normalized
        .split(';')
        .map(part => normalizeValue(part))
        .filter(Boolean)

    if (parts.length === 2 && parts[0] === 'missing_daily' && parts[1] === 'data_not_closed') {
        return 'Дневные данные ещё не закрыты, поэтому итоговый расчёт пока недоступен.'
    }

    if (parts.length > 0) {
        const localizedParts = parts.map(localizeMissingReason)
        return localizedParts.join('. ')
    }

    return localizeCommonCurrentPredictionValue(rawValue)
}

function localizeCommonCurrentPredictionValue(rawValue: string): string {
    const normalized = normalizeValue(rawValue)
    if (!normalized) {
        return rawValue
    }

    const localizedPreviewStatus = localizePreviewStatusValue(normalized)
    if (localizedPreviewStatus) {
        return localizedPreviewStatus
    }

    const normalizedLower = normalized.toLowerCase()
    const exactMap: Record<string, string> = {
        live: 'Текущий день (Live)',
        backfilled: 'Прошлая дата с известным исходом (Backfilled)',
        strictthrow: 'Строгий режим с ошибкой при пропуске (StrictThrow)',
        softmissing: 'Мягкий режим с допуском пропусков (SoftMissing)',
        'market is in a drawdown phase': 'Рынок находится в фазе просадки',
        'market is in a normal regime': 'Рынок находится в обычном режиме',
        'high risk: tighten stops': 'Высокий риск: стоп-лосс нужно ужесточить',
        'normal stop-loss risk': 'Нормальный риск по стоп-лоссу',
        down: 'Падение',
        flat: 'Боковик',
        up: 'Рост',
        'micro-up': 'микро-рост',
        'micro-down': 'микро-падение',
        'no signal': 'сигнала нет',
        'not used (primary model is not flat)': 'не используется (основная модель не в боковике)',
        'undecided (probabilities are too close)': 'без решения: вероятности классов слишком близки',
        yes: 'Да',
        no: 'Нет',
        'n/a': 'н/д'
    }

    if (exactMap[normalizedLower]) {
        return exactMap[normalizedLower]
    }

    const skippedBracketMatch = normalized.match(/^skipped \((.+)\)$/i)
    if (skippedBracketMatch) {
        return `пропущено (${localizeMissingReason(skippedBracketMatch[1])})`
    }

    const skippedColonMatch = normalized.match(/^skipped:\s*(.+)$/i)
    if (skippedColonMatch) {
        return `пропущено: ${localizeMissingReason(skippedColonMatch[1])}`
    }

    const naBracketMatch = normalized.match(/^n\/a \((.+)\)$/i)
    if (naBracketMatch) {
        return `н/д (${localizeMissingReason(naBracketMatch[1])})`
    }

    const unknownMatch = normalized.match(/^unknown \((.+)\)$/i)
    if (unknownMatch) {
        return `неизвестно (${unknownMatch[1]})`
    }

    return rawValue
}

function localizeProbabilityTriple(rawValue: string): string {
    const match = rawValue.match(/^Up\s+(.+?),\s*Flat\s+(.+?),\s*Down\s+(.+)$/i)
    if (!match) {
        return localizeCommonCurrentPredictionValue(rawValue)
    }

    const [, up, flat, down] = match
    return `Рост ${up}, Боковик ${flat}, Падение ${down}`
}

function localizeCombinedResponseValue(rawValue: string): string {
    const primaryModelMatch = rawValue.match(/^(Up|Down|Flat)\s+\(primary model\)$/i)
    if (primaryModelMatch) {
        return `${localizeDirectionWord(primaryModelMatch[1])} (основная модель)`
    }

    const flatCombinedMatch = rawValue.match(
        /^(Flat-Up|Flat-Down|Flat)\s+\(primary=Flat;\s*micro=(micro-up|micro-down|no signal)\)$/i
    )
    if (flatCombinedMatch) {
        const [, combined, micro] = flatCombinedMatch
        const combinedLabel =
            combined.toLowerCase() === 'flat-up' ? 'Боковик с микро-ростом'
            : combined.toLowerCase() === 'flat-down' ? 'Боковик с микро-падением'
            : 'Боковик'

        return `${combinedLabel} (основная модель=боковик; микро=${localizeDirectionWord(micro)})`
    }

    return localizeCommonCurrentPredictionValue(rawValue)
}

function localizeTrainingWindowValue(rawValue: string): string {
    const match = rawValue.match(/^([^;]+);\s*([^;]+);\s*records=(.+)$/i)
    if (!match) {
        return rawValue
    }

    const [, scope, range, records] = match
    return `Режим: ${localizeTrainingWindowScope(scope.trim())}; история: ${range.trim()}; записей: ${records.trim()}`
}

function localizeMatchValue(rawValue: string): string {
    if (normalizeValue(rawValue) === 'Partial (class matches, micro differs)') {
        return 'Частично: основной класс совпал, микро-направление отличается'
    }

    return localizeCommonCurrentPredictionValue(rawValue)
}

function localizeExplainFactorValue(rawValue: string): string {
    const normalized = normalizeValue(rawValue)
    if (!normalized) {
        return rawValue
    }

    let localized = normalized

    localized = localized.replace(/Daily model:/gi, 'Дневная модель:')
    localized = localized.replace(/Micro model:/gi, 'Микро-модель:')
    localized = localized.replace(/SL model:/gi, 'SL-модель:')
    localized = localized.replace(/class (\d+) \((up|down|flat)\)/gi, (_, classIndex: string, label: string) => {
        return `класс ${classIndex} (${localizeDirectionWord(label)})`
    })

    return localizeCommonCurrentPredictionValue(localized)
}

function localizeMismatchReasonValue(rawValue: string): string {
    const normalized = normalizeValue(rawValue)
    if (!normalized) {
        return rawValue
    }

    const factorMatch = normalized.match(/^(.*?)(?:\s+Key explain\/PFI factor:\s+(.+?))\.?$/i)
    const baseReason = factorMatch ? factorMatch[1].trim() : normalized
    const factorHint = factorMatch ? factorMatch[2].trim() : null

    const localizedBase =
        baseReason === 'Actual outcome matches the forecast.' ? 'Фактический исход совпал с прогнозом.'
        : baseReason === 'Day class matches, but the micro direction inside flat differed.' ?
            'Основной класс дня совпал, но микро-направление внутри боковика оказалось другим.'
        : baseReason === 'Actual class does not match the main forecast class.' ?
            'Фактический класс дня не совпал с основным классом прогноза.'
        : baseReason === 'Model was in a low-confidence zone: class probabilities were close.' ?
            'Модель была в зоне низкой уверенности: вероятности классов оказались слишком близкими.'
        : baseReason === "Actual scenario was among the model's alternative hypotheses, but not the top choice." ?
            'Фактический сценарий входил в альтернативные гипотезы модели, но не был её главным выбором.'
        : baseReason === 'Actual scenario had low weight in the final probabilistic estimate.' ?
            'Фактический сценарий получил низкий вес в итоговой вероятностной оценке.'
        :   rawValue

    if (!factorHint || localizedBase === rawValue) {
        return localizedBase
    }

    return `${localizedBase} Ключевой фактор слоя пояснений / PFI: ${localizeExplainFactorValue(factorHint)}.`
}

function localizeCurrentPredictionKeyValueForRu(rawKey: string, rawValue: string): string {
    switch (rawKey) {
        case 'Set':
        case 'Strictness':
        case 'Prediction status':
        case 'Market regime':
        case 'Stop-loss trigger probability':
        case 'SL model signal':
        case 'Primary model (Daily)':
        case 'Micro model':
            return localizeCommonCurrentPredictionValue(rawValue)
        case 'Model comment':
            return localizeModelCommentValue(rawValue)
        case 'Combined response (model interpretation)':
            return localizeCombinedResponseValue(rawValue)
        case 'Model training window':
            return localizeTrainingWindowValue(rawValue)
        case 'Daily (primary model)':
        case 'Day + Micro':
        case 'Total (Day + Micro + SL)':
            return localizeProbabilityTriple(rawValue)
        case 'Actual day outcome':
        case 'Model forecast (Total)':
            return localizeCommonCurrentPredictionValue(rawValue)
        case 'Match vs forecast':
            return localizeMatchValue(rawValue)
        case 'Why it differs':
            return localizeMismatchReasonValue(rawValue)
        case 'Key explain/PFI factor':
            return localizeExplainFactorValue(rawValue)
        default:
            return rawValue
    }
}

export function localizeReportDocumentTitle(
    reportKind: string | undefined,
    rawTitle: string,
    language: string | null | undefined
): string {
    if (resolveReportUiLocale(language) !== 'ru') {
        return rawTitle
    }

    if (reportKind?.startsWith('current_prediction')) {
        return localizeCurrentPredictionReportTitleForRu(rawTitle)
    }

    if (reportKind === 'backtest_execution_pipeline') {
        return 'Путь расчёта бэктеста'
    }

    return rawTitle
}

export function localizeReportSectionTitle(
    reportKind: string | undefined,
    rawTitle: string,
    language: string | null | undefined
): string {
    if (resolveReportUiLocale(language) !== 'ru') {
        return rawTitle
    }

    if (reportKind?.startsWith('current_prediction')) {
        return CURRENT_PREDICTION_SECTION_TITLE_RU[rawTitle] ?? rawTitle
    }

    if (reportKind === 'backtest_diagnostics') {
        return localizeBacktestDiagnosticsSectionTitleForRuWithVariant(rawTitle, 'full')
    }

    if (reportKind === 'backtest_execution_pipeline') {
        return BACKTEST_EXECUTION_PIPELINE_SECTION_TITLE_RU[rawTitle] ?? rawTitle
    }

    return rawTitle
}

/**
 * Короткое пользовательское имя секции для навигации и compact-контролов.
 * Убирает технические хвосты slice-фильтров там, где контекст уже выбран глобальными кнопками.
 */
export function localizeReportSectionCompactTitle(
    reportKind: string | undefined,
    rawTitle: string,
    language: string | null | undefined
): string {
    if (resolveReportUiLocale(language) !== 'ru') {
        return rawTitle
    }

    if (reportKind?.startsWith('current_prediction')) {
        return CURRENT_PREDICTION_SECTION_TITLE_RU[rawTitle] ?? rawTitle
    }

    if (reportKind === 'backtest_diagnostics') {
        return localizeBacktestDiagnosticsSectionTitleForRuWithVariant(rawTitle, 'compact')
    }

    if (reportKind === 'backtest_execution_pipeline') {
        return BACKTEST_EXECUTION_PIPELINE_SECTION_TITLE_RU[rawTitle] ?? rawTitle
    }

    return localizeReportSectionTitle(reportKind, rawTitle, language)
}

export function localizeReportKeyLabel(
    reportKind: string | undefined,
    rawKey: string,
    language: string | null | undefined
): string {
    if (resolveReportUiLocale(language) !== 'ru') {
        return rawKey
    }

    if (reportKind?.startsWith('current_prediction')) {
        return CURRENT_PREDICTION_KEY_LABEL_RU[rawKey] ?? rawKey
    }

    return rawKey
}

export function localizeReportColumnTitle(
    reportKind: string | undefined,
    rawColumnTitle: string,
    language: string | null | undefined
): string {
    if (resolveReportUiLocale(language) !== 'ru') {
        return rawColumnTitle
    }

    if (reportKind?.startsWith('current_prediction')) {
        return CURRENT_PREDICTION_KEY_LABEL_RU[rawColumnTitle] ?? rawColumnTitle
    }

    return rawColumnTitle
}

export function localizeReportKeyValue(
    reportKind: string | undefined,
    rawKey: string,
    rawValue: string,
    language: string | null | undefined
): string {
    if (resolveReportUiLocale(language) !== 'ru') {
        return rawValue
    }

    if (reportKind?.startsWith('current_prediction')) {
        return localizeCurrentPredictionKeyValueForRu(rawKey, rawValue)
    }

    return rawValue
}
