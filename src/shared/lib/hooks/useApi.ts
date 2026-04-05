import { useState, useEffect } from 'react'
import { buildDetailedRequestErrorMessage } from '@/shared/api/tanstackQueries/utils/requestErrorMessage'
import { API_BASE_URL } from '../../configs/config'
import { normalizeErrorLike } from '../errors/normalizeError'

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
            setError(null)
            try {
                const response = await fetch(`${API_BASE_URL}${endpoint}`)
                if (!response.ok) {
                    const bodyText = await response.text()
                    throw new Error(buildDetailedRequestErrorMessage('Failed to load API payload', response, bodyText))
                }
                const jsonData = (await response.json()) as T
                setData(jsonData)
            } catch (error) {
                setError(
                    normalizeErrorLike(error, 'Unknown API request error.', {
                        source: 'use-api',
                        domain: 'ui_section',
                        owner: 'useApi',
                        expected: 'API hook should receive a successful JSON payload or a detailed API error.',
                        requiredAction: 'Inspect the endpoint and request wrapper.',
                        extra: { endpoint }
                    })
                )
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
