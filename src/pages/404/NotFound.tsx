import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import classNames from '@/shared/lib/helpers/classNames'
import { Btn, Text } from '@/shared/ui'
import { MOBILE } from '@/shared/utils'
import { useBackOnPrevPage } from '@/shared/lib/hooks/'
import cls from './NotFound.module.scss'

/*
	NotFound — страница 404.

	Зачем:
		- Показывает пользователю, что маршрут не найден.
		- Даёт быстрые действия и ссылки на ключевые разделы.

	Контракты:
		- suggestions содержит валидные path маршрутов приложения.
*/

// Пропсы страницы 404.
interface NotFoundProps {
    className?: string
}

// Модель карточки с рекомендацией по разделу.
interface NotFoundSuggestion {
    id: string
    title: string
    description: string
    path: string
}

export default function NotFound({ className }: NotFoundProps) {
    const navigate = useNavigate()
    // Хук возвращает обработчик "назад", его нужно вызвать для корректной навигации.
    const { backOnPrevPage } = useBackOnPrevPage()

    // Список рекомендуемых разделов для быстрого возврата пользователя.
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

                        <Text fz={MOBILE ? '14px' : '16px'} color='#B1B2B4' position='left'>
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

                    <Text fz={MOBILE ? '13px' : '14px'} color='#8B8C8F' position='center'>
                        Или выберите один из разделов ниже:
                    </Text>
                </div>

                <div className={cls.linksGrid}>
                    {suggestions.map(item => (
                        <Btn
                            key={item.id}
                            className={cls.linkCard}
                            onClick={() => handleSuggestionClick(item.path)}>
                            <Text type='h4' fz={MOBILE ? '14px' : '16px'} position='left'>
                                {item.title}
                            </Text>

                            <Text fz={MOBILE ? '12px' : '13px'} color='#A0A1A4' position='left'>
                                {item.description}
                            </Text>
                        </Btn>
                    ))}
                </div>
            </div>
        </div>
    )
}
