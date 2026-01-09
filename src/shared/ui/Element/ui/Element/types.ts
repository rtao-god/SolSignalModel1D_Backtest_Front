import type { HTMLAttributes, ReactNode } from 'react'

// Все HTML-теги, которые реально есть в DOM
export type HtmlTag = keyof HTMLElementTagNameMap

/**
 * Базовый полиморфный элемент.
 * Наследует HTMLAttributes<HTMLElement>, чтобы принимать id, className, aria-*, data-* и т.д.
 * Стандартный HTML-атрибут type убираем, чтобы не конфликтовал с нашим prop type (тег).
 */
export default interface ElementProps extends Omit<HTMLAttributes<HTMLElement>, 'type'> {
    /**
     * Какой HTML-тег отрендерить (div, span, p, h1 и т.п.).
     */
    type?: HtmlTag

    /**
     * Дочерний контент.
     */
    children: ReactNode
}
