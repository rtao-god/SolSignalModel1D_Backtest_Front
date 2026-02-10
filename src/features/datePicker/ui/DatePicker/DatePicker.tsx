import { useDispatch, useSelector } from 'react-redux'
import classNames from '@/shared/lib/helpers/classNames'
import cls from './DatePicker.module.scss'
import DatePickerProps from './types'
import { selectArrivalDate, selectDepartureDate, dateActions } from '@/entities/date'
import { Input, Modal } from '@/shared/ui'
import useModal from '@/shared/lib/hooks/useModal'
import Calendar from '../Calendar/Calendar'

export default function DatePicker({ className }: DatePickerProps) {
    const { isOpen, openModal, closeModal } = useModal()

    const dispatch = useDispatch()
    const departureDate = useSelector(selectDepartureDate)
    const arrivalDate = useSelector(selectArrivalDate)

    const hasRange = Boolean(departureDate && arrivalDate)

    function handleDepartureDateClick(): void {
        openModal()
        dispatch(dateActions.setIsSelectingDepartureDate(true))
    }

    function handleArrivalDateClick(): void {
        openModal()
        dispatch(dateActions.setIsSelectingDepartureDate(false))
    }

    return (
        <div className={classNames(cls.datePicker, {}, [className ?? ''])}>
            <div className={cls.inputs}>
                <Input
                    type='text'
                    placeholder='From date'
                    value={departureDate?.value ?? ''}
                    onClick={handleDepartureDateClick}
                    width='180px'
                    readOnly
                />
                <div className={classNames(cls.separator, { [cls.separatorActive]: hasRange }, [])} aria-hidden='true'>
                    <span className={cls.separatorLine}></span>
                </div>
                <Input
                    type='text'
                    placeholder='To date'
                    value={arrivalDate?.value ?? ''}
                    onClick={handleArrivalDateClick}
                    width='180px'
                    readOnly
                />
            </div>

            {isOpen && (
                <Modal onClose={closeModal} width='fit-content' height='fit-content' className={cls.modal}>
                    <Calendar />
                </Modal>
            )}
        </div>
    )
}
