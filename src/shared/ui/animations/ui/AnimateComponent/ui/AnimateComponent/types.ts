import { ElementType, ReactNode } from 'react'
export default interface AnimateComponentProps {
    children: ReactNode
    Component?: ElementType
    initialOpacity?: number
    animateOpacity?: number
    exitOpacity?: number
    duration?: number
    className?: string
}


