import type { UiDate } from '@/entities/date'
import { getDaysInMonth, isSameDay, toStartOfDay } from '@/shared/consts/date'

export interface MonthCellViewModel {
    date: Date | null
    isDisabled: boolean
    isToday: boolean
    isStandaloneSelection: boolean
    isSingleSelected: boolean
    isRangeStart: boolean
    isRangeEnd: boolean
    isInRange: boolean
    isRangeMonthStart: boolean
    isRangeMonthEnd: boolean
    showLeftBridge: boolean
    showRightBridge: boolean
}

interface BuildMonthCellsParams {
    monthDates: (Date | null)[]
    departureDate: UiDate
    arrivalDate: UiDate
    minSelectableDate: Date
    maxSelectableDate: Date
}

interface BaseMonthCellState extends MonthCellViewModel {
    participatesInRangeRibbon: boolean
}

function createEmptyCell(): BaseMonthCellState {
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
        isRangeMonthEnd: false,
        showLeftBridge: false,
        showRightBridge: false,
        participatesInRangeRibbon: false
    }
}

/**
 * Строит состояние видимой сетки месяца целиком.
 * Лента диапазона рассчитывается по соседям внутри строки недели,
 * поэтому мостики между днями не могут перескочить через пустую ячейку или край строки.
 */
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

    const baseCells = monthDates.map(date => {
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
        const participatesInRangeRibbon = isRangeStart || isRangeEnd || isInRange

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
            isRangeMonthEnd,
            showLeftBridge: false,
            showRightBridge: false,
            participatesInRangeRibbon
        }
    })

    return baseCells.map((cell, index) => {
        if (!cell.date || !cell.participatesInRangeRibbon) {
            return cell
        }

        const columnIndex = index % 7
        const leftNeighbor = columnIndex === 0 ? null : baseCells[index - 1]
        const rightNeighbor = columnIndex === 6 ? null : baseCells[index + 1]

        return {
            ...cell,
            showLeftBridge: Boolean(leftNeighbor?.participatesInRangeRibbon),
            showRightBridge: Boolean(rightNeighbor?.participatesInRangeRibbon)
        }
    })
}
