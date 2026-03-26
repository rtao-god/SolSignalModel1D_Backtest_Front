export interface DateRangeValue {
    value: string
    dateObj: Date
}

export type UiDate = DateRangeValue | null
export type StoredDateValue = string | null

export default interface DateSchema {
    departureDate: StoredDateValue
    arrivalDate: StoredDateValue
}
