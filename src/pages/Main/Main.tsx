import cls from './Main.module.scss'
import classNames from '@/shared/lib/helpers/classNames'
import MainProps from './types'
import { Link } from '@/shared/ui'

export default function Main({ className }: MainProps) {
    return (
            <span>
                <section className={cls.hero}>
                    <h1 className={cls.heroTitle}>SolSignal 1D ML-модель</h1>
                    <p className={cls.heroSubtitle}>
                        Дневная ML-модель, которая прогнозирует движение SOL/USDT по данным BTC, макро-индикаторам и
                        внутренним фичам. Бэктесты, отчёты и текущий прогноз собраны в отдельных разделах.
                    </p>
                    <div className={cls.heroMeta}>
                        <div className={cls.metaPill}>24h горизонт</div>
                        <div className={cls.metaPill}>Path-based labeling</div>
                        <div className={cls.metaPill}>Multi-layer (move / dir / micro / SL)</div>
                    </div>
                </section>
                {/* Карточки разделов — то, что сейчас делает модель */}
                <section className={cls.sections}>
                    <h2 className={cls.sectionsTitle}>Что можно посмотреть</h2>
                    <div className={cls.cards}>
                        <Link to='/current-prediction' className={cls.cardLink}>
                            <article className={cls.card}>
                                <h3 className={cls.cardTitle}>Текущий прогноз</h3>
                                <p className={cls.cardText}>
                                    Последний расчёт модели: направление дня, minMove, micro-слой, SL-риски. Обновляется
                                    вместе с пайплайном.
                                </p>
                                <span className={cls.cardHint}>Открыть текущий прогноз →</span>
                            </article>
                        </Link>
                        <Link to='/backtest/baseline' className={cls.cardLink}>
                            <article className={cls.card}>
                                <h3 className={cls.cardTitle}>Baseline бэктест</h3>
                                <p className={cls.cardText}>
                                    Эталонный запуск бэктеста: фиксированный конфиг, одна политика, базовые метрики и
                                    PnL-кривая.
                                </p>
                                <span className={cls.cardHint}>Смотреть baseline →</span>
                            </article>
                        </Link>
                        <Link to='/backtest/summary' className={cls.cardLink}>
                            <article className={cls.card}>
                                <h3 className={cls.cardTitle}>Сводка бэктеста</h3>
                                <p className={cls.cardText}>
                                    Расширенный отчёт: сравнение политик, риск-метрики, просадки, ликвидации, доходности по
                                    горизонту.
                                </p>
                                <span className={cls.cardHint}>К сводному отчёту →</span>
                            </article>
                        </Link>
                        <Link to='/backtest/full' className={cls.cardLink}>
                            <article className={cls.card}>
                                <h3 className={cls.cardTitle}>Экспериментальный бэктест</h3>
                                <p className={cls.cardText}>
                                    Песочница для настройки параметров: стопы, тейки, плечи, политики. Запуск нового
                                    бэктеста по запросу.
                                </p>
                                <span className={cls.cardHint}>Открыть песочницу →</span>
                            </article>
                        </Link>
                    </div>
                </section>
            </span>
    )
}

// TODO: Всем страницам добавить в конце названия Page
// TODO: Сделать открыание <CurrentMLModelPredictionPage /> и <BacktestPage /> при помощи кнопки
