import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import classNames from '@/shared/lib/helpers/classNames'
import cls from './DatePicker.module.scss'
import type DatePickerProps from './types'
import { dateActions, selectArrivalDate, selectDepartureDate, type UiDate } from '@/entities/date'
import { toStartOfDay } from '@/shared/consts/date'
import useClickOutside from '@/shared/lib/hooks/useClickOutside'
import Calendar from '../Calendar/Calendar'
import type { DateRangeField } from '../../model/types'
import resolveDateRangeSelection from '../../model/lib/resolveDateRangeSelection'

const DEFAULT_MIN_SELECTABLE_DATE = toStartOfDay(new Date(2022, 3, 13))

export default function DatePicker({ className, minSelectableDate }: DatePickerProps) {
    const { t } = useTranslation('common')
    const [isOpen, setIsOpen] = useState(false)
    const [activeField, setActiveField] = useState<DateRangeField | null>(null)
    const [openAbove, setOpenAbove] = useState(false)
    const [alignRight, setAlignRight] = useState(false)
    const [viewResetKey, setViewResetKey] = useState(0)

    const dispatch = useDispatch()
    const departureDate = useSelector(selectDepartureDate)
    const arrivalDate = useSelector(selectArrivalDate)
    const rootRef = useRef<HTMLDivElement>(null)
    const inputGroupRef = useRef<HTMLDivElement>(null)
    const popoverRef = useRef<HTMLDivElement>(null)

    const hasRange = Boolean(departureDate && arrivalDate)
    const resolvedMinSelectableDate = useMemo(
        () => toStartOfDay(minSelectableDate ?? DEFAULT_MIN_SELECTABLE_DATE),
        [minSelectableDate]
    )

    const closePicker = useCallback(() => {
        setIsOpen(false)
        setActiveField(null)
    }, [])

    useClickOutside(rootRef, closePicker)

    const measurePopoverPosition = useCallback(() => {
        if (!isOpen || !inputGroupRef.current || !popoverRef.current) {
            return
        }

        const inputGroupRect = inputGroupRef.current.getBoundingClientRect()
        const popoverRect = popoverRef.current.getBoundingClientRect()
        const nextOpenAbove =
            inputGroupRect.bottom + popoverRect.height + 12 > window.innerHeight &&
            inputGroupRect.top - popoverRect.height - 12 >= 0
        const nextAlignRight =
            inputGroupRect.left + popoverRect.width > window.innerWidth &&
            inputGroupRect.right - popoverRect.width >= 12

        setOpenAbove(prev => (prev === nextOpenAbove ? prev : nextOpenAbove))
        setAlignRight(prev => (prev === nextAlignRight ? prev : nextAlignRight))
    }, [isOpen])

    useEffect(() => {
        if (!isOpen) {
            return
        }

        const frameId = window.requestAnimationFrame(measurePopoverPosition)
        const handleViewportChange = () => {
            window.requestAnimationFrame(measurePopoverPosition)
        }

        window.addEventListener('resize', handleViewportChange)

        return () => {
            window.cancelAnimationFrame(frameId)
            window.removeEventListener('resize', handleViewportChange)
        }
    }, [isOpen, measurePopoverPosition])

    useEffect(() => {
        if (!isOpen) {
            return
        }

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                closePicker()
            }
        }

        window.addEventListener('keydown', handleEscape)

        return () => {
            window.removeEventListener('keydown', handleEscape)
        }
    }, [closePicker, isOpen])

    const openPicker = useCallback((field: DateRangeField) => {
        setActiveField(field)
        setIsOpen(true)
        setViewResetKey(previous => previous + 1)
    }, [])

    const commitRange = useCallback(
        (nextDepartureDate: UiDate, nextArrivalDate: UiDate) => {
            dispatch(dateActions.setDepartureDate(nextDepartureDate?.value ?? null))
            dispatch(dateActions.setArrivalDate(nextArrivalDate?.value ?? null))
        },
        [dispatch]
    )

    const handleDateSelect = useCallback(
        (selectedDate: Date) => {
            if (!activeField) {
                return
            }

            const { nextDepartureDate, nextArrivalDate, nextActiveField, shouldClose } = resolveDateRangeSelection({
                activeField,
                departureDate,
                arrivalDate,
                selectedDate
            })

            commitRange(nextDepartureDate, nextArrivalDate)
            if (shouldClose) {
                closePicker()
                return
            }

            setActiveField(nextActiveField)
        },
        [activeField, arrivalDate, closePicker, commitRange, departureDate]
    )

    const handleClearRange = useCallback(() => {
        dispatch(dateActions.clearDateRange())
        if (activeField === 'to') {
            setActiveField('from')
        }
        setViewResetKey(previous => previous + 1)
    }, [activeField, dispatch])

    const fromDisplayValue = departureDate?.value ?? t('dateRangePicker.fromPlaceholder')
    const toDisplayValue = arrivalDate?.value ?? t('dateRangePicker.toPlaceholder')

    return (
        <div ref={rootRef} className={classNames(cls.datePicker, {}, [className ?? ''])}>
            <div
                ref={inputGroupRef}
                className={cls.inputGroup}
                role='group'
                aria-label={t('dateRangePicker.groupAria')}>
                <button
                    type='button'
                    className={classNames(
                        cls.inputButton,
                        {
                            [cls.inputButtonActive]: isOpen && activeField === 'from'
                        },
                        []
                    )}
                    onClick={() => openPicker('from')}
                    aria-expanded={isOpen}
                    aria-haspopup='dialog'
                    aria-label={t('dateRangePicker.fromAria')}>
                    <span className={classNames(cls.inputValue, { [cls.placeholder]: !departureDate }, [])}>
                        {fromDisplayValue}
                    </span>
                </button>

                <div className={classNames(cls.separator, { [cls.separatorActive]: hasRange }, [])} aria-hidden='true'>
                    <span className={cls.separatorLine}></span>
                </div>

                <button
                    type='button'
                    className={classNames(
                        cls.inputButton,
                        {
                            [cls.inputButtonActive]: isOpen && activeField === 'to'
                        },
                        []
                    )}
                    onClick={() => openPicker('to')}
                    aria-expanded={isOpen}
                    aria-haspopup='dialog'
                    aria-label={t('dateRangePicker.toAria')}>
                    <span className={classNames(cls.inputValue, { [cls.placeholder]: !arrivalDate }, [])}>
                        {toDisplayValue}
                    </span>
                </button>
            </div>

            {isOpen && (
                <div
                    ref={popoverRef}
                    className={classNames(
                        cls.popover,
                        { [cls.popoverAbove]: openAbove, [cls.popoverAlignRight]: alignRight },
                        []
                    )}>
                    {activeField && (
                        <Calendar
                            key={viewResetKey}
                            departureDate={departureDate}
                            arrivalDate={arrivalDate}
                            minSelectableDate={resolvedMinSelectableDate}
                            activeField={activeField}
                            onSelectDate={handleDateSelect}
                            onClearRange={handleClearRange}
                        />
                    )}
                </div>
            )}
        </div>
    )
}
