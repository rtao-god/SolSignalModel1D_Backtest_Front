import { createSelector } from '@reduxjs/toolkit'
import { StateSchema } from '@/app/providers/StoreProvider'
import { formatDateKey, parseDateKey, toStartOfDay } from '@/shared/consts/date'
import type { UiDate } from '../types/DateSchema'

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

const selectRawDepartureDate = (state: StateSchema): unknown => state.date?.departureDate as unknown

const selectRawArrivalDate = (state: StateSchema): unknown => state.date?.arrivalDate as unknown

export const selectDepartureDate = createSelector([selectRawDepartureDate], normalizeDate)

export const selectArrivalDate = createSelector([selectRawArrivalDate], normalizeDate)
