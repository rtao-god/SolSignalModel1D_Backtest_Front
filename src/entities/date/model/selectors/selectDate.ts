import { StateSchema } from '@/app/providers/StoreProvider'
import type DateSchema from '../types/DateSchema'

// Канонический формат даты для UI: то, что реально нужно DatePicker/страницам.
type UiDate = DateSchema['departureDate'] // { value: string; dateObj: Date } | null

function normalizeDate(raw: unknown): UiDate {
    if (raw == null) {
        return null
    }

    // Уже в нужном формате: { value, dateObj? }
    if (typeof raw === 'object' && 'value' in (raw as any)) {
        const r = raw as { value: string; dateObj?: Date }
        const value = r.value
        const dateObj = r.dateObj instanceof Date ? r.dateObj : new Date(value)

        return { value, dateObj }
    }

    // Храним Date как есть, value берём из toISOString
    if (raw instanceof Date) {
        const iso = raw.toISOString()
        const value = iso.slice(0, 10) // YYYY-MM-DD
        return { value, dateObj: raw }
    }

    // Строка: считаем, что это YYYY-MM-DD или ISO
    if (typeof raw === 'string') {
        const value = raw
        const dateObj = new Date(raw)
        // Даже если дата "кривая", объект всё равно будет создан; для UI критична строка value.
        return { value, dateObj }
    }

    // Любой другой формат считаем неприменимым
    return null
}

export const selectDepartureDate = (state: StateSchema): UiDate => normalizeDate(state.date?.departureDate as unknown)

export const selectArrivalDate = (state: StateSchema): UiDate => normalizeDate(state.date?.arrivalDate as unknown)

export const selectIsSelectingDepartureDate = (state: StateSchema) => state.date?.isSelectingDepartureDate
