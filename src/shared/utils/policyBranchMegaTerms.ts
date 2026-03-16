import type { TableSectionDto } from '@/shared/types/report.types'
import {
    ANTI_D_SHARE_DESCRIPTION,
    CAP_AVG_MIN_MAX_DESCRIPTION,
    CAP_P50_P90_DESCRIPTION,
    COMMON_ANTI_D_SHARE_DESCRIPTION_EN,
    COMMON_CAP_AVG_MIN_MAX_DESCRIPTION_EN,
    COMMON_CAP_P50_P90_DESCRIPTION_EN,
    COMMON_LONG_SHARE_DESCRIPTION_EN,
    COMMON_NO_TRADE_SHARE_DESCRIPTION_EN,
    COMMON_RISK_DAY_SHARE_DESCRIPTION_EN,
    COMMON_SHORT_SHARE_DESCRIPTION_EN,
    LONG_SHARE_DESCRIPTION,
    NO_TRADE_SHARE_DESCRIPTION,
    RISK_DAY_SHARE_DESCRIPTION,
    SHORT_SHARE_DESCRIPTION
} from '@/shared/terms/common'
import { POLICY_BRANCH_MEGA_COMMON_TERM_DRAFTS } from '@/shared/terms/reports/policyBranchMega'
import {
    normalizePolicyBranchMegaTitle,
    resolvePolicyBranchMegaBucketFromTitle,
    resolvePolicyBranchMegaMetricFromTitle
} from '@/shared/utils/policyBranchMegaTabs'
import { resolveCommonReportColumnTooltipOrNull } from '@/shared/terms/common'

export interface PolicyBranchMegaTermDefinition {
    key: string
    title: string
    description: string
    tooltip: string
}

export interface PolicyBranchMegaTermReference {
    key: string
    title: string
}

export type PolicyBranchMegaTermLocale = 'ru' | 'en'
export interface PolicyBranchMegaTermResolveOptions {
    locale?: PolicyBranchMegaTermLocale
}

interface PolicyBranchMegaTermDraft {
    key: string
    title: string
    description: string
}

interface PolicyBranchMegaResolvedLocaleContent {
    description: string
    readingHint: string
    example: string | null
}

export function resolvePolicyBranchMegaTermLocale(language: string | null | undefined): PolicyBranchMegaTermLocale {
    const normalized = (language ?? '').trim().toLowerCase()
    return normalized.startsWith('ru') ? 'ru' : 'en'
}

