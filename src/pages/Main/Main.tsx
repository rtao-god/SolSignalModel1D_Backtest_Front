import cls from './Main.module.scss'
import MainProps from './types'
import { Link, Text } from '@/shared/ui'

export default function Main({ className }: MainProps) {
    return (
        <span>
            <section className={cls.hero}>
                {/* кнопка для вызова искусственной ошибки. Нужна просто для тестов. */}
                {/* <BugBtn /> */}

                <Text type='h1' className={cls.heroTitle}>
                    SolSignal 1D ML-модель
                </Text>
                <Text className={cls.heroSubtitle}>
                    Дневная ML-модель, которая прогнозирует движение SOL/USDT по данным BTC, макро-индикаторам и
                    внутренним фичам. Бэктесты, отчёты и текущий прогноз собраны в отдельных разделах.
                </Text>
                <div className={cls.heroMeta}>
                    <div className={cls.metaPill}>24h горизонт</div>
                    <div className={cls.metaPill}>Path-based labeling</div>
                    <div className={cls.metaPill}>Multi-layer (move / dir / micro / SL)</div>
                </div>
            </section>
            {/* Карточки разделов — то, что сейчас делает модель */}
            <section className={cls.sections}>
                <Text type='h2' className={cls.sectionsTitle}>
                    Что можно посмотреть
                </Text>
                <div className={cls.cards}>
                    <Link to='/current-prediction' className={cls.cardLink}>
                        <article className={cls.card}>
                            <Text type='h3' className={cls.cardTitle}>
                                Текущий прогноз
                            </Text>
                            <Text className={cls.cardText}>
                                Последний расчёт модели: направление дня, minMove, micro-слой, SL-риски. Обновляется
                                вместе с пайплайном.
                            </Text>
                            <span className={cls.cardHint}>Открыть текущий прогноз →</span>
                        </article>
                    </Link>
                    <Link to='/backtest/baseline' className={cls.cardLink}>
                        <article className={cls.card}>
                            <Text type='h3' className={cls.cardTitle}>
                                Baseline бэктест
                            </Text>
                            <Text className={cls.cardText}>
                                Эталонный запуск бэктеста: фиксированный конфиг, одна политика, базовые метрики и
                                PnL-кривая.
                            </Text>
                            <span className={cls.cardHint}>Смотреть baseline →</span>
                        </article>
                    </Link>
                    <Link to='/backtest/summary' className={cls.cardLink}>
                        <article className={cls.card}>
                            <Text type='h3' className={cls.cardTitle}>
                                Сводка бэктеста
                            </Text>
                            <Text className={cls.cardText}>
                                Расширенный отчёт: сравнение политик, риск-метрики, просадки, ликвидации, доходности по
                                горизонту.
                            </Text>
                            <span className={cls.cardHint}>К сводному отчёту →</span>
                        </article>
                    </Link>
                    <Link to='/backtest/full' className={cls.cardLink}>
                        <article className={cls.card}>
                            <Text type='h3' className={cls.cardTitle}>
                                Экспериментальный бэктест
                            </Text>
                            <Text className={cls.cardText}>
                                Песочница для настройки параметров: стопы, тейки, плечи, политики. Запуск нового
                                бэктеста по запросу.
                            </Text>
                            <span className={cls.cardHint}>Открыть песочницу →</span>
                        </article>
                    </Link>
                </div>
            </section>
        </span>
    )
}
