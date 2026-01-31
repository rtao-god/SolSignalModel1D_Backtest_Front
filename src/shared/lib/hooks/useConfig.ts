import { useState, useEffect } from 'react'

/*
	useConfig — пользовательский хук.

	Зачем:
		- Инкапсулирует логику useConfig.
*/

interface Notification {
    title: string
    message: string
}

interface Config {
    notifications: Notification[]
}

const baseURL = import.meta.env.API_BASE_URL

function useConfig(endpoint: string): { config: Config | null; isLoading: boolean; error: Error | null } {
    const [config, setConfig] = useState<Config | null>(null)
    const [isLoading, setIsLoading] = useState<boolean>(true)
    const [error, setError] = useState<Error | null>(null)

    useEffect(() => {
        setIsLoading(true)
        fetch(`${baseURL}${endpoint}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok')
                }
                return response.json()
            })
            .then((data: Config) => {
                setConfig(data)
                setIsLoading(false)
                return data
            })
            .catch((err: unknown) => {
                if (err instanceof Error) {
                    setError(err)
                } else {
                    setError(new Error('An unknown error occurred'))
                }
                setIsLoading(false)
            })
    }, [endpoint])

    return { config, isLoading, error }
}

export default useConfig