const MEGA_TITLE_MARKER = 'Policy Branch Mega'
const POLICY_BRANCH_MEGA_SHARED_COMMON_TERM_KEYS = new Set(Object.keys(POLICY_BRANCH_MEGA_COMMON_TERM_DRAFTS))
const TERMS: Record<string, PolicyBranchMegaTermDraft> = {
    Days: {
        key: 'Days',
        title: 'Days',
        description:
            'Количество торговых дней периода по данной политике и ветке. Включает дни со сделкой и дни без сделки. Выходные (суббота и воскресенье) в метрику не входят: модели на них не обучались и сделки по ним не моделируются. [[why-weekends|Почему?]]',
    },
    StartDay: {
        key: 'StartDay',
        title: 'StartDay',
        description:
            'StartDay + EndDay — границы периода в формате UTC day-key.\n\nStartDay — первая дата окна, EndDay — последняя дата окна (или дата ранней остановки).\n\nМетрика нужна, чтобы сравнивать стратегии только на одном и том же интервале.',
    },
    EndDay: {
        key: 'EndDay',
        title: 'EndDay',
        description:
            'EndDay — последняя дата периода в формате UTC day-key. При ранней остановке фиксируется дата остановки.',
    },
    StopReason: {
        key: 'StopReason',
        title: 'StopReason',
        description:
            'Почему серия закончилась.\n\n- До конца периода: тест дошёл до последнего дня окна. Это штатный и хороший сценарий завершения.\n- Ликвидация (ранний stop): биржа принудительно закрыла позицию из-за критического убытка.\n- Ранний stop без ликвидации: принудительного закрытия биржей не было; рабочий баланс был потерян серией убыточных сделок, и сработал сценарий руины (AccRuin).',
    },
    Miss: {
        key: 'Miss',
        title: 'Miss',
        description:
            'Пропуски внутри рабочего периода в формате "будни | выходные". Слева — пропуски будних дней: для расчёта не хватило обязательных дневных записей или дневного журнала решений. Справа — пропуски выходных: суббота и воскресенье здесь штатно исключаются из расчёта и не считаются ошибкой.',
    },
    'Trade%': {
        key: 'Trade%',
        title: 'Trade%',
        description:
            'Доля дней с реальной сделкой: TradeDays / Days * 100. День считается торговым только после всех фильтров: есть валидное направление, не сработал внутренний запрет политики, доля капитала на сделку больше 0 и вход не заблокирован риск-фильтром.',
    },
    'Long%': {
        key: 'Long%',
        title: 'Long%',
        description: LONG_SHARE_DESCRIPTION
    },
    'Short%': {
        key: 'Short%',
        title: 'Short%',
        description: SHORT_SHARE_DESCRIPTION
    },
    'NoTrade%': {
        key: 'NoTrade%',
        title: 'NoTrade%',
        description: NO_TRADE_SHARE_DESCRIPTION
    },
    'RiskDay%': {
        key: 'RiskDay%',
        title: 'RiskDay%',
        description: RISK_DAY_SHARE_DESCRIPTION
    },
    'AntiD%': {
        key: 'AntiD%',
        title: 'AntiD%',
        description: ANTI_D_SHARE_DESCRIPTION
    },
    'AntiD|Risk%': {
        key: 'AntiD|Risk%',
        title: 'AntiD|Risk%',
        description:
            'AntiD|Risk% — доля риск-дней, где ветка [[branch|ANTI-D]] действительно перевернула направление позиции.\n\nФормула:\nAntiDAppliedRiskDays / RiskDays * 100.\n\nКак читать:\nвысокое значение означает, что инверсия часто работала именно в напряжённые дни. Низкое значение означает, что даже при наличии риск-дня ветка чаще оставляла базовое направление.\n\nДля [[branch|BASE]] колонка не применяется и показывает «—».',
    },
    'Lev avg / min / max': {
        key: 'Lev avg / min / max',
        title: 'Lev avg / min / max',
        description:
            'Плечо (leverage) — во сколько раз размер позиции больше залога (маржи). Здесь показаны среднее, минимум и максимум плеча по торговым дням.\n\nДля верхнего хвоста агрессии используется [[p90-quantile|p90]] в соседней колонке Lev p50 / p90.\n\nБольшие значения означают более агрессивную торговлю: прибыль и убыток по залогу меняются быстрее.',
    },
    'Lev p50 / p90': {
        key: 'Lev p50 / p90',
        title: 'Lev p50 / p90',
        description:
            'Распределение плеча по торговым дням: p50 (медиана, «обычное» значение) и p90 (высокий уровень, который стратегия достигает редко, но регулярно). Помогает видеть, насколько часто стратегия уходит в агрессивное плечо.',
    },
    'Cap avg / min / max': {
        key: 'Cap avg / min / max',
        title: 'Cap avg / min / max',
        description: CAP_AVG_MIN_MAX_DESCRIPTION
    },
    'Cap p50 / p90': {
        key: 'Cap p50 / p90',
        title: 'Cap p50 / p90',
        description: CAP_P50_P90_DESCRIPTION
    },
    CapAp: {
        key: 'CapAp',
        title: 'CapAp',
        description:
            'Сколько дней cap‑фильтр был применён (доля капитала на сделку > 0) и сделка действительно произошла. Если значение сильно ниже TradeDays, часть входов была отфильтрована другими условиями.',
    },
    CapSk: {
        key: 'CapSk',
        title: 'CapSk',
        description:
            'Сколько дней были пропущены, потому что доля капитала на сделку обнулила размер входа. Это прямой запрет на сделку в этот день.',
    },
    'AvgStake%': {
        key: 'AvgStake%',
        title: 'AvgStake%',
        description:
            'AvgStake% + AvgStake$ — средний размер залога (маржи) на одну сделку.\n\nПоказатель отражает, какой суммой стратегия обычно рискует в одной позиции до применения плеча.\n\nРазница только в единицах измерения: AvgStake% показывает долю от [[start-cap|стартового капитала]] в процентах, AvgStake$ показывает ту же величину в долларах.',
    },
    AvgStake$: {
        key: 'AvgStake$',
        title: 'AvgStake$',
        description:
            'Средний размер залога (маржи) на одну сделку в долларах. Это денежная версия AvgStake%: чем выше число, тем больше абсолютный риск на сделку.',
    },
    'Exposure% (avg / p50 / p90 / p99 / max)': {
        key: 'Exposure% (avg / p50 / p90 / p99 / max)',
        title: 'Exposure% (avg / p50 / p90 / p99 / max)',
        description:
            'Exposure% — фактическая нагрузка позиции на капитал в каждой сделке.\n\nФормула по сделке:\nExposure = ([[margin-used|MarginUsed]] * LeverageUsed / [[start-cap|StartCap$]]) * 100.\n\nВ колонке выводится распределение по сделкам:\navg (среднее), p50 (медиана), [[p90-quantile|p90]] / p99 (верхний риск-хвост), max (пиковое значение).\n\nКак читать:\nрост p90 / p99 и max означает, что стратегия чаще уходит в агрессивные режимы с высоким хвостовым риском.',
    },
    'HighExposureTr% (>=20 / 50)': {
        key: 'HighExposureTr% (>=20 / 50)',
        title: 'HighExposureTr% (>=20 / 50)',
        description:
            'Доля сделок с повышенной экспозицией: первая часть — процент сделок, где Exposure >= 20%, вторая часть — где Exposure >= 50%.\n\nФормат значения: >=20% / >=50%.',
    },
    'DailyTP%': {
        key: 'DailyTP%',
        title: 'DailyTP%',
        description:
            'Take-profit (TP) — уровень прибыли, при котором позиция закрывается автоматически. В этой колонке показаны фактические TP-пороги для дневных сделок: средний/минимальный/максимальный процент от цены входа.',
    },
    'DailySL%': {
        key: 'DailySL%',
        title: 'DailySL%',
        description:
            '[[tp-sl|Стоп лосс]] — уровень убытка, при котором позиция закрывается автоматически для ограничения потерь.\n\nВ этой колонке показаны фактические уровни стоп лосса для дневных сделок (avg / min / max, % от цены входа).\n\nВ режиме [[no-sl-mode|NO SL]] вместо чисел показывается «—», потому что стоп лосс отключён.',
    },
    'DynTP / SL Days': {
        key: 'DynTP / SL Days',
        title: 'DynTP / SL Days',
        description:
            'Количество уникальных дней, где реально включился [[dynamic-tp-sl|DYNAMIC risk]]-оверлей.\n\nВ этих днях движок не только менял уровни [[tp-sl|stop-loss]] / [[tp-sl|take-profit]], но и масштабировал [[cap-fraction|долю капитала на сделку]] по уверенности модели.\n\nДень попадает сюда только после прохождения [[confidence-bucket|confidence-bucket]] по минимуму наблюдений и качеству (win-rate).',
    },
    'DynTP / SL Tr': {
        key: 'DynTP / SL Tr',
        title: 'DynTP / SL Tr',
        description:
            'Количество сделок, где реально применился [[dynamic-tp-sl|DYNAMIC risk]]-оверлей.\n\nВ этом режиме движок масштабирует уровни [[tp-sl|stop-loss]] и [[tp-sl|take-profit]], а также [[cap-fraction|долю капитала на сделку]] по уверенности модели.\n\nОбычно таких сделок меньше общего числа: без подтверждения по [[confidence-bucket|confidence-bucket]] день не попадает в dynamic-срез.',
    },
    'DynTP / SL PnL%': {
        key: 'DynTP / SL PnL%',
        title: 'DynTP / SL PnL%',
        description:
            'Вклад в итоговую доходность только от сделок с [[dynamic-tp-sl|DYNAMIC risk]], в процентах от [[start-cap|стартового капитала]] выбранного бакета.\n\nМетрика выделяет только часть общего результата этой [[policy|Policy]], которая пришлась на dynamic-сделки.',
    },
    'DynGate OK': {
        key: 'DynGate OK',
        title: 'DynGate OK',
        description:
            'DynGate OK — число дней, которые прошли все условия допуска к [[dynamic-tp-sl|DYNAMIC risk]].\n\nИменно эти дни попадают в [[dynamic-tp-sl|DynTP / SL Days]] и получают dynamic-настройку уровней выхода и размера позиции.\n\nКак читать:\nчем выше значение, тем чаще dynamic-слой реально участвовал в расчёте.',
    },
    'DynGate <Conf': {
        key: 'DynGate <Conf',
        title: 'DynGate <Conf',
        description:
            'DynGate <Conf — число дней, где уверенность модели оказалась ниже рабочего порога для [[dynamic-tp-sl|DYNAMIC risk]].\n\nВ такие дни dynamic-слой не включается, даже если сделка в целом была допустима.\n\nКак читать:\nрост этой колонки означает, что ограничение сидит в самой силе прогноза.',
    },
    'DynGate <Samples': {
        key: 'DynGate <Samples',
        title: 'DynGate <Samples',
        description:
            'DynGate <Samples — число дней, где нужная [[confidence-bucket|корзина уверенности]] не набрала минимум исторических сделок.\n\nDynamic-слой требует подтверждённую историю, поэтому без достаточной выборки день остаётся вне dynamic-среза.\n\nКак читать:\nрост этой колонки означает нехватку статистики, а не проблему расчёта отчёта.',
    },
    'DynGate <WinRate': {
        key: 'DynGate <WinRate',
        title: 'DynGate <WinRate',
        description:
            'DynGate <WinRate — число дней, где [[confidence-bucket|корзина уверенности]] уже набрала историю, но доля успешных сделок в ней осталась ниже рабочего порога.\n\nВ такие дни dynamic-слой не включается, потому что историческое качество сигнала недостаточно.\n\nКак читать:\nрост этой колонки означает, что ограничение сидит в слабом качестве похожих прошлых сделок.',
    },
    'StatTP / SL Days': {
        key: 'StatTP / SL Days',
        title: 'StatTP / SL Days',
        description:
            'Количество дней, где сделка прошла без [[dynamic-tp-sl|DYNAMIC risk]]-оверлея, то есть в режиме [[static-tp-sl|STATIC base]].\n\nВ этом режиме используются базовые правила сделки без dynamic-множителей по уровням выхода и [[cap-fraction|доле капитала на сделку]].',
    },
    'StatTP / SL Tr': {
        key: 'StatTP / SL Tr',
        title: 'StatTP / SL Tr',
        description:
            'Количество сделок, где [[dynamic-tp-sl|DYNAMIC risk]] не применился и расчёт остался в режиме [[static-tp-sl|STATIC base]].\n\nРост этой метрики означает, что dynamic-оверлей реже проходил условия допуска по исторической статистике.',
    },
    'StatTP / SL PnL%': {
        key: 'StatTP / SL PnL%',
        title: 'StatTP / SL PnL%',
        description:
            'Вклад в итоговую доходность только от сделок режима [[static-tp-sl|STATIC base]], в процентах от [[start-cap|стартового капитала]] выбранного бакета.\n\nПоказатель читается вместе с [[dynamic-tp-sl|DynTP / SL PnL%]], чтобы видеть, какой режим дал основную часть результата.\n\nПереключатель dynamic-risk режима меняет состав сделок этого среза, но не пересчитывает задним числом уже применённые в сделке [[leverage|плечо]] и [[cap-fraction|долю капитала на сделку]].',
    },
    'DelayedTP%': {
        key: 'DelayedTP%',
        title: 'DelayedTP%',
        description:
            'Средний TP для delayed-сделок (отложенный вход, то есть вход не в момент сигнала, а позже по правилу). Порог показан в процентах от цены входа.',
    },
    'DelayedSL%': {
        key: 'DelayedSL%',
        title: 'DelayedSL%',
        description:
            'Средний [[tp-sl|стоп лосс]] для [[bucket-delayed|delayed]]-сделок в процентах от цены входа.\n\nВ режиме [[no-sl-mode|NO SL]] вместо чисел показывается «—», потому что стоп лосс отключён.',
    },
    Tr: {
        key: 'Tr',
        title: 'Tr',
        description:
            'Общее число сделок в [[backtest|бэктесте]] по этой политике и ветке. Это количество отдельных позиций, а не количество дней.',
    },
    TotalPnl$: {
        key: 'TotalPnl$',
        title: 'TotalPnl$',
        description:
            'TotalPnl$ — денежный итог выбранного среза.\n\nФормула:\nTotalPnl$ = ([[current-balance|текущий баланс]] + [[withdrawn-profit|выведенная прибыль]]) - [[start-cap|стартовый капитал]].\n\nЧто показывает:\n1) это абсолютный результат в деньгах, а не процент;\n2) плюс означает прибыль, минус — убыток.\n\nКак читать:\n1) колонка нужна, когда важен не только относительный процент, но и реальный денежный масштаб эффекта;\n2) сравнение между строками корректно только вместе со [[start-cap|стартовым капиталом]], иначе одинаковый процент может скрывать разный денежный размер результата.',
    },
    BucketNow$: {
        key: 'BucketNow$',
        title: 'BucketNow$',
        description:
            'Текущий реальный баланс выбранного бакета после всех сделок, без учёта [[withdrawn-profit|выведенной прибыли]].\n\nДля [[bucket-daily|daily]] / [[bucket-intraday|intraday]] / [[bucket-delayed|delayed]] это локальный баланс бакета.\n\nДля [[bucket-total-aggregate|aggregate]] — сумма по всем бакетам.',
    },
    'MaxDD%': {
        key: 'MaxDD%',
        title: 'MaxDD%',
        description:
            'MaxDD% — самое глубокое падение active equity от локального пика до худшей точки по минутному пути цены.\n\nМетрика показывает, насколько тяжёлый провал капитал переживал внутри сделок, а не только по их закрытию.\n\nКак читать:\nчем глубже MaxDD%, тем труднее стратегия переносит плохой участок и тем тяжелее потом восстановление.\n\nВ режиме [[no-biggest-liq-loss|NO BIGGEST LIQ LOSS]] расчёт остаётся тем же, но без одной самой тяжёлой ликвидации.',
    },
    'MaxDD_NoLiq%': {
        key: 'MaxDD_NoLiq%',
        title: 'MaxDD_NoLiq%',
        description:
            'Максимальная просадка без учёта сделок с ликвидацией (принудительным закрытием позиции биржей). Показывает, насколько глубоко стратегия проседает в обычных условиях, если убрать аварийные события.',
    },
    'MaxDD_Active% / Days': {
        key: 'MaxDD_Active% / Days',
        title: 'MaxDD_Active% / Days',
        description:
            'MaxDD_Active% / Days — глубина и длительность одного худшего эпизода просадки по кривой [[active-equity|active equity]].\n\nПервое число показывает, насколько далеко капитал ушёл вниз от пика. Второе число показывает, сколько календарных дней капитал жил ниже этого пика до восстановления или до конца периода.\n\nКак читать:\nметрика нужна, когда важно видеть не только глубину провала, но и то, как долго капитал оставался под давлением.\n\nПример:\n42.7 / 181 означает просадку 42.7% и жизнь ниже старого пика в течение 181 дня.',
    },
    Sharpe: {
        key: 'Sharpe',
        title: 'Sharpe',
        description:
            'Коэффициент Sharpe по дневным доходностям: средняя дневная доходность / стандартное отклонение * √252. Дневные доходности агрегируются из сделок с весом позиции относительно общего капитала.',
    },
    Sortino: {
        key: 'Sortino',
        title: 'Sortino',
        description:
            'Коэффициент Sortino: средняя дневная доходность / down‑std * √252. Down‑std считается только по отрицательным дневным доходностям, что делает метрику чувствительной именно к падениям.',
    },
    Calmar: {
        key: 'Calmar',
        title: 'Calmar',
        description:
            'Calmar = CAGR / MaxDD (по дневной кривой из ratio‑метрик). Показывает доходность на единицу глубины просадки. Если MaxDD почти нулевая, выводится "—".',
    },
    'CAGR%': {
        key: 'CAGR%',
        title: 'CAGR%',
        description:
            'Годовой темп роста (CAGR), рассчитанный на дневной кривой доходностей: years = N/252, CAGR = equity^(1/years) − 1. Это годовая скорость роста, а не просто среднее по дням.',
    },
    'WinRate%': {
        key: 'WinRate%',
        title: 'WinRate%',
        description:
            'Доля прибыльных сделок: сделки, где [[net-return-pct|NetReturnPct]] > 0, от общего числа сделок * 100.',
    },
    ProfitFactor: {
        key: 'ProfitFactor',
        title: 'ProfitFactor',
        description:
            'ProfitFactor = сумма положительного NetPnl$ / abs(сумма отрицательного NetPnl$).\n\nМетрика отвечает на вопрос, перекрывает ли общий денежный выигрыш общий денежный убыток. Значение выше 1 означает, что прибыльных долларов больше, чем убыточных.\n\nЕсли у этой [[policy|Policy]] нет убыточных сделок, метрика математически не определена и выводится как "—".',
    },
    PayoffRatio: {
        key: 'PayoffRatio',
        title: 'PayoffRatio',
        description:
            'PayoffRatio = abs(AvgHit% / AvgMiss%).\n\nПоказывает, насколько средняя прибыльная сделка по проценту больше средней убыточной сделки по модулю.\n\nЕсли у этой [[policy|Policy]] нет хотя бы одной прибыльной и одной убыточной сделки, метрика не определена и выводится как "—".',
    },
    'AvgHit%': {
        key: 'AvgHit%',
        title: 'AvgHit%',
        description:
            'Средний NetReturnPct только по сделкам, где NetReturnPct > 0.\n\nЭто типичный размер выигрыша одной прибыльной сделки после комиссий и всех текущих правил симуляции.\n\nЕсли прибыльных сделок нет, метрика не определяется и выводится как "—".',
    },
    'AvgMiss%': {
        key: 'AvgMiss%',
        title: 'AvgMiss%',
        description:
            'Средний NetReturnPct только по сделкам, где NetReturnPct < 0.\n\nМетрика показывает, насколько глубокой обычно была убыточная сделка по проценту к использованной марже.\n\nЕсли убыточных сделок нет, выводится "—".',
    },
    'Expectancy%': {
        key: 'Expectancy%',
        title: 'Expectancy%',
        description:
            'Средний NetReturnPct по всем сделкам этой [[policy|Policy]].\n\nЭто ожидаемый процент результата одной случайной сделки из этой выборки после комиссий и текущих правил симуляции.\n\nПоложительное значение означает положительное математическое ожидание на сделку в процентах, отрицательное — отрицательное.',
    },
    Expectancy$: {
        key: 'Expectancy$',
        title: 'Expectancy$',
        description:
            'Средний NetPnl$ по всем сделкам этой [[policy|Policy]].\n\nМетрика показывает средний денежный результат одной сделки, а не всей серии.\n\nЕсли сделок нет, выводится "—".',
    },
    'LongWinRate%': {
        key: 'LongWinRate%',
        title: 'LongWinRate%',
        description:
            'Доля прибыльных LONG‑сделок: прибыльные long / все long * 100.\n\nПоказатель помогает понять, действительно ли стратегия умеет зарабатывать именно в направлении роста, а не только за счёт общего микса сделок.\n\nЕсли long‑сделок нет, выводится "—".',
    },
    'ShortWinRate%': {
        key: 'ShortWinRate%',
        title: 'ShortWinRate%',
        description:
            'Доля прибыльных SHORT‑сделок: прибыльные short / все short * 100.\n\nЧитается отдельно от общего WinRate%, чтобы видеть устойчивость стратегии именно в сделках на падение.\n\nЕсли short‑сделок нет, выводится "—".',
    },
    'BestDay%': {
        key: 'BestDay%',
        title: 'BestDay%',
        description:
            'Лучшая дневная доходность той же дневной серии, по которой считаются Sharpe, Sortino, Calmar и CAGR.\n\nМетрика показывает самый сильный положительный день в выбранном срезе без введения второй альтернативной серии.',
    },
    'WorstDay%': {
        key: 'WorstDay%',
        title: 'WorstDay%',
        description:
            'Худшая дневная доходность той же дневной серии, по которой считаются Sharpe, Sortino, Calmar и CAGR.\n\nЭто самый глубокий однодневный провал в выбранном срезе.',
    },
    RetSkew: {
        key: 'RetSkew',
        title: 'RetSkew',
        description:
            'Skewness дневной серии доходностей.\n\nПоложительный skew означает, что правый хвост распределения длиннее: редкие большие положительные дни выражены сильнее. Отрицательный skew означает более тяжёлый левый хвост и более неприятные редкие падения.',
    },
    RetKurt: {
        key: 'RetKurt',
        title: 'RetKurt',
        description:
            'Kurtosis дневной серии доходностей в non-excess виде, где нормальное распределение = 3.\n\nЧем выше значение, тем тяжелее хвосты распределения и тем чаще серия даёт экстремальные дни относительно обычной волатильности.',
    },
    'PSR>0%': {
        key: 'PSR>0%',
        title: 'PSR>0%',
        description:
            'Probabilistic Sharpe Ratio против порога true SR > 0.\n\nМетрика использует observed non-annualized Sharpe, длину серии, RetSkew и RetKurt и отвечает на вопрос: какова вероятность, что истинный Sharpe действительно выше нуля.\n\nПользователю выводится в процентах 0..100. Если серия слишком короткая или без разброса, метрика не определяется и выводится как "—".',
    },
    'MinTRL95 SR>0': {
        key: 'MinTRL95 SR>0',
        title: 'MinTRL95 SR>0',
        description:
            'Minimum Track Record Length для доверия 95% к гипотезе true SR > 0.\n\nМетрика показывает, сколько дневных наблюдений требуется при текущем observed Sharpe, RetSkew и RetKurt, чтобы статистически доверять положительному Sharpe на уровне 95%.\n\nЕсли observed Sharpe <= 0 или формула вырождается, выводится "—".',
    },
    'MeanRet%': {
        key: 'MeanRet%',
        title: 'MeanRet%',
        description:
            'Средняя дневная доходность той же дневной серии, по которой считаются Sharpe, Sortino, Calmar и CAGR. Сначала все сделки одного дня сворачиваются в один дневной итог, после чего берётся среднее по дням. Выводится в процентах.',
    },
    'StdRet%': {
        key: 'StdRet%',
        title: 'StdRet%',
        description:
            'Стандартное отклонение дневных доходностей (volatility) по той же дневной серии, что используется для [[sharpe-ratio|Sharpe]].\n\nВыводится в процентах.',
    },
    'DownStd%': {
        key: 'DownStd%',
        title: 'DownStd%',
        description:
            'Downside deviation: стандартное отклонение отрицательных дневных доходностей (все положительные значения обнуляются).\n\nИспользуется в [[sortino-ratio|Sortino]].',
    },
    'MaxDD_Ratio%': {
        key: 'MaxDD_Ratio%',
        title: 'MaxDD_Ratio%',
        description:
            'Максимальная просадка на [[ratio-curve|ratio-кривой]]: глубина падения visible wealth от локального пика до минимума, рассчитанная по дневной серии.\n\nПоказатель может совпадать с [[drawdown|MaxDD%]], когда дневная visible-wealth серия и основная wealth-база дают одну и ту же глубину провала. Колонка нужна, чтобы drawdown на ratio-кривой читался рядом с Sharpe, Sortino, Calmar и CAGR как часть одного блока дневных ratio-метрик.',
    },
    Withdrawn$: {
        key: 'Withdrawn$',
        title: 'Withdrawn$',
        description:
            'Сумма выведенной прибыли в долларах (WithdrawnTotal). Это деньги, которые «сняты» с баланса, когда equity превышал стартовый капитал.',
    },
    OnExch$: {
        key: 'OnExch$',
        title: 'OnExch$',
        description:
            'OnExch$ — капитал, который после выбранного среза остаётся в рынке, без учёта [[withdrawn-profit|выведенной прибыли]].\n\nВ [[bucket-total-aggregate|aggregate]] это сумма по всем бакетам.\n\nВ одном бакете число часто совпадает с [[bucket-now|BucketNow$]], но здесь акцент на той части капитала, которая ещё остаётся в работе.',
    },
    HadLiq: {
        key: 'HadLiq',
        title: 'HadLiq',
        description:
            'Были ли [[liquidation|ликвидации]]. Значение Yes означает аварийный риск в истории: у стратегии хотя бы раз было биржевое принудительное закрытие позиции. Это флаг риска, а не прямой ответ, почему остановился весь прогон.',
    },
    'RealLiq#': {
        key: 'RealLiq#',
        title: 'RealLiq#',
        description:
            'RealLiq# — сколько сделок дошло до строгого backtest-уровня [[liquidation|ликвидации]].\n\nКолонка считает сами аварийные события, а не деньги.\n\nКак читать:\nесли значение растёт, стратегия чаще доходит до принудительного закрытия. Денежный ущерб таких событий показывают [[real-liq-loss-usd|RealLiqLoss$]] и [[real-liq-loss-pct|RealLiqLoss%]].\n\nЕсли режим маржи не использует этот счётчик, выводится «—».',
    },
    'RealLiqLoss$': {
        key: 'RealLiqLoss$',
        title: 'RealLiqLoss$',
        description:
            'RealLiqLoss$ — суммарные денежные потери только по сделкам со строгой [[liquidation|ликвидацией]].\n\nВ расчёт входят только отрицательные денежные дельты этих сделок.\n\nКак читать:\nчем сильнее минус, тем дороже для капитала обходятся аварийные закрытия.\n\nЕсли режим маржи не использует этот показатель, выводится «—».',
    },
    'RealLiqLoss%': {
        key: 'RealLiqLoss%',
        title: 'RealLiqLoss%',
        description:
            'RealLiqLoss% — доля стартового капитала, потерянная именно на сделках со строгой [[liquidation|ликвидацией]].\n\nФормула:\n[[real-liq-loss-usd|RealLiqLoss$]] / [[start-cap|StartCap$]] * 100.\n\nКак читать:\nметрика показывает, какую часть стартовой базы уже сожгли аварийные закрытия.',
    },
    EODExit_n: {
        key: 'EODExit_n',
        title: 'EODExit_n',
        description:
            'Количество сделок, закрытых в конце торгового окна (EndOfDay), когда раньше не сработали ни [[tp-sl|TP]], ни [[tp-sl|SL]], ни [[liquidation|ликвидация]]. Рост метрики показывает, что стратегия чаще дотягивает до конца дня без раннего выхода.',
    },
    'EODExit%': {
        key: 'EODExit%',
        title: 'EODExit%',
        description:
            'Доля принудительных EndOfDay-выходов среди всех сделок: EODExit_n / Tr * 100. Нужна, чтобы видеть, насколько часто позиция доживает до конца окна.',
    },
    EODExit$: {
        key: 'EODExit$',
        title: 'EODExit$',
        description:
            'Суммарный NetPnL в долларах только по сделкам с принудительным EndOfDay-выходом. Показывает вклад EOD-сделок в общий денежный результат.',
    },
    'EODExit_AvgRet%': {
        key: 'EODExit_AvgRet%',
        title: 'EODExit_AvgRet%',
        description:
            'Средняя NetReturn% по сделкам, закрытым принудительно в конце окна (EndOfDay). Это средняя доходность одной EOD-сделки без взвешивания по частоте других причин выхода.',
    },
    LiqBeforeSL_n: {
        key: 'LiqBeforeSL_n',
        title: 'LiqBeforeSL_n',
        description:
            'Сколько раз при включённом SL [[liquidation|ликвидация]] произошла раньше стоп-лосса. Это означает, что защита была включена, но биржа закрыла позицию раньше, чем успел сработать SL.',
    },
    LiqBeforeSL_BadSL_n: {
        key: 'LiqBeforeSL_BadSL_n',
        title: 'LiqBeforeSL_BadSL_n',
        description:
            'Подмножество LiqBeforeSL_n, где SL стоял дальше, чем цена [[liquidation|ликвидации]]. Это означает, что защитный стоп-лосс фактически бесполезен при выбранном плече и залоге.',
    },
    LiqBeforeSL_Same1m_n: {
        key: 'LiqBeforeSL_Same1m_n',
        title: 'LiqBeforeSL_Same1m_n',
        description:
            'Подмножество LiqBeforeSL_n, где SL и [[liquidation|ликвидация]] коснулись цены в одной минутной свече. Это зона повышенной чувствительности к правилу приоритета событий внутри минуты.',
    },
    LiqBeforeSL$: {
        key: 'LiqBeforeSL$',
        title: 'LiqBeforeSL$',
        description:
            'Суммарный денежный результат только по сделкам, где [[liquidation|ликвидация]] произошла раньше SL. Чем сильнее отрицательное значение, тем дороже для стратегии обходится ситуация, в которой защита не успела сработать.',
    },
    'BalMin%': {
        key: 'BalMin%',
        title: 'BalMin%',
        description:
            'BalMin% — самый низкий уровень [[active-equity|active equity]] в процентах от стартового капитала по минутному пути цены.\n\nКолонка отвечает на вопрос, сколько капитала оставалось в худший момент.\n\nКак читать:\nчем ниже BalMin%, тем ближе стратегия подходила к аварийной зоне.',
    },
    BalDead: {
        key: 'BalDead',
        title: 'BalDead',
        description:
            'Флаг «балансовой смерти»: true, если активная equity падала ниже 35% от старта (порог BalanceDeathThresholdFrac).',
    },
    RecovSignals: {
        key: 'RecovSignals',
        title: 'RecovSignals',
        description:
            'Количество уникальных trade‑дней между дном MaxDD и восстановлением. Это «сколько сигналов понадобилось» для возврата к пику.',
    },
    'Time<35%': {
        key: 'Time<35%',
        title: 'Time<35%',
        description:
            'Суммарное время (в днях), которое equity провела ниже 35% от старта. Считается по отрезкам active equity кривой, включая частичные пересечения порога.',
    },
    'DD70_Min%': {
        key: 'DD70_Min%',
        title: 'DD70_Min%',
        description:
            'Минимальная equity в самом глубоком эпизоде, когда equity падала ниже 70% от старта. Это аналитический порог, а не правило выхода из сделки.',
    },
    DD70_Recov: {
        key: 'DD70_Recov',
        title: 'DD70_Recov',
        description:
            'Флаг восстановления после глубокой просадки: поднялась ли equity обратно выше 70% после самого глубокого эпизода.',
    },
    DD70_RecovDays: {
        key: 'DD70_RecovDays',
        title: 'DD70_RecovDays',
        description:
            'Сколько календарных дней прошло от минимума глубокой просадки до восстановления выше 70%. Если восстановления не было — выводится "—".',
    },
    DD70_n: {
        key: 'DD70_n',
        title: 'DD70_n',
        description:
            'Количество эпизодов, когда equity опускалась ниже 70% от старта. Это отдельный счётчик глубоких просадок.',
    },
    HorizonDays: {
        key: 'HorizonDays',
        title: 'HorizonDays',
        description:
            'HorizonDays — длина календарного периода строки от [[start-day|StartDay]] до [[end-day|EndDay]] включительно.\n\nЭта база используется для [[avg-day|AvgDay%]], [[avg-week|AvgWeek%]], [[avg-month|AvgMonth%]] и [[avg-year|AvgYear%]].\n\nКак читать:\nметрика показывает, на каком календарном горизонте получен итог строки.',
    },
    'AvgDay%': {
        key: 'AvgDay%',
        title: 'AvgDay%',
        description:
            'AvgDay% — средний дневной темп роста на календарной базе строки.\n\nМетрика переводит весь итог в один типичный день так, как если бы результат нарастал ровно на всём горизонте.\n\nКак читать:\nэто удобная шкала для сравнения строк разной длины по одному дневному темпу.',
    },
    'AvgWeek%': {
        key: 'AvgWeek%',
        title: 'AvgWeek%',
        description:
            'AvgWeek% — средний недельный темп роста, полученный из [[avg-day|AvgDay%]] на календарной базе.\n\nКак читать:\nметрика показывает, каким был бы типичный результат одной недели при том же темпе роста.',
    },
    'AvgMonth%': {
        key: 'AvgMonth%',
        title: 'AvgMonth%',
        description:
            'AvgMonth% — средний месячный темп роста, полученный из [[avg-day|AvgDay%]] на календарной базе.\n\nКак читать:\nметрика показывает, каким был бы типичный месяц при том же темпе роста.',
    },
    'AvgYear%': {
        key: 'AvgYear%',
        title: 'AvgYear%',
        description:
            'AvgYear% — средний годовой темп роста, полученный из [[avg-day|AvgDay%]] на календарной базе.\n\nМетрика использует 365 календарных дней и поэтому отвечает на вопрос о полном календарном темпе, а не о торговом годе.\n\nКак читать:\nзначение помогает сравнивать длинные периоды по одной годовой шкале.',
    },
    'Long n': {
        key: 'Long n',
        title: 'Long n',
        description:
            'Количество LONG-сделок (позиции на рост цены) по данной политике/ветке. Это число сделок, не число дней.',
    },
    'Short n': {
        key: 'Short n',
        title: 'Short n',
        description:
            'Количество SHORT-сделок (позиции на падение цены) по данной политике/ветке. Это число сделок, не число дней.',
    },
    'Long $': {
        key: 'Long $',
        title: 'Long $',
        description:
            'Денежный вклад LONG-сделок (сделок на рост) в общий результат. Помогает понять, на каком направлении стратегия реально зарабатывает или теряет больше.',
    },
    'Short $': {
        key: 'Short $',
        title: 'Short $',
        description:
            'Денежный вклад SHORT-сделок (сделок на падение) в общий результат. Нужен для сравнения, насколько стратегия зависит от падения рынка.',
    },
    'AvgLong%': {
        key: 'AvgLong%',
        title: 'AvgLong%',
        description:
            'Средняя доходность одной LONG-сделки (позиции на рост) в процентах. Это среднее по сделкам, без учёта их размера.',
    },
    'AvgShort%': {
        key: 'AvgShort%',
        title: 'AvgShort%',
        description:
            'Средняя доходность одной SHORT-сделки (позиции на падение) в процентах. Это среднее по сделкам, без учёта их размера.',
    },
    inv_liq_mismatch: {
        key: 'inv_liq_mismatch',
        title: 'inv_liq_mismatch',
        description:
            'Технический индикатор качества симуляции: сколько найдено нарушений инвариантов по ликвидациям (принудительным закрытиям позиций биржей). Ноль — норма, любое ненулевое значение означает, что расчёт нужно перепроверить до бизнес-выводов.',
    },
    minutes_anomaly: {
        key: 'minutes_anomaly',
        title: 'minutes_anomaly',
        description:
            'Сколько обнаружено аномалий в минутных данных (пробелы, ошибки в 1m-серии) во время бэктеста, то есть проверки на исторических данных. Это индикатор качества данных, а не качества стратегии.',
    }
}

