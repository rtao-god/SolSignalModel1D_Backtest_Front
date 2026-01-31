import ElementProps, { HtmlTag } from '@/shared/ui/Element/ui/Element/types'
import type { CSSProperties, ReactNode } from 'react'
// Разрешённые теги для текста.
export type TextTag = Extract<HtmlTag, 'p' | 'span' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'>

/*
	Публичный контракт Text.

	- Наследует все DOM-пропсы через ElementProps (id, aria-*, data-*, onClick, tabIndex, и т.п.).
	- Переопределяет type (семантический тег текста).
	- Добавляет шорткаты типографики.
*/
export default interface TextProps extends Omit<ElementProps, 'type' | 'style' | 'children'> {
    // Какой тег рисуем (p/h1/...).
    type?: TextTag

    // Контент.
    children: ReactNode

    // Выравнивание текста (сохранены твои значения).
    position?: 'start' | 'end' | 'left' | 'right' | 'center' | 'justify' | 'match-parent'

    // Размер шрифта (шорткат поверх style.fontSize).
    fz?: string | number

    // Цвет шрифта (шорткат поверх style.color).
    color?: string

    // Жирность (шорткат поверх style.fontWeight).
    fw?: number | string

    // Базовые inline-стили, мержатся с шорткатами.
    style?: CSSProperties
}


