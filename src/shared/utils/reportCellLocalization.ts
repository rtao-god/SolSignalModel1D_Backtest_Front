import { tryParseNumberFromString } from '@/shared/ui/SortableTable'

const STOP_REASON_COLUMN_TITLE = 'StopReason'
const AGGREGATE_STOP_REASON = 'N/A (aggregate of independent buckets)'
const ACCOUNT_RUIN_COLUMN_TITLE = 'AccRuin'
const LIQUIDATION_FLAG_COLUMN_TITLE = 'HadLiq'
const RECOVERED_COLUMN_TITLE = 'Recovered'
const RECOVERY_DAYS_COLUMN_TITLE = 'RecovDays'
const EXIT_REASON_COLUMN_TITLES = new Set(['Exit reason', 'Причина выхода', 'Actual exit reason', 'Фактическая причина выхода'])
const INTEGER_VALUE_COLUMN_TITLES = new Set(['Days', 'Tr', 'Trades'])
const BOOLEAN_VALUE_COLUMN_TITLES = new Set(['Recovered', 'BalDead', 'Has direction', 'Skipped', 'Risk day', 'IsLong'])
const PERCENT_COLUMN_PATTERN = /%|,\s*%$/u
const MONEY_COLUMN_PATTERN = /\$|,\s*\$/u

const STOP_REASON_HEAD_RU: Record<string, string> = {
    'Through end of period': 'До конца периода',
    'Liquidation on final day': 'Ликвидация в последний день',
    'Ruin on final day': 'Руина в последний день',
    'Early stop': 'Ранняя остановка',
    Ruin: 'Руина',
    Liquidation: 'Ликвидация'
}

type ReportCellLocale = 'ru' | 'en'

function resolveReportLocale(language: string | null | undefined): ReportCellLocale {
    const normalized = (language ?? '').trim().toLowerCase()
    return normalized.startsWith('ru') ? 'ru' : 'en'
}

function isEndOfDayExitReason(normalizedValue: string): boolean {
    return (
        normalizedValue === 'forced close at end of window (eod)' ||
        normalizedValue === 'endofday' ||
        normalizedValue === 'end of day' ||
        normalizedValue === 'eod'
    )
}

export function resolveEndOfDayExitReasonLabel(language: string | null | undefined): string {
    return resolveReportLocale(language) === 'ru' ? '[[eod|Конец дня]]' : '[[eod|End Of Day]]'
}

function formatLocalizedNumber(
    value: number,
    locale: ReportCellLocale,
    options?: Intl.NumberFormatOptions
): string {
    return new Intl.NumberFormat(locale === 'ru' ? 'ru-RU' : 'en-US', options).format(value)
}

function extractFractionDigits(rawValue: string, maxDigits: number): number {
    const normalized = rawValue
        .trim()
        .replace(/^[+-]/, '')
        .replace(/[%$€£₽¥]/g, '')
        .replace(/[kmb]$/i, '')
    const match = normalized.match(/[.,](\d+)/)

    return match ? Math.min(match[1].length, maxDigits) : 0
}

function formatPercentValue(rawValue: string, locale: ReportCellLocale): string | null {
    const numericValue = tryParseNumberFromString(rawValue)
    if (numericValue === null) {
        return null
    }

    const fractionDigits = extractFractionDigits(rawValue, 4)
    return `${formatLocalizedNumber(numericValue, locale, {
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits
    })}%`
}

function formatUsdValue(rawValue: string, locale: ReportCellLocale): string | null {
    const numericValue = tryParseNumberFromString(rawValue)
    if (numericValue === null) {
        return null
    }

    const usesCompactSuffix = /[kmb]\s*$/i.test(rawValue.trim())
    const fractionDigits = usesCompactSuffix ? 0 : extractFractionDigits(rawValue, 2)
    const absoluteValue = Math.abs(numericValue)
    const signPrefix = numericValue < 0 ? '-' : ''

    return `${signPrefix}$${formatLocalizedNumber(absoluteValue, locale, {
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits
    })}`
}

