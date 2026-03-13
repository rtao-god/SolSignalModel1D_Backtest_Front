import type { UiDate } from '@/entities/date'
import type { DateRangeField } from '@/features/datePicker/model/types'

/**
 * Контракт промежуточного календарного popup между корневым picker и отдельным месяцем.
 */
export default interface CalendarProps {
    /** Внешний CSS-класс корневого контейнера popup. */
    className?: string
    /** Текущая выбранная стартовая дата диапазона. */
    departureDate: UiDate
    /** Текущая выбранная конечная дата диапазона. */
    arrivalDate: UiDate
    /** Нижняя граница допустимого выбора; если не задана, используется feature default. */
    minSelectableDate?: Date
    /** Поле диапазона, которое следующий клик по дню должен обновить. */
    activeField: DateRangeField
    /** Поднимает выбранную дату в owner-логику диапазона. */
    onSelectDate: (date: Date) => void
    /** Полностью очищает текущий диапазон выбора. */
    onClearRange: () => void
}