const POLICY_BRANCH_MEGA_COMMON_TERM_KEYS = Object.keys(POLICY_BRANCH_MEGA_COMMON_TERM_DRAFTS)
export const POLICY_BRANCH_MEGA_TERM_KEYS = Object.freeze([
    ...POLICY_BRANCH_MEGA_COMMON_TERM_KEYS,
    ...Object.keys(TERMS)
]) as readonly string[]
function extractMegaPartNumber(title: string | undefined): number | null {
    if (!title) return null

    const normalized = normalizePolicyBranchMegaTitle(title)
    const partIndex = normalized.toLowerCase().indexOf('[part')
    if (partIndex < 0) return null

    const slashIndex = normalized.indexOf('/', partIndex)
    const endIndex = normalized.indexOf(']', partIndex)
    if (slashIndex < 0 || endIndex < 0 || slashIndex > endIndex) return null

    const numberStart = normalized.indexOf(' ', partIndex)
    if (numberStart < 0 || numberStart > slashIndex) return null

    const raw = normalized.slice(numberStart, slashIndex).trim()
    const parsed = Number(raw)
    if (!Number.isFinite(parsed)) return null

    return parsed
}
function resolveMegaModeKey(title: string | undefined): 'WITH SL' | 'NO SL' | 'UNKNOWN' {
    if (!title) return 'UNKNOWN'

    const normalized = normalizePolicyBranchMegaTitle(title).toUpperCase()
    if (normalized.includes('NO SL')) return 'NO SL'
    if (normalized.includes('WITH SL')) return 'WITH SL'

    return 'UNKNOWN'
}

function resolveMegaModeOrder(mode: 'WITH SL' | 'NO SL' | 'UNKNOWN'): number {
    if (mode === 'WITH SL') return 0
    if (mode === 'NO SL') return 1
    return 2
}

function resolveMegaMetricOrder(metric: 'real' | 'no-biggest-liq-loss' | null): number {
    if (metric === 'real') return 0
    if (metric === 'no-biggest-liq-loss') return 1
    return 2
}

function resolveMegaBucketOrder(bucket: 'daily' | 'intraday' | 'delayed' | 'total' | null): number {
    if (bucket === 'daily') return 0
    if (bucket === 'intraday') return 1
    if (bucket === 'delayed') return 2
    if (bucket === 'total') return 3
    return 4
}
function isPolicyBranchMegaTitle(title: string | undefined): boolean {
    if (!title) return false
    const normalized = normalizePolicyBranchMegaTitle(title)
    return normalized.toLowerCase().includes(MEGA_TITLE_MARKER.toLowerCase())
}

function normalizeTermKey(rawTitle: string): string {
    return rawTitle.trim().replace(/\s*\|\s*/g, '|')
}

const DRAW_DOWN_KEYS = new Set<string>([
    'MaxDD%',
    'MaxDD_NoLiq%',
    'MaxDD_Active% / Days',
    'MaxDD_Ratio%',
    'BalMin%',
    'BalDead',
    'Time<35%',
    'DD70_Min%',
    'DD70_n'
])

const RECOVERY_KEYS = new Set<string>([
    'Recovered',
    'RecovDays',
    'RecovSignals',
    'ReqGain%',
    'DD70_Recov',
    'DD70_RecovDays'
])

const DIAGNOSTIC_ZERO_KEYS = new Set<string>(['inv_liq_mismatch', 'minutes_anomaly'])

const MERGED_PRIMARY_TO_SECONDARY = new Map<string, string>([
    ['StartDay', 'EndDay'],
    ['Long%', 'Short%'],
    ['AvgStake%', 'AvgStake$']
])

const MERGED_SECONDARY_TO_PRIMARY = new Map<string, string>(
    [...MERGED_PRIMARY_TO_SECONDARY.entries()].map(([primary, secondary]) => [secondary, primary])
)

const MERGED_PRIMARY_TITLE_BY_KEY = new Map<string, string>([
    ['StartDay', 'StartDay + EndDay'],
    ['Long%', 'Long% + Short%'],
    ['AvgStake%', 'AvgStake% + AvgStake$']
])

