import type { UiDate } from '@/entities/date'

export default interface MonthProps {
    className?: string
    year: number
    month: number
    departureDate: UiDate
    arrivalDate: UiDate
    minSelectableDate: Date
    maxSelectableDate: Date
    onDateSelect: (date: Date) => void
    onPrevMonth?: () => void
    onNextMonth?: () => void
}
