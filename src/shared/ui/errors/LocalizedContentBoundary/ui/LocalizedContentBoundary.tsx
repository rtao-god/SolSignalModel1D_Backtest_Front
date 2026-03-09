import type { ReactNode } from 'react'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Btn, Text } from '@/shared/ui'
import {
    isLocalizedContentPendingError,
    normalizeI18nLanguage,
    resolveAlternativeI18nLanguage
} from '@/shared/lib/i18n'
import { ErrorBlock } from '../../ErrorBlock/ui/ErrorBlock'
import { SectionErrorBoundary } from '../../SectionErrorBoundary/ui/SectionErrorBoundary'

interface LocalizedContentBoundaryProps {
    children: ReactNode | (() => ReactNode)
    compact?: boolean
    name: string
}

interface LocalizedContentRendererProps {
    loadingText: string
    render: () => ReactNode
}

function LocalizedContentRenderer({ render, loadingText }: LocalizedContentRendererProps) {
    try {
        return <>{render()}</>
    } catch (error) {
        if (isLocalizedContentPendingError(error)) {
            return <Text>{loadingText}</Text>
        }

        throw error
    }
}

/**
 * Изолирует ошибки локализованных блоков так, чтобы дефект одного текста,
 * списка или таблицы не блокировал соседние секции и другие страницы.
 */
export function LocalizedContentBoundary({ children, compact = true, name }: LocalizedContentBoundaryProps) {
    const { i18n, t } = useTranslation('errors')
    const activeLanguage = normalizeI18nLanguage(i18n.resolvedLanguage ?? i18n.language)
    const alternativeLanguage = resolveAlternativeI18nLanguage(activeLanguage)
    const switchDescriptionKey =
        alternativeLanguage === 'ru' ? 'ui.localizedContentBoundary.descriptionSwitchToRussian'
        : alternativeLanguage === 'en' ? 'ui.localizedContentBoundary.descriptionSwitchToEnglish'
        : 'ui.localizedContentBoundary.descriptionDefault'
    const switchButtonKey =
        alternativeLanguage === 'ru' ? 'ui.localizedContentBoundary.switchToRussian'
        : alternativeLanguage === 'en' ? 'ui.localizedContentBoundary.switchToEnglish'
        : null

    const renderFallback = useCallback(
        ({ error, reset }: { error: Error; reset: () => void }) => (
            <ErrorBlock
                code='I18N'
                compact={compact}
                title={t('ui.localizedContentBoundary.title', {
                    defaultValue: 'This content block did not load.'
                })}
                description={t(switchDescriptionKey, {
                    defaultValue:
                        alternativeLanguage ?
                            'Only this block is unavailable. If the issue is limited to the current localization, switch to the alternative language and continue reading the page.'
                        :   'Only this block is unavailable because the active localization resource is missing or invalid. The rest of the page remains available.'
                })}
                details={error.message}
                onRetry={reset}
                actions={
                    alternativeLanguage && switchButtonKey ?
                        <Btn
                            variant='chip'
                            colorScheme='accent'
                            onClick={() => {
                                void i18n.changeLanguage(alternativeLanguage)
                            }}>
                            {t(switchButtonKey, {
                                defaultValue: 'Switch language'
                            })}
                        </Btn>
                    :   undefined
                }
            />
        ),
        [alternativeLanguage, compact, i18n, switchButtonKey, switchDescriptionKey, t]
    )

    const content =
        typeof children === 'function' ?
            <LocalizedContentRenderer
                loadingText={t('ui.localizedContentBoundary.loading', {
                    defaultValue: 'Loading localized content'
                })}
                render={children as () => ReactNode}
            />
        :   children

    return (
        <SectionErrorBoundary
            name={name}
            resetKeys={[activeLanguage]}
            fallback={({ error, reset }) => renderFallback({ error, reset })}>
            {content}
        </SectionErrorBoundary>
    )
}
