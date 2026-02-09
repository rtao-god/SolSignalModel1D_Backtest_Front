import type { ReactNode } from 'react'
import PageError from '@/shared/ui/errors/PageError/ui/PageError'
import { PageLoader } from '@/shared/ui/loaders/PageLoader'

interface PageDataBoundaryProps {
    isLoading?: boolean
    isError?: boolean
    error?: unknown
    hasData: boolean
    onRetry?: () => void
    errorTitle: string
    loadingTitle?: string
    children: ReactNode
}

export default function PageDataBoundary({
    isLoading,
    isError,
    error,
    hasData,
    onRetry,
    errorTitle,
    loadingTitle,
    children
}: PageDataBoundaryProps) {
    if (isLoading) {
        return <PageLoader title={loadingTitle ?? 'Загружаю данные'} />
    }

    if (isError || !hasData) {
        return <PageError title={errorTitle} error={error} onRetry={onRetry} />
    }

    return <>{children}</>
}
