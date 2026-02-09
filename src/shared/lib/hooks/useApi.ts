import { useState, useEffect } from 'react'
import { API_BASE_URL } from '../../configs/config'

/*
	useApi — минимальный универсальный fetch-хук для чтения данных по endpoint.

	Источники данных и сайд-эффекты:
		- Делает HTTP GET через window.fetch к API_BASE_URL + endpoint.
		- Управляет локальными состояниями data/isLoading/error.

	Контракты:
		- Хук перезапрашивает данные при смене endpoint.
		- Невалидный HTTP-статус трактуется как ошибка и попадает в error.
*/
function useApi<T>(endpoint: string): { data: T | null; isLoading: boolean; error: Error | null } {
    const [data, setData] = useState<T | null>(null)
    const [isLoading, setIsLoading] = useState<boolean>(true)
    const [error, setError] = useState<Error | null>(null)

    useEffect(() => {
        // Хук привязан к endpoint: при его смене выполняем новый запрос.
        const fetchData = async () => {
            setIsLoading(true)
            try {
                const response = await fetch(`${API_BASE_URL}${endpoint}`)
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

        // Явно помечаем Promise как fire-and-forget внутри эффекта.
        void fetchData()
    }, [endpoint])

    return { data, isLoading, error }
}

export default useApi

