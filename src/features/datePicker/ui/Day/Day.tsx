import classNames from '@/shared/lib/helpers/classNames'
import cls from './Day.module.scss'
import { formatDateKey, getDaysInMonth, getMonthGrid, MIN_DATE_PICKER_YEAR, toStartOfDay } from '@/shared/consts/date'
import DayProps from './types'
import { useDispatch, useSelector } from 'react-redux'
import { dateActions, selectArrivalDate, selectDepartureDate, selectIsSelectingDepartureDate } from '@/entities/date'

export default function Day({ className, year, month }: DayProps) {
    const monthGrid = getMonthGrid(year, month)
    const lastDayOfMonth = getDaysInMonth(year, month)

    const dispatch = useDispatch()
    const departureDate = useSelector(selectDepartureDate)
    const arrivalDate = useSelector(selectArrivalDate)
    const isSelectingDepartureDate = useSelector(selectIsSelectingDepartureDate)

    const minSelectableDate = toStartOfDay(new Date(MIN_DATE_PICKER_YEAR, 0, 1))
    const maxSelectableDate = toStartOfDay(new Date())

    const departureTime = departureDate?.dateObj.getTime() ?? null
    const arrivalTime = arrivalDate?.dateObj.getTime() ?? null
    const hasRange = departureTime !== null && arrivalTime !== null
    const isSingleDayRange = hasRange && departureTime === arrivalTime

    const makeUiDate = (dateObj: Date) => {
        const normalizedDate = toStartOfDay(dateObj)

        return {
            value: formatDateKey(normalizedDate),
            dateObj: normalizedDate
        }
    }

    const isSelectableDate = (dateObj: Date): boolean =>
        dateObj.getTime() >= minSelectableDate.getTime() && dateObj.getTime() <= maxSelectableDate.getTime()

    function setNewDepartureDate(dateObj: Date): void {
        dispatch(dateActions.setDepartureDate(makeUiDate(dateObj)))
        dispatch(dateActions.setArrivalDate(null))
        dispatch(dateActions.setIsSelectingDepartureDate(false))
    }

    function setNewArrivalDate(dateObj: Date): void {
        dispatch(dateActions.setArrivalDate(makeUiDate(dateObj)))
        dispatch(dateActions.setIsSelectingDepartureDate(false))
    }

    function handleClick(dateObj: Date): void {
        const normalizedDate = toStartOfDay(dateObj)

        if (!isSelectableDate(normalizedDate)) {
            return
        }

        if (!departureDate || isSelectingDepartureDate) {
            setNewDepartureDate(normalizedDate)
            return
        }

        const selectedTime = normalizedDate.getTime()
        const departureDateTime = departureDate.dateObj.getTime()

        if (selectedTime < departureDateTime) {
            setNewDepartureDate(normalizedDate)
            return
        }

        setNewArrivalDate(normalizedDate)
    }

    return (
        <div className={classNames(cls.monthGrid, {}, [className ?? ''])}>
            {monthGrid.map((day, index) => {
                if (day === null) {
                    return <div key={`empty-${index}`} className={cls.emptyCell} aria-hidden='true'></div>
                }

                const dateObj = toStartOfDay(new Date(year, month - 1, day))
                const dayTime = dateObj.getTime()
                const isDisabled = !isSelectableDate(dateObj)

                const isSelectedDeparture = departureTime !== null && dayTime === departureTime
                const isSelectedArrival = arrivalTime !== null && dayTime === arrivalTime

                const isRange =
                    hasRange &&
                    departureTime !== null &&
                    arrivalTime !== null &&
                    dayTime > departureTime &&
                    dayTime < arrivalTime
                const isRangeStart = !isSingleDayRange && isSelectedDeparture
                const isRangeEnd = !isSingleDayRange && isSelectedArrival
                const isRangeMonthStart = isRange && day === 1
                const isRangeMonthEnd = isRange && day === lastDayOfMonth

                const isSingleSelectedDay = isSingleDayRange && (isSelectedDeparture || isSelectedArrival)

                const isSelected = isSelectedDeparture || isSelectedArrival
                const key = `${year}-${month}-${day}`

                return (
                    <button
                        type='button'
                        key={key}
                        className={classNames(
                            cls.dayCell,
                            {
                                [cls.disabled]: isDisabled,
                                [cls.selected]: isSelected,
                                [cls.range]: isRange,
                                [cls.rangeStart]: isRangeStart,
                                [cls.rangeEnd]: isRangeEnd,
                                [cls.singleSelected]: isSingleSelectedDay,
                                [cls.rangeMonthStart]: isRangeMonthStart,
                                [cls.rangeMonthEnd]: isRangeMonthEnd
                            },
                            []
                        )}
                        onClick={() => handleClick(dateObj)}
                        disabled={isDisabled}
                        aria-pressed={isSelected || isRange}
                        aria-label={formatDateKey(dateObj)}>
                        <span className={cls.dayValue}>{day}</span>
                    </button>
                )
            })}
        </div>
    )
}
