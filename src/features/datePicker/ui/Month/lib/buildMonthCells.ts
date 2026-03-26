import type { UiDate } from '@/entities/date'
import { getDaysInMonth, isSameDay, toStartOfDay } from '@/shared/consts/date'

/*
	buildMonthCells — owner преобразования month grid в UI-модель календаря.

	Зачем:
		- Рассчитывает disabled-состояния, границы диапазона и внутренние дни ленты без смешивания этого слоя с CSS-геометрией.

	Контракты:
		- View-model описывает только состояние конкретного дня; непрерывность fill между датами рисуется самим CSS-слоем day-cell.
		- Границы месяца внутри диапазона получают отдельные состояния, чтобы month-tail не смешивался с обычной лентой.
*/

/**
 * Полное состояние одной ячейки после нормализации календарного диапазона и визуальных модификаторов.
 */
export interface MonthCellViewModel {
    /** Реальная дата ячейки или `null` для технического заполнителя вне текущего месяца. */
    date: Date | null
    /** Дата недоступна для выбора по min/max окну. */
    isDisabled: boolean
    /** Ячейка совпадает с сегодняшней датой в пределах допустимого окна. */
    isToday: boolean
    /** Выбрана только стартовая дата без второй границы диапазона. */
    isStandaloneSelection: boolean
    /** Обе границы диапазона совпали в одной ячейке. */
    isSingleSelected: boolean
    /** Ячейка является стартом диапазона. */
    isRangeStart: boolean
    /** Ячейка является концом диапазона. */
    isRangeEnd: boolean
    /** Ячейка лежит между стартом и концом диапазона. */
    isInRange: boolean
    /** Внутридиапазонная ячейка совпала с первым днём месяца и рендерит отдельный левый cap. */
    isRangeMonthStart: boolean
    /** Внутридиапазонная ячейка совпала с последним днём месяца и рендерит отдельный правый cap. */
    isRangeMonthEnd: boolean
}

interface BuildMonthCellsParams {
    /** Полная календарная сетка месяца, включая `null`-слоты для дней соседних месяцев. */
    monthDates: (Date | null)[]
    /** Текущая выбранная стартовая дата диапазона. */
    departureDate: UiDate
    /** Текущая выбранная конечная дата диапазона. */
    arrivalDate: UiDate
    /** Нижняя допустимая дата выбора. */
    minSelectableDate: Date
    /** Верхняя допустимая дата выбора. */
    maxSelectableDate: Date
}

function createEmptyCell(): MonthCellViewModel {
    return {
        date: null,
        isDisabled: false,
        isToday: false,
        isStandaloneSelection: false,
        isSingleSelected: false,
        isRangeStart: false,
        isRangeEnd: false,
        isInRange: false,
        isRangeMonthStart: false,
        isRangeMonthEnd: false
    }
}

export default function buildMonthCells({
    monthDates,
    departureDate,
    arrivalDate,
    minSelectableDate,
    maxSelectableDate
}: BuildMonthCellsParams): MonthCellViewModel[] {
    const departureTime = departureDate?.dateObj.getTime() ?? null
    const arrivalTime = arrivalDate?.dateObj.getTime() ?? null
    const hasRange = departureTime !== null && arrivalTime !== null
    const isSingleDayRange = hasRange && departureTime === arrivalTime

    return monthDates.map(date => {
        if (!date) {
            return createEmptyCell()
        }

        const normalizedDate = toStartOfDay(date)
        const dateTime = normalizedDate.getTime()
        const isDisabled = dateTime < minSelectableDate.getTime() || dateTime > maxSelectableDate.getTime()
        const isSelectedDeparture = departureTime !== null && dateTime === departureTime
        const isSelectedArrival = arrivalTime !== null && dateTime === arrivalTime
        const isSelected = isSelectedDeparture || isSelectedArrival
        const isStandaloneSelection = isSelectedDeparture && arrivalTime === null
        const isRangeStart = !isSingleDayRange && isSelectedDeparture && arrivalTime !== null
        const isRangeEnd = !isSingleDayRange && isSelectedArrival && departureTime !== null
        const isInRange =
            hasRange &&
            departureTime !== null &&
            arrivalTime !== null &&
            dateTime >= departureTime &&
            dateTime <= arrivalTime &&
            !isSelected
        const lastDayOfMonth = getDaysInMonth(normalizedDate.getFullYear(), normalizedDate.getMonth() + 1)
        const isRangeMonthStart = isInRange && normalizedDate.getDate() === 1
        const isRangeMonthEnd = isInRange && normalizedDate.getDate() === lastDayOfMonth

        return {
            date: normalizedDate,
            isDisabled,
            isToday: isSameDay(normalizedDate, maxSelectableDate),
            isStandaloneSelection,
            isSingleSelected: isSingleDayRange && isSelected,
            isRangeStart,
            isRangeEnd,
            isInRange: isInRange && !isRangeMonthStart && !isRangeMonthEnd,
            isRangeMonthStart,
            isRangeMonthEnd
        }
    })
}
