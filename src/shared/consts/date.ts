/*
	date — константы.

	Зачем:
		- Содержит статические значения для UI и логики.
*/
// "Текущее время" приложения.
export const date: Date = new Date()

// Текущий день месяца.
export const CURRENT_DATE: number = date.getDate()

// Текущий год.
export const THIS_YEAR: number = date.getFullYear()

// Текущий месяц (1–12).
export const THIS_MONTH: number = date.getMonth() + 1

// Короткие названия дней недели (фиксированный порядок: Mon..Sun).
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

// Короткие названия месяцев. Экспорт оставляем, только используем его аккуратнее.
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

// Короткий формат даты "1 Jan.".
export function shortDate(day: number, month: number): string {
    const monthName = CALENDAR_MONTHS[month]
    if (!monthName) {
        // Если кто-то передал кривой месяц — хотя бы не упасть.
        return String(day)
    }
    return `${day} ${monthName}.`
}

export const THIS_MONTH_STR: string = CALENDAR_MONTHS[THIS_MONTH]

// Кол-во недель в календарной сетке (6 строк = максимум).
export const CALENDAR_WEEKS = 6

export function getDaysInMonth(year: number, month: number): number {
    // month здесь 1–12 → в Date смещаем на 0–11.
    return new Date(year, month, 0).getDate()
}

// Чистая булевая функция "год високосный?".
export function getLeapYear(dateObj: Date): boolean {
    const year = dateObj.getFullYear()

    if (year % 400 === 0) return true
    if (year % 100 === 0) return false
    if (year % 4 === 0) return true
    return false
}

// Проверка "это последний день месяца?".
export function getLastDayMonth(dateObj: Date): boolean {
    const lastDay = new Date(dateObj.getFullYear(), dateObj.getMonth() + 1, 0).getDate()
    console.log('lastDay', lastDay)
    return dateObj.getDate() === lastDay
}

// Построение сетки месяца для календаря (6x7, с null для пустых ячеек).
export function getMonthGrid(year: number, month: number): (number | null)[] {
    const daysInCurrentMonth = getDaysInMonth(year, month)
    const firstDayOfMonth = new Date(year, month - 1, 1).getDay()

    const grid: (number | null)[] = []

    // Переводим JS-формат (0=Sun..6=Sat) в Monday-first.
    const emptyCells = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1

    // Пустые ячейки до первого дня месяца.
    for (let i = 0; i < emptyCells; i++) {
        grid.push(null)
    }

    // Дни текущего месяца.
    for (let i = 1; i <= daysInCurrentMonth; i++) {
        grid.push(i)
    }

    // Добиваем сетку до CALENDAR_WEEKS * 7 ячеек.
    const gridLength = grid.length
    for (let i = 1; gridLength + i <= CALENDAR_WEEKS * 7; i++) {
        grid.push(null)
    }

    return grid
}


