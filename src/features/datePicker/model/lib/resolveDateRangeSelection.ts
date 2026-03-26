import { formatDateKey, toStartOfDay } from '@/shared/consts/date'
import type { UiDate } from '@/entities/date'
import type { DateRangeField } from '../types'

/*
	resolveDateRangeSelection — owner логики выбора диапазона в date picker.

	Зачем:
		- Превращает один клик пользователя в согласованную пару `from/to`, следующее активное поле и решение, закрывать ли popup.

	Контракты:
		- Диапазон не может оставаться перевёрнутым: если новая дата ломает порядок, противоположная граница очищается.
		- На выходе UI всегда получает нормализованные даты на уровне начала дня.
*/

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
    // UI хранит и строковый ключ, и объект даты, чтобы selector/store и кнопки работали по одному контракту.
    return {
        value: formatDateKey(dateObj),
        dateObj
    }
}

/**
 * Заполняет активную границу диапазона и решает,
 * нужно ли очищать противоположную сторону и закрывать picker.
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
        // Перевёрнутый диапазон в состоянии не сохраняем: пользователь должен заново выбрать вторую границу.
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
