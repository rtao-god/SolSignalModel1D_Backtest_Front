import cls from './Profile.module.scss'
import classNames from '@/shared/lib/helpers/classNames'
import ProfileProps from './types'
import { Link as AppLink, Text } from '@/shared/ui'
import { Trans, useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { ROUTE_PATH } from '@/app/providers/router/config/consts'
import { AppRoute } from '@/app/providers/router/config/types'

interface ProfilePageCopy {
    title: string
    lead: string
    description: string
    backtestLinkLabel: string
    descriptionTail: string
}

/**
 * Возвращает пользовательский текст даже если i18n в рантайме отдал сырой ключ.
 * Это защищает placeholder-страницу от показа служебных идентификаторов.
 */
function resolveProfilePageText(t: TFunction<'common'>, key: string, fallbackValue: string): string {
    const localizedValue = t(key)

    return localizedValue === key ? fallbackValue : localizedValue
}

function resolveProfilePageFallbackCopy(language: string | undefined): ProfilePageCopy {
    const isEnglish = language?.toLowerCase().startsWith('en') ?? false

    if (isEnglish) {
        return {
            title: 'The user profile will appear later',
            lead: 'This section is reserved for the future profile of a registered user.',
            description: 'The profile will be used to save personal settings from the experimental backtest section.',
            backtestLinkLabel: 'experimental backtest',
            descriptionTail:
                'These settings include leverage, risk level, stop-loss, take-profit, and other calculation parameters. This part of the product is not implemented yet.'
        }
    }

    return {
        title: 'Профиль зарегистрированного пользователя появится позже',
        lead: 'Раздел зарезервирован под будущий профиль пользователя.',
        description: 'Профиль будет нужен для сохранения персональных настроек из раздела экспериментального бэктеста.',
        backtestLinkLabel: 'экспериментального бэктеста',
        descriptionTail:
            'В этих настройках будут сохраняться плечо, уровень риска, stop-loss, take-profit и другие параметры расчёта. Сейчас эта часть продукта ещё не реализована.'
    }
}

export default function Profile({ className }: ProfileProps) {
    const { t, i18n } = useTranslation('common')
    const fallbackCopy = resolveProfilePageFallbackCopy(i18n.resolvedLanguage ?? i18n.language)
    const title = resolveProfilePageText(t, 'profile.page.title', fallbackCopy.title)
    const lead = resolveProfilePageText(t, 'profile.page.lead', fallbackCopy.lead)
    const description = resolveProfilePageText(t, 'profile.page.description', fallbackCopy.description)
    const descriptionTail = resolveProfilePageText(t, 'profile.page.descriptionTail', fallbackCopy.descriptionTail)
    const backtestLinkLabel = resolveProfilePageText(
        t,
        'profile.page.backtestLinkLabel',
        fallbackCopy.backtestLinkLabel
    )

    return (
        <div className={classNames(cls.Profile, {}, [className ?? ''])}>
            <section className={cls.content}>
                <div className={cls.accent} />
                <Text type='h1' className={cls.title}>
                    {title}
                </Text>
                <Text className={cls.lead}>{lead}</Text>
                <Text className={cls.description}>
                    <Trans
                        i18nKey='profile.page.description'
                        defaults='{{description}} <backtestLink>{{backtestLinkLabel}}</backtestLink>. {{descriptionTail}}'
                        components={{
                            backtestLink: (
                                <AppLink to={ROUTE_PATH[AppRoute.BACKTEST_FULL]} className={cls.descriptionLink}>
                                    {backtestLinkLabel}
                                </AppLink>
                            )
                        }}
                        values={{
                            description,
                            backtestLinkLabel,
                            descriptionTail
                        }}
                    />
                </Text>
            </section>
        </div>
    )
}
