import { useDispatch, useSelector } from 'react-redux'
import classNames from '@/shared/lib/helpers/classNames'
import cls from './DatePicker.module.scss'
import DatePickerProps from './types'
import { selectArrivalDate, selectDepartureDate, selectIsSelectingDepartureDate, dateActions } from '@/entities/date'
import { Input, Modal } from '@/shared/ui'
import useModal from '@/shared/lib/hooks/useModal'
import Calendar from '../Calendar/Calendar'

export default function DatePicker({ className }: DatePickerProps) {
    const { isOpen, openModal, closeModal } = useModal()

    const dispatch = useDispatch()
    const departureDate = useSelector(selectDepartureDate)
    const arrivalDate = useSelector(selectArrivalDate)
    const isSelectingDepartureDate = useSelector(selectIsSelectingDepartureDate)

    console.log('[DatePicker] state', {
        departureDate,
        arrivalDate,
        isSelectingDepartureDate
    })

    function handleDepartureDateClick(): void {
        openModal()
        dispatch(dateActions.setIsSelectingDepartureDate(true))
        console.log('[DatePicker] click departure')
    }

    function handleArrivalDateClick(): void {
        openModal()
        dispatch(dateActions.setIsSelectingDepartureDate(false))
        console.log('[DatePicker] click arrival')
    }

    return (
        <div className={classNames(cls.Date_picker, {}, [className ?? ''])}>
            <Input
                type='text'
                placeholder='Departure Date'
                value={departureDate?.value ?? ''}
                onClick={handleDepartureDateClick}
                readOnly
            />
            <div className={cls.datepicker_separator}>
                {departureDate && arrivalDate && (
                    <div className={cls.datepicker_range}>
                        <div className={cls.datepicker_line}></div>
                    </div>
                )}
            </div>
            <Input
                type='text'
                placeholder='Arrival Date'
                value={arrivalDate?.value ?? ''}
                onClick={handleArrivalDateClick}
                readOnly
            />
            {isOpen && (
                <Modal onClose={closeModal}>
                    <Calendar />
                </Modal>
            )}
        </div>
    )
}
