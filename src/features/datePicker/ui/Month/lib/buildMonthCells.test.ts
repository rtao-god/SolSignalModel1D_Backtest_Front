import { describe, expect, test } from 'vitest'
import { getMonthGridDates, parseDateKey } from '@/shared/consts/date'
import buildMonthCells from './buildMonthCells'

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

describe('buildMonthCells', () => {
    test('keeps the fill bridge between adjacent selected dates inside the same week row', () => {
        const monthCells = buildMonthCells({
            monthDates: getMonthGridDates(2024, 11),
            departureDate: createUiDate('2024-11-12'),
            arrivalDate: createUiDate('2024-11-13'),
            minSelectableDate: getDateOrThrow('2022-04-13'),
            maxSelectableDate: getDateOrThrow('2026-03-10')
        })

        const startCell = monthCells.find(cell => cell.date?.getTime() === getDateOrThrow('2024-11-12').getTime())
        const endCell = monthCells.find(cell => cell.date?.getTime() === getDateOrThrow('2024-11-13').getTime())

        expect(startCell?.isRangeStart).toBe(true)
        expect(startCell?.showRightBridge).toBe(true)
        expect(endCell?.isRangeEnd).toBe(true)
        expect(endCell?.showLeftBridge).toBe(true)
    })

    test('stops the fill bridge at the week boundary between sunday and monday', () => {
        const monthCells = buildMonthCells({
            monthDates: getMonthGridDates(2024, 11),
            departureDate: createUiDate('2024-11-09'),
            arrivalDate: createUiDate('2024-11-12'),
            minSelectableDate: getDateOrThrow('2022-04-13'),
            maxSelectableDate: getDateOrThrow('2026-03-10')
        })

        const sundayCell = monthCells.find(cell => cell.date?.getTime() === getDateOrThrow('2024-11-10').getTime())
        const mondayCell = monthCells.find(cell => cell.date?.getTime() === getDateOrThrow('2024-11-11').getTime())

        expect(sundayCell?.showRightBridge).toBe(false)
        expect(mondayCell?.showLeftBridge).toBe(false)
    })
})
