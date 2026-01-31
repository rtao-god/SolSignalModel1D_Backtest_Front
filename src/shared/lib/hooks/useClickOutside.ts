import { RefObject, useEffect } from 'react'

/*
	useClickOutside — пользовательский хук.

	Зачем:
		- Инкапсулирует логику useClickOutside.
*/

function useClickOutside<T extends HTMLElement>(
    ref: RefObject<T>,
    handler: (event: MouseEvent | TouchEvent) => void,
    excludeRef?: RefObject<HTMLElement>
): void {
    useEffect(() => {
        const listener = (event: MouseEvent | TouchEvent) => {
            // Игнорируем клики внутри основного ref и внутри excludeRef.
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

