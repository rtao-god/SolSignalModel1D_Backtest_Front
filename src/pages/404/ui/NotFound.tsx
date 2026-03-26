import { useNavigate } from 'react-router-dom'
import classNames from '@/shared/lib/helpers/classNames'
import { Btn, Text } from '@/shared/ui'
import { useBackOnPrevPage } from '@/shared/lib/hooks/'
import { useTranslation } from 'react-i18next'
import cls from './NotFound.module.scss'
interface NotFoundProps {
    className?: string
}

interface NotFoundSuggestion {
    id: string
    title: string
    description: string
    path: string
}

export default function NotFound({ className }: NotFoundProps) {
    const { t } = useTranslation('errors')
    const navigate = useNavigate()
    const { backOnPrevPage } = useBackOnPrevPage()
    const suggestions: NotFoundSuggestion[] = [
        {
            id: 'current-prediction',
            title: t('notFound.suggestions.currentPrediction.title'),
            description: t('notFound.suggestions.currentPrediction.description'),
            path: '/current-prediction'
        },
        {
            id: 'backtest-summary',
            title: t('notFound.suggestions.backtestSummary.title'),
            description: t('notFound.suggestions.backtestSummary.description'),
            path: '/backtest-summary'
        },
        {
            id: 'pfi',
            title: t('notFound.suggestions.pfi.title'),
            description: t('notFound.suggestions.pfi.description'),
            path: '/pfi'
        },
        {
            id: 'about',
            title: t('notFound.suggestions.about.title'),
            description: t('notFound.suggestions.about.description'),
            path: '/about'
        }
    ]

    const handleGoHome = () => {
        navigate('/')
    }

    const handleSuggestionClick = (path: string) => {
        navigate(path)
    }

    return (
        <div className={classNames(cls.NotFoundPage, {}, [className ?? ''])}>
            <div className={cls.inner}>
                <div className={cls.mainBlock}>
                    <div className={cls.codeBadge}>404</div>

                    <div className={cls.textBlock}>
                        <Text type='h2' position='left' className={cls.title}>
                            {t('notFound.title')}
                        </Text>

                        <Text color='#B1B2B4' position='left' className={cls.description}>
                            {t('notFound.description.line1')}
                            <br />
                            {t('notFound.description.line2')}
                        </Text>
                    </div>
                </div>

                <div className={cls.actions}>
                    <div className={cls.primaryActions}>
                        <Btn color='#0064FA' onClick={handleGoHome}>
                            {t('notFound.actions.home')}
                        </Btn>

                        <Btn onClick={backOnPrevPage}>{t('notFound.actions.back')}</Btn>
                    </div>

                    <Text color='#8B8C8F' position='center' className={cls.orChoose}>
                        {t('notFound.actions.orChoose')}
                    </Text>
                </div>

                <div className={cls.linksGrid}>
                    {suggestions.map(item => (
                        <Btn key={item.id} className={cls.linkCard} onClick={() => handleSuggestionClick(item.path)}>
                            <Text type='h4' position='left' className={cls.cardTitle}>
                                {item.title}
                            </Text>

                            <Text color='#A0A1A4' position='left' className={cls.cardDescription}>
                                {item.description}
                            </Text>
                        </Btn>
                    ))}
                </div>
            </div>
        </div>
    )
}
