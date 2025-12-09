import type { ErrorInfo } from 'react'

export interface LogErrorContext {
    // Откуда пришла ошибка (глобальный boundary, layout, window и т.п.)
    source?: string
    // Текущий путь/роут, если есть
    path?: string
    // Внешний ID ошибки (если генерится где-то ещё, например во fallback-UI)
    errorId?: string
    // Дополнительные данные по ситуации
    extra?: Record<string, unknown>
}

/**
 * Универсальная точка логирования ошибок UI.
 * Сейчас: dev → подробный console.error, prod → заготовка под отправку на backend/в сервис мониторинга.
 */
export function logError(error: Error, errorInfo?: ErrorInfo, context?: LogErrorContext) {
    const payload = {
        name: error.name,
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo?.componentStack,
        source: context?.source,
        path: context?.path ?? (typeof window !== 'undefined' ? window.location.pathname : undefined),
        extra: context?.extra
    }

    if (process.env.NODE_ENV === 'development') {
        // В dev достаточно честно и подробно вывалить всё в консоль
        console.error('[UI Error]', payload)
        return
    }

    // TODO: Добавить в backend:
    //
    // void fetch('/api/logs/ui-error', {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify(payload)
    // })
    //
    // Чтобы сейчас ничего не ломать — оставляем мягкий fallback в консоль.
    console.error('[UI Error][prod]', payload)
}
