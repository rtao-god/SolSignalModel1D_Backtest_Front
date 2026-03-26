import { describe, expect, test } from 'vitest'
import { parseDateKey } from '@/shared/consts/date'
import resolveDateRangeSelection from './resolveDateRangeSelection'

/*
	Тесты фиксируют owner-контракт выбора диапазона:
	перевёрнутый диапазон очищает противоположную границу,
	а валидная пара дат завершает сценарий и закрывает picker.
*/

function getDate(value: string): Date {
    const parsedDate = parseDateKey(value)
    if (!parsedDate) {
        throw new Error(`Failed to parse date for test: ${value}`)
    }

    return parsedDate
}

function createUiDate(value: string) {
    // Тестовые сценарии используют тот же YYYY-MM-DD ключ, что и production store/selectors.
    return {
        value,
        dateObj: getDate(value)
    }
}

describe('resolveDateRangeSelection', () => {
    test('clears the end date when a new start date is chosen after it', () => {
        const result = resolveDateRangeSelection({
            activeField: 'from',
            departureDate: createUiDate('2024-11-10'),
            arrivalDate: createUiDate('2024-11-12'),
            selectedDate: getDate('2024-11-15')
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
            selectedDate: getDate('2024-11-12')
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
            selectedDate: getDate('2024-11-12')
        })

        expect(result.nextDepartureDate?.value).toBe('2024-11-10')
        expect(result.nextArrivalDate?.value).toBe('2024-11-12')
        expect(result.nextActiveField).toBeNull()
        expect(result.shouldClose).toBe(true)
    })
})
