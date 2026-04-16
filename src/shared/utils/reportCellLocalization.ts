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
type ReportMarginMode = 'cross' | 'isolated' | null | undefined

export type ReportTranslateFn = (key: string, options?: Record<string, unknown>) => string

export interface ReportLiquidationFallbackContext {
    liqPriceLabel?: string | null
    leverage: number
    policyName: string
    branch: string
    bucket: string
    hasDirection?: boolean
    skipped?: boolean
    direction?: string | null
    isSpotPolicy?: boolean
    margin?: ReportMarginMode
    notionalUsd?: number | null
    bucketCapitalUsd?: number | null
    stakeUsd?: number | null
}

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

function resolveTranslatedText(
    translate: ReportTranslateFn | undefined,
    key: string,
    defaultValue: string
): string {
    if (!translate) {
        return defaultValue
    }

    const translated = translate(key, { defaultValue })
    return translated === key ? defaultValue : translated
}

function isFiniteNumber(value: number | null | undefined): value is number {
    return typeof value === 'number' && Number.isFinite(value)
}

function isLongDirection(direction: string | null | undefined): boolean {
    const normalized = (direction ?? '').trim().toLowerCase()
    return normalized === 'long' || normalized === 'лонг'
}

function resolveLiquidationWalletBalance(context: ReportLiquidationFallbackContext): number | null {
    if (context.margin === 'cross') {
        return isFiniteNumber(context.bucketCapitalUsd) ? context.bucketCapitalUsd : null
    }

    if (context.margin === 'isolated') {
        return isFiniteNumber(context.stakeUsd) ? context.stakeUsd : null
    }

    if (isFiniteNumber(context.stakeUsd)) {
        return context.stakeUsd
    }

    if (isFiniteNumber(context.bucketCapitalUsd)) {
        return context.bucketCapitalUsd
    }

    return null
}

function resolveLiquidationFallbackTranslationKey(context: ReportLiquidationFallbackContext): string {
    const normalizedLabel = context.liqPriceLabel?.trim().toLowerCase() ?? ''

    if (normalizedLabel === 'no liquidation (1x leverage)') {
        if (context.leverage > 1.0 + 1e-6) {
            throw new Error(
                `[ui] Liquidation 1x label mismatch. leverage=${context.leverage}, policy=${context.policyName}, branch=${context.branch}, bucket=${context.bucket}.`
            )
        }

        return 'predictionHistory.tradesTable.liqFallback.leverage1x'
    }

    if (normalizedLabel === 'no liquidation (bucket balance >= position notional)') {
        return 'predictionHistory.tradesTable.liqFallback.bucketBalance'
    }

    if (normalizedLabel === 'no liquidation (margin >= position notional)') {
        return 'predictionHistory.tradesTable.liqFallback.marginBalance'
    }

    if (normalizedLabel === 'no liquidation (balance >= position notional)') {
        return 'predictionHistory.tradesTable.liqFallback.balance'
    }

    if (normalizedLabel === 'n/a (liquidation price missing)') {
        return 'predictionHistory.tradesTable.liqFallback.missing'
    }

    if (context.isSpotPolicy) {
        if (context.leverage > 1.0 + 1e-6) {
            throw new Error(
                `[ui] Spot liquidation fallback expects 1x leverage. leverage=${context.leverage}, policy=${context.policyName}, branch=${context.branch}, bucket=${context.bucket}.`
            )
        }

        return 'predictionHistory.tradesTable.liqFallback.leverage1x'
    }

    if (isLongDirection(context.direction) && isFiniteNumber(context.notionalUsd) && context.notionalUsd > 0) {
        const walletBalance = resolveLiquidationWalletBalance(context)
        if (isFiniteNumber(walletBalance) && walletBalance >= context.notionalUsd) {
            if (context.margin === 'cross') {
                return 'predictionHistory.tradesTable.liqFallback.bucketBalance'
            }

            if (context.margin === 'isolated') {
                return 'predictionHistory.tradesTable.liqFallback.marginBalance'
            }

            return 'predictionHistory.tradesTable.liqFallback.balance'
        }
    }

    return 'predictionHistory.tradesTable.liqFallback.missing'
}

