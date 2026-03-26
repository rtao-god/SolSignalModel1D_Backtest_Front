const TRAILING_SLASHES_PATTERN = /\/+$/

function normalizeRoutePath(path: string): string {
    if (path === '/') {
        return path
    }

    const normalizedPath = path.replace(TRAILING_SLASHES_PATTERN, '')
    return normalizedPath || '/'
}

/**
 * Сравнивает pathname c конкретным routePath без ложных совпадений по общему префиксу.
 * Нужен для активного состояния leaf-страниц вроде /current-prediction и /current-prediction/history.
 */
export function isRouteExactMatch(pathname: string, routePath: string): boolean {
    return normalizeRoutePath(pathname) === normalizeRoutePath(routePath)
}

/**
 * Проверяет, что pathname находится внутри route-ветки и совпадает по границе URL-сегмента.
 * Пример: /guide/models принадлежит /guide, но /guidebook не принадлежит /guide.
 */
export function isRouteBranchMatch(pathname: string, routePath: string): boolean {
    const normalizedPathname = normalizeRoutePath(pathname)
    const normalizedRoutePath = normalizeRoutePath(routePath)

    if (normalizedRoutePath === '/') {
        return normalizedPathname === '/'
    }

    return normalizedPathname === normalizedRoutePath || normalizedPathname.startsWith(`${normalizedRoutePath}/`)
}
