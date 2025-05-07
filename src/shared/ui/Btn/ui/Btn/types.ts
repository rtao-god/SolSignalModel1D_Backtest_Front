import { ButtonHTMLAttributes, ReactNode } from 'react'

export interface CustomBtnProps {
    children: ReactNode
    color?: string
    width?: string
    height?: string
    br?: string
    padding?: string
    border?: string
    fz?: string
    minW?: string
    className?: string
    size?: 'small' | 'medium' | 'large'
    dataTestid?: string
}

export type BtnProps = CustomBtnProps & ButtonHTMLAttributes<HTMLButtonElement>
