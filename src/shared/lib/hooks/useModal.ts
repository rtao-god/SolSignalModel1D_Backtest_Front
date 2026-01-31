import { useState, useCallback } from 'react'

/*
	useModal — пользовательский хук.

	Зачем:
		- Инкапсулирует логику useModal.
*/

export default function useModal(initialState = false) {
    const [isOpen, setIsOpen] = useState(initialState)

    const openModal = useCallback(() => {
        setIsOpen(true)
    }, [])
    const closeModal = useCallback(() => {
        setIsOpen(false)
    }, [])
    const toggleModal = useCallback(() => {
        setIsOpen(prev => !prev)
    }, [])

    return { isOpen, openModal, closeModal, toggleModal }
}

