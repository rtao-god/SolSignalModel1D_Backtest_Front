import { useMemo } from 'react'
import classNames from '@/shared/lib/helpers/classNames'
import { TermTooltip, Text } from '@/shared/ui'
import SectionPager from '@/shared/ui/SectionPager/ui/SectionPager'
import { useSectionPager } from '@/shared/ui/SectionPager/model/useSectionPager'
import { EXPLAIN_PROJECT_TABS } from '@/shared/utils/explainTabs'
import cls from './ExplainProjectPage.module.scss'
import type { ExplainProjectPageProps } from './types'

interface TermItem {
    term: string
    description: string
}

const PIPELINE_TERMS: TermItem[] = [
    {
        term: 'Свечи 6h / 1h / 1m',
        description:
            'Входные ряды рынка. 6h нужны для дневных фич, 1h/1m — для внутри-дневной разметки TP/SL и проверки исполнения.'
    },
    {
        term: 'CausalDataRow',
        description:
            'Дневная строка признаков на момент входа. Содержит только то, что было известно на этот момент.'
    },
    {
        term: 'PredictionEngine',
        description:
            'Собирает move/dir/micro вероятности и выдает прогноз дня (Day, Day+Micro, Total).'
    },
    {
        term: 'BacktestRecord (omniscient)',
        description:
            'Расширенная запись для оценки: прогноз + фактические результаты forward-окна + PnL-контекст.'
    },
    {
        term: 'Reports',
        description:
            'JSON-снапшоты с таблицами и ключ-значение секциями. Они сохраняются в cache/reports и читаются API.'
    },
    {
        term: 'API -> Front',
        description:
            'API отдает готовые отчетные документы, фронт их рендерит как страницы/таблицы/подсказки.'
    }
]

const CAUSAL_TERMS: TermItem[] = [
    {
        term: 'Казуальная логика (Causal)',
        description:
            'Любое решение должно опираться только на данные, доступные в момент EntryUtc. Будущее запрещено.'
    },
    {
        term: 'Не-казуальная логика (Omniscient)',
        description:
            'Используется только для оценки и отчетов: здесь можно смотреть, что реально произошло после входа.'
    },
    {
        term: 'Почему разделение критично',
        description:
            'Без разделения легко «подсмотреть» будущее и получить красивые, но ложные метрики. Проект специально разделен на два контура, чтобы этого не было.'
    },
    {
        term: 'Leakage guards',
        description:
            'Пакет защит от утечек: типы времени, NyWindowing, CausalAudit, тесты leakage, архитектурные тесты и sanity-checks.'
    }
]

const PROJECT_TERMS: TermItem[] = [
    {
        term: 'SolSignalModel1D_Backtest',
        description:
            'Главный host-оркестратор. Управляет пайплайном end-to-end: загрузка данных, построение рядов, запуск обучения, бэктест, отчеты.'
    },
    {
        term: 'SolSignalModel1D_Backtest.Core.Causal',
        description:
            'Казуальный слой: фичи, time-contract, обучение и инференс без доступа к будущим значениям.'
    },
    {
        term: 'SolSignalModel1D_Backtest.Core.Omniscient',
        description:
            'Оценочный слой: forward outcomes, бэктест-политики, PnL, метрики, snapshots.'
    },
    {
        term: 'SolSignalModel1D_Backtest.Core.Time',
        description:
            'Типы времени (UtcInstant/UtcDayKey и др.) и правила NY-окон. Нужен, чтобы не смешивать разные семантики времени.'
    },
    {
        term: 'SolSignalModel1D_Backtest.Core.Config',
        description:
            'Конфигурационные контракты и правила coverage/валидации для запуска пайплайна.'
    },
    {
        term: 'SolSignalModel1D_Backtest.Infra',
        description:
            'Инфраструктура хранения и доступа: пути, NDJSON-ридеры, вспомогательные сервисы.'
    },
    {
        term: 'SolSignalModel1D_Backtest.Reports',
        description:
            'Сборка отчетов в единый формат ReportDocument: таблицы, key-value секции, metadata.'
    },
    {
        term: 'SolSignalModel1D_Backtest.Api',
        description:
            'HTTP-контур, который отдает отчеты и текущие прогнозы во фронтенд.'
    },
    {
        term: 'SolSignalModel1D_Backtest.AppOrchestration',
        description:
            'Слой сценариев запуска и интеграции, который соединяет host, отчеты, API и runtime-процессы.'
    },
    {
        term: 'SolSignalModel1D_Backtest.AppOrchestration.Interop',
        description:
            'Мост DTO/контрактов между слоями. Упрощает безопасный обмен данными между runtime и API.'
    },
    {
        term: 'SolSignalModel1D_Backtest.SanityChecks',
        description:
            'Пакет пост-расчетных проверок: daily/micro/sl leakage, row-vs-future, bare PnL sanity.'
    },
    {
        term: 'SolSignalModel1D_Backtest.Tests / ArchTests / Analyzers',
        description:
            'Многоуровневый контроль качества: unit/integration тесты, архитектурные барьеры и compile-time анализаторы.'
    }
]

