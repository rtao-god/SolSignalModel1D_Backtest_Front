import { useState, useEffect } from 'react'
import { buildDetailedRequestErrorMessage } from '@/shared/api/tanstackQueries/utils/requestErrorMessage'
import { API_BASE_URL } from '../../configs/config'
import { normalizeErrorLike } from '../errors/normalizeError'

interface Notification {
    title: string
    message: string
}

interface Config {
    notifications: Notification[]
}

function useConfig(endpoint: string): { config: Config | null; isLoading: boolean; error: Error | null } {
    const [config, setConfig] = useState<Config | null>(null)
    const [isLoading, setIsLoading] = useState<boolean>(true)
    const [error, setError] = useState<Error | null>(null)

    useEffect(() => {
        setIsLoading(true)
        setError(null)
        fetch(`${API_BASE_URL}${endpoint}`)
            .then(async response => {
                if (!response.ok) {
                    const bodyText = await response.text()
                    throw new Error(buildDetailedRequestErrorMessage('Failed to load config payload', response, bodyText))
                }
                return response.json()
            })
            .then((data: Config) => {
                setConfig(data)
                setIsLoading(false)
                return data
            })
            .catch((err: unknown) => {
                setError(
                    normalizeErrorLike(err, 'Unknown config request error.', {
                        source: 'use-config',
                        domain: 'ui_section',
                        owner: 'useConfig',
                        expected: 'Config hook should receive a successful JSON payload or a detailed API error.',
                        requiredAction: 'Inspect the config endpoint and request wrapper.',
                        extra: { endpoint }
                    })
                )
                setIsLoading(false)
            })
    }, [endpoint])

    return { config, isLoading, error }
}

export default useConfig