function ensureSentenceEnding(text: string): string {
    const normalized = text
        .replace(/\r\n/g, '\n')
        .split('\n')
        .map(line => line.replace(/[ \t]{2,}/g, ' ').trim())
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
    if (!normalized) return normalized

    const visibleText = normalized.replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, '$2')
    return /[.!?]$/.test(visibleText) ? normalized : `${normalized}.`
}

function removeRedundantGlossaryFromDescription(text: string): string {
    let next = text

    // Встроенные словарные вставки для LONG/SHORT убираются здесь,
    // потому что расшифровка этих терминов приходит через hover-термины.
    next = next.replace(/\(\s*LONG\s*=\s*[^)]*SHORT\s*=\s*[^)]*\)/gi, '')
    next = next.replace(/,\s*где\s+LONG\s+означает[^.]*\./gi, '.')
    next = next.replace(/,\s*где\s+SHORT\s+означает[^.]*\./gi, '.')
    next = next.replace(/\bв\s+какую\s+сторону\s+идти\b/gi, 'в каком направлении открывать позицию')
    next = next.replace(/\s*\(\s*во\s+сколько\s+раз\s+позиция\s+больше\s+залога\s*\)/gi, '')

    // Убираем повторные "в скобках" пояснения для терминов, которые уже раскрываются подсказкой.
    next = next.replace(/\s*\(покупка\)/gi, '')
    next = next.replace(/\s*\(продажа\)/gi, '')
    next = next.replace(/\s*\(симуляц[^)]*\)/gi, '')
    next = next.replace(/(ликвидац[а-я]*)\s*\(\s*принудительн[^)]*\)/gi, '$1')
    next = next.replace(/(TP|SL)\s*\(\s*(?:фиксац|ограничени)[^)]*\)/gi, '$1')

    // Длинные дефиниции терминов убираем из основного текста: пользователь читает их по hover.
    next = next.replace(/Take-profit\s*\(TP\)\s*[—-]\s*[^.]*\./gi, 'Take-profit (TP).')
    next = next.replace(/Stop-loss\s*\(SL\)\s*[—-]\s*[^.]*\./gi, 'Stop-loss (SL).')
    next = next.replace(/Плечо\s*\(leverage\)\s*[—-]\s*[^.]*\./gi, 'Плечо (leverage).')
    next = next.replace(/Маржа\s*[—-]\s*[^.]*\./gi, 'Маржа.')
    next = next.replace(/Ликвидация\s*[—-]\s*[^.]*\./gi, 'Ликвидация.')

    // Нормализуем пробелы и пунктуацию после чистки.
    next = next.replace(/[ \t]{2,}/g, ' ')
    next = next.replace(/[ \t]+([,.;:!?])/g, '$1')
    next = next.replace(/,\s*\./g, '.')
    next = next.replace(/\(\s*\)/g, '')

    return next.trim()
}

function rewriteRichTextVisibleContent(text: string, rewriteVisibleSegment: (segment: string) => string): string {
    const explicitTermRegex = /\[\[([^|\]]+)\|([^\]]+)\]\]/g
    let cursor = 0
    let next = ''

    for (const match of text.matchAll(explicitTermRegex)) {
        const matchIndex = match.index
        if (typeof matchIndex !== 'number') {
            continue
        }

        next += rewriteVisibleSegmentPreservingBoundaryWhitespace(
            text.slice(cursor, matchIndex),
            rewriteVisibleSegment
        )
        next += `[[${match[1]}|${rewriteVisibleSegment(match[2])}]]`
        cursor = matchIndex + match[0].length
    }

    next += rewriteVisibleSegmentPreservingBoundaryWhitespace(text.slice(cursor), rewriteVisibleSegment)
    return next
}

function rewriteVisibleSegmentPreservingBoundaryWhitespace(
    segment: string,
    rewriteVisibleSegment: (segment: string) => string
): string {
    if (!segment) {
        return segment
    }

    const leadingWhitespace = segment.match(/^\s+/)?.[0] ?? ''
    const trailingWhitespace = segment.match(/\s+$/)?.[0] ?? ''
    const visibleSegmentStart = leadingWhitespace.length
    const visibleSegmentEnd = segment.length - trailingWhitespace.length
    const visibleSegment = segment.slice(visibleSegmentStart, visibleSegmentEnd)

    if (!visibleSegment) {
        return segment
    }

    return `${leadingWhitespace}${rewriteVisibleSegment(visibleSegment)}${trailingWhitespace}`
}

function applyRuInternalTextReplacements(text: string): string {
    let next = text

    next = next.replace(/\bpolicy-?skip\b/gi, 'внутренний запрет политики')
    next = next.replace(/\bcap fraction\b/gi, 'доля капитала на сделку')
    next = next.replace(/\btrace-?сигнал(ы|ов)?\b/gi, 'дневные сигналы модели')
    next = next.replace(/\bweekend-?skip\b/gi, 'штатное исключение выходных')

    next = next.replace(/[ \t]{2,}/g, ' ')
    next = next.replace(/[ \t]+([,.;:!?])/g, '$1')
    return next.trim()
}

function isFallbackCountMetricKey(key: string): boolean {
    return /(?:_n| n|Days|Tr|Signals)$/.test(key)
}

function humanizeInternalTerms(text: string): string {
    return rewriteRichTextVisibleContent(text, applyRuInternalTextReplacements)
}

function ensureSemanticParagraphBreaks(text: string): string {
    let next = text

    next = next.replace(/([^\n])\s+(Пример:)/g, '$1\n\n$2')
    next = next.replace(/([^\n])\s+(Example:)/g, '$1\n\n$2')
    next = next.replace(/([^\n])\s+(Как читать:)/g, '$1\n\n$2')
    next = next.replace(/([^\n])\s+(How to read:)/g, '$1\n\n$2')
    next = next.replace(/([^\n])\s+(Ориентир чтения:)/g, '$1\n\n$2')
    next = next.replace(/([^\n])\s+(First-event цепочка:)/g, '$1\n\n$2')
    next = next.replace(/([^\n])\s+(Риск NO SL:|Риск NO-SL:)/g, '$1\n\n$2')
    next = next.replace(/([^\n])\s+(true:|false:)/g, '$1\n\n$2')

    return next
}

function normalizeLocaleAwareTermBlock(text: string, locale: PolicyBranchMegaTermLocale): string {
    const cleaned = removeRedundantGlossaryFromDescription(text)
    const humanized = locale === 'ru' ? humanizeInternalTerms(cleaned) : cleaned
    return ensureSentenceEnding(ensureSemanticParagraphBreaks(humanized))
}

function resolveReadingLabel(locale: PolicyBranchMegaTermLocale): string {
    return locale === 'ru' ? 'Как читать' : 'How to read'
}

function resolveExampleLabel(locale: PolicyBranchMegaTermLocale): string {
    return locale === 'ru' ? 'Пример' : 'Example'
}

function resolveTermReadingHintOrDefault(key: string): string {
    if (key === 'StartDay' || key === 'EndDay') {
        return 'эти даты должны совпадать с окном сравнения; разные границы периода делают сравнение политик некорректным.'
    }
    if (key === 'StopReason') {
        return 'штатный кейс — завершение до конца периода; ранняя остановка из-за ликвидации — красный флаг.'
    }
    if (key === 'Days' || key === 'Tr') {
        return 'большая доходность на очень малом числе дней/сделок менее надёжна, чем сопоставимая доходность на широкой выборке.'
    }
    if (key === 'Trade%') {
        return 'пример: 35% значит торговля была в 35 из 100 дней.'
    }
    if (key === 'NoTrade%') {
        return 'рост метрики означает более редкую торговлю; это не плохо само по себе, но влияет на устойчивость статистики.'
    }
    if (key === 'Long%' || key === 'Short%') {
        return 'сами по себе не “хорошо/плохо”; интерпретация выполняется вместе с Long$/Short$ и AvgLong%/AvgShort%.'
    }
    if (key === 'RiskDay%') {
        return 'внутри одного исторического окна метрика часто близка у разных политик; это скорее фон риска периода, чем главный критерий сравнения.'
    }
    if (key === 'AntiD%' || key === 'AntiD|Risk%') {
        return 'высокие значения показывают активную работу инверсии; далее оценивается, улучшает ли это PnL при тех же или меньших рисках.'
    }
    if (key === 'Lev avg / min / max' || key === 'Lev p50 / p90') {
        return 'чем выше плечо, тем агрессивнее риск; особенно показателен верхний хвост (p90/max).'
    }
    if (key === 'Cap avg / min / max' || key === 'Cap p50 / p90' || key === 'AvgStake%' || key === 'AvgStake$') {
        return 'чем выше доля капитала на сделку, тем сильнее влияние каждой ошибки; оценка выполняется вместе с MaxDD и Liq-метриками.'
    }
    if (key === 'Exposure% (avg / p50 / p90 / p99 / max)' || key === 'HighExposureTr% (>=20 / 50)') {
        return 'рост верхних уровней (p90/p99/max, >=50%) означает рост хвостового риска.'
    }
    if (key === 'DailyTP%' || key === 'DelayedTP%') {
        return 'показывает целевой профит-уровень: сопоставляется с соответствующим SL, чтобы видеть профиль риск/прибыль.'
    }
    if (key === 'DailySL%' || key === 'DelayedSL%') {
        return 'слишком широкий SL увеличивает убыток на сделку; слишком узкий резко снижает долю успешных сделок.'
    }
    if (key === 'DynTP / SL Days' || key === 'DynTP / SL Tr') {
        return 'обычно меньше общего объёма, потому что [[dynamic-tp-sl|DYNAMIC risk]] требует подтверждённой статистики по [[confidence-bucket|confidence-bucket]].'
    }
    if (key === 'DynGate OK' || key === 'DynGate <Conf' || key === 'DynGate <Samples' || key === 'DynGate <WinRate') {
        return 'это owner-диагностика допуска dynamic-слоя по дням, а не доходность и не число сделок.'
    }
    if (key === 'StatTP / SL Days' || key === 'StatTP / SL Tr') {
        return 'если сделок [[static-tp-sl|STATIC base]] резко больше, чем [[dynamic-tp-sl|DYNAMIC risk]], значит dynamic-оверлей редко проходит условия допуска в этом периоде.'
    }
    if (key === 'DynTP / SL PnL%' || key === 'StatTP / SL PnL%') {
        return 'вклад [[dynamic-tp-sl|DYNAMIC risk]] и [[static-tp-sl|STATIC base]] оценивается совместно: так видно, какой режим реально даёт результат.'
    }
    if (key === 'TotalPnl$') {
        return 'чем выше, тем лучше по доходности, но финальное решение только вместе с MaxDD%, HadLiq и AccRuin.'
    }
    if (key === 'Sharpe' || key === 'Sortino' || key === 'Calmar') {
        return 'чем выше, тем лучше соотношение доходности и риска, но сравнение корректно только внутри одного bucket и одного режима метрик.'
    }
    if (
        key === 'ProfitFactor' ||
        key === 'PayoffRatio' ||
        key === 'AvgHit%' ||
        key === 'AvgMiss%' ||
        key === 'Expectancy%' ||
        key === 'Expectancy$' ||
        key === 'LongWinRate%' ||
        key === 'ShortWinRate%'
    ) {
        return 'это экономика одной сделки: как часто стратегия выигрывает, сколько зарабатывает на среднем хите и сколько теряет на среднем промахе.'
    }
    if (
        key === 'BestDay%' ||
        key === 'WorstDay%' ||
        key === 'RetSkew' ||
        key === 'RetKurt' ||
        key === 'PSR>0%' ||
        key === 'MinTRL95 SR>0'
    ) {
        return 'это уже свойства дневной серии доходностей: хвосты, асимметрия и статистическая уверенность в положительном Sharpe.'
    }
    if (key === 'CAGR%' || key === 'MeanRet%' || key === 'StdRet%' || key === 'DownStd%' || key === 'WinRate%') {
        return 'совместная интерпретация обязательна: высокая средняя доходность без контроля разброса и просадки часто даёт нестабильный профиль риска.'
    }
    if (key === 'BucketNow$' || key === 'OnExch$' || key === 'Withdrawn$' || key === 'OnExch%' || key === 'Wealth%') {
        return 'интерпретация идёт связкой: Wealth% показывает полный итог, OnExch% и OnExch$ — что ещё осталось в рынке, Withdrawn$ — что уже выведено, а BucketNow$ подчёркивает локальный баланс выбранного бакета.'
    }
    if (key === 'StartCap$') {
        return 'это база масштаба; проценты корректно сравнивать между стратегиями, а доллары — только при одинаковом стартовом капитале.'
    }
    if (DRAW_DOWN_KEYS.has(key)) {
        return 'для просадки правило простое: чем ниже глубина и реже глубокие эпизоды, тем стратегия устойчивее.'
    }
    if (key === 'HadLiq') {
        return 'лучший сценарий — false/0. Даже единичная ликвидация — повод смотреть хвостовой риск.'
    }
    if (key === 'AccRuin') {
        return 'лучший сценарий — 0. Значение 1 означает, что стратегия по сути “умерла” на выбранном горизонте.'
    }
    if (
        key === 'RealLiq#' ||
        key === 'RealLiqLoss$' ||
        key === 'RealLiqLoss%' ||
        key === 'LiqBeforeSL_n' ||
        key === 'LiqBeforeSL_BadSL_n' ||
        key === 'LiqBeforeSL_Same1m_n'
    ) {
        return 'желательно 0 или близко к 0; рост требует пересмотра плеча, доли капитала и уровней SL.'
    }
    if (key === 'LiqBeforeSL$') {
        return 'сильный минус означает, что случаи “ликвидация раньше SL” дорого обходятся бизнесу.'
    }
    if (key === 'EODExit_n' || key === 'EODExit%') {
        return 'рост означает, что сделка чаще закрывается в конце окна, а не по TP/SL; это меняет профиль риска и качества выходов.'
    }
    if (key === 'EODExit$' || key === 'EODExit_AvgRet%') {
        return 'если метрика стабильно отрицательная, режим EOD чаще ухудшает итог, чем помогает.'
    }
    if (RECOVERY_KEYS.has(key)) {
        return 'лучше, когда восстановление есть (Recovered=true), быстрее (меньше RecovDays/RecovSignals) и дешевле по требуемому росту (ниже ReqGain%).'
    }
    if (key === 'HorizonDays' || key === 'AvgDay%' || key === 'AvgWeek%' || key === 'AvgMonth%' || key === 'AvgYear%') {
        return 'здесь используется календарная шкала. Её полезно отличать от Days, RecovDays и длительности в MaxDD_Active% / Days, потому что эти поля отвечают на разные вопросы.'
    }
    if (
        key === 'Long n' ||
        key === 'Short n' ||
        key === 'Long $' ||
        key === 'Short $' ||
        key === 'AvgLong%' ||
        key === 'AvgShort%'
    ) {
        return 'интерпретируется как разрез по направлениям: где стратегия зарабатывает чаще и где чаще теряет.'
    }
    if (DIAGNOSTIC_ZERO_KEYS.has(key)) {
        return 'нормальное значение — 0; любое ненулевое — сигнал перепроверить данные и механику симуляции.'
    }
    if (key === 'Miss') {
        return 'в формате "будни | выходные" левое число (будние пропуски) в норме равно 0; правое число отражает выходные пропуски и считается штатным.'
    }

    return 'корректное сравнение возможно только для [[policy|Policy]] в одном и том же срезе (bucket, SL mode, TP/SL mode, zonal, metric view), иначе вывод будет некорректным.'
}

