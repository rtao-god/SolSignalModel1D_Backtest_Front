import type { ReactNode } from 'react'
import PageError from '@/shared/ui/errors/PageError/ui/PageError'

interface PageDataBoundaryProps {
    isError?: boolean
    error?: unknown
    hasData: boolean
    onRetry?: () => void
    errorTitle: string
    children: ReactNode
}

export default function PageDataBoundary({
    isError,
    error,
    hasData,
    onRetry,
    errorTitle,
    children
}: PageDataBoundaryProps) {
    if (isError || !hasData) {
        return <PageError title={errorTitle} error={error} onRetry={onRetry} />
    }

    return <>{children}</>
}

