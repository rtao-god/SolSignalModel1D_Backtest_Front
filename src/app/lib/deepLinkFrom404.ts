const DEEPLINK_QUERY_KEY = '__ssm_deeplink'

function isSafeRelativePath(value: string): boolean {
    if (!value.startsWith('/')) {
        return false
    }

    if (value.startsWith('//')) {
        return false
    }

    return !value.includes('://')
}

export function build404DeepLinkTarget(pathname: string, search: string, hash: string): string {
    return `/?${DEEPLINK_QUERY_KEY}=${encodeURIComponent(`${pathname}${search}${hash}`)}`
}

export function restorePathFrom404(search: string): string | null {
    const params = new URLSearchParams(search)
    const encodedPath = params.get(DEEPLINK_QUERY_KEY)
    if (!encodedPath) {
        return null
    }

    let decodedPath: string
    try {
        decodedPath = decodeURIComponent(encodedPath)
    } catch {
        return null
    }

    if (!isSafeRelativePath(decodedPath)) {
        return null
    }

    return decodedPath
}
