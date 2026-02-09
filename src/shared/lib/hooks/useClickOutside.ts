import { RefObject, useEffect } from 'react'

/*
	useClickOutside — хук закрытия/сворачивания UI при клике вне целевого контейнера.

	Источники данных и сайд-эффекты:
		- Слушает глобальные события mousedown и touchstart на document.
		- Вызывает внешний handler только для кликов вне ref и вне excludeRef.

	Контракты:
		- ref должен указывать на реальный DOM-узел, иначе хук ничего не делает.
		- excludeRef используется для "кнопок-исключений" (например, кнопки открытия меню), чтобы клик по ним не считался внешним.
*/
function useClickOutside<T extends HTMLElement>(
    ref: RefObject<T>,
    handler: (event: MouseEvent | TouchEvent) => void,
    excludeRef?: RefObject<HTMLElement>
): void {
    useEffect(() => {
        const listener = (event: MouseEvent | TouchEvent) => {
            // Не закрываем UI при клике внутри целевого блока и в исключённой зоне (например, кнопке-тогглере).
            if (
                !ref.current ||
                ref.current.contains(event.target as Node) ||
                excludeRef?.current?.contains(event.target as Node)
            ) {
                return
            }

            handler(event)
        }

        document.addEventListener('mousedown', listener)
        document.addEventListener('touchstart', listener)

        return () => {
            document.removeEventListener('mousedown', listener)
            document.removeEventListener('touchstart', listener)
        }
    }, [ref, handler, excludeRef])
}

export default useClickOutside

