import { Btn, Text } from '@/shared/ui'
import { ErrorBoundaryFallbackProps } from '../../ErrorBoundary'
import cls from './PageErrorFallback.module.scss'
import classNames from '@/shared/lib/helpers/classNames'
import { useTranslation } from 'react-i18next'
import { isLocalizedContentError, normalizeI18nLanguage, resolveAlternativeI18nLanguage } from '@/shared/lib/i18n'

export default function PageErrorFallback({ error, resetErrorBoundary }: ErrorBoundaryFallbackProps) {
    const { t, i18n } = useTranslation('errors')
    const activeLanguage = normalizeI18nLanguage(i18n.resolvedLanguage ?? i18n.language)
    const alternativeLanguage = resolveAlternativeI18nLanguage(activeLanguage)
    const isLocalizedError = isLocalizedContentError(error)
    const title =
        isLocalizedError ?
            t('ui.pageError.localizedTitle', {
                defaultValue: 'Localized page section failed to load'
            })
        :   t('ui.pageError.title', {
                defaultValue: 'This part of the page failed to load'
            })
    const descriptionKey =
        isLocalizedError && alternativeLanguage === 'ru' ? 'ui.pageError.localizedDescriptionSwitchToRussian'
        : isLocalizedError && alternativeLanguage === 'en' ? 'ui.pageError.localizedDescriptionSwitchToEnglish'
        : isLocalizedError ? 'ui.pageError.localizedDescriptionDefault'
        : 'ui.pageError.description'
    const switchButtonKey =
        alternativeLanguage === 'ru' ? 'ui.localizedContentBoundary.switchToRussian'
        : alternativeLanguage === 'en' ? 'ui.localizedContentBoundary.switchToEnglish'
        : null

    return (
        <div className={classNames(cls.PageErrorFallback, {}, [])}>
            <div className={cls.card}>
                <div className={cls.header}>
                    <span className={cls.pill}>
                        {t('ui.pageError.pill', {
                            defaultValue: 'Section error'
                        })}
                    </span>
                    <h2 className={cls.title}>{title}</h2>
                    <Text className={cls.subtitle}>
                        {t(descriptionKey, {
                            defaultValue:
                                isLocalizedError ?
                                    'The error is limited to the main content area. The active localization resource is missing or invalid, while the rest of the layout remains available.'
                                :   'You can retry this section. If the error persists, check settings or open another route; the rest of the application remains available.'
                        })}
                    </Text>
                </div>

                {error?.message && (
                    <div className={cls.message}>
                        <span className={cls.messageLabel}>
                            {t('ui.pageError.detailsLabel', {
                                defaultValue: 'Details'
                            })}
                        </span>
                        <span className={cls.messageText}>{error.message}</span>
                    </div>
                )}

                <div className={cls.actions}>
                    <Btn className={cls.primary} onClick={resetErrorBoundary}>
                        {t('ui.pageError.retry', {
                            defaultValue: 'Retry request'
                        })}
                    </Btn>
                    {isLocalizedError && alternativeLanguage && switchButtonKey && (
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
                    )}
                </div>
            </div>
        </div>
    )
}
