import type { ErrorInfo } from 'react'

/*
	logError — логирование.

	Зачем:
		- Централизует обработку и отправку ошибок.
*/

export interface LogErrorContext {
    // Откуда пришла ошибка (глобальный boundary, layout, window и т.п.).
    source?: string
    // Текущий путь/роут, если есть.
    path?: string
    // Внешний ID ошибки (если генерится где-то ещё, например во fallback-UI).
    errorId?: string
    // Дополнительные данные по ситуации.
    extra?: Record<string, unknown>
}

/*
	Универсальная точка логирования ошибок UI.

	- В dev: подробный console.error.
	- В prod: заготовка под отправку на backend или в сервис мониторинга.
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
        // В dev достаточно честно и подробно вывалить всё в консоль.
        console.error('[UI Error]', payload)
        return
    }

    /*
		TODO: добавить отправку ошибки в backend.

		- Endpoint: POST /api/logs/ui-error с payload.
		- Пока не ломаем поток, оставляем fallback в консоль.
	*/
    console.error('[UI Error][prod]', payload)
}

