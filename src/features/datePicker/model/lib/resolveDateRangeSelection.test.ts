import { describe, expect, test } from 'vitest'
import { parseDateKey } from '@/shared/consts/date'
import resolveDateRangeSelection from './resolveDateRangeSelection'

function getDateOrThrow(value: string): Date {
    const parsedDate = parseDateKey(value)
    if (!parsedDate) {
        throw new Error(`Failed to parse date for test: ${value}`)
    }

    return parsedDate
}

function createUiDate(value: string) {
    return {
        value,
        dateObj: getDateOrThrow(value)
    }
}

describe('resolveDateRangeSelection', () => {
    test('clears the end date when a new start date is chosen after it', () => {
        const result = resolveDateRangeSelection({
            activeField: 'from',
            departureDate: createUiDate('2024-11-10'),
            arrivalDate: createUiDate('2024-11-12'),
            selectedDate: getDateOrThrow('2024-11-15')
        })

        expect(result.nextDepartureDate?.value).toBe('2024-11-15')
        expect(result.nextArrivalDate).toBeNull()
        expect(result.nextActiveField).toBe('to')
        expect(result.shouldClose).toBe(false)
    })

    test('clears the start date when a new end date is chosen before it', () => {
        const result = resolveDateRangeSelection({
            activeField: 'to',
            departureDate: createUiDate('2024-11-20'),
            arrivalDate: createUiDate('2024-11-25'),
            selectedDate: getDateOrThrow('2024-11-12')
        })

        expect(result.nextDepartureDate).toBeNull()
        expect(result.nextArrivalDate?.value).toBe('2024-11-12')
        expect(result.nextActiveField).toBe('from')
        expect(result.shouldClose).toBe(false)
    })

    test('closes the picker after both sides of the range are filled', () => {
        const result = resolveDateRangeSelection({
            activeField: 'to',
            departureDate: createUiDate('2024-11-10'),
            arrivalDate: null,
            selectedDate: getDateOrThrow('2024-11-12')
        })

        expect(result.nextDepartureDate?.value).toBe('2024-11-10')
        expect(result.nextArrivalDate?.value).toBe('2024-11-12')
        expect(result.nextActiveField).toBeNull()
        expect(result.shouldClose).toBe(true)
    })
})
