import classNames from '@/shared/lib/helpers/classNames'
import cls from './Day.module.scss'
import { getLastDayMonth, getMonthGrid } from '@/shared/consts/date'
import DayProps from './types'
import { useDispatch, useSelector } from 'react-redux'
import { dateActions, selectArrivalDate, selectDepartureDate, selectIsSelectingDepartureDate } from '@/entities/date'

export default function Day({ className, year, month }: DayProps) {
    const monthGrid = getMonthGrid(year, month)

    const dispatch = useDispatch()
    const departureDate = useSelector(selectDepartureDate)
    const arrivalDate = useSelector(selectArrivalDate)
    const isSelectingDepartureDate = useSelector(selectIsSelectingDepartureDate)

    function handleClick(day: number, dateObj: Date) {
        console.log('[Day] handleClick RAW', {
            day,
            dateIso: dateObj.toISOString(),
            isSelectingDepartureDate,
            departureDate,
            arrivalDate
        })

        const isoValue = dateObj.toISOString().slice(0, 10) // YYYY-MM-DD

        const selectedDateValue = {
            value: isoValue,
            dateObj
        }

        if (isSelectingDepartureDate) {
            console.log('[Day] DISPATCH setDepartureDate (as FROM)', selectedDateValue)
            dispatch(dateActions.setDepartureDate(selectedDateValue))
            dispatch(dateActions.setIsSelectingDepartureDate(false))
        } else if (departureDate && dateObj >= departureDate.dateObj) {
            console.log('[Day] DISPATCH setArrivalDate (TO >= FROM)', selectedDateValue)
            dispatch(dateActions.setArrivalDate(selectedDateValue))
            dispatch(dateActions.setIsSelectingDepartureDate(false))
        } else if (departureDate && !isSelectingDepartureDate) {
            console.log('[Day] DISPATCH reset range, new FROM', selectedDateValue)
            dispatch(dateActions.setArrivalDate(null))
            dispatch(dateActions.setDepartureDate(selectedDateValue))
            dispatch(dateActions.setIsSelectingDepartureDate(false))
        } else {
            console.log('[Day] CLICK FALLTHROUGH (no branch matched)')
        }
    }

    console.log(
        '[Day] render',
        { year, month },
        'selectors:',
        'departureDate =',
        departureDate?.value,
        'arrivalDate =',
        arrivalDate?.value,
        'isSelectingDepartureDate =',
        isSelectingDepartureDate
    )

    return (
        <div className={classNames(cls.month_grid, {}, [className ?? ''])}>
            {monthGrid.map((day, index) => {
                if (day === null) {
                    return <div key={index} className={cls.day_cell}></div>
                }

                const dateObj = new Date(year, month - 1, day)
                dateObj.setHours(0, 0, 0, 0)

                const today = new Date()
                today.setHours(0, 0, 0, 0)

                // ДЛЯ ДИАГНОСТИКИ: пока считаем все дни кликабельными
                const isClickable = true

                const isSelectedDeparture = !!departureDate && dateObj.getTime() === departureDate.dateObj.getTime()
                const isSelectedArrival = !!arrivalDate && dateObj.getTime() === arrivalDate.dateObj.getTime()

                const isRange =
                    !!departureDate && !!arrivalDate && dateObj > departureDate.dateObj && dateObj < arrivalDate.dateObj

                const isFirstDay = isRange && day === 1
                const isLastDay = isRange && getLastDayMonth(dateObj)

                console.log('[Day] cell', {
                    index,
                    day,
                    dateIso: dateObj.toISOString().slice(0, 10),
                    isClickable,
                    isSelectedDeparture,
                    isSelectedArrival,
                    isRange,
                    isFirstDay,
                    isLastDay
                })

                return (
                    <div
                        key={index}
                        className={classNames(
                            cls.Day_cell,
                            {
                                [cls.active]: isClickable,
                                [cls.disabled]: !isClickable,
                                [cls.selected_departure]: isSelectedDeparture,
                                [cls.selected_arrival]: isSelectedArrival,
                                [cls.range]: isRange,
                                [cls.firstDay]: isFirstDay,
                                [cls.lastDay]: isLastDay
                            },
                            [className ?? '']
                        )}
                        // КРИТИЧЕСКОЕ МЕСТО: убираем все условия, всегда вешаем onClick
                        onClick={() => handleClick(day, dateObj)}>
                        {day}
                    </div>
                )
            })}
        </div>
    )
}
