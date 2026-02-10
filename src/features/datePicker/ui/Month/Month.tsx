import { CALENDAR_MONTHS, getWeekDaysArray } from '@/shared/consts/date'
import Day from '../Day/Day'
import cls from './Month.module.scss'
import { Icon, Text } from '@/shared/ui'
import MonthProps from './types'
import classNames from '@/shared/lib/helpers/classNames'

export default function Month({ className, year, month, onPrevMonth, onNextMonth }: MonthProps) {
    const monthTitle = `${CALENDAR_MONTHS[month]} ${year}`

    return (
        <div className={classNames(cls.Month, {}, [className ?? ''])}>
            <div className={cls.Month_header}>
                {onPrevMonth && (
                    <button
                        type='button'
                        className={classNames(cls.navButton, {}, [cls.prevButton])}
                        onClick={onPrevMonth}
                        aria-label='Previous month'>
                        <Icon name='arrow' flipped color='currentColor' />
                    </button>
                )}

                <Text type='h1' className={cls.dateTitle}>
                    {monthTitle}
                </Text>

                {onNextMonth && (
                    <button
                        type='button'
                        className={classNames(cls.navButton, {}, [cls.nextButton])}
                        onClick={onNextMonth}
                        aria-label='Next month'>
                        <Icon name='arrow' color='currentColor' />
                    </button>
                )}
            </div>

            <div className={cls.week_days}>
                {getWeekDaysArray().map(day => (
                    <Text key={day} type='h4' className={cls.weekDay}>
                        {day}
                    </Text>
                ))}
            </div>

            <Day year={year} month={month} />
        </div>
    )
}
