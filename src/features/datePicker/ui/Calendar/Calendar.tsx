import { ChangeEvent, useState } from 'react'
import classNames from '@/shared/lib/helpers/classNames'
import cls from './Calendar.module.scss'
import CalendarProps from '../Calendar/types'
import Month from '../Month/Month'
import { MIN_DATE_PICKER_YEAR, toStartOfDay } from '@/shared/consts/date'

interface MonthCursor {
    year: number
    month: number
}

function addMonths(cursor: MonthCursor, delta: number): MonthCursor {
    const shiftedDate = new Date(cursor.year, cursor.month - 1 + delta, 1)

    return {
        year: shiftedDate.getFullYear(),
        month: shiftedDate.getMonth() + 1
    }
}

function compareMonthCursors(left: MonthCursor, right: MonthCursor): number {
    if (left.year === right.year) {
        return left.month - right.month
    }

    return left.year - right.year
}

function clampCursor(cursor: MonthCursor, min: MonthCursor, max: MonthCursor): MonthCursor {
    if (compareMonthCursors(cursor, min) < 0) {
        return min
    }
    if (compareMonthCursors(cursor, max) > 0) {
        return max
    }

    return cursor
}

export default function Calendar({ className }: CalendarProps) {
    const today = toStartOfDay(new Date())
    const minMonth: MonthCursor = {
        year: MIN_DATE_PICKER_YEAR,
        month: 1
    }

    const maxMonth: MonthCursor = {
        year: today.getFullYear(),
        month: today.getMonth() + 1
    }

    const maxVisibleMonth = (() => {
        const candidate = addMonths(maxMonth, -1)
        return compareMonthCursors(candidate, minMonth) < 0 ? minMonth : candidate
    })()

    const [visibleMonth, setVisibleMonth] = useState<MonthCursor>(maxVisibleMonth)

    const rightMonth = addMonths(visibleMonth, 1)
    const canGoPrev = compareMonthCursors(visibleMonth, minMonth) > 0
    const canGoNext = compareMonthCursors(visibleMonth, maxVisibleMonth) < 0

    const availableYears: number[] = []
    for (let year = maxMonth.year; year >= minMonth.year; year -= 1) {
        availableYears.push(year)
    }

    const handlePrevMonth = () => {
        if (!canGoPrev) {
            return
        }

        setVisibleMonth(previous => addMonths(previous, -1))
    }

    const handleNextMonth = () => {
        if (!canGoNext) {
            return
        }

        setVisibleMonth(previous => addMonths(previous, 1))
    }

    const handleYearChange = (event: ChangeEvent<HTMLSelectElement>) => {
        const year = Number(event.target.value)
        if (Number.isNaN(year)) {
            return
        }

        setVisibleMonth(previous => {
            const nextCursor = {
                year,
                month: previous.month
            }

            return clampCursor(nextCursor, minMonth, maxVisibleMonth)
        })
    }

    return (
        <div className={classNames(cls.Calendar, {}, [className ?? ''])}>
            <div className={cls.toolbar}>
                <label htmlFor='date-picker-year' className={cls.yearLabel}>
                    Year
                </label>
                <select
                    id='date-picker-year'
                    className={cls.yearSelect}
                    value={visibleMonth.year}
                    onChange={handleYearChange}>
                    {availableYears.map(year => (
                        <option key={year} value={year}>
                            {year}
                        </option>
                    ))}
                </select>
            </div>

            <div className={cls.months}>
                <Month
                    year={visibleMonth.year}
                    month={visibleMonth.month}
                    onPrevMonth={canGoPrev ? handlePrevMonth : undefined}
                />
                <Month
                    year={rightMonth.year}
                    month={rightMonth.month}
                    onNextMonth={canGoNext ? handleNextMonth : undefined}
                />
            </div>
        </div>
    )
}
