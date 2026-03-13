import { ChangeEvent, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import classNames from '@/shared/lib/helpers/classNames'
import cls from './Calendar.module.scss'
import type CalendarProps from '../Calendar/types'
import Month from '../Month/Month'
import { toStartOfDay } from '@/shared/consts/date'

const DEFAULT_MIN_SELECTABLE_DATE = toStartOfDay(new Date(2022, 3, 13))

/**
 * Позиция видимого календаря на уровне года и месяца без привязки к конкретному дню.
 */
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

function toMonthCursor(date: Date): MonthCursor {
    return {
        year: date.getFullYear(),
        month: date.getMonth() + 1
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

function resolveInitialVisibleMonth(
    activeField: CalendarProps['activeField'],
    departureDate: CalendarProps['departureDate'],
    arrivalDate: CalendarProps['arrivalDate'],
    minMonth: MonthCursor,
    maxVisibleMonth: MonthCursor,
    today: Date
): MonthCursor {
    const targetDate =
        activeField === 'to' ?
            (arrivalDate?.dateObj ?? departureDate?.dateObj ?? today)
        :   (departureDate?.dateObj ?? today)
    const targetCursor = toMonthCursor(targetDate)

    return clampCursor(targetCursor, minMonth, maxVisibleMonth)
}

/*
	Calendar — popup-календарь с двумя синхронизированными месяцами.

	Зачем:
		- Даёт выбрать диапазон дат внутри допустимого окна и сохраняет контекст активного поля `from/to`.

	Контракты:
		- Левый месяц никогда не выходит за допустимое окно так, чтобы правый месяц перескочил за текущий день.
		- Начальный видимый месяц подбирается от активного поля и уже выбранных дат, а не от жёстко заданного today-only курса.
*/
export default function Calendar({
    className,
    departureDate,
    arrivalDate,
    minSelectableDate,
    activeField,
    onSelectDate,
    onClearRange
}: CalendarProps) {
    const { t } = useTranslation('common')
    const today = useMemo(() => toStartOfDay(new Date()), [])
    const resolvedMinSelectableDate = useMemo(
        () => toStartOfDay(minSelectableDate ?? DEFAULT_MIN_SELECTABLE_DATE),
        [minSelectableDate]
    )
    const minMonth = useMemo(() => toMonthCursor(resolvedMinSelectableDate), [resolvedMinSelectableDate])
    const maxMonth = useMemo<MonthCursor>(
        () => ({
            year: today.getFullYear(),
            month: today.getMonth() + 1
        }),
        [today]
    )

    const maxVisibleMonth = useMemo(() => {
        // Правый календарь всегда показывает следующий месяц, поэтому левый не должен доходить до текущего месяца.
        const candidate = addMonths(maxMonth, -1)
        return compareMonthCursors(candidate, minMonth) < 0 ? minMonth : candidate
    }, [maxMonth, minMonth])

    const [visibleMonth, setVisibleMonth] = useState<MonthCursor>(() =>
        resolveInitialVisibleMonth(activeField, departureDate, arrivalDate, minMonth, maxVisibleMonth, today)
    )

    const rightMonth = addMonths(visibleMonth, 1)
    const canGoPrev = compareMonthCursors(visibleMonth, minMonth) > 0
    const canGoNext = compareMonthCursors(visibleMonth, maxVisibleMonth) < 0

    const availableYears = useMemo(() => {
        // Новые годы держим ближе к началу dropdown, чтобы текущий рабочий диапазон выбирался быстрее.
        const years: number[] = []
        for (let year = maxMonth.year; year >= minMonth.year; year -= 1) {
            years.push(year)
        }

        return years
    }, [maxMonth.year, minMonth.year])

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
        <div className={classNames(cls.calendar, {}, [className ?? ''])}>
            <div className={cls.toolbar}>
                <label htmlFor='date-picker-year' className={cls.yearControl}>
                    <span className={cls.yearLabel}>{t('dateRangePicker.yearLabel')}</span>
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
                </label>
            </div>

            <div className={cls.months}>
                <Month
                    year={visibleMonth.year}
                    month={visibleMonth.month}
                    departureDate={departureDate}
                    arrivalDate={arrivalDate}
                    minSelectableDate={resolvedMinSelectableDate}
                    maxSelectableDate={today}
                    onDateSelect={onSelectDate}
                    onPrevMonth={canGoPrev ? handlePrevMonth : undefined}
                />
                <Month
                    year={rightMonth.year}
                    month={rightMonth.month}
                    departureDate={departureDate}
                    arrivalDate={arrivalDate}
                    minSelectableDate={resolvedMinSelectableDate}
                    maxSelectableDate={today}
                    onDateSelect={onSelectDate}
                    onNextMonth={canGoNext ? handleNextMonth : undefined}
                />
            </div>

            <div className={cls.actions}>
                <button
                    type='button'
                    className={cls.clearButton}
                    onClick={onClearRange}
                    disabled={!departureDate && !arrivalDate}
                    aria-label={t('dateRangePicker.clearAria')}>
                    {t('dateRangePicker.clear')}
                </button>
            </div>
        </div>
    )
}
