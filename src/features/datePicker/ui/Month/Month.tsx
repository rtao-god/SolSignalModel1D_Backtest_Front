import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import Day from '../Day/Day'
import cls from './Month.module.scss'
import type MonthProps from './types'
import classNames from '@/shared/lib/helpers/classNames'
import { getMonthGridDates } from '@/shared/consts/date'
import buildMonthCells from './lib/buildMonthCells'

export default function Month({
    className,
    year,
    month,
    departureDate,
    arrivalDate,
    minSelectableDate,
    maxSelectableDate,
    onDateSelect,
    onPrevMonth,
    onNextMonth
}: MonthProps) {
    const { i18n, t } = useTranslation('common')
    const monthDates = useMemo(() => getMonthGridDates(year, month), [month, year])
    const monthNameFormatter = useMemo(
        () =>
            new Intl.DateTimeFormat(i18n.language, {
                month: 'long'
            }),
        [i18n.language]
    )
    const weekDayFormatter = useMemo(
        () =>
            new Intl.DateTimeFormat(i18n.language, {
                weekday: 'short'
            }),
        [i18n.language]
    )
    const weekDays = useMemo(
        () => Array.from({ length: 7 }, (_, index) => weekDayFormatter.format(new Date(2024, 0, 1 + index))),
        [weekDayFormatter]
    )
    const monthTitle = `${monthNameFormatter.format(new Date(year, month - 1, 1))} ${year}`
    const monthCells = useMemo(
        () =>
            buildMonthCells({
                monthDates,
                departureDate,
                arrivalDate,
                minSelectableDate,
                maxSelectableDate
            }),
        [arrivalDate, departureDate, maxSelectableDate, minSelectableDate, monthDates]
    )

    return (
        <section className={classNames(cls.month, {}, [className ?? ''])} aria-label={monthTitle}>
            <div className={cls.header}>
                {onPrevMonth ?
                    <button
                        type='button'
                        className={cls.navButton}
                        onClick={onPrevMonth}
                        aria-label={t('dateRangePicker.prevMonthAria')}>
                        <span className={classNames(cls.navIcon, {}, [cls.navIconPrev])} aria-hidden='true'></span>
                    </button>
                :   <span className={cls.navSpacer} aria-hidden='true'></span>}

                <span className={cls.dateTitle}>{monthTitle}</span>

                {onNextMonth ?
                    <button
                        type='button'
                        className={cls.navButton}
                        onClick={onNextMonth}
                        aria-label={t('dateRangePicker.nextMonthAria')}>
                        <span className={cls.navIcon} aria-hidden='true'></span>
                    </button>
                :   <span className={cls.navSpacer} aria-hidden='true'></span>}
            </div>

            <div className={cls.weekDays}>
                {weekDays.map(day => (
                    <span key={day} className={cls.weekDay}>
                        {day}
                    </span>
                ))}
            </div>

            <div className={cls.daysGrid}>
                {monthCells.map((cell, index) => (
                    <Day
                        key={cell.date ? cell.date.toISOString() : `empty-${year}-${month}-${index}`}
                        date={cell.date}
                        isDisabled={cell.isDisabled}
                        isToday={cell.isToday}
                        isStandaloneSelection={cell.isStandaloneSelection}
                        isSingleSelected={cell.isSingleSelected}
                        isRangeStart={cell.isRangeStart}
                        isRangeEnd={cell.isRangeEnd}
                        isInRange={cell.isInRange}
                        isRangeMonthStart={cell.isRangeMonthStart}
                        isRangeMonthEnd={cell.isRangeMonthEnd}
                        showLeftBridge={cell.showLeftBridge}
                        showRightBridge={cell.showRightBridge}
                        onSelectDate={onDateSelect}
                    />
                ))}
            </div>
        </section>
    )
}
