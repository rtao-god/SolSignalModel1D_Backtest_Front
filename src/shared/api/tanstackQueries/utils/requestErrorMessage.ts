interface ApiErrorResponseLike {
    code?: unknown
    message?: unknown
    owner?: unknown
    context?: unknown
    expected?: unknown
    actual?: unknown
    requiredAction?: unknown
    traceId?: unknown
    status?: unknown
    statusText?: unknown
    error?: unknown
    title?: unknown
    detail?: unknown
}

function toText(value: unknown): string | null {
    if (typeof value === 'string') {
        const trimmed = value.trim()
        return trimmed.length > 0 ? trimmed : null
    }

    if (value == null) {
        return null
    }

    try {
        const serialized = JSON.stringify(value)
        return serialized && serialized !== '{}' ? serialized : null
    } catch {
        return String(value)
    }
}

function toStatusText(response: Response): string {
    const text = response.statusText.trim()
    return text.length > 0 ? text : 'Unknown status'
}

function buildDetailsFromPayload(payload: ApiErrorResponseLike): string[] {
    const details: string[] = []

    const owner = toText(payload.owner)
    const code = toText(payload.code)
    const message = toText(payload.message) ?? toText(payload.detail) ?? toText(payload.title) ?? toText(payload.error)
    const expected = toText(payload.expected)
    const actual = toText(payload.actual)
    const requiredAction = toText(payload.requiredAction)
    const traceId = toText(payload.traceId)
    const context = toText(payload.context)

    if (owner) details.push(`owner=${owner}`)
    if (code) details.push(`code=${code}`)
    if (message) details.push(`message=${message}`)
    if (expected) details.push(`expected=${expected}`)
    if (actual) details.push(`actual=${actual}`)
    if (requiredAction) details.push(`requiredAction=${requiredAction}`)
    if (context) details.push(`context=${context}`)
    if (traceId) details.push(`traceId=${traceId}`)

    return details
}

/**
 * Преобразует HTTP-ошибку API в подробный текст для логов и UI.
 * Если backend вернул structured error envelope, сохраняет owner/expected/actual/context.
 */
export function buildDetailedRequestErrorMessage(resourceLabel: string, response: Response, bodyText: string): string {
    const prefix = `${resourceLabel}: ${response.status} ${toStatusText(response)}`
    const trimmedBody = bodyText.trim()

    if (!trimmedBody) {
        return `${prefix}.`
    }

    try {
        const payload = JSON.parse(trimmedBody) as ApiErrorResponseLike
        const details = buildDetailsFromPayload(payload)
        if (details.length > 0) {
            return `${prefix}. ${details.join(' | ')}.`
        }
    } catch {
        // Некорректный JSON не должен скрывать исходный body text.
    }

    return `${prefix}. body=${trimmedBody}.`
}
