import { formatDateKey, toStartOfDay } from '@/shared/consts/date'
import type { UiDate } from '@/entities/date'
import type { DateRangeField } from '../types'

interface ResolveDateRangeSelectionParams {
    activeField: DateRangeField
    departureDate: UiDate
    arrivalDate: UiDate
    selectedDate: Date
}

interface ResolveDateRangeSelectionResult {
    nextDepartureDate: UiDate
    nextArrivalDate: UiDate
    nextActiveField: DateRangeField | null
    shouldClose: boolean
}

function createUiDate(dateObj: Date): NonNullable<UiDate> {
    return {
        value: formatDateKey(dateObj),
        dateObj
    }
}

/**
 * Повторяет модель выбора диапазона из vs-chat:
 * клик всегда заполняет активное поле, а противоположная граница очищается,
 * если после клика диапазон становится перевёрнутым.
 */
export default function resolveDateRangeSelection({
    activeField,
    departureDate,
    arrivalDate,
    selectedDate
}: ResolveDateRangeSelectionParams): ResolveDateRangeSelectionResult {
    const normalizedSelectedDate = createUiDate(toStartOfDay(selectedDate))
    const nextInactiveField: DateRangeField = activeField === 'from' ? 'to' : 'from'
    const nextDates: Record<DateRangeField, UiDate> = {
        from: activeField === 'from' ? normalizedSelectedDate : departureDate,
        to: activeField === 'to' ? normalizedSelectedDate : arrivalDate
    }

    const nextFromTime = nextDates.from?.dateObj.getTime() ?? 0
    const nextToTime = nextDates.to?.dateObj.getTime() ?? 0

    if (nextFromTime > nextToTime) {
        nextDates[nextInactiveField] = null
    }

    const shouldClose = Boolean(nextDates.from && nextDates.to)

    return {
        nextDepartureDate: nextDates.from,
        nextArrivalDate: nextDates.to,
        nextActiveField: shouldClose ? null : nextInactiveField,
        shouldClose
    }
}
