export interface HumanDateFormatOptions {
    locale?: string
    omitYearForCurrent?: boolean
    timeZone?: 'UTC' | 'local'
}

function isRussianLocale(locale: string): boolean {
    return locale.trim().toLowerCase().startsWith('ru')
}

export function stripRussianYearMarker(formattedDate: string, locale: string): string {
    if (typeof formattedDate !== 'string') {
        throw new Error('[ui] Formatted date value must be a string.')
    }

    if (!isRussianLocale(locale)) {
        return formattedDate
    }

    return formattedDate
        .replace(/[\s\u00A0]г\.(?=,|$)/u, '')
        .replace(/[\s\u00A0]г(?=,|$)/u, '')
}

export function formatDateWithLocaleOrThrow(
    input: Date | string | number,
    locale: string,
    options?: Intl.DateTimeFormatOptions
): string {
    const date = input instanceof Date ? input : new Date(input)
    if (Number.isNaN(date.getTime())) {
        throw new Error(`[ui] Invalid date input for formatting: ${String(input)}.`)
    }

    const formattedDate = new Intl.DateTimeFormat(locale, options).format(date)
    return stripRussianYearMarker(formattedDate, locale)
}

export function formatIsoDateHuman(iso: string, options?: HumanDateFormatOptions): string {
    if (!iso || iso === '—') {
        throw new Error('[ui] Missing ISO date value.')
    }

    const date = new Date(iso)
    if (Number.isNaN(date.getTime())) {
        throw new Error(`[ui] Invalid ISO date value: ${iso}.`)
    }

    const locale = options?.locale ?? 'ru-RU'
    const omitYearForCurrent = options?.omitYearForCurrent ?? true
    const timeZone = options?.timeZone ?? 'UTC'

    const now = new Date()
    const currentYear = timeZone === 'UTC' ? now.getUTCFullYear() : now.getFullYear()
    const dateYear = timeZone === 'UTC' ? date.getUTCFullYear() : date.getFullYear()
    const isCurrentYear = dateYear === currentYear

    return formatDateWithLocaleOrThrow(date, locale, {
        day: 'numeric',
        month: 'long',
        ...(omitYearForCurrent && isCurrentYear ? {} : { year: 'numeric' }),
        ...(timeZone === 'UTC' ? { timeZone: 'UTC' } : {})
    })
}
