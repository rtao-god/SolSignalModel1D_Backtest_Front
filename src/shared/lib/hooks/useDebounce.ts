import { useCallback, useRef } from 'react'

/*
	useDebounce — пользовательский хук.

	Зачем:
		- Инкапсулирует логику useDebounce.
*/

export function useDebounce<T extends (...args: any[]) => void>(callback: T, delay = 500) {
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

    const debouncedCallback = useCallback(
        (...args: Parameters<T>) => {
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

