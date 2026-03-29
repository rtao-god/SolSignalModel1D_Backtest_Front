import type { ErrorDomain } from '@/shared/lib/logging/errorDomains'

export interface NormalizeErrorContext {
    source?: string
    path?: string
    domain?: ErrorDomain
    owner?: string
    expected?: string
    actual?: string
    requiredAction?: string
    errorId?: string
    extra?: Record<string, unknown>
}

function toReason(value: unknown): string | null {
    if (value instanceof Error) {
        return `${value.name}: ${value.message}`
    }

    if (typeof value === 'string') {
        const trimmed = value.trim()
        return trimmed.length > 0 ? trimmed : null
    }

    if (value == null) {
        return null
    }

    try {
        const serialized = JSON.stringify(value)
        return serialized && serialized !== '{}' ? serialized : String(value)
    } catch {
        return String(value)
    }
}

function hasContextPayload(context?: NormalizeErrorContext): boolean {
    return Boolean(
        context?.source ||
            context?.path ||
            context?.domain ||
            context?.owner ||
            context?.expected ||
            context?.actual ||
            context?.requiredAction ||
            context?.errorId ||
            context?.extra
    )
}

function addPartIfMissing(parts: string[], baseMessage: string, marker: string, value: string | undefined): void {
    if (!value) {
        return
    }

    const prefix = `${marker}=`
    if (baseMessage.includes(prefix)) {
        return
    }

    parts.push(`${prefix}${value}`)
}

/**
 * Нормализует неизвестное значение в Error, сохраняя доменный контекст рядом с сообщением.
 * Используется на границах app/bootstrap, boundary и mutation/query wrapper-ов.
 */
export function normalizeErrorLike(error: unknown, fallbackMessage: string, context?: NormalizeErrorContext): Error {
    if (error instanceof Error) {
        if (!hasContextPayload(context)) {
            return error
        }

        const baseMessage = error.message.trim().length > 0 ? error.message.trim() : fallbackMessage
        const parts: string[] = [baseMessage]

        addPartIfMissing(parts, baseMessage, 'owner', context?.owner)
        addPartIfMissing(parts, baseMessage, 'expected', context?.expected)
        addPartIfMissing(parts, baseMessage, 'reportedActual', context?.actual)
        addPartIfMissing(parts, baseMessage, 'requiredAction', context?.requiredAction)
        addPartIfMissing(parts, baseMessage, 'source', context?.source)
        addPartIfMissing(parts, baseMessage, 'path', context?.path)
        addPartIfMissing(parts, baseMessage, 'domain', context?.domain)
        addPartIfMissing(parts, baseMessage, 'errorId', context?.errorId)

        if (context?.extra && !baseMessage.includes('extra=')) {
            try {
                parts.push(`extra=${JSON.stringify(context.extra)}`)
            } catch {
                parts.push('extra=[unserializable]')
            }
        }

        if (parts.length === 1) {
            return error
        }

        const normalized = new Error(parts.join(' | '))
        normalized.name = error.name
        if (error.stack) {
            normalized.stack = error.stack
        }

        return normalized
    }

    const parts: string[] = [fallbackMessage]
    const reason = toReason(error)
    if (reason) parts.push(`actual=${reason}`)
    if (context?.owner) parts.push(`owner=${context.owner}`)
    if (context?.expected) parts.push(`expected=${context.expected}`)
    if (context?.actual) parts.push(`reportedActual=${context.actual}`)
    if (context?.requiredAction) parts.push(`requiredAction=${context.requiredAction}`)
    if (context?.source) parts.push(`source=${context.source}`)
    if (context?.path) parts.push(`path=${context.path}`)
    if (context?.domain) parts.push(`domain=${context.domain}`)
    if (context?.errorId) parts.push(`errorId=${context.errorId}`)

    if (context?.extra) {
        try {
            parts.push(`extra=${JSON.stringify(context.extra)}`)
        } catch {
            parts.push('extra=[unserializable]')
        }
    }

    return new Error(parts.join(' | '))
}
