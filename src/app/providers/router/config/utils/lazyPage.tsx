import { ComponentType, lazy, type LazyExoticComponent } from 'react'

function normalizeLazyImportError(error: unknown): Error {
    return error instanceof Error ? error : new Error(String(error ?? 'Unknown lazy page import error.'))
}

function createLazyImportErrorComponent<T extends ComponentType<any>>(error: Error): T {
    function LazyImportErrorComponent() {
        throw error
    }

    return LazyImportErrorComponent as unknown as T
}

export function lazyPage<T extends ComponentType<any>>(
    importer: () => Promise<{ default: T }>
): LazyExoticComponent<T> {
    return lazy(async () => {
        try {
            return await importer()
        } catch (error) {
            const normalizedError = normalizeLazyImportError(error)

            // Ошибка загрузки route chunk должна доходить до page-level ErrorBoundary внутри layout,
            // а не превращаться в глобальный unhandled rejection с блокировкой всего shell.
            return {
                default: createLazyImportErrorComponent<T>(normalizedError)
            }
        }
    })
}
