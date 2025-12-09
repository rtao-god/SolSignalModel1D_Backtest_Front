import { useState, useEffect } from 'react'

function useApi<T>(endpoint: string): { data: T | null; isLoading: boolean; error: Error | null } {
    const [data, setData] = useState<T | null>(null)
    const [isLoading, setIsLoading] = useState<boolean>(true)
    const [error, setError] = useState<Error | null>(null)
    const baseURL = import.meta.env.API_BASE_URL

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true)
            try {
                const response = await fetch(`${baseURL}${endpoint}`)
                if (!response.ok) {
                    throw new Error('Network response was not ok')
                }
                const jsonData = (await response.json()) as T
                setData(jsonData)
            } catch (error) {
                setError(error as Error)
            } finally {
                setIsLoading(false)
            }
        }

        void fetchData()
    }, [endpoint, baseURL])

    return { data, isLoading, error }
}

export default useApi
