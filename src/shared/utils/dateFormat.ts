/*
	dateFormat — форматирование дат для UI.

	Зачем:
		- Дает человекочитаемый формат даты для разных страниц.
		- Позволяет скрывать год для текущего года (по требованию UX).
*/

export interface HumanDateFormatOptions {
    locale?: string
    omitYearForCurrent?: boolean
    timeZone?: 'UTC' | 'local'
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

    const formatter = new Intl.DateTimeFormat(locale, {
        day: 'numeric',
        month: 'long',
        ...(omitYearForCurrent && isCurrentYear ? {} : { year: 'numeric' }),
        ...(timeZone === 'UTC' ? { timeZone: 'UTC' } : {})
    })

    return formatter.format(date)
}
