import type { ReactNode } from 'react'
import classNames from '@/shared/lib/helpers/classNames'
import cls from './BulletList.module.scss'

/*
	BulletList — shared-обёртка для пользовательских списков с кастомным маркером.

	Зачем:
		- Заменяет стандартный `ul/li` там, где нужен управляемый визуальный маркер и единый ритм текста в продуктовых блоках.

	Контракты:
		- Компонент рендерит именно unordered-список; для шагов, приоритетов и последовательности действий должен использоваться нумерованный формат.
		- Маркер вынесен в отдельный декоративный `span` с `aria-hidden`, поэтому screen reader читает только содержимое пункта.
*/

interface BulletListItem {
    /** Стабильный ключ пункта; если его нет, компонент использует fallback по индексу. */
    key?: string
    /** React-содержимое одного пункта списка. */
    content: ReactNode
}

interface BulletListProps {
    /** Нормализованный список пользовательских пунктов для отображения. */
    items: readonly BulletListItem[]
    /** Внешний класс корневого контейнера списка. */
    className?: string
    /** Режим цвета для декоративных маркеров всего списка. */
    markerTone?: 'default' | 'primary'
    /** Класс одного пункта списка. */
    itemClassName?: string
    /** Класс декоративного маркера-кружка. */
    markerClassName?: string
    /** Класс контейнера текста пункта. */
    contentClassName?: string
}

export default function BulletList({
    items,
    className,
    markerTone = 'default',
    itemClassName,
    markerClassName,
    contentClassName
}: BulletListProps) {
    return (
        <span
            className={classNames(
                cls.list,
                {
                    [cls.listPrimary]: markerTone === 'primary'
                },
                [className ?? '']
            )}>
            {items.map((item, index) => (
                <span
                    key={item.key ?? `bullet-list-item-${index}`}
                    className={classNames(cls.item, {}, [itemClassName ?? ''])}>
                    {/* Маркер отделён от текста, чтобы пользовательский ритм списка не зависел от стандартного `li::marker`. */}
                    <span aria-hidden='true' className={classNames(cls.marker, {}, [markerClassName ?? ''])} />
                    <span className={classNames(cls.content, {}, [contentClassName ?? ''])}>{item.content}</span>
                </span>
            ))}
        </span>
    )
}