function resolveEnglishTermReadingHintOrDefault(key: string): string {
    if (key === 'StartDay' || key === 'EndDay') {
        return 'These dates must match the comparison window; different date boundaries make policy comparison invalid.'
    }
    if (key === 'StopReason') {
        return 'The normal case is reaching the end of the period; early stop because of liquidation is a red flag.'
    }
    if (key === 'Days' || key === 'Tr') {
        return 'High return based on very few days or trades is less reliable than comparable return on a broad sample.'
    }
    if (key === 'Trade%') {
        return 'Example reading: 35% means the strategy traded on 35 out of 100 days.'
    }
    if (key === 'NoTrade%') {
        return 'A higher value means rarer trading; that is not bad by itself, but it affects statistical stability.'
    }
    if (key === 'Long%' || key === 'Short%') {
        return 'These metrics are not “good” or “bad” on their own; interpret them together with Long$/Short$ and AvgLong%/AvgShort%.'
    }
    if (key === 'RiskDay%') {
        return 'Inside one historical window this metric is often very similar across policies; it is mostly the risk background of the period, not the main ranking metric.'
    }
    if (key === 'AntiD%' || key === 'AntiD|Risk%') {
        return 'High values mean direction inversion is active often; then assess whether that improves PnL at the same or lower risk.'
    }
    if (key === 'Lev avg / min / max' || key === 'Lev p50 / p90') {
        return 'Higher leverage means more aggressive risk; the upper tail (p90/max) is especially informative.'
    }
    if (key === 'Cap avg / min / max' || key === 'Cap p50 / p90' || key === 'AvgStake%' || key === 'AvgStake$') {
        return 'The larger the capital fraction per trade, the stronger the impact of each mistake; interpret together with MaxDD and liquidation metrics.'
    }
    if (key === 'Exposure% (avg / p50 / p90 / p99 / max)' || key === 'HighExposureTr% (>=20 / 50)') {
        return 'Growth in the upper levels (p90/p99/max, >=50%) means tail risk is increasing.'
    }
    if (key === 'DailyTP%' || key === 'DelayedTP%') {
        return 'This is the profit target level; compare it with the matching SL to see the risk/reward profile.'
    }
    if (key === 'DailySL%' || key === 'DelayedSL%') {
        return 'An excessively wide SL increases loss per trade; an excessively tight SL sharply reduces the share of successful trades.'
    }
    if (key === 'DynTP / SL Days' || key === 'DynTP / SL Tr') {
        return 'These values are usually smaller than the full trade volume because [[dynamic-tp-sl|DYNAMIC risk]] requires confirmed statistics inside [[confidence-bucket|confidence-bucket]].'
    }
    if (key === 'DynGate OK' || key === 'DynGate <Conf' || key === 'DynGate <Samples' || key === 'DynGate <WinRate') {
        return 'This is owner-level admission diagnostics for the dynamic layer by day, not return and not trade count.'
    }
    if (key === 'StatTP / SL Days' || key === 'StatTP / SL Tr') {
        return 'If [[static-tp-sl|STATIC base]] trade count is much larger than [[dynamic-tp-sl|DYNAMIC risk]], the dynamic overlay rarely passes admission conditions in this period.'
    }
    if (key === 'DynTP / SL PnL%' || key === 'StatTP / SL PnL%') {
        return 'The contribution of [[dynamic-tp-sl|DYNAMIC risk]] and [[static-tp-sl|STATIC base]] must be read together to see which mode actually drives the result.'
    }
    if (key === 'TotalPnl$') {
        return 'Higher is better for return, but the final decision must always be made together with MaxDD%, HadLiq, and AccRuin.'
    }
    if (key === 'Sharpe' || key === 'Sortino' || key === 'Calmar') {
        return 'Higher is better for risk-adjusted return, but comparison is valid only inside the same bucket and the same metric mode.'
    }
    if (
        key === 'ProfitFactor' ||
        key === 'PayoffRatio' ||
        key === 'AvgHit%' ||
        key === 'AvgMiss%' ||
        key === 'Expectancy%' ||
        key === 'Expectancy$' ||
        key === 'LongWinRate%' ||
        key === 'ShortWinRate%'
    ) {
        return 'These are per-trade economics: how often the strategy wins, how large the average win is, and how painful the average loss is.'
    }
    if (
        key === 'BestDay%' ||
        key === 'WorstDay%' ||
        key === 'RetSkew' ||
        key === 'RetKurt' ||
        key === 'PSR>0%' ||
        key === 'MinTRL95 SR>0'
    ) {
        return 'These belong to the daily return series itself: tail shape, asymmetry, and statistical confidence that Sharpe is truly above zero.'
    }
    if (key === 'CAGR%' || key === 'MeanRet%' || key === 'StdRet%' || key === 'DownStd%' || key === 'WinRate%') {
        return 'These must be interpreted together: high average return without control over dispersion and drawdown usually means unstable risk profile.'
    }
    if (key === 'BucketNow$' || key === 'OnExch$' || key === 'Withdrawn$' || key === 'OnExch%' || key === 'Wealth%') {
        return 'Interpret them together: Wealth% is the full outcome, OnExch% and OnExch$ show what still remains in the market, Withdrawn$ shows what was already taken out, and BucketNow$ emphasizes the local balance of the selected bucket.'
    }
    if (key === 'StartCap$') {
        return 'This is the scale baseline: percentages can be compared between strategies, but dollar amounts only when start capital is the same.'
    }
    if (DRAW_DOWN_KEYS.has(key)) {
        return 'For drawdown, the rule is simple: the shallower the decline and the rarer the deep episodes, the more robust the strategy.'
    }
    if (key === 'HadLiq') {
        return 'Best case is false/0. Even a single liquidation is a reason to inspect tail risk.'
    }
    if (key === 'AccRuin') {
        return 'Best case is 0. A value of 1 means the strategy effectively “died” on the selected horizon.'
    }
    if (
        key === 'RealLiq#' ||
        key === 'RealLiqLoss$' ||
        key === 'RealLiqLoss%' ||
        key === 'LiqBeforeSL_n' ||
        key === 'LiqBeforeSL_BadSL_n' ||
        key === 'LiqBeforeSL_Same1m_n'
    ) {
        return 'Preferably these values stay at 0 or near 0; growth here calls for leverage, capital fraction, and SL revision.'
    }
    if (key === 'LiqBeforeSL$') {
        return 'A large negative value means “liquidation before SL” events are expensive for the business.'
    }
    if (key === 'EODExit_n' || key === 'EODExit%') {
        return 'Higher values mean trades reach end-of-window closure more often instead of exiting by TP/SL; that changes both risk profile and exit quality.'
    }
    if (key === 'EODExit$' || key === 'EODExit_AvgRet%') {
        return 'If this metric is consistently negative, EndOfDay behavior harms the final result more often than it helps.'
    }
    if (RECOVERY_KEYS.has(key)) {
        return 'Better when recovery exists (Recovered=true), is faster (lower RecovDays/RecovSignals), and requires less growth (lower ReqGain%).'
    }
    if (key === 'HorizonDays' || key === 'AvgDay%' || key === 'AvgWeek%' || key === 'AvgMonth%' || key === 'AvgYear%') {
        return 'These fields use a calendar scale. That should be kept separate from Days, RecovDays, and the duration in MaxDD_Active% / Days, because those fields answer different timing questions.'
    }
    if (
        key === 'Long n' ||
        key === 'Short n' ||
        key === 'Long $' ||
        key === 'Short $' ||
        key === 'AvgLong%' ||
        key === 'AvgShort%'
    ) {
        return 'Interpret this as direction split: where the strategy earns more often and where it loses more often.'
    }
    if (DIAGNOSTIC_ZERO_KEYS.has(key)) {
        return 'The normal value is 0; any non-zero value is a signal to recheck data and simulation mechanics.'
    }
    if (key === 'Miss') {
        return 'In the "weekday | weekend" format, the left number (weekday misses) should normally be 0; the right number reflects weekend skips and is expected.'
    }

    return 'Correct comparison is possible only for Policies inside the same slice (bucket, SL mode, TP/SL mode, zonal, metric view); otherwise the conclusion is invalid.'
}

function resolveFallbackExampleHint(key: string): string {
    if (key === 'StartDay' || key === 'EndDay') {
        return 'StartDay=2022-01-01 и EndDay=2025-12-31 означают, что сравнение выполнено на одном и том же историческом окне.'
    }
    if (key === 'MaxDD%' || key === 'MaxDD_NoLiq%') {
        return `${key}=28 означает, что в худшей точке капитал был на 28% ниже локального пика.`
    }
    if (key === 'BalMin%') {
        return 'BalMin%=34 означает, что в худший момент оставалось 34% стартового капитала.'
    }
    if (key === 'HorizonDays') {
        return 'HorizonDays=934 означает календарную длину периода от StartDay до EndDay включительно.'
    }
    if (key === 'Days') {
        return 'Days=934 означает число рабочих дней строки без выходных, а не календарную длину периода.'
    }
    if (key === 'RecovDays') {
        return 'RecovDays=45 означает, что от дна просадки до возврата к прежнему пику прошло 45 календарных дней.'
    }
    if (key === 'MaxDD_Active% / Days') {
        return 'MaxDD_Active% / Days = 42.7 / 181 означает глубину худшего эпизода 42.7% и жизнь ниже прежнего пика в течение 181 дня.'
    }
    if (key.includes('$')) {
        return `${key}=12 500 показывает денежный эффект именно в долларах, а не в процентах.`
    }
    if (key.includes('%')) {
        return `${key}=28 означает, что показатель равен 28% в выбранном срезе таблицы.`
    }
    if (isFallbackCountMetricKey(key)) {
        return `${key}=120 означает 120 событий (дней, сделок или сигналов) в выбранном срезе таблицы.`
    }
    return `${key} читается в связке с соседними метриками той же [[policy|Policy]]: доходность, просадка, ликвидации и восстановление.`
}

function resolveEnglishFallbackExampleHint(key: string): string {
    if (key === 'StartDay' || key === 'EndDay') {
        return 'StartDay=2022-01-01 and EndDay=2025-12-31 mean the comparison was run on the same historical window.'
    }
    if (key === 'MaxDD%' || key === 'MaxDD_NoLiq%') {
        return `${key}=28 means capital was 28% below its local peak at the worst point.`
    }
    if (key === 'BalMin%') {
        return 'BalMin%=34 means 34% of the starting capital was still left at the worst point.'
    }
    if (key === 'HorizonDays') {
        return 'HorizonDays=934 means the calendar length from StartDay to EndDay inclusive.'
    }
    if (key === 'Days') {
        return 'Days=934 means the count of working days in the row, not the calendar span of the period.'
    }
    if (key === 'RecovDays') {
        return 'RecovDays=45 means 45 calendar days passed from the drawdown bottom to the recovery of the old peak.'
    }
    if (key === 'MaxDD_Active% / Days') {
        return 'MaxDD_Active% / Days = 42.7 / 181 means a 42.7% worst active-equity drop and 181 days below the old peak.'
    }
    if (key.includes('$')) {
        return `${key}=12,500 shows the effect in dollars, not in percentages.`
    }
    if (key.includes('%')) {
        return `${key}=28 means the metric equals 28% in the selected table slice.`
    }
    if (isFallbackCountMetricKey(key)) {
        return `${key}=120 means 120 events (days, trades, or signals) in the selected table slice.`
    }
    return `${key} must be read together with neighboring metrics in the same Policy: return, drawdown, liquidations, and recovery.`
}

