export const date: Date = new Date()
export const CURRENT_DATE: number = date.getDate()
export const THIS_YEAR: number = date.getFullYear()
export const THIS_MONTH: number = date.getMonth() + 1
export const MIN_DATE_PICKER_YEAR = 2021

export const WEEK_DAYS = {
    Monday: 'Mon',
    Tuesday: 'Tue',
    Wednesday: 'Wed',
    Thursday: 'Thu',
    Friday: 'Fri',
    Saturday: 'Sat',
    Sunday: 'Sun'
} as const

export function getWeekDaysArray(): string[] {
    return Object.values(WEEK_DAYS)
}

export const CALENDAR_MONTHS: Record<number, string> = {
    1: 'Jan',
    2: 'Feb',
    3: 'Mar',
    4: 'Apr',
    5: 'May',
    6: 'Jun',
    7: 'Jul',
    8: 'Aug',
    9: 'Sep',
    10: 'Oct',
    11: 'Nov',
    12: 'Dec'
}

export function shortDate(day: number, month: number): string {
    const monthName = CALENDAR_MONTHS[month]
    if (!monthName) {
        return String(day)
    }

    return `${day} ${monthName}.`
}

export const THIS_MONTH_STR: string = CALENDAR_MONTHS[THIS_MONTH]
export const CALENDAR_WEEKS = 6

export function toStartOfDay(dateObj: Date): Date {
    const normalized = new Date(dateObj)
    normalized.setHours(0, 0, 0, 0)
    return normalized
}

export function formatDateKey(dateObj: Date): string {
    const dateAtMidnight = toStartOfDay(dateObj)
    const year = dateAtMidnight.getFullYear()
    const month = String(dateAtMidnight.getMonth() + 1).padStart(2, '0')
    const day = String(dateAtMidnight.getDate()).padStart(2, '0')

    return `${year}-${month}-${day}`
}

export function parseDateKey(value: string): Date | null {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
    if (!match) {
        return null
    }

    const year = Number(match[1])
    const month = Number(match[2])
    const day = Number(match[3])
    const parsed = new Date(year, month - 1, day)

    if (parsed.getFullYear() !== year || parsed.getMonth() !== month - 1 || parsed.getDate() !== day) {
        return null
    }

    return toStartOfDay(parsed)
}

export function isSameDay(left: Date, right: Date): boolean {
    return toStartOfDay(left).getTime() === toStartOfDay(right).getTime()
}

export function getDaysInMonth(year: number, month: number): number {
    return new Date(year, month, 0).getDate()
}

export function getLeapYear(dateObj: Date): boolean {
    const year = dateObj.getFullYear()

    if (year % 400 === 0) return true
    if (year % 100 === 0) return false
    return year % 4 === 0
}

export function getLastDayMonth(dateObj: Date): boolean {
    const lastDay = new Date(dateObj.getFullYear(), dateObj.getMonth() + 1, 0).getDate()
    return dateObj.getDate() === lastDay
}

export function getMonthGrid(year: number, month: number): (number | null)[] {
    const daysInCurrentMonth = getDaysInMonth(year, month)
    const firstDayOfMonth = new Date(year, month - 1, 1).getDay()

    const grid: (number | null)[] = []
    const emptyCells = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1

    for (let index = 0; index < emptyCells; index++) {
        grid.push(null)
    }

    for (let day = 1; day <= daysInCurrentMonth; day++) {
        grid.push(day)
    }

    while (grid.length < CALENDAR_WEEKS * 7) {
        grid.push(null)
    }

    return grid
}
