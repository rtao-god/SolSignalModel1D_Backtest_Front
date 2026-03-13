import { memo } from 'react'
import classNames from '@/shared/lib/helpers/classNames'
import cls from './Day.module.scss'
import { formatDateKey } from '@/shared/consts/date'
import type DayProps from './types'

/*
	Day — одна ячейка сетки месяца.

	Зачем:
		- Рендерит либо интерактивный день, либо технический заполнитель сетки.
		- Собирает все визуальные состояния диапазона в единый button-контракт для accessibility и CSS-модификаторов.

	Контракты:
		- `date === null` означает пустую ячейку вне текущего месяца и не даёт интерактивности.
		- `aria-pressed` отражает любое участие дня в текущем выборе диапазона, а не только одиночное выделение.
*/

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
    onSelectDate
}: DayProps) {
    if (date === null) {
        // Пустые ячейки сохраняют ровную календарную сетку, но не участвуют в навигации и выборе диапазона.
        return <div className={classNames(cls.emptyCell, {}, [className ?? ''])} aria-hidden='true'></div>
    }

    // Для screen reader диапазон должен звучать как выбранный на всех ключевых участках ленты, а не только на крайних датах.
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
                    [cls.today]: isToday && !isPressed
                },
                [className ?? '']
            )}
            onClick={() => onSelectDate(date)}
            disabled={isDisabled}
            aria-pressed={isPressed}
            aria-current={isToday ? 'date' : undefined}
            aria-label={formatDateKey(date)}>
            <span className={cls.daySurface}>
                <span className={cls.dayValue}>{date.getDate()}</span>
            </span>
        </button>
    )
}

export default memo(Day)