function resolveTermExampleHintOrNull(key: string): string | null {
    if (key === 'Days') {
        return 'значение 365 означает, что расчёт охватил 365 торговых дней (без выходных).'
    }
    if (key === 'StopReason') {
        return null
    }
    if (key === 'StartDay' || key === 'EndDay') {
        return 'StartDay=2022-01-01 и EndDay=2025-12-31 означает, что симуляция читалась по этому окну дат.'
    }
    if (key === 'Trade%') {
        return '35% означает, что в 35 из 100 дней были сделки.'
    }
    if (key === 'NoTrade%') {
        return '65% означает, что стратегия пропускала около 65 из 100 дней.'
    }
    if (key === 'Long%' || key === 'Short%') {
        return 'Long%=70 и Short%=20 при NoTrade%=10 означает сильный уклон стратегии в сделки на рост.'
    }
    if (key === 'Lev avg / min / max' || key === 'Lev p50 / p90') {
        return 'avg=4, p90=9 означает, что в основном плечо умеренное, но в верхнем хвосте стратегия переходит в агрессивный режим.'
    }
    if (key === 'Cap avg / min / max' || key === 'Cap p50 / p90' || key === 'AvgStake%' || key === 'AvgStake$') {
        return 'AvgStake%=12 означает, что в среднем в одной сделке рискуется около 12% от стартового капитала бакета.'
    }
    if (key === 'Exposure% (avg / p50 / p90 / p99 / max)' || key === 'HighExposureTr% (>=20 / 50)') {
        return 'если доля >=50% выросла с 4% до 19%, стратегия стала заметно агрессивнее.'
    }
    if (key === 'DailyTP%' || key === 'DelayedTP%' || key === 'DailySL%' || key === 'DelayedSL%') {
        return 'TP=2.0% и SL=1.0% означает, что на бумаге цель прибыли в 2 раза больше лимита убытка.'
    }
    if (key === 'DynTP / SL Days' || key === 'DynTP / SL Tr') {
        return 'DynTP / SL Tr=120 при Tr=460 означает, что [[dynamic-tp-sl|DYNAMIC risk]] применился только к части сделок, а остальные остались в [[static-tp-sl|STATIC base]].'
    }
    if (key === 'DynGate OK' || key === 'DynGate <Conf' || key === 'DynGate <Samples' || key === 'DynGate <WinRate') {
        return 'DynGate <Samples=180 при DynGate OK=0 означает, что dynamic-слой не применялся из-за нехватки истории в confidence-bucket, а не из-за мёртвого feature.'
    }
    if (key === 'StatTP / SL Days' || key === 'StatTP / SL Tr') {
        return 'StatTP / SL Tr=340 при DynTP / SL Tr=120 показывает, что основная масса сделок прошла без [[dynamic-tp-sl|DYNAMIC risk]]-оверлея.'
    }
    if (key === 'DynTP / SL PnL%' || key === 'StatTP / SL PnL%') {
        return 'DynTP / SL PnL%=14 и StatTP / SL PnL%=6 означает, что основной вклад в доходность дал [[dynamic-tp-sl|DYNAMIC risk]]-срез.'
    }
    if (key === 'Tr') {
        return 'Tr=520 означает, что в этом срезе у этой политики было 520 сделок.'
    }
    if (key === 'TotalPnl$') {
        return 'TotalPnl$=19 000 означает чистую прибыль 19 000 долларов в этом срезе.'
    }
    if (key === 'BucketNow$') {
        return 'BucketNow$=62 000 означает текущий капитал бакета после всех закрытых сделок.'
    }
    if (key === 'MaxDD%' || key === 'MaxDD_NoLiq%' || key === 'MaxDD_Active% / Days' || key === 'MaxDD_Ratio%') {
        return 'MaxDD=41% означает, что в худшей точке капитал падал на 41% от локального максимума.'
    }
    if (key === 'Sharpe' || key === 'Sortino' || key === 'Calmar') {
        return 'Sharpe=1.2 лучше, чем Sharpe=0.6, если сравнение идёт в одном и том же срезе.'
    }
    if (key === 'CAGR%' || key === 'AvgYear%') {
        return 'CAGR%=24 означает средний годовой темп около 24% на выбранном горизонте.'
    }
    if (key === 'WinRate%') {
        return 'WinRate%=58 означает, что прибыльными были 58 из 100 сделок.'
    }
    if (key === 'ProfitFactor') {
        return 'ProfitFactor=1.6 означает, что на каждый 1 доллар суммарного убытка стратегия дала 1.6 доллара суммарной прибыли.'
    }
    if (key === 'PayoffRatio') {
        return 'PayoffRatio=1.4 означает, что средняя прибыльная сделка по проценту примерно в 1.4 раза больше средней убыточной.'
    }
    if (key === 'AvgHit%' || key === 'AvgMiss%') {
        return 'AvgHit%=2.3 и AvgMiss%=-1.7 означает, что средний выигрыш выше среднего проигрыша по модулю.'
    }
    if (key === 'Expectancy%' || key === 'Expectancy$') {
        return 'Expectancy%=0.18 и Expectancy$=34 означает, что одна случайная сделка из этой серии в среднем добавляла около 0.18% и 34 доллара.'
    }
    if (key === 'LongWinRate%' || key === 'ShortWinRate%') {
        return 'LongWinRate%=62 и ShortWinRate%=47 означает, что стратегия заметно лучше работает в LONG, чем в SHORT.'
    }
    if (key === 'BestDay%' || key === 'WorstDay%') {
        return 'BestDay%=5.4 и WorstDay%=-4.1 означает, что лучший день дал +5.4%, а худший день забрал -4.1% той же дневной серии.'
    }
    if (key === 'RetSkew' || key === 'RetKurt') {
        return 'RetSkew=-0.8 и RetKurt=4.7 означает более тяжёлый левый хвост и больше экстремальных дней, чем у нормального распределения.'
    }
    if (key === 'PSR>0%') {
        return 'PSR>0%=93 означает высокую статистическую уверенность, что истинный Sharpe этой серии действительно выше нуля.'
    }
    if (key === 'MinTRL95 SR>0') {
        return 'MinTRL95 SR>0=146 означает, что для 95% доверия к положительному Sharpe нужно не меньше 146 дневных наблюдений.'
    }
    if (key === 'MeanRet%') {
        return 'MeanRet%=0.35 означает, что средняя дневная доходность серии составила +0.35%.'
    }
    if (key === 'StdRet%') {
        return 'StdRet%=1.8 означает, что дневная доходность обычно отклонялась примерно на 1.8 п.п. от своего среднего.'
    }
    if (key === 'DownStd%') {
        return 'DownStd%=1.1 означает, что типичный разброс именно у убыточных дней был около 1.1 п.п.'
    }
    if (key === 'Withdrawn$' || key === 'OnExch$' || key === 'StartCap$') {
        return 'Для отдельного бакета StartCap$ обычно 20 000, для total aggregate обычно 60 000; вместе с Withdrawn$ и OnExch$ это показывает структуру результата в деньгах.'
    }
    if (key === 'HadLiq' || key === 'AccRuin' || key === 'RealLiq#') {
        return 'HadLiq=1 означает, что хотя бы одна позиция была принудительно закрыта биржей.'
    }
    if (key === 'RealLiqLoss$' || key === 'RealLiqLoss%') {
        return 'RealLiqLoss%>0 означает, что strict liquidation уже съела измеримую часть стартового капитала.'
    }
    if (key === 'EODExit_n' || key === 'EODExit%' || key === 'EODExit$' || key === 'EODExit_AvgRet%') {
        return 'EODExit%=42 означает, что 42% сделок закрылись по времени в конце окна, а не по TP/SL.'
    }
    if (
        key === 'LiqBeforeSL_n' ||
        key === 'LiqBeforeSL_BadSL_n' ||
        key === 'LiqBeforeSL_Same1m_n' ||
        key === 'LiqBeforeSL$'
    ) {
        return 'LiqBeforeSL_n=7 означает 7 случаев, когда ликвидация произошла раньше защитного SL.'
    }
    if (key === 'BalMin%' || key === 'BalDead' || key === 'Time<35%') {
        return 'Time<35%=18% означает, что 18% времени капитал находился ниже 35% от стартовой базы.'
    }
    if (
        key === 'Recovered' ||
        key === 'RecovDays' ||
        key === 'RecovSignals' ||
        key === 'ReqGain%' ||
        key === 'DD70_Min%' ||
        key === 'DD70_Recov' ||
        key === 'DD70_RecovDays' ||
        key === 'DD70_n'
    ) {
        return 'RecovDays=140 означает, что после крупной просадки стратегия возвращалась к прошлому пику около 140 дней.'
    }
    if (key === 'HorizonDays' || key === 'AvgDay%' || key === 'AvgWeek%' || key === 'AvgMonth%' || key === 'AvgYear%') {
        return 'AvgMonth%=1.8 означает средний месячный темп около 1.8%, но его всегда нужно сверять с MaxDD.'
    }
    if (
        key === 'Long n' ||
        key === 'Short n' ||
        key === 'Long $' ||
        key === 'Short $' ||
        key === 'AvgLong%' ||
        key === 'AvgShort%'
    ) {
        return 'Long$=14 000 и Short$=-2 000 означает, что прибыль в основном была получена на сделках в сторону роста.'
    }
    if (key === 'Miss') {
        return 'Формат "0 | 18" означает: будних пропусков нет, а 18 выходных дней были штатно исключены из расчёта.'
    }
    if (key === 'inv_liq_mismatch' || key === 'minutes_anomaly') {
        return 'Нормальный сценарий: 0. Любое заметное отклонение — повод перепроверить данные и логику расчёта.'
    }

    return resolveFallbackExampleHint(key)
}

function resolveEnglishTermExampleHintOrNull(key: string): string | null {
    if (key === 'Days') {
        return 'A value of 365 means the calculation covered 365 trading days (excluding weekends).'
    }
    if (key === 'StopReason') {
        return null
    }
    if (key === 'StartDay' || key === 'EndDay') {
        return 'StartDay=2022-01-01 and EndDay=2025-12-31 mean the simulation was read on exactly that date window.'
    }
    if (key === 'Trade%') {
        return '35% means there were trades on 35 out of 100 days.'
    }
    if (key === 'NoTrade%') {
        return '65% means the strategy skipped roughly 65 out of 100 days.'
    }
    if (key === 'Long%' || key === 'Short%') {
        return 'Long%=70 and Short%=20 with NoTrade%=10 mean the strategy is heavily biased toward long entries.'
    }
    if (key === 'Lev avg / min / max' || key === 'Lev p50 / p90') {
        return 'avg=4, p90=9 means leverage is moderate most of the time, but the upper tail shifts into aggressive mode.'
    }
    if (key === 'Cap avg / min / max' || key === 'Cap p50 / p90' || key === 'AvgStake%' || key === 'AvgStake$') {
        return 'AvgStake%=12 means roughly 12% of bucket start capital is risked per trade on average.'
    }
    if (key === 'Exposure% (avg / p50 / p90 / p99 / max)' || key === 'HighExposureTr% (>=20 / 50)') {
        return 'If the >=50% share rises from 4% to 19%, the strategy became materially more aggressive.'
    }
    if (key === 'DailyTP%' || key === 'DelayedTP%' || key === 'DailySL%' || key === 'DelayedSL%') {
        return 'TP=2.0% and SL=1.0% mean the paper profit target is twice the loss limit.'
    }
    if (key === 'DynTP / SL Days' || key === 'DynTP / SL Tr') {
        return 'DynTP / SL Tr=120 with Tr=460 means [[dynamic-tp-sl|DYNAMIC risk]] applied only to part of the trades, while the rest stayed in [[static-tp-sl|STATIC base]].'
    }
    if (key === 'DynGate OK' || key === 'DynGate <Conf' || key === 'DynGate <Samples' || key === 'DynGate <WinRate') {
        return 'DynGate <Samples=180 with DynGate OK=0 means the dynamic layer stayed off because the confidence bucket lacked history, not because the feature was dead.'
    }
    if (key === 'StatTP / SL Days' || key === 'StatTP / SL Tr') {
        return 'StatTP / SL Tr=340 with DynTP / SL Tr=120 shows that most trades ran without the [[dynamic-tp-sl|DYNAMIC risk]] overlay.'
    }
    if (key === 'DynTP / SL PnL%' || key === 'StatTP / SL PnL%') {
        return 'DynTP / SL PnL%=14 and StatTP / SL PnL%=6 mean the main return contribution came from the [[dynamic-tp-sl|DYNAMIC risk]] slice.'
    }
    if (key === 'Tr') {
        return 'Tr=520 means this policy had 520 trades in the selected slice.'
    }
    if (key === 'TotalPnl$') {
        return 'TotalPnl$=19,000 means net profit of 19,000 USD in this slice.'
    }
    if (key === 'BucketNow$') {
        return 'BucketNow$=62,000 means the current bucket capital after all closed trades.'
    }
    if (key === 'MaxDD%' || key === 'MaxDD_NoLiq%' || key === 'MaxDD_Active% / Days' || key === 'MaxDD_Ratio%') {
        return 'MaxDD=41% means capital fell 41% from the local peak at the worst point.'
    }
    if (key === 'Sharpe' || key === 'Sortino' || key === 'Calmar') {
        return 'Sharpe=1.2 is better than Sharpe=0.6 when the comparison is made inside the same slice.'
    }
    if (key === 'CAGR%' || key === 'AvgYear%') {
        return 'CAGR%=24 means the average annualized growth rate is about 24% on the selected horizon.'
    }
    if (key === 'WinRate%') {
        return 'WinRate%=58 means 58 out of 100 trades were profitable.'
    }
    if (key === 'ProfitFactor') {
        return 'ProfitFactor=1.6 means the strategy generated 1.6 dollars of total profit for each 1 dollar of total loss.'
    }
    if (key === 'PayoffRatio') {
        return 'PayoffRatio=1.4 means the average winning trade was about 1.4x larger than the average losing trade in percentage terms.'
    }
    if (key === 'AvgHit%' || key === 'AvgMiss%') {
        return 'AvgHit%=2.3 and AvgMiss%=-1.7 mean the average win is larger than the average loss in absolute size.'
    }
    if (key === 'Expectancy%' || key === 'Expectancy$') {
        return 'Expectancy%=0.18 and Expectancy$=34 mean a random trade from this Policy added about 0.18% and 34 USD on average.'
    }
    if (key === 'LongWinRate%' || key === 'ShortWinRate%') {
        return 'LongWinRate%=62 and ShortWinRate%=47 mean the strategy is materially stronger in LONG than in SHORT.'
    }
    if (key === 'BestDay%' || key === 'WorstDay%') {
        return 'BestDay%=5.4 and WorstDay%=-4.1 mean the best day added 5.4% while the worst day lost 4.1% on the same daily series.'
    }
    if (key === 'RetSkew' || key === 'RetKurt') {
        return 'RetSkew=-0.8 and RetKurt=4.7 mean a heavier left tail and more extreme days than a normal distribution.'
    }
    if (key === 'PSR>0%') {
        return 'PSR>0%=93 means there is high statistical confidence that the true Sharpe of the series is above zero.'
    }
    if (key === 'MinTRL95 SR>0') {
        return 'MinTRL95 SR>0=146 means at least 146 daily observations are needed for 95% confidence that true Sharpe is above zero.'
    }
    if (key === 'MeanRet%') {
        return 'MeanRet%=0.35 means the average daily return of the series was +0.35%.'
    }
    if (key === 'StdRet%') {
        return 'StdRet%=1.8 means daily return usually deviated by about 1.8 p.p. from its mean.'
    }
    if (key === 'DownStd%') {
        return 'DownStd%=1.1 means the typical spread of losing days was about 1.1 p.p.'
    }
    if (key === 'Withdrawn$' || key === 'OnExch$' || key === 'StartCap$') {
        return 'For a single bucket StartCap$ is usually 20,000, while total aggregate is usually 60,000; together with Withdrawn$ and OnExch$ this shows the money structure of the result.'
    }
    if (key === 'HadLiq' || key === 'AccRuin' || key === 'RealLiq#') {
        return 'HadLiq=1 means at least one position was force-closed by the exchange.'
    }
    if (key === 'RealLiqLoss$' || key === 'RealLiqLoss%') {
        return 'RealLiqLoss%>0 means strict liquidation already consumed a measurable share of start capital.'
    }
    if (key === 'EODExit_n' || key === 'EODExit%' || key === 'EODExit$' || key === 'EODExit_AvgRet%') {
        return 'EODExit%=42 means 42% of trades were closed by time at end of window, not by TP/SL.'
    }
    if (
        key === 'LiqBeforeSL_n' ||
        key === 'LiqBeforeSL_BadSL_n' ||
        key === 'LiqBeforeSL_Same1m_n' ||
        key === 'LiqBeforeSL$'
    ) {
        return 'LiqBeforeSL_n=7 means there were 7 cases where liquidation happened before the protective SL.'
    }
    if (key === 'BalMin%' || key === 'BalDead' || key === 'Time<35%') {
        return 'Time<35%=18% means capital spent 18% of the time below 35% of its start baseline.'
    }
    if (
        key === 'Recovered' ||
        key === 'RecovDays' ||
        key === 'RecovSignals' ||
        key === 'ReqGain%' ||
        key === 'DD70_Min%' ||
        key === 'DD70_Recov' ||
        key === 'DD70_RecovDays' ||
        key === 'DD70_n'
    ) {
        return 'RecovDays=140 means the strategy needed about 140 days to return to its previous peak after a major drawdown.'
    }
    if (key === 'HorizonDays' || key === 'AvgDay%' || key === 'AvgWeek%' || key === 'AvgMonth%' || key === 'AvgYear%') {
        return 'AvgMonth%=1.8 means the average monthly pace is about 1.8%, but it must always be checked against MaxDD.'
    }
    if (
        key === 'Long n' ||
        key === 'Short n' ||
        key === 'Long $' ||
        key === 'Short $' ||
        key === 'AvgLong%' ||
        key === 'AvgShort%'
    ) {
        return 'Long$=14,000 and Short$=-2,000 mean profit came mainly from upward trades.'
    }
    if (key === 'Miss') {
        return 'The format "0 | 18" means: no weekday misses, while 18 weekend days were excluded by the normal weekend rule.'
    }
    if (key === 'inv_liq_mismatch' || key === 'minutes_anomaly') {
        return 'Normal case: 0. Any visible deviation is a reason to recheck both data and calculation logic.'
    }

    return resolveEnglishFallbackExampleHint(key)
}

