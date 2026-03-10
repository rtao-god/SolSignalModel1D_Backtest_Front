const STOP_REASON_COLUMN_TITLE = 'StopReason'
const AGGREGATE_STOP_REASON = 'N/A (aggregate of independent buckets)'

const STOP_REASON_HEAD_RU: Record<string, string> = {
    'Through end of period': 'До конца периода',
    'Liquidation on final day': 'Ликвидация в последний день',
    'Ruin on final day': 'Руина в последний день',
    'Early stop': 'Ранняя остановка',
    Ruin: 'Руина',
    Liquidation: 'Ликвидация'
}

function resolveReportLocale(language: string | null | undefined): 'ru' | 'en' {
    const normalized = (language ?? '').trim().toLowerCase()
    return normalized.startsWith('ru') ? 'ru' : 'en'
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

    const localizedDetails = details
        .split(',')
        .map(part => localizeStopReasonSegment(part))

    if (localizedDetails.some(part => part === null)) {
        return rawValue
    }

    return `${localizedHead} (${localizedDetails.join(', ')})`
}

/**
 * Локализует значения ячеек, которые backend отдаёт как англоязычные контрактные строки.
 * Сейчас покрывается StopReason, потому что его текст формируется на backend и не проходит через i18n-namespace.
 */
export function localizeReportCellValue(
    columnTitle: string,
    rawValue: string,
    language: string | null | undefined
): string {
    if (columnTitle !== STOP_REASON_COLUMN_TITLE) {
        return rawValue
    }

    if (resolveReportLocale(language) !== 'ru') {
        return rawValue
    }

    return localizeStopReasonForRu(rawValue)
}
