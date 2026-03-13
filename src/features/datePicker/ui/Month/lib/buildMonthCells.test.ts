import { describe, expect, test } from 'vitest'
import { getMonthGridDates, parseDateKey } from '@/shared/consts/date'
import buildMonthCells from './buildMonthCells'

/*
	Тесты закрепляют owner-контракт month cell view-model:
	расчёт дня должен отдавать только состояние диапазона,
	а непрерывная заливка между датами уже рисуется CSS-слоем ячейки.
*/

function getDate(value: string): Date {
    const parsedDate = parseDateKey(value)
    if (!parsedDate) {
        throw new Error(`Failed to parse date for test: ${value}`)
    }

    return parsedDate
}

function createUiDate(value: string) {
    // Держим тестовый helper в том же формате, что и production selection/store contract.
    return {
        value,
        dateObj: getDate(value)
    }
}

describe('buildMonthCells', () => {
    test('marks the inner days of a multi-day range as inRange', () => {
        const monthCells = buildMonthCells({
            monthDates: getMonthGridDates(2024, 11),
            departureDate: createUiDate('2024-11-10'),
            arrivalDate: createUiDate('2024-11-13'),
            minSelectableDate: getDate('2022-04-13'),
            maxSelectableDate: getDate('2026-03-10')
        })

        const startCell = monthCells.find(cell => cell.date?.getTime() === getDate('2024-11-10').getTime())
        const middleCell = monthCells.find(cell => cell.date?.getTime() === getDate('2024-11-11').getTime())
        const endCell = monthCells.find(cell => cell.date?.getTime() === getDate('2024-11-13').getTime())

        expect(startCell?.isRangeStart).toBe(true)
        expect(middleCell?.isInRange).toBe(true)
        expect(endCell?.isRangeEnd).toBe(true)
    })

    test('marks first day of month inside range with dedicated month-start state', () => {
        const monthCells = buildMonthCells({
            monthDates: getMonthGridDates(2024, 11),
            departureDate: createUiDate('2024-10-30'),
            arrivalDate: createUiDate('2024-11-03'),
            minSelectableDate: getDate('2022-04-13'),
            maxSelectableDate: getDate('2026-03-10')
        })

        const firstDayCell = monthCells.find(cell => cell.date?.getTime() === getDate('2024-11-01').getTime())

        expect(firstDayCell?.isRangeMonthStart).toBe(true)
        expect(firstDayCell?.isInRange).toBe(false)
    })
})