interface PolicyBranchMegaManualTranslation {
    description: string
    readingHint?: string
    example?: string | null
}

const POLICY_BRANCH_MEGA_MANUAL_EN: Record<string, PolicyBranchMegaManualTranslation> = {
    Days: {
        description: 'Total trading days in this policy/branch slice (trade and no-trade days).',
    },
    StartDay: {
        description: 'First UTC day key of the analyzed period.',
    },
    EndDay: {
        description: 'Last UTC day key of the analyzed period.',
    },
    StopReason: {
        description:
            'Why the series ended.\n\n- End of period: the test reached the final day of the window. That is the normal and healthy completion path.\n- Liquidation (early stop): the exchange force-closed a position because loss became critical.\n- Early stop without liquidation: the exchange did not force-close the trade, but the working balance was destroyed by a sequence of losses and the ruin scenario (AccRuin) fired.',
    },
    Miss: {
        description:
            'Missing days inside the working period in "weekday | weekend" format. The left side shows weekday gaps when required daily records or the day-level decision log are missing for calculation. The right side shows weekend gaps, which are intentionally excluded from this model and are not treated as errors.',
    },
    'Trade%': {
        description:
            'Share of days with a real trade: TradeDays / Days * 100. A day counts as a trading day only after all filters are passed: a valid direction exists, the policy-level skip rule did not fire, capital share per trade is above 0, and entry is not blocked by the risk filter.',
    },
    'Long%': {
        description: COMMON_LONG_SHARE_DESCRIPTION_EN,
    },
    'Short%': {
        description: COMMON_SHORT_SHARE_DESCRIPTION_EN,
    },
    'NoTrade%': {
        description: COMMON_NO_TRADE_SHARE_DESCRIPTION_EN,
    },
    'RiskDay%': {
        description: COMMON_RISK_DAY_SHARE_DESCRIPTION_EN,
    },
    'AntiD%': {
        description: COMMON_ANTI_D_SHARE_DESCRIPTION_EN,
    },
    'AntiD|Risk%': {
        description: 'Anti-direction application rate inside risk days only.',
    },
    'Lev avg / min / max': {
        description: 'Average, minimum, and maximum leverage used on trade days.',
    },
    'Lev p50 / p90': {
        description: 'Leverage distribution quantiles on trade days: median (p50) and upper tail (p90).',
    },
    'Cap avg / min / max': {
        description: COMMON_CAP_AVG_MIN_MAX_DESCRIPTION_EN,
    },
    'Cap p50 / p90': {
        description: COMMON_CAP_P50_P90_DESCRIPTION_EN,
    },
    CapAp: {
        description: 'Count of days where cap filter was applied and trade was executed.',
    },
    CapSk: {
        description: 'Count of days skipped because capital share per trade disabled entry.',
    },
    'AvgStake%': {
        description: 'Average margin per trade in percent of total start capital.',
    },
    AvgStake$: {
        description: 'Average margin per trade in USD.',
    },
    'Exposure% (avg / p50 / p90 / p99 / max)': {
        description: 'Trade-level exposure distribution in %: avg, p50, p90, p99, max.',
    },
    'HighExposureTr% (>=20 / 50)': {
        description: 'Share of trades with high exposure thresholds: >=20% and >=50%.',
    },
    'DailyTP%': {
        description: 'Daily TP threshold distribution (avg/min/max), in % from entry.',
    },
    'DailySL%': {
        description: 'Daily SL threshold distribution (avg/min/max), in % from entry.',
    },
    'DynTP / SL Days': {
        description: 'Unique days where the DYNAMIC risk overlay was actually applied.',
    },
    'DynTP / SL Tr': {
        description: 'Trades where the DYNAMIC risk overlay was actually applied.',
    },
    'DynTP / SL PnL%': {
        description: 'PnL contribution from DYNAMIC risk trades, in % of StartCap$.',
    },
    'DynGate OK': {
        description: 'Checked days that passed the historical-evidence gate and were allowed to use DYNAMIC risk.',
    },
    'DynGate <Conf': {
        description: 'Checked days blocked because model confidence stayed below the minimum gate.',
    },
    'DynGate <Samples': {
        description: 'Checked days blocked because the confidence bucket had too few historical samples.',
    },
    'DynGate <WinRate': {
        description: 'Checked days blocked because the confidence bucket win-rate stayed below the minimum threshold.',
    },
    'StatTP / SL Days': {
        description: 'Unique days where trades stayed in STATIC base mode without dynamic overlay.',
    },
    'StatTP / SL Tr': {
        description: 'Trades that stayed in STATIC base mode without dynamic overlay.',
    },
    'StatTP / SL PnL%': {
        description: 'PnL contribution from STATIC base trades, in % of StartCap$.',
    },
    'DelayedTP%': {
        description: 'Average delayed-entry TP threshold, % from entry.',
    },
    'DelayedSL%': {
        description: 'Average delayed-entry SL threshold, % from entry.',
    },
    Tr: {
        description: 'Total number of trades in this Policy.',
    },
    TotalPnl$: {
        description:
            'TotalPnl$ is the money result of the selected slice.\n\nFormula:\nTotalPnl$ = ([[current-balance|current balance]] + [[withdrawn-profit|withdrawn profit]]) - [[start-cap|starting capital]].\n\nWhat it shows:\n1) this is the absolute result in money, not a percentage;\n2) positive means profit, negative means loss.\n\nHow to read it:\n1) the column matters when the business needs the real dollar scale of the effect, not only relative return;\n2) comparison across rows is only fair together with [[start-cap|starting capital]], because the same percentage can hide very different money size.',
    },
    BucketNow$: {
        description: 'Current capital of selected bucket after all closed trades.',
    },
    'MaxDD%': {
        description:
            'Maximum drawdown of active equity on the 1m price path, in %.\n\nIt captures the deepest capital drop from a local peak to the worst point reached inside open or already closed trades.\n\nIn NO BIGGEST LIQ LOSS it is recalculated after removing one largest liquidation.',
    },
    'MaxDD_NoLiq%': {
        description: 'Maximum drawdown excluding liquidation effects, in %.',
    },
    'MaxDD_Active% / Days': {
        description:
            'MaxDD_Active% / Days is a two-part metric for the single worst drawdown episode of the [[active-equity|active equity]] curve.\n\nWhat it shows:\nthe first value is drawdown depth: how far active equity fell from the prior local peak to the trough. The second value is the duration of that same episode in calendar days: from that peak to recovery of the old peak, or to the last point of the selected period if recovery never happened.\n\nHow to read it:\nthis metric answers both how deep the worst active drawdown was and how long capital stayed below its old high-water mark. It can differ from [[drawdown|MaxDD%]] because it is computed on the sum of live bucket balances after trade exits, not on the wealth curve used by the PnL engine.\n\nExample:\n42.7 / 181 means the worst active-equity drawdown was 42.7%, and that same worst episode lasted 181 calendar days.',
    },
    Sharpe: {
        description: 'Sharpe ratio for this Policy.',
    },
    Sortino: {
        description: 'Sortino ratio for this Policy.',
    },
    Calmar: {
        description: 'Calmar ratio for this Policy.',
    },
    'CAGR%': {
        description: 'Compound annual growth rate, in %.',
    },
    'WinRate%': {
        description: 'Share of profitable trades, in %.',
    },
    ProfitFactor: {
        description: 'Profit factor = sum of positive NetPnl$ / abs(sum of negative NetPnl$).',
    },
    PayoffRatio: {
        description: 'Payoff ratio = abs(AvgHit% / AvgMiss%).',
    },
    'AvgHit%': {
        description: 'Average NetReturnPct of profitable trades only.',
    },
    'AvgMiss%': {
        description: 'Average NetReturnPct of losing trades only.',
    },
    'Expectancy%': {
        description: 'Average NetReturnPct across all trades.',
    },
    Expectancy$: {
        description: 'Average NetPnl$ across all trades.',
    },
    'LongWinRate%': {
        description: 'Share of profitable LONG trades, in %.',
    },
    'ShortWinRate%': {
        description: 'Share of profitable SHORT trades, in %.',
    },
    'BestDay%': {
        description: 'Best daily return of the same series used for Sharpe/Sortino/Calmar/CAGR.',
    },
    'WorstDay%': {
        description: 'Worst daily return of the same series used for Sharpe/Sortino/Calmar/CAGR.',
    },
    RetSkew: {
        description: 'Skewness of the daily return series.',
    },
    RetKurt: {
        description: 'Non-excess kurtosis of the daily return series (normal = 3).',
    },
    'PSR>0%': {
        description: 'Probabilistic Sharpe Ratio against the threshold true SR > 0, in %.',
    },
    'MinTRL95 SR>0': {
        description: 'Minimum Track Record Length needed for 95% confidence that true SR > 0.',
    },
    'MeanRet%': {
        description:
            'Average daily return of the same day-level series used for Sharpe, Sortino, Calmar, and CAGR. All trades from the same day are first combined into one daily result, then the mean is taken across days. Reported in %.',
    },
    'StdRet%': {
        description: 'Standard deviation of returns, in %.',
    },
    'DownStd%': {
        description: 'Downside standard deviation of returns, in %.',
    },
    'MaxDD_Ratio%': {
        description:
            'Maximum drawdown on the [[ratio-curve|ratio curve]]: the drop of visible wealth from local peak to trough on the daily series.\n\nThis value can match [[drawdown|MaxDD%]] when the daily visible-wealth series and the main wealth base produce the same depth of decline. The column keeps ratio-curve drawdown next to Sharpe, Sortino, Calmar, and CAGR as part of one daily ratio block.',
    },
    Withdrawn$: {
        description: 'Total withdrawn profit in USD.',
    },
    OnExch$: {
        description: 'Capital still on exchange in USD.',
    },
    StartCap$: {
        description: 'Start capital baseline in USD for this Policy.',
    },
    HadLiq: {
        description:
            'HadLiq tracks liquidation events in this Policy.\n\nFor one bucket-specific Policy it is rendered as "No" or "Yes". "Yes" means at least one position was force-closed by the exchange.\n\nFor total aggregate it can represent how many buckets among daily / intraday / delayed suffered liquidation.\n\nThis is an аварийный risk metric: even one liquidation can erase the profit of many normal days.',
    },
    AccRuin: {
        description:
            'AccRuin is the ruin metric of the working bucket capital.\n\nA bucket is considered ruined when it is explicitly marked as dead or when EquityNow / StartCapital falls to 20% or below, which means 80% or more of the start capital was lost.\n\nFor one bucket-specific Policy it is rendered as "No, the bucket is still alive" or "Yes, the bucket exhausted its starting capital". For total aggregate it can show how many buckets were ruined.\n\nThis is stricter than ordinary drawdown: ruin means the strategy is no longer operational on that capital base.',
    },
    'RealLiq#': {
        description:
            'How many trades strictly reached the backtest [[liquidation|liquidation]] level.\n\nThis is a strict liquidation-touch counter, not a direct statement about how much capital each event economically destroyed. Read the capital effect through RealLiqLoss$, PnL, drawdown, and the balance metrics of the same row.',
    },
    'RealLiqLoss$': {
        description:
            'Total actual capital loss in USD only from strict liquidation-touch trades.\n\nOwner formula: sum only the negative visible-wealth deltas of trades with strict liquidation. This is already the economic effect, not just an event counter.',
    },
    'RealLiqLoss%': {
        description:
            'Share of strict liquidation losses relative to StartCap$.\n\nFormula: RealLiqLoss$ / StartCap$ * 100. This metric shows how much of the starting capital was actually consumed by strict liquidation events.',
    },
    EODExit_n: {
        description: 'Number of trades closed by EndOfDay.',
    },
    'EODExit%': {
        description: 'Share of trades closed by EndOfDay: EODExit_n / Tr * 100.',
    },
    EODExit$: {
        description: 'Sum of NetPnl$ for EndOfDay exits only.',
    },
    'EODExit_AvgRet%': {
        description: 'Average NetRet% for EndOfDay exits only.',
    },
    LiqBeforeSL_n: {
        description: 'Cases where liquidation happened before SL trigger.',
    },
    LiqBeforeSL_BadSL_n: {
        description: 'Subset of LiqBeforeSL_n where SL level was beyond liquidation level.',
    },
    LiqBeforeSL_Same1m_n: {
        description: 'Subset of LiqBeforeSL_n where SL and liquidation touched in the same 1m candle.',
    },
    LiqBeforeSL$: {
        description: 'Total NetPnl$ of trades where liquidation happened before SL.',
    },
    'BalMin%': {
        description: 'Lowest active equity reached on the 1m price path, as % of StartCap$.',
    },
    BalDead: {
        description: 'Flag showing equity dropped below balance-death threshold.',
    },
    Recovered: {
        description:
            'Recovered is the recovery flag after the MaxDD episode on active equity.\n\nThe check is simple: after the MaxDD bottom, the current balance must return to the peak that existed before that drawdown.\n\ntrue means the old peak was regained; false means the series ended without full recovery.',
    },
    RecovDays: {
        description:
            'Calendar days from the MaxDD bottom to the moment when balance returns to the peak before that drawdown.\n\nIf recovery never happened, the raw calculation keeps -1 and the table renders an empty / unavailable marker instead.\n\nThis metric shows not only whether recovery exists, but also how long the business has to wait for it.',
    },
    RecovSignals: {
        description: 'Trade-day count needed for recovery after MaxDD.',
    },
    'Time<35%': {
        description: 'Time spent with equity below 35% of StartCap$, measured in days.',
    },
    'ReqGain%': {
        description:
            'Required gain from the MaxDD bottom to return to the peak before that drawdown.\n\nFormula: ReqGain% = (1 / (1 - MaxDD) - 1) * 100.\n\nInterpretation is direct: the lower the value, the more realistic the recovery. 100%+ already means a heavy comeback requirement, and 200%+ is extremely demanding.',
    },
    'DD70_Min%': {
        description: 'Minimum equity in deepest episode where equity fell below 70% of start.',
    },
    DD70_Recov: {
        description: 'Whether equity recovered above 70% after deepest DD<70% episode.',
    },
    DD70_RecovDays: {
        description: 'Calendar days to recover above 70% after deepest DD<70% episode.',
    },
    DD70_n: {
        description: 'Count of episodes where equity dropped below 70% of start.',
    },
    HorizonDays: {
        description: 'Calendar length of simulation horizon in days.',
    },
    'AvgDay%': {
        description: 'Geometric average daily return, in %.',
    },
    'AvgWeek%': {
        description: 'Geometric average weekly return, in %.',
    },
    'AvgMonth%': {
        description: 'Geometric average monthly return, in %.',
    },
    'AvgYear%': {
        description: 'Geometric average annual return, in %.',
    },
    'Long n': {
        description: 'Number of LONG trades.',
    },
    'Short n': {
        description: 'Number of SHORT trades.',
    },
    'Long $': {
        description: 'Total PnL contribution of LONG trades, in USD.',
    },
    'Short $': {
        description: 'Total PnL contribution of SHORT trades, in USD.',
    },
    'AvgLong%': {
        description: 'Average return per LONG trade, in %.',
    },
    'AvgShort%': {
        description: 'Average return per SHORT trade, in %.',
    },
    inv_liq_mismatch: {
        description: 'Diagnostic count of liquidation-invariant mismatches. Should be zero.',
    },
    minutes_anomaly: {
        description: 'Diagnostic count of minute-level data anomalies. Should be zero in healthy datasets.',
    }
}