const REPORTS_TERMS: TermItem[] = [
    {
        term: 'ReportDocument',
        description:
            'Унифицированный формат отчетов: заголовок + секции (таблицы и key-value). Благодаря этому фронт рендерит разные отчеты одним механизмом.'
    },
    {
        term: 'ReportStorage',
        description:
            'Файловое хранилище отчетов в cache/reports/{kind}/{id}.json. Можно подгружать «последний» отчет по kind.'
    },
    {
        term: 'Report kind',
        description:
            'Логический тип отчета (например, model_stats, pfi_per_model, backtest_summary), который определяет содержимое.'
    },
    {
        term: 'API endpoints',
        description:
            'Маршруты чтения отчетов и текущего прогноза. API не обучает модель, а отдает подготовленные документы.'
    }
]

const TESTS_TERMS: TermItem[] = [
    {
        term: 'Shuffle-тесты на деградацию',
        description:
            'Пример: DailyPipelineLeakageTests перемешивает train labels/фичи и ждет падения OOS качества (минимум на 15 процентных пунктов, а при random features — ниже 50%).'
    },
    {
        term: 'Изоляция тренеров',
        description:
            'ModelTrainerIsolationTests и SlFirstTrainerIsolationTests проверяют, что после shuffle labels качество заметно падает. Если не падает — риск leakage.'
    },
    {
        term: 'Future-blind проверки',
        description:
            'RowFeatureLeakageChecks и leakage-тесты мутируют будущее и проверяют, что causal-фичи/модели от этого не меняются.'
    },
    {
        term: 'Split/time контракт',
        description:
            'NyTrainSplit strict тесты и NyWindowing тесты проверяют границы train/oos, baseline-exit и day-key логику.'
    },
    {
        term: 'Архитектурные барьеры',
        description:
            'ArchTests и AssemblyDependencyTests запрещают ссылку Causal -> Omniscient и отслеживают недопустимые зависимости.'
    },
    {
        term: 'SelfCheckRunner',
        description:
            'После расчета запускает sanity-блоки: daily leakage + shuffle, micro layer, SL layer и row-features vs future targets.'
    }
]

function TermGrid({ items }: { items: TermItem[] }) {
    return (
        <div className={cls.termGrid}>
            {items.map(item => (
                <TermTooltip
                    key={item.term}
                    term={item.term}
                    description={item.description}
                    type='span'
                    className={cls.termItem}
                />
            ))}
        </div>
    )
}

