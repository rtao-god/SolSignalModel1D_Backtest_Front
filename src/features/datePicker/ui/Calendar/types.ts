import type { UiDate } from '@/entities/date'
import type { DateRangeField } from '@/features/datePicker/model/types'

export default interface CalendarProps {
    className?: string
    departureDate: UiDate
    arrivalDate: UiDate
    minSelectableDate?: Date
    activeField: DateRangeField
    onSelectDate: (date: Date) => void
    onClearRange: () => void
}
