import classNames from '@/shared/lib/helpers/classNames'
import { TermTooltip, Text } from '@/shared/ui'
import cls from './DocsPage.module.scss'

/*
	DocsPage — обзорная документация.

	Зачем:
		- Объясняет ключевые термины и принципы чтения отчётов.
		- Даёт быстрые подсказки для страниц аналитики.
*/

// Пропсы страницы Docs.
interface DocsPageProps {
    className?: string
}

export default function DocsPage({ className }: DocsPageProps) {
    return (
        <div className={classNames(cls.DocsModelsPage, {}, [className ?? ''])}>
            <Text>DocsPage</Text>

            <section id='model-stats-overview' className={cls.sectionCard}>
                <Text type='h3' className={cls.sectionTitle}>
                    Как читать страницу &laquo;Статистика моделей&raquo; (ModelStatsPage)
                </Text>

                <Text className={cls.sectionText}>
                    Страница &laquo;Статистика моделей&raquo; показывает качество ML-моделей на разных выборках (train /
                    OOS / full / recent) и в двух режимах: бизнес- и техническом. Выбор сегмента и режима влияет на
                    набор таблиц и метрик ниже.
                </Text>

                <TermTooltip
                    term='OOS'
                    type='h4'
                    description={
                        <>
                            OOS (out-of-sample) — отрезок данных, полностью исключённый из обучения. Метрики на OOS дают
                            честную оценку качества без переобучения.
                        </>
                    }
                />

                <TermTooltip
                    term='Train'
                    type='h4'
                    description={
                        <>
                            Train — обучающая выборка, на которой подбираются веса модели. Метрики обычно выше, чем на
                            OOS, поэтому сравнение Train vs OOS важно для контроля переобучения.
                        </>
                    }
                />

                <TermTooltip
                    term='Full history'
                    type='h4'
                    description={
                        <>
                            Full history — вся доступная история отчёта (Train + OOS). Удобно для общей картины, но
                            контроль качества надо делать по OOS и Recent.
                        </>
                    }
                />

                <TermTooltip
                    term='Recent'
                    type='h4'
                    description={
                        <>
                            Recent — свежий отрезок данных за последние N дней. Здесь видно, как модель ведёт себя
                            &laquo;прямо сейчас&raquo; и есть ли деградация относительно OOS.
                        </>
                    }
                />
            </section>
        </div>
    )
}
