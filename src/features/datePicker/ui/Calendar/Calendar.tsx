import { useState } from 'react'
import classNames from '@/shared/lib/helpers/classNames'
import cls from './Calendar.module.scss'
import CalendarProps from '../Calendar/types'
import Month from '../Month/Month'
import { date, THIS_MONTH } from '@/shared/consts/date'

export default function Calendar({ className }: CalendarProps) {
    const today = new Date()

    const currentYearToday = today.getFullYear()
    const currentMonthToday = today.getMonth() + 1

    const [currentYear, setCurrentYear] = useState(currentYearToday)
    const [currentMonth, setCurrentMonth] = useState(currentMonthToday)

    const handlePrevMonth = () => {
        let newMonth = currentMonth - 1
        let newYear = currentYear

        if (newMonth < 1) {
            newMonth = 12
            newYear -= 1
        }

        console.log('today', today, '\n', 'date', date, '\n', 'newMonth', newMonth, '\n')
        if (newYear < currentYearToday || (newYear === currentYearToday && newMonth < currentMonthToday)) return

        setCurrentMonth(newMonth)
        setCurrentYear(newYear)
    }

    const handleNextMonth = () => {
        let newMonth = currentMonth + 1
        let newYear = currentYear

        if (newMonth > 12) {
            newMonth = 1
            newYear += 1
        }

        setCurrentMonth(newMonth)
        setCurrentYear(newYear)
    }
    let nextMonth = currentMonth + 1
    let nextYear = currentYear

    if (nextMonth > 12) {
        nextMonth = 1
        nextYear += 1
    }

    return (
        <div className={classNames(cls.Calendar, {}, [className ?? ''])}>
            <Month
                year={currentYear}
                month={currentMonth}
                onPrevMonth={handlePrevMonth}
                onNextMonth={handleNextMonth}
            />
            <Month year={nextYear} month={nextMonth} />
        </div>
    )
}
