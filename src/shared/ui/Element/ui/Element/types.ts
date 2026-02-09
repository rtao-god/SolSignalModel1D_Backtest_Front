import type { HTMLAttributes, ReactNode } from 'react'
export type HtmlTag = keyof HTMLElementTagNameMap

export default interface ElementProps extends Omit<HTMLAttributes<HTMLElement>, 'type'> {
    type?: HtmlTag
    children: ReactNode
}

