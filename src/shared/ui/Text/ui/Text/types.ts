import ElementProps, { HtmlTag } from '@/shared/ui/Element/ui/Element/types'
import type { CSSProperties, ReactNode } from 'react'
export type TextTag = Extract<HtmlTag, 'p' | 'span' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'>
export type TextVariant =
    | 'display'
    | 'display-compact'
    | 'page-title'
    | 'page-title-compact'
    | 'section-title'
    | 'section-title-compact'
    | 'card-title'
    | 'card-title-strong'
    | 'body-lg'
    | 'body-md'
    | 'body-sm'
    | 'label'
    | 'caption'
    | 'micro'
    | 'nav'
    | 'tooltip'
    | 'error'
    | 'kpi'

export default interface TextProps extends Omit<ElementProps, 'type' | 'style' | 'children'> {
    type?: TextTag
    children: ReactNode
    variant?: TextVariant
    position?: 'start' | 'end' | 'left' | 'right' | 'center' | 'justify' | 'match-parent'
    color?: string
    fw?: number | string
    style?: CSSProperties
}
