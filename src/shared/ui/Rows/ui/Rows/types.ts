import { CSSProperties, ReactNode } from 'react'
export default interface RowsProps {
    children: ReactNode
    rows: string[]
    gap: number
    style?: CSSProperties
    className?: string
}

