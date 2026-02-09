import { logError } from './logError'

let isInitialized = false

export function setupGlobalErrorHandlers() {
    if (isInitialized || typeof window === 'undefined') {
        return
    }

    isInitialized = true

    window.addEventListener('error', event => {
        if (!(event.error instanceof Error)) {
            return
        }

        logError(event.error, undefined, {
            source: 'window.onerror'
        })
    })

    window.addEventListener('unhandledrejection', event => {
        const reason = event.reason

        if (reason instanceof Error) {
            logError(reason, undefined, {
                source: 'unhandledrejection'
            })
            return
        }

        const wrappedError = new Error('Unhandled promise rejection')
        logError(wrappedError, undefined, {
            source: 'unhandledrejection',
            extra: { reason }
        })
    })
}

