import { ButtonHTMLAttributes, ReactNode } from 'react'
export type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'chip'
export type BtnSize = 'sm' | 'md' | 'lg'
export type BtnColorScheme = 'blue' | 'green' | 'accent' | 'danger' | 'neutral'

// Публичный API кнопки: декларативные варианты.
export interface BtnOwnProps {
    children: ReactNode
    variant?: BtnVariant
    size?: BtnSize
    colorScheme?: BtnColorScheme
    className?: string
    dataTestid?: string
}

export type BtnProps = BtnOwnProps & ButtonHTMLAttributes<HTMLButtonElement>