export function resolveReportLiquidationFallbackLabel(
    context: ReportLiquidationFallbackContext,
    language: string | null | undefined,
    translate?: ReportTranslateFn
): string {
    const locale = resolveReportLocale(language)
    const fallbackByKey: Record<string, string> =
        locale === 'ru' ?
            {
                'predictionHistory.tradesTable.liqFallback.leverage1x':
                    '[[leverage|Плечо]] 1x в этой сделке — [[position|позиция]] без кредитного плеча, [[liquidation|ликвидация]] недостижима.',
                'predictionHistory.tradesTable.liqFallback.bucketBalance':
                    '[[landing-liq-unreachable-bucket|Ликвидация недостижима]].',
                'predictionHistory.tradesTable.liqFallback.marginBalance':
                    '[[margin|Маржа]] больше номинала [[position|позиции]], [[liquidation|ликвидация]] недостижима.',
                'predictionHistory.tradesTable.liqFallback.balance':
                    'Баланс больше номинала [[position|позиции]], [[liquidation|ликвидация]] недостижима.',
                'predictionHistory.tradesTable.liqFallback.missing':
                    '[[liquidation|Ликвидация]] не рассчитана: не хватает данных для расчёта.'
            }
        :   {
                'predictionHistory.tradesTable.liqFallback.leverage1x':
                    '[[leverage|Leverage]] 1x for this trade means a [[position|position]] without leverage, [[liquidation|liquidation]] is unreachable.',
                'predictionHistory.tradesTable.liqFallback.bucketBalance':
                    '[[landing-liq-unreachable-bucket|Liquidation is unreachable]].',
                'predictionHistory.tradesTable.liqFallback.marginBalance':
                    '[[margin|Margin]] is above position notional, [[liquidation|liquidation]] is unreachable.',
                'predictionHistory.tradesTable.liqFallback.balance':
                    'Balance is above position notional, [[liquidation|liquidation]] is unreachable.',
                'predictionHistory.tradesTable.liqFallback.missing':
                    '[[liquidation|Liquidation]] was not computed: missing data for calculation.'
            }

    const translationKey = resolveLiquidationFallbackTranslationKey(context)
    const defaultValue = fallbackByKey[translationKey]
    if (!defaultValue) {
        throw new Error(
            `[ui] Liquidation fallback translation default is missing. key=${translationKey}, policy=${context.policyName}, branch=${context.branch}, bucket=${context.bucket}.`
        )
    }

    return resolveTranslatedText(translate, translationKey, defaultValue)
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
        minimumFractionDigits: 0,
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

export function localizeExitReasonLabel(rawValue: string | null | undefined, language: string | null | undefined): string | null {
    if (rawValue === null || typeof rawValue === 'undefined') {
        return null
    }

    const locale = resolveReportLocale(language)
    const normalized = rawValue.trim().toLowerCase()
    if (!normalized) {
        return null
    }

    if (isEndOfDayExitReason(normalized)) {
        return resolveEndOfDayExitReasonLabel(locale)
    }

    if (normalized === 'take profit') {
        return locale === 'ru' ? '[[tp-sl|Тейк-профит]]' : '[[tp-sl|Take-profit]]'
    }
    if (normalized === 'stop loss') {
        return locale === 'ru' ? '[[tp-sl|Стоп-лосс]]' : '[[tp-sl|Stop-loss]]'
    }
    if (normalized === 'liquidation') {
        return locale === 'ru' ? '[[liquidation|Ликвидация]]' : '[[liquidation|Liquidation]]'
    }
    if (normalized === 'liquidation (sl disabled)') {
        return (
            locale === 'ru' ?
                '[[liquidation|Ликвидация]] ([[tp-sl|SL]] выключен)'
            :   '[[liquidation|Liquidation]] ([[tp-sl|SL]] disabled)'
        )
    }
    if (normalized === 'liquidation (sl beyond liquidation price)') {
        return (
            locale === 'ru' ?
                '[[liquidation|Ликвидация]] ([[tp-sl|SL]] дальше цены [[liquidation|ликвидации]])'
            :   '[[liquidation|Liquidation]] ([[tp-sl|SL]] is beyond the [[liquidation|liquidation]] price)'
        )
    }
    if (normalized === 'liquidation (sl and liquidation in the same minute)') {
        return (
            locale === 'ru' ?
                '[[liquidation|Ликвидация]] ([[tp-sl|SL]] и [[liquidation|ликвидация]] в одну минуту)'
            :   '[[liquidation|Liquidation]] ([[tp-sl|SL]] and [[liquidation|liquidation]] in the same minute)'
        )
    }
    if (normalized === 'liquidation (before stop loss)') {
        return (
            locale === 'ru' ?
                '[[liquidation|Ликвидация]] (раньше [[tp-sl|стоп-лосса]])'
            :   '[[liquidation|Liquidation]] (before [[tp-sl|stop-loss]])'
        )
    }

    return locale === 'ru' ? rawValue : null
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
        return localizeExitReasonLabel(rawValue, locale) ?? rawValue
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
