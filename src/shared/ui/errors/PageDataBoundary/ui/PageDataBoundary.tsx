import type { ReactNode } from 'react'
import PageError from '@/shared/ui/errors/PageError/ui/PageError'
import { PageLoader } from '@/shared/ui/loaders/PageLoader'
import { useTranslation } from 'react-i18next'

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
    const { t } = useTranslation('errors')
    const shouldShowLoading = isLoading ?? (!isError && !hasData)

    if (shouldShowLoading) {
        return (
            <PageLoader
                title={loadingTitle ?? t('ui.pageDataBoundary.loading', { defaultValue: 'Loading data' })}
            />
        )
    }

    if (isError || !hasData) {
        return <PageError title={errorTitle} error={error} onRetry={onRetry} />
    }

    return <>{children}</>
}
