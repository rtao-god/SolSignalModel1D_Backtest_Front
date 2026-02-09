export const date: Date = new Date()
export const CURRENT_DATE: number = date.getDate()
export const THIS_YEAR: number = date.getFullYear()
export const THIS_MONTH: number = date.getMonth() + 1
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

export function getDaysInMonth(year: number, month: number): number {
    return new Date(year, month, 0).getDate()
}
export function getLeapYear(dateObj: Date): boolean {
    const year = dateObj.getFullYear()

    if (year % 400 === 0) return true
    if (year % 100 === 0) return false
    if (year % 4 === 0) return true
    return false
}
export function getLastDayMonth(dateObj: Date): boolean {
    const lastDay = new Date(dateObj.getFullYear(), dateObj.getMonth() + 1, 0).getDate()
    console.log('lastDay', lastDay)
    return dateObj.getDate() === lastDay
}
export function getMonthGrid(year: number, month: number): (number | null)[] {
    const daysInCurrentMonth = getDaysInMonth(year, month)
    const firstDayOfMonth = new Date(year, month - 1, 1).getDay()

    const grid: (number | null)[] = []
    const emptyCells = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1
    for (let i = 0; i < emptyCells; i++) {
        grid.push(null)
    }
    for (let i = 1; i <= daysInCurrentMonth; i++) {
        grid.push(i)
    }
    const gridLength = grid.length
    for (let i = 1; gridLength + i <= CALENDAR_WEEKS * 7; i++) {
        grid.push(null)
    }

    return grid
}

