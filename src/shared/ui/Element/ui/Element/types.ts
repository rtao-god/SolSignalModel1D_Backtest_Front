import type { HTMLAttributes, ReactNode } from 'react'

// Явно ограничиваемся только HTML-тегами, без SVG
export type HtmlTag = keyof HTMLElementTagNameMap

export default interface ElementProps extends HTMLAttributes<HTMLElement> {
    // Какой HTML-тег отрендерить (div, span, p, h1 и т.п.)
    type?: HtmlTag
    children: ReactNode
}
