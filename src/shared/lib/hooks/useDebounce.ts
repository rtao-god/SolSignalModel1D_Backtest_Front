import { useCallback, useRef } from 'react'

/*
	useDebounce — пользовательский хук.

	Зачем:
		- Инкапсулирует логику useDebounce.
*/

export function useDebounce(callback, delay = 500) {
    const timer = useRef(null)

    const debouncedCallback = useCallback(
        (...args) => {
            if (timer.current) {
                clearTimeout(timer.current)
            }

            timer.current = setTimeout(() => {
                callback(...args)
            }, delay)
        },
        [callback, delay]
    )

    return debouncedCallback
}

