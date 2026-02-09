import { ReactNode } from 'react'
import { LinkProps } from 'react-router-dom'
export default interface AppLinkProps extends LinkProps {
    children: ReactNode
    className?: string
}

