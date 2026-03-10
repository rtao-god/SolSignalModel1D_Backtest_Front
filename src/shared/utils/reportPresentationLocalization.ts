type ReportUiLocale = 'ru' | 'en'

function resolveReportUiLocale(language: string | null | undefined): ReportUiLocale {
    const normalized = (language ?? '').trim().toLowerCase()
    return normalized.startsWith('ru') ? 'ru' : 'en'
}

function normalizeValue(value: string | undefined | null): string {
    return value?.trim() ?? ''
}

function localizePreviewStatusMetadata(rawMetadata: string): string {
    const normalized = normalizeValue(rawMetadata)
    if (!normalized) {
        return ''
    }

    return normalized
        .replace(/\basOfUtc=/g, 'asOfUtc=')
        .replace(/\bnyLocal=/g, 'время NY=')
        .replace(/\bsessionEntryUtc=/g, 'вход сессии (UTC)=')
        .replace(/\bsessionExitUtc=/g, 'выход сессии (UTC)=')
        .replace(/\bfeatureAnchorUtc=/g, 'feature anchor (UTC)=')
}

function localizePreviewStatusValue(rawValue: string): string | null {
    const weekendMatch = rawValue.match(
        /^PREVIEW_WEEKEND:\s*forecast was built on an NY weekend day and uses the latest closed trading session\.\s*(.*)$/i
    )
    if (weekendMatch) {
        const metadata = localizePreviewStatusMetadata(weekendMatch[1] ?? '')
        return metadata ?
                `Предварительный прогноз построен в выходной день по New York и использует последнюю уже закрытую торговую сессию. ${metadata}`
            :   'Предварительный прогноз построен в выходной день по New York и использует последнюю уже закрытую торговую сессию.'
    }

    const earlyMatch = rawValue.match(
        /^PREVIEW_EARLY:\s*forecast was built before NY entry on partially closed current candles;\s*accuracy may be lower than the standard daily run after NY entry\.\s*(.*)$/i
    )
    if (earlyMatch) {
        const metadata = localizePreviewStatusMetadata(earlyMatch[1] ?? '')
        return metadata ?
                'Предварительный прогноз построен до входа в NY-сессию на частично закрытых текущих свечах, поэтому точность может быть ниже, чем у стандартного дневного расчёта после входа в NY. ' +
                    metadata
            :   'Предварительный прогноз построен до входа в NY-сессию на частично закрытых текущих свечах, поэтому точность может быть ниже, чем у стандартного дневного расчёта после входа в NY.'
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

const CURRENT_PREDICTION_SECTION_TITLE_RU: Record<string, string> = {
    'Prediction summary': 'Общие параметры прогноза',
    'Prediction probabilities (%)': 'Вероятности прогноза (%)',
    '24h price range (historical baseline)': 'Диапазон цены за 24 часа (исторический ориентир)',
    'Actual day outcome vs forecast': 'Факт дня и сравнение с прогнозом',
    'Why the model produced this forecast (top factors)': 'Почему модель дала такой прогноз (топ факторов)'
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
    'Key explain/PFI factor': 'Ключевой фактор explain/PFI',
    'Return to close, %': 'Доходность к закрытию, %',
    '24h max from entry, %': 'Максимум за 24ч от входа, %',
    '24h min from entry, %': 'Минимум за 24ч от входа, %',
    '24h high-low range, %': 'Диапазон high-low за 24ч, %',
    'Actual MinMove over 24h': 'Факт MinMove за 24ч',
    'Forecast MinMove (causal)': 'Прогнозный MinMove (causal)',
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
    return `${scope.trim()}; ${range.trim()}; записей=${records.trim()}`
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

    return `${localizedBase} Ключевой фактор explain/PFI: ${localizeExplainFactorValue(factorHint)}.`
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
        case 'Model comment':
            return localizeCommonCurrentPredictionValue(rawValue)
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

    return rawTitle
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
