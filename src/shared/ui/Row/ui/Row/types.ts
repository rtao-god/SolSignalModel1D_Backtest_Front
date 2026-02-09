import { CSSProperties, ReactNode } from 'react'

export default interface RowProps {
    children: ReactNode
    gap: number
    style?: CSSProperties
    className?: string
    onClick?: () => void
}

