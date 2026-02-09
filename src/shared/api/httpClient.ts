import { API_BASE_URL } from '../configs/config'

export async function getJson<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${path}`, {
        method: 'GET',
        headers: {
            Accept: 'application/json'
        },
        ...init
    })

    if (!response.ok) {
        const text = await response.text().catch(() => '')
        const error = new Error(
            `Request failed with status ${response.status} ${response.statusText}: ${text || '<empty body>'}`
        )
        throw error
    }

    return (await response.json()) as T
}

