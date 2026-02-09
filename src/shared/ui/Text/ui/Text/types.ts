import ElementProps, { HtmlTag } from '@/shared/ui/Element/ui/Element/types'
import type { CSSProperties, ReactNode } from 'react'
export type TextTag = Extract<HtmlTag, 'p' | 'span' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'>

export default interface TextProps extends Omit<ElementProps, 'type' | 'style' | 'children'> {
    type?: TextTag
    children: ReactNode
    position?: 'start' | 'end' | 'left' | 'right' | 'center' | 'justify' | 'match-parent'
    fz?: string | number
    color?: string
    fw?: number | string
    style?: CSSProperties
}

