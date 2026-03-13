import type { UiDate } from '@/entities/date'

/**
 * Контракт одного видимого месяца внутри двойного календаря.
 */
export default interface MonthProps {
    /** Внешний CSS-класс контейнера месяца. */
    className?: string
    /** Год рендеримого месяца. */
    year: number
    /** Номер месяца в диапазоне 1..12. */
    month: number
    /** Текущая выбранная стартовая дата диапазона. */
    departureDate: UiDate
    /** Текущая выбранная конечная дата диапазона. */
    arrivalDate: UiDate
    /** Нижняя допустимая дата выбора. */
    minSelectableDate: Date
    /** Верхняя допустимая дата выбора. */
    maxSelectableDate: Date
    /** Поднимает выбранный день в owner-компонент date picker. */
    onDateSelect: (date: Date) => void
    /** Листает видимую пару месяцев назад на один месяц. */
    onPrevMonth?: () => void
    /** Листает видимую пару месяцев вперёд на один месяц. */
    onNextMonth?: () => void
}
