import { StateSchema } from '@/app/providers/StoreProvider'
import { formatDateKey, parseDateKey, toStartOfDay } from '@/shared/consts/date'
import type DateSchema from '../types/DateSchema'

type UiDate = DateSchema['departureDate']

function createUiDate(value: string | null, dateObj: Date | null): UiDate {
    if (!value && !dateObj) {
        return null
    }

    const normalizedByValue = value ? parseDateKey(value) : null
    const normalizedByObject = dateObj ? toStartOfDay(dateObj) : null
    const normalized = normalizedByValue ?? normalizedByObject

    if (!normalized) {
        return null
    }

    return {
        value: formatDateKey(normalized),
        dateObj: normalized
    }
}

function normalizeDate(raw: unknown): UiDate {
    if (raw == null) {
        return null
    }

    if (typeof raw === 'object' && 'value' in (raw as Record<string, unknown>)) {
        const typedRaw = raw as { value?: unknown; dateObj?: unknown }
        const value = typeof typedRaw.value === 'string' ? typedRaw.value : null
        const dateObj = typedRaw.dateObj instanceof Date ? typedRaw.dateObj : null

        return createUiDate(value, dateObj)
    }

    if (raw instanceof Date) {
        const normalizedDate = toStartOfDay(raw)
        return createUiDate(formatDateKey(normalizedDate), normalizedDate)
    }

    if (typeof raw === 'string') {
        return createUiDate(raw, null)
    }

    return null
}

export const selectDepartureDate = (state: StateSchema): UiDate => normalizeDate(state.date?.departureDate as unknown)

export const selectArrivalDate = (state: StateSchema): UiDate => normalizeDate(state.date?.arrivalDate as unknown)

export const selectIsSelectingDepartureDate = (state: StateSchema) => state.date?.isSelectingDepartureDate
