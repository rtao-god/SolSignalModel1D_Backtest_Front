import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import classNames from '@/shared/lib/helpers/classNames'
import { Btn, Text } from '@/shared/ui'
import { MOBILE } from '@/shared/utils'
import { useBackOnPrevPage } from '@/shared/lib/hooks/'
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

/**
 * 404-страница:
 * - крупный код ошибки и пояснение;
 * - основные действия: на главную / назад;
 * - набор ссылок на ключевые разделы, чтобы не терять пользователя.
 */
export default function NotFound({ className }: NotFoundProps) {
    const navigate = useNavigate()
    // Хук должен быть вызван, а не просто передан как ссылка
    const { backOnPrevPage } = useBackOnPrevPage()

    // Список рекомендуемых разделов. 
    const suggestions: NotFoundSuggestion[] = useMemo(
        () => [
            {
                id: 'current-prediction',
                title: 'Текущий прогноз',
                description: 'Посмотреть сигнал моделей на ближайший торговый день.',
                path: '/current-prediction'
            },
            {
                id: 'backtest-summary',
                title: 'Сводка бэктеста',
                description: 'Оценить, как стратегия вела себя на истории.',
                path: '/backtest-summary'
            },
            {
                id: 'pfi',
                title: 'PFI по моделям',
                description: 'Разобраться, какие признаки сильнее всего влияют на прогноз.',
                path: '/pfi'
            },
            {
                id: 'about',
                title: 'О проекте',
                description: 'Краткое описание идеи, архитектуры и возможностей системы.',
                path: '/about'
            }
        ],
        []
    )

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
                        <Text type='h2' fz={MOBILE ? '18px' : '26px'} position='left'>
                            Страница не найдена
                        </Text>

                        <Text type='p' fz={MOBILE ? '14px' : '16px'} color='#B1B2B4' position='left'>
                            Похоже, по этому адресу ничего нет.
                            <br />
                            Возможно, страница была переименована или никогда не существовала.
                        </Text>
                    </div>
                </div>

                <div className={cls.actions}>
                    <div className={cls.primaryActions}>
                        <Btn color='#0064FA' onClick={handleGoHome}>
                            На главную
                        </Btn>

                        <Btn onClick={backOnPrevPage}>Вернуться назад</Btn>
                    </div>

                    <Text type='p' fz={MOBILE ? '13px' : '14px'} color='#8B8C8F' position='center'>
                        Или выберите один из разделов ниже:
                    </Text>
                </div>

                <div className={cls.linksGrid}>
                    {suggestions.map(item => (
                        <button
                            key={item.id}
                            type='button'
                            className={cls.linkCard}
                            onClick={() => handleSuggestionClick(item.path)}>
                            <Text type='h4' fz={MOBILE ? '14px' : '16px'} position='left'>
                                {item.title}
                            </Text>

                            <Text type='p' fz={MOBILE ? '12px' : '13px'} color='#A0A1A4' position='left'>
                                {item.description}
                            </Text>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    )
}