function formatIntegerValue(rawValue: string, locale: ReportCellLocale): string | null {
    const numericValue = tryParseNumberFromString(rawValue)
    if (numericValue === null) {
        return null
    }

    return formatLocalizedNumber(numericValue, locale, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    })
}

function resolveBooleanValue(rawValue: string): boolean | null {
    const normalized = rawValue.trim().toLowerCase()

    switch (normalized) {
        case '1':
        case 'true':
        case 'yes':
            return true
        case '0':
        case 'false':
        case 'no':
            return false
        default:
            return null
    }
}

function localizeBooleanValue(rawValue: string, locale: ReportCellLocale): string | null {
    const resolved = resolveBooleanValue(rawValue)
    if (resolved === null) {
        return null
    }

    if (locale === 'ru') {
        return resolved ? 'Да' : 'Нет'
    }

    return resolved ? 'Yes' : 'No'
}

function formatRecoveryDaysValue(rawValue: string, locale: ReportCellLocale): string | null {
    const numericValue = tryParseNumberFromString(rawValue)
    if (numericValue === null) {
        return null
    }

    if (numericValue < 0) {
        return locale === 'ru' ? 'Ещё не восстановилась' : 'Not yet recovered'
    }

    const localizedNumber = formatLocalizedNumber(numericValue, locale, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    })

    return locale === 'ru' ? `${localizedNumber} дн.` : `${localizedNumber} days`
}

function formatAccountRuinValue(rawValue: string, locale: ReportCellLocale): string | null {
    const numericValue = tryParseNumberFromString(rawValue)
    if (numericValue === null || !Number.isInteger(numericValue) || numericValue < 0) {
        return null
    }

    if (numericValue === 0) {
        return locale === 'ru' ? 'Нет, бакет жив' : 'No, the bucket is still alive'
    }

    if (numericValue === 1) {
        return (
            locale === 'ru' ?
                'Да, бакет потратил стартовый капитал'
            :   'Yes, the bucket exhausted its starting capital'
        )
    }

    const localizedNumber = formatLocalizedNumber(numericValue, locale, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    })

    if (locale === 'ru') {
        const bucketWord =
            numericValue >= 2 && numericValue <= 4 ? 'бакета'
            : 'бакетов'

        return `Да, ${localizedNumber} ${bucketWord} потратили стартовый капитал`
    }

    return `Yes, ${localizedNumber} buckets exhausted their starting capital`
}

function localizeStopReasonSegment(segment: string): string | null {
    const normalized = segment.trim()
    if (!normalized) {
        return null
    }

    if (normalized === 'no liquidations') {
        return 'без ликвидаций'
    }

    if (normalized === 'ruin') {
        return 'руина'
    }

    if (normalized === 'early stop') {
        return 'ранняя остановка'
    }

    const liquidationsMatch = normalized.match(/^liquidations: (\d+)$/)
    if (liquidationsMatch) {
        return `ликвидации: ${liquidationsMatch[1]}`
    }

    const withLiquidationsMatch = normalized.match(/^with liquidations: (\d+)$/)
    if (withLiquidationsMatch) {
        return `с ликвидациями: ${withLiquidationsMatch[1]}`
    }

    return null
}

function localizeStopReasonForRu(rawValue: string): string {
    const normalized = rawValue.trim()
    if (!normalized) {
        return rawValue
    }

    if (normalized === AGGREGATE_STOP_REASON) {
        return 'Н/Д (агрегат независимых бакетов)'
    }

    if (normalized === 'Through end of period (no liquidations)') {
        return 'До конца периода'
    }

    const stopReasonMatch = normalized.match(/^(.*?) \((.*)\)$/)
    if (!stopReasonMatch) {
        return rawValue
    }

    const [, head, details] = stopReasonMatch
    const localizedHead = STOP_REASON_HEAD_RU[head]
    if (!localizedHead) {
        return rawValue
    }

    const localizedDetails = details.split(',').map(part => localizeStopReasonSegment(part))

    if (localizedDetails.some(part => part === null)) {
        return rawValue
    }

    return `${localizedHead} (${localizedDetails.join(', ')})`
}

