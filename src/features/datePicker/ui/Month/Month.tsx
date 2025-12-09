import { CALENDAR_MONTHS, getWeekDaysArray } from '@/shared/consts/date'
import Day from '../Day/Day'
import cls from './Month.module.scss'
import { Icon, Text } from '@/shared/ui'
import MonthProps from './types'
import classNames from '@/shared/lib/helpers/classNames'

export default function Month({ className, year, month, onPrevMonth, onNextMonth }: MonthProps) {
    return (
        <div className={classNames(cls.Month, {}, [className ?? ''])}>
            <div className={cls.Month_header}>
                <div className={cls.date}>
                    {onPrevMonth && (
                        <Icon name='arrow' flipped={true} onClick={onPrevMonth} className={cls.prev_icon} />
                    )}
                    <Text type='h1'>
                        {CALENDAR_MONTHS[month]} {year}
                    </Text>
                    {onNextMonth && <Icon name='arrow' onClick={onNextMonth} className={cls.next_icon} />}
                </div>
            </div>
            <div className={cls.week_days}>
                {getWeekDaysArray().map((day, index) => (
                    <Text key={index} type='h4'>
                        {day}
                    </Text>
                ))}
            </div>
            <Day year={year} month={month} />
        </div>
    )
}