function resolveManualEnglishTermTranslation(key: string): PolicyBranchMegaManualTranslation {
    const translation = POLICY_BRANCH_MEGA_MANUAL_EN[key]
    if (!translation) {
        throw new Error(`[policy-branch-mega] manual en translation is missing for term=${key}.`)
    }

    if (!translation.description) {
        throw new Error(`[policy-branch-mega] manual en translation is empty for term=${key}.`)
    }

    return translation
}

function resolveEnglishTermContent(key: string): PolicyBranchMegaResolvedLocaleContent {
    if (POLICY_BRANCH_MEGA_SHARED_COMMON_TERM_KEYS.has(key)) {
        const sharedDescription = resolveCommonReportColumnTooltipOrNull(key, 'en')
        if (!sharedDescription) {
            throw new Error(`[policy-branch-mega] shared common en tooltip is missing for term=${key}.`)
        }

        return {
            description: sharedDescription,
            readingHint: '',
            example: null,
        }
    }

    const translation = resolveManualEnglishTermTranslation(key)

    return {
        description: translation.description,
        readingHint: translation.readingHint ?? resolveEnglishTermReadingHintOrDefault(key),
        example:
            typeof translation.example === 'undefined' ? resolveEnglishTermExampleHintOrNull(key) : translation.example,
    }
}

function resolveRuTermContent(
    term: PolicyBranchMegaTermDraft,
    key: string
): PolicyBranchMegaResolvedLocaleContent {
    if (POLICY_BRANCH_MEGA_SHARED_COMMON_TERM_KEYS.has(key)) {
        const sharedDescription = resolveCommonReportColumnTooltipOrNull(key, 'ru')
        if (!sharedDescription) {
            throw new Error(`[policy-branch-mega] shared common ru tooltip is missing for term=${key}.`)
        }

        return {
            description: sharedDescription,
            readingHint: '',
            example: null
        }
    }

    if (!term.description || term.description.trim().length === 0) {
        throw new Error(`[policy-branch-mega] description is empty for term=${key}.`)
    }

    return {
        description: term.description,
        readingHint: resolveTermReadingHintOrDefault(key),
        example: resolveTermExampleHintOrNull(key)
    }
}

function resolvePolicyBranchMegaTermContent(
    term: PolicyBranchMegaTermDraft,
    key: string,
    locale: PolicyBranchMegaTermLocale
): PolicyBranchMegaResolvedLocaleContent {
    return locale === 'en' ? resolveEnglishTermContent(key) : resolveRuTermContent(term, key)
}

function buildUserFacingTermDescription(
    term: PolicyBranchMegaTermDraft,
    key: string,
    locale: PolicyBranchMegaTermLocale
): string {
    const content = resolvePolicyBranchMegaTermContent(term, key, locale)
    const base = normalizeLocaleAwareTermBlock(content.description, locale)
    const reading = normalizeLocaleAwareTermBlock(content.readingHint, locale)
    const exampleBlock =
        typeof content.example === 'string' && content.example.trim().length > 0 ?
            normalizeLocaleAwareTermBlock(`${resolveExampleLabel(locale)}: ${content.example}`, locale)
        :   ''
    const readingBlock = reading.length > 0 ? `${resolveReadingLabel(locale)}: ${reading}` : ''
    const blocks = [base, readingBlock, exampleBlock].filter((block): block is string => Boolean(block))

    return blocks.join('\n\n')
}

function resolvePolicyBranchMegaTermDraft(key: string): PolicyBranchMegaTermDraft {
    const commonTerm = POLICY_BRANCH_MEGA_COMMON_TERM_DRAFTS[key]
    if (commonTerm) {
        return commonTerm
    }

    const term = TERMS[key]
    if (!term) {
        throw new Error(`[policy-branch-mega] unknown column term: ${key}`)
    }

    return term
}

export function getPolicyBranchMegaTerm(
    title: string,
    options?: PolicyBranchMegaTermResolveOptions
): PolicyBranchMegaTermDefinition {
    const key = normalizeTermKey(title ?? '')
    if (!key) {
        throw new Error('[policy-branch-mega] column title is empty.')
    }

    const term = resolvePolicyBranchMegaTermDraft(key)

    const locale = options?.locale ?? 'ru'
    const resolvedDescription = buildUserFacingTermDescription(term, key, locale)

    return {
        key: term.key,
        title: term.title,
        description: resolvedDescription,
        tooltip: resolvedDescription
    }
}

export function buildPolicyBranchMegaTermReferencesForColumns(columns: string[]): PolicyBranchMegaTermReference[] {
    if (!columns || columns.length === 0) {
        throw new Error('[policy-branch-mega] columns list is empty.')
    }

    const normalizedColumns = columns.map(column => normalizeTermKey(column ?? ''))
    const normalizedSet = new Set(normalizedColumns.filter(Boolean))
    const resolved: PolicyBranchMegaTermReference[] = []

    normalizedColumns.forEach((column, index) => {
        if (!column) {
            throw new Error(`[policy-branch-mega] column at index=${index} is empty.`)
        }

        const primaryKey = MERGED_SECONDARY_TO_PRIMARY.get(column)
        if (primaryKey && normalizedSet.has(primaryKey)) {
            return
        }

        const term = resolvePolicyBranchMegaTermDraft(column)
        const secondaryKey = MERGED_PRIMARY_TO_SECONDARY.get(column)
        const hasSecondaryPair = Boolean(secondaryKey && normalizedSet.has(secondaryKey))
        const mergedTitle = hasSecondaryPair ? (MERGED_PRIMARY_TITLE_BY_KEY.get(column) ?? term.title) : term.title

        resolved.push({
            key: term.key,
            title: mergedTitle
        })
    })

    return resolved
}

export function orderPolicyBranchMegaSections(sections: TableSectionDto[]): TableSectionDto[] {
    if (!sections || sections.length === 0) {
        throw new Error('[policy-branch-mega] report has no sections.')
    }

    const megaSections = sections.filter(section => isPolicyBranchMegaTitle(section.title))
    if (megaSections.length === 0) {
        throw new Error('[policy-branch-mega] no Policy Branch Mega sections found.')
    }

    const enriched = megaSections.map((section, index) => ({
        section,
        part: extractMegaPartNumber(section.title),
        mode: resolveMegaModeKey(section.title),
        metric: resolvePolicyBranchMegaMetricFromTitle(section.title),
        bucket: resolvePolicyBranchMegaBucketFromTitle(section.title),
        index
    }))
    if (enriched.some(item => item.mode === 'UNKNOWN')) {
        const titles = enriched.map(item => item.section.title).join(' | ')
        throw new Error(`[policy-branch-mega] unknown mega mode in titles: ${titles}`)
    }

    if (enriched.some(item => item.metric === null)) {
        const titles = enriched.map(item => item.section.title).join(' | ')
        throw new Error(`[policy-branch-mega] unknown mega metric in titles: ${titles}`)
    }

    return enriched
        .sort((a, b) => {
            const modeOrder = resolveMegaModeOrder(a.mode) - resolveMegaModeOrder(b.mode)
            if (modeOrder !== 0) return modeOrder

            const metricOrder = resolveMegaMetricOrder(a.metric) - resolveMegaMetricOrder(b.metric)
            if (metricOrder !== 0) return metricOrder

            const bucketOrder = resolveMegaBucketOrder(a.bucket) - resolveMegaBucketOrder(b.bucket)
            if (bucketOrder !== 0) return bucketOrder

            if (a.part !== null && b.part !== null) return a.part - b.part
            if (a.part !== null) return -1
            if (b.part !== null) return 1
            return a.index - b.index
        })
        .map(item => item.section)
}
export function buildPolicyBranchMegaTermsForColumns(
    columns: string[],
    options?: PolicyBranchMegaTermResolveOptions
): PolicyBranchMegaTermDefinition[] {
    if (!columns || columns.length === 0) {
        throw new Error('[policy-branch-mega] columns list is empty.')
    }

    const normalizedColumns = columns.map(column => normalizeTermKey(column ?? ''))
    const normalizedSet = new Set(normalizedColumns.filter(Boolean))

    const resolved: PolicyBranchMegaTermDefinition[] = []

    normalizedColumns.forEach((column, index) => {
        if (!column) {
            throw new Error(`[policy-branch-mega] column at index=${index} is empty.`)
        }

        const primaryKey = MERGED_SECONDARY_TO_PRIMARY.get(column)
        if (primaryKey && normalizedSet.has(primaryKey)) {
            return
        }

        const term = getPolicyBranchMegaTerm(column, options)
        const secondaryKey = MERGED_PRIMARY_TO_SECONDARY.get(column)
        const hasSecondaryPair = Boolean(secondaryKey && normalizedSet.has(secondaryKey))
        const mergedTitle = hasSecondaryPair ? (MERGED_PRIMARY_TITLE_BY_KEY.get(column) ?? column) : column

        resolved.push({
            ...term,
            title: mergedTitle
        })
    })

    return resolved
}
export function resolvePolicyBranchMegaSectionDescription(
    title: string | undefined,
    locale: PolicyBranchMegaTermLocale = 'ru'
): string | null {
    const normalized = normalizePolicyBranchMegaTitle(title)
    if (!normalized) return null

    const upper = normalized.toUpperCase()
    const mode = resolveMegaModeKey(normalized)
    const metric = resolvePolicyBranchMegaMetricFromTitle(normalized)
    const modePrefix =
        mode === 'NO SL' ? 'NO SL: '
        : mode === 'WITH SL' ? 'WITH SL: '
        : ''
    const metricPrefix = metric === 'no-biggest-liq-loss' ? 'NO BIGGEST LIQ LOSS: ' : 'REAL: '
    const prefix = `${modePrefix}${metricPrefix}`

    if (upper.includes('PART 1/4')) {
        if (locale === 'en') {
            return `${prefix}Part 1/4: baseline summary for activity, risk days, leverage/cap usage and core PnL metrics (up to MaxDD_Ratio%).`
        }

        return `${prefix}Часть 1/4: базовая сводка по дням, риск‑дням, плечу/кап‑доле и ключевым PnL‑метрикам (до MaxDD_Ratio%).`
    }

    if (upper.includes('PART 2/4')) {
        if (locale === 'en') {
            return `${prefix}Part 2/4: balance and recovery metrics (Withdrawn/OnExch, liquidations, recovery, DD70).`
        }

        return `${prefix}Часть 2/4: балансные и восстановительные метрики (Withdrawn/OnExch, ликвидации, recovery, DD70).`
    }

    if (upper.includes('PART 3/4')) {
        if (locale === 'en') {
            return `${prefix}Part 3/4: horizon and average growth rates, long/short split and diagnostic counters.`
        }

        return `${prefix}Часть 3/4: горизонт и средние темпы роста, разрез long/short и диагностические счётчики.`
    }

    if (upper.includes('PART 4/4')) {
        if (locale === 'en') {
            return `${prefix}Part 4/4: trade-derived and advanced daily-series metrics (ProfitFactor, Expectancy, Best/Worst day, PSR, MinTRL).`
        }

        return `${prefix}Часть 4/4: trade-derived и advanced daily-series метрики (ProfitFactor, Expectancy, Best/Worst day, PSR, MinTRL).`
    }

    return null
}
