import { ReactNode, CSSProperties, MouseEventHandler } from 'react'

export default interface TextProps {
    type?: 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
    children: ReactNode
    position?: 'start' | 'end' | 'left' | 'right' | 'center' | 'justify' | 'match-parent'
    fz?: string | number
    color?: string
    fw?: number
    onClick?: MouseEventHandler<HTMLElement>
    style?: CSSProperties
    className?: string
}
