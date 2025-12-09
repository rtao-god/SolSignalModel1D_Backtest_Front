import classNames from '@/shared/lib/helpers/classNames'
import { Text } from '@/shared/ui'
import cls from './ContactPage.module.scss'

interface ContactPageProps {
    className?: string
}

// Константы с контактами лучше переопределить реальными значениями
const FULL_NAME = 'Имя Фамилия'
const TELEGRAM_HANDLE = '@telegram_username'
const TELEGRAM_URL = 'https://t.me/telegram_username'
const LINKEDIN_URL = 'https://www.linkedin.com/in/linkedin-username/'
const PHONE_DISPLAY = '+0 000 000 00 00'
const PHONE_TEL = '+00000000000'

export default function ContactPage({ className }: ContactPageProps) {
    return (
        <div className={classNames(cls.ContactPage, {}, [className ?? ''])}>
            <div className={cls.inner}>
                <header className={cls.header}>
                    <Text type='h1' className={cls.title}>
                        Связаться со мной
                    </Text>
                    <Text className={cls.subtitle}>
                        Короткая страница с основными контактами для связи по проекту и вопросам сотрудничества.
                    </Text>
                </header>

                <section className={cls.profileCard}>
                    <div className={cls.avatarStub}>
                        <span className={cls.avatarInitials}>
                            {FULL_NAME.split(' ')
                                .filter(Boolean)
                                .map(part => part[0])
                                .join('')
                                .toUpperCase()}
                        </span>
                    </div>
                    <div className={cls.profileInfo}>
                        <Text type='h2' className={cls.profileName}>
                            {FULL_NAME}
                        </Text>
                        <Text className={cls.profileRole}>Quant / ML, Full-stack (React + .NET)</Text>
                        <Text className={cls.profileNote}>
                            Фокус на моделях для крипторынка, аналитике и визуализации результатов бэктестов.
                        </Text>
                    </div>
                </section>

                <section className={cls.grid}>
                    {/* Telegram */}
                    <article className={cls.contactCard}>
                        <div className={cls.cardIcon}>
                            <svg viewBox='0 0 24 24' aria-hidden='true'>
                                <path d='M9.04 16.9 8.9 20.2c.32 0 .46-.14.63-.31l1.52-1.48 3.15 2.3c.58.32 1 .15 1.16-.53l2.1-9.86c.19-.9-.32-1.25-.9-1.03L4.7 12.5c-.86.33-.85.81-.15 1.03l3.3 1.03 7.65-4.82c.36-.24.69-.11.42.14z' />
                            </svg>
                        </div>
                        <div className={cls.cardBody}>
                            <Text type='h3' className={cls.cardTitle}>
                                Telegram
                            </Text>
                            <Text className={cls.cardDescription}>
                                Основной канал для быстрой связи, вопросов по модели и демо-созвонов.
                            </Text>
                            <a href={TELEGRAM_URL} target='_blank' rel='noreferrer' className={cls.cardLink}>
                                {TELEGRAM_HANDLE}
                            </a>
                        </div>
                    </article>

                    {/* LinkedIn */}
                    <article className={cls.contactCard}>
                        <div className={cls.cardIcon}>
                            <svg viewBox='0 0 24 24' aria-hidden='true'>
                                <path d='M6.5 6.5A2.5 2.5 0 1 1 4 4a2.5 2.5 0 0 1 2.5 2.5zM4.25 9h4.5v11.5h-4.5zM13 9h4.3a3.7 3.7 0 0 1 3.7 3.7v7.8h-4.5v-7.1c0-1.1-.8-1.9-1.9-1.9S13 12.3 13 13.4v7.1H8.5V9z' />
                            </svg>
                        </div>
                        <div className={cls.cardBody}>
                            <Text type='h3' className={cls.cardTitle}>
                                LinkedIn
                            </Text>
                            <Text className={cls.cardDescription}>
                                Профессиональный профиль, резюме и история проектов.
                            </Text>
                            <a href={LINKEDIN_URL} target='_blank' rel='noreferrer' className={cls.cardLink}>
                                Открыть профиль
                            </a>
                        </div>
                    </article>

                    {/* Телефон / WhatsApp */}
                    <article className={cls.contactCard}>
                        <div className={cls.cardIcon}>
                            <svg viewBox='0 0 24 24' aria-hidden='true'>
                                <path d='M6.6 3h10.8A2.6 2.6 0 0 1 20 5.6v12.8a2.6 2.6 0 0 1-2.6 2.6H6.6A2.6 2.6 0 0 1 4 18.4V5.6A2.6 2.6 0 0 1 6.6 3zm0 1.5A1.1 1.1 0 0 0 5.5 5.6v12.8a1.1 1.1 0 0 0 1.1 1.1h10.8a1.1 1.1 0 0 0 1.1-1.1V5.6a1.1 1.1 0 0 0-1.1-1.1zm2.4 1.9h6v1.3h-6z' />
                            </svg>
                        </div>
                        <div className={cls.cardBody}>
                            <Text type='h3' className={cls.cardTitle}>
                                Телефон / WhatsApp
                            </Text>
                            <Text className={cls.cardDescription}>
                                Для созвонов, обсуждения деталей сотрудничества и быстрых согласований.
                            </Text>
                            <a href={`tel:${PHONE_TEL}`} className={cls.cardLink}>
                                {PHONE_DISPLAY}
                            </a>
                            <Text className={cls.cardTag}>WhatsApp доступен по этому номеру</Text>
                        </div>
                    </article>
                </section>

                <footer className={cls.footer}>
                    <Text className={cls.footerText}>
                        При необходимости могу предложить короткий онлайн-демо формат: 10–15 минут, чтобы показать
                        ключевые метрики и UI проекта.
                    </Text>
                </footer>
            </div>
        </div>
    )
}
