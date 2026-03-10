import { memo } from 'react'
import classNames from '@/shared/lib/helpers/classNames'
import cls from './Day.module.scss'
import { formatDateKey } from '@/shared/consts/date'
import type DayProps from './types'

function Day({
    className,
    date,
    isDisabled,
    isToday,
    isStandaloneSelection,
    isSingleSelected,
    isRangeStart,
    isRangeEnd,
    isInRange,
    isRangeMonthStart,
    isRangeMonthEnd,
    showLeftBridge,
    showRightBridge,
    onSelectDate
}: DayProps) {
    if (date === null) {
        return <div className={classNames(cls.emptyCell, {}, [className ?? ''])} aria-hidden='true'></div>
    }
    const isPressed =
        isStandaloneSelection ||
        isSingleSelected ||
        isRangeStart ||
        isRangeEnd ||
        isInRange ||
        isRangeMonthStart ||
        isRangeMonthEnd

    return (
        <button
            type='button'
            className={classNames(
                cls.dayCell,
                {
                    [cls.disabled]: isDisabled,
                    [cls.selected]: isStandaloneSelection,
                    [cls.singleSelected]: isSingleSelected,
                    [cls.rangeStart]: isRangeStart,
                    [cls.rangeEnd]: isRangeEnd,
                    [cls.inRange]: isInRange,
                    [cls.rangeMonthStart]: isRangeMonthStart,
                    [cls.rangeMonthEnd]: isRangeMonthEnd,
                    [cls.bridgeLeft]: showLeftBridge,
                    [cls.bridgeRight]: showRightBridge,
                    [cls.today]: isToday && !isPressed,
                },
                [className ?? '']
            )}
            onClick={() => onSelectDate(date)}
            disabled={isDisabled}
            aria-pressed={isPressed}
            aria-current={isToday ? 'date' : undefined}
            aria-label={formatDateKey(date)}>
            <span className={cls.dayValue}>{date.getDate()}</span>
        </button>
    )
}

export default memo(Day)