export default function ExplainProjectPage({ className }: ExplainProjectPageProps) {
    const sections = useMemo(() => EXPLAIN_PROJECT_TABS, [])
    const { currentIndex, canPrev, canNext, handlePrev, handleNext } = useSectionPager({
        sections,
        syncHash: true
    })

    return (
        <div className={classNames(cls.ExplainProjectPage, {}, [className ?? ''])} data-tooltip-boundary>
            <header className={cls.headerRow}>
                <div>
                    <Text type='h2'>О проекте</Text>
                    <Text className={cls.subtitle}>
                        Здесь собрана техническая карта проекта: как проходит данные, где именно живет казуальная
                        логика, зачем выделены отдельные проекты и как система защищается от утечек.
                    </Text>
                </div>
            </header>

            <div className={cls.sectionsGrid}>
                <section id='explain-project-overview' className={cls.sectionCard}>
                    <Text type='h3' className={cls.sectionTitle}>
                        Общий пайплайн
                    </Text>
                    <Text className={cls.sectionText}>
                        Основная цепочка: сырые данные рынка → causal-фичи → прогноз → omniscient-оценка → backtest →
                        отчеты → API → фронтенд.
                    </Text>
                    <div className={cls.tableWrap}>
                        <table className={cls.infoTable}>
                            <thead>
                                <tr>
                                    <th>Этап</th>
                                    <th>Главный артефакт</th>
                                    <th>Зачем нужен</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>Подготовка данных</td>
                                    <td>Свечи + индикаторы</td>
                                    <td>Стабильный и проверенный вход для модели</td>
                                </tr>
                                <tr>
                                    <td>Causal слой</td>
                                    <td>CausalDataRow</td>
                                    <td>Прогноз без доступа к будущему</td>
                                </tr>
                                <tr>
                                    <td>Omniscient слой</td>
                                    <td>BacktestRecord</td>
                                    <td>Оценка качества и PnL по факту</td>
                                </tr>
                                <tr>
                                    <td>Отчеты</td>
                                    <td>ReportDocument JSON</td>
                                    <td>Единый формат выдачи для API и фронта</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <TermGrid items={PIPELINE_TERMS} />
                </section>

                <section id='explain-project-causal' className={cls.sectionCard}>
                    <Text type='h3' className={cls.sectionTitle}>
                        Causal vs Omniscient
                    </Text>
                    <Text className={cls.sectionText}>
                        Ключевая архитектурная идея проекта: слой принятия решений и слой оценки результатов разделены
                        физически и контрактно.
                    </Text>
                    <TermGrid items={CAUSAL_TERMS} />
                </section>

                <section id='explain-project-structure' className={cls.sectionCard}>
                    <Text type='h3' className={cls.sectionTitle}>
                        Проекты и структура решения
                    </Text>
                    <Text className={cls.sectionText}>
                        Ниже перечислены главные проекты решения и их роль в архитектуре.
                    </Text>
                    <div className={cls.tableWrap}>
                        <table className={cls.infoTable}>
                            <thead>
                                <tr>
                                    <th>Проект</th>
                                    <th>Техническая задача</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>SolSignalModel1D_Backtest</td>
                                    <td>Host-оркестрация полного цикла расчета</td>
                                </tr>
                                <tr>
                                    <td>Core.Causal / Core.Omniscient</td>
                                    <td>Разделение «решение» и «оценка по факту»</td>
                                </tr>
                                <tr>
                                    <td>Core.Time / Core.Config</td>
                                    <td>Контракты времени, split-границы, правила валидности</td>
                                </tr>
                                <tr>
                                    <td>Infra / Reports / Api</td>
                                    <td>Хранение, сборка отчетов и HTTP-выдача</td>
                                </tr>
                                <tr>
                                    <td>AppOrchestration / Interop</td>
                                    <td>Интеграция сценариев, DTO-мэппинг и runtime-связка слоев</td>
                                </tr>
                                <tr>
                                    <td>SanityChecks / Tests / ArchTests / Analyzers</td>
                                    <td>Проверки корректности, анти-leakage и архитектурные барьеры</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <TermGrid items={PROJECT_TERMS} />
                </section>

                <section id='explain-project-reports' className={cls.sectionCard}>
                    <Text type='h3' className={cls.sectionTitle}>
                        Отчеты и API
                    </Text>
                    <Text className={cls.sectionText}>
                        Контур отчетов специально вынесен в отдельные проекты, чтобы фронт всегда читал стабильный
                        формат и не зависел от внутренней логики обучения.
                    </Text>
                    <TermGrid items={REPORTS_TERMS} />
                </section>

                <section id='explain-project-tests' className={cls.sectionCard}>
                    <Text type='h3' className={cls.sectionTitle}>
                        Тесты и защиты
                    </Text>
                    <Text className={cls.sectionText}>
                        В проекте несколько слоев контроля: unit/integration тесты, архитектурные проверки и
                        post-run sanity checks.
                    </Text>
                    <div className={cls.tableWrap}>
                        <table className={cls.infoTable}>
                            <thead>
                                <tr>
                                    <th>Группа</th>
                                    <th>Пример</th>
                                    <th>Что считается проблемой</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>Leakage / shuffle</td>
                                    <td>DailyPipelineLeakageTests</td>
                                    <td>После randomize train качество не падает до ожидаемого уровня</td>
                                </tr>
                                <tr>
                                    <td>Изоляция моделей</td>
                                    <td>ModelTrainerIsolationTests, SlFirstTrainerIsolationTests</td>
                                    <td>Перемешанные labels не ухудшают AUC/Accuracy</td>
                                </tr>
                                <tr>
                                    <td>Future-blind rows</td>
                                    <td>RowFeatureLeakageChecks</td>
                                    <td>Фичи численно совпадают с будущими таргетами</td>
                                </tr>
                                <tr>
                                    <td>Split/time contract</td>
                                    <td>NyTrainSplit strict, NyWindowing tests</td>
                                    <td>Неверная классификация train/oos или выход за baseline-границу</td>
                                </tr>
                                <tr>
                                    <td>Архитектурные барьеры</td>
                                    <td>ArchBarrierTests, AssemblyDependencyTests</td>
                                    <td>Causal зависит от Omniscient или leaking API в public-типах</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <TermGrid items={TESTS_TERMS} />
                </section>
            </div>

            <SectionPager
                sections={sections}
                currentIndex={currentIndex}
                canPrev={canPrev}
                canNext={canNext}
                onPrev={handlePrev}
                onNext={handleNext}
            />
        </div>
    )
}