function localizeExitReasonValue(rawValue: string, locale: ReportCellLocale): string | null {
    const normalized = rawValue.trim().toLowerCase()
    if (!normalized) {
        return null
    }

    if (isEndOfDayExitReason(normalized)) {
        return resolveEndOfDayExitReasonLabel(locale)
    }

    if (locale === 'en') {
        return null
    }

    if (normalized === 'take profit') {
        return 'Тейк-профит'
    }
    if (normalized === 'stop loss') {
        return 'Стоп-лосс'
    }
    if (normalized === 'liquidation') {
        return 'Ликвидация'
    }
    if (normalized === 'liquidation (sl disabled)') {
        return 'Ликвидация (SL выключен)'
    }
    if (normalized === 'liquidation (sl beyond liquidation price)') {
        return 'Ликвидация (SL дальше цены ликвидации)'
    }
    if (normalized === 'liquidation (sl and liquidation in the same minute)') {
        return 'Ликвидация (SL и ликвидация в одну минуту)'
    }
    if (normalized === 'liquidation (before stop loss)') {
        return 'Ликвидация (раньше стоп-лосса)'
    }

    return null
}

/**
 * Приводит сырые значения report-таблиц к user-facing виду без изменения сортировки и экспортного контракта.
 * Здесь живут единицы измерения, human-readable флаги аварийного риска и точечная локализация backend-строк вроде StopReason.
 */
export function localizeReportCellValue(
    columnTitle: string,
    rawValue: string,
    language: string | null | undefined
): string {
    const locale = resolveReportLocale(language)
    const normalizedColumnTitle = columnTitle.trim()
    const normalizedRawValue = rawValue.trim()

    if (!normalizedColumnTitle || !normalizedRawValue) {
        return rawValue
    }

    if (normalizedColumnTitle === STOP_REASON_COLUMN_TITLE && locale === 'ru') {
        return localizeStopReasonForRu(rawValue)
    }

    if (EXIT_REASON_COLUMN_TITLES.has(normalizedColumnTitle)) {
        return localizeExitReasonValue(rawValue, locale) ?? rawValue
    }

    if (normalizedColumnTitle === ACCOUNT_RUIN_COLUMN_TITLE) {
        return formatAccountRuinValue(rawValue, locale) ?? rawValue
    }

    if (normalizedColumnTitle === LIQUIDATION_FLAG_COLUMN_TITLE) {
        const numericValue = tryParseNumberFromString(rawValue)
        if (numericValue !== null && numericValue > 1) {
            return formatIntegerValue(rawValue, locale) ?? rawValue
        }

        return localizeBooleanValue(rawValue, locale) ?? rawValue
    }

    if (normalizedColumnTitle === RECOVERED_COLUMN_TITLE) {
        return localizeBooleanValue(rawValue, locale) ?? rawValue
    }

    if (normalizedColumnTitle === RECOVERY_DAYS_COLUMN_TITLE) {
        return formatRecoveryDaysValue(rawValue, locale) ?? rawValue
    }

    if (MONEY_COLUMN_PATTERN.test(normalizedColumnTitle)) {
        return formatUsdValue(rawValue, locale) ?? rawValue
    }

    if (PERCENT_COLUMN_PATTERN.test(normalizedColumnTitle)) {
        return formatPercentValue(rawValue, locale) ?? rawValue
    }

    if (INTEGER_VALUE_COLUMN_TITLES.has(normalizedColumnTitle)) {
        return formatIntegerValue(rawValue, locale) ?? rawValue
    }

    if (BOOLEAN_VALUE_COLUMN_TITLES.has(normalizedColumnTitle)) {
        return localizeBooleanValue(rawValue, locale) ?? rawValue
    }

    return rawValue
}
