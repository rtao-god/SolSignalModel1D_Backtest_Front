import { ReactNode } from 'react'
export default interface ModalProps {
    children: ReactNode
    onClose: () => void
    width?: string
    height?: string
    className?: string
}

