export interface AppErrorDescriptor {
    // Код ошибки: HTTP-код или технический маркер (NETWORK, TIMEOUT, UNKNOWN и т.п.).
    code: AppErrorCode
    // Короткий заголовок, который можно показывать пользователю.
    title: string
    // Описание для пользователя: что пошло не так и что он может сделать.
    description: string
}

// Базовый тип для кодов ошибок.
// Вынесен в отдельный файл, чтобы можно было переиспользовать в других модулях без цикличных импортов.
export type AppErrorCode = number | 'NETWORK' | 'TIMEOUT' | 'PARSING' | 'UNKNOWN'

export const DEFAULT_ERROR_DESCRIPTOR: AppErrorDescriptor = {
    code: 'UNKNOWN',
    title: 'Что-то пошло не так',
    description: 'Произошла непредвиденная ошибка. Попробуйте обновить страницу или повторить действие позже.'
}

/**
 * Словарь распространённых ошибок по коду.
 * Ключ — строка, чтобы покрыть и числовые статусы, и текстовые маркеры.
 */
export const ERROR_DESCRIPTORS: Record<string, AppErrorDescriptor> = {
    '400': {
        code: 400,
        title: 'Некорректный запрос',
        description: 'Проверьте введённые параметры и попробуйте ещё раз.'
    },
    '401': {
        code: 401,
        title: 'Нужно авторизоваться',
        description: 'Авторизуйтесь в системе и повторите попытку.'
    },
    '403': {
        code: 403,
        title: 'Нет доступа',
        description: 'У вас нет прав для выполнения этой операции.'
    },
    '404': {
        code: 404,
        title: 'Ничего не найдено',
        description: 'Запрашиваемый ресурс не найден или был удалён.'
    },
    '500': {
        code: 500,
        title: 'Ошибка на сервере',
        description: 'Сервер временно недоступен. Попробуйте повторить попытку позже.'
    },
    NETWORK: {
        code: 'NETWORK',
        title: 'Проблемы с сетью',
        description: 'Не удалось связаться с сервером. Проверьте подключение к интернету.'
    },
    TIMEOUT: {
        code: 'TIMEOUT',
        title: 'Сервер долго не отвечал',
        description: 'Запрос превысил лимит ожидания. Попробуйте повторить попытку позже.'
    },
    PARSING: {
        code: 'PARSING',
        title: 'Некорректный ответ сервера',
        description: 'Ответ сервера не удалось обработать. Возможно, идёт деплой или изменился формат API.'
    }
}

/**
 * Возвращает описатель ошибки по коду или дефолтный, если код не распознан.
 */
export function getErrorDescriptor(code: AppErrorCode | null | undefined): AppErrorDescriptor {
    if (code == null) {
        return DEFAULT_ERROR_DESCRIPTOR
    }

    const key = typeof code === 'number' ? String(code) : code
    return ERROR_DESCRIPTORS[key] ?? { ...DEFAULT_ERROR_DESCRIPTOR, code }
}
