import type { TableSectionDto } from '@/shared/types/report.types'
import {
    normalizePolicyBranchMegaTitle,
    resolvePolicyBranchMegaBucketFromTitle,
    resolvePolicyBranchMegaMetricFromTitle
} from '@/shared/utils/policyBranchMegaTabs'

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

export const POLICY_BRANCH_MEGA_TOOLTIP_FROM_DESCRIPTION = '__POLICY_BRANCH_MEGA_TOOLTIP_FROM_DESCRIPTION__' as const
type PolicyBranchMegaTooltipDraft = string | typeof POLICY_BRANCH_MEGA_TOOLTIP_FROM_DESCRIPTION
export type PolicyBranchMegaTooltipResolutionMode = 'description' | 'draft'
export type PolicyBranchMegaTermLocale = 'ru' | 'en'
export interface PolicyBranchMegaTermResolveOptions {
    tooltipMode?: PolicyBranchMegaTooltipResolutionMode
    locale?: PolicyBranchMegaTermLocale
}

interface PolicyBranchMegaTermDraft {
    key: string
    title: string
    description: string
    tooltip?: PolicyBranchMegaTooltipDraft
}

interface PolicyBranchMegaResolvedLocaleContent {
    description: string
    readingHint: string
    example: string | null
    tooltip: string
}

export function resolvePolicyBranchMegaTermLocale(language: string | null | undefined): PolicyBranchMegaTermLocale {
    const normalized = (language ?? '').trim().toLowerCase()
    return normalized.startsWith('ru') ? 'ru' : 'en'
}

const MEGA_TITLE_MARKER = 'Policy Branch Mega'
// Дефолтный режим для Mega: tooltip всегда полный и совпадает с description.
const POLICY_BRANCH_MEGA_DEFAULT_TOOLTIP_MODE: PolicyBranchMegaTooltipResolutionMode = 'description'
const TERMS: Record<string, PolicyBranchMegaTermDraft> = {
    Policy: {
        key: 'Policy',
        title: 'Policy',
        description:
            'Имя торговой политики. Политика — это набор правил: когда открывать позицию, какое действие выбирать в этот день (LONG, SHORT или без сделки), каким размером входить, какое плечо использовать и где задаются stop-loss/take-profit.\n\nДень пропускается, если не выполнены условия входа (например: нет направления сигнала, сработал policy-skip, включился риск-фильтр или cap fraction = 0).\n\nНазвание Policy обозначает конфигурацию входа, выхода и риска.',
        tooltip: POLICY_BRANCH_MEGA_TOOLTIP_FROM_DESCRIPTION
    },
    Branch: {
        key: 'Branch',
        title: 'Branch',
        description:
            'Branch — сценарий исполнения одной и той же Policy.\n\nBASE:\nиспользуется исходное направление сигнала дня без инверсии (LONG остаётся LONG, SHORT остаётся SHORT).\n\nANTI-D:\nкаждый день проверяется правило anti-direction. Если правило сработало, направление принудительно меняется на противоположное (LONG -> SHORT, SHORT -> LONG).\n\nОдин из обязательных фильтров anti-direction:\nMinMove в рабочем диапазоне (0.5%-12%).\n\nЗачем это сравнение:\nпо паре BASE vs ANTI-D видно, снижает ли инверсия риск на стрессовых днях без критической потери доходности.',
        tooltip:
            'Branch — сценарий исполнения одной и той же Policy.\n\nBASE: исходное направление без инверсии.\n\nANTI-D: при срабатывании anti-direction направление меняется на противоположное.\n\nMinMove-фильтр: рабочий диапазон (0.5%-12%).'
    },
    'SL Mode': {
        key: 'SL Mode',
        title: 'SL Mode',
        description:
            'SL Mode — переключатель механики выхода из сделки.\n\nWITH SL: защитный стоп-лосс включён. Сделка может закрыться раньше конца окна по стоп-лоссу, тейк-профиту или ликвидации; если этого не произошло, в конце дня срабатывает EndOfDay.\n\nNO SL: защитный стоп-лосс отключён. Сделка остаётся открытой до тейк-профита, ликвидации или EndOfDay.\n\nРиск NO SL: для isolated-маржи это повышает шанс потерять весь залог сделки.\n\nДля cross-маржи это повышает шанс потерять весь баланс бакета.\n\nПочему? (NO SL)',
        tooltip: 'Режим расчёта строки: WITH SL или NO SL.'
    },
    Days: {
        key: 'Days',
        title: 'Days',
        description:
            'Количество торговых дней периода по данной политике и ветке. Включает дни со сделкой и дни без сделки. Выходные (суббота и воскресенье) в метрику не входят: модели на них не обучались и сделки по ним не моделируются. Почему? (выходные)',
        tooltip: 'Сколько торговых дней было в расчёте (без выходных).'
    },
    StartDay: {
        key: 'StartDay',
        title: 'StartDay',
        description:
            'StartDay + EndDay — границы периода в формате UTC day-key.\n\nStartDay — первая дата окна, EndDay — последняя дата окна (или дата ранней остановки).\n\nМетрика нужна, чтобы сравнивать стратегии только на одном и том же интервале.',
        tooltip: 'Первая дата периода (UTC).'
    },
    EndDay: {
        key: 'EndDay',
        title: 'EndDay',
        description:
            'EndDay — последняя дата периода в формате UTC day-key. При ранней остановке фиксируется дата остановки.',
        tooltip: 'Последняя дата периода (UTC).'
    },
    StopReason: {
        key: 'StopReason',
        title: 'StopReason',
        description:
            'Почему серия закончилась.\n\nДо конца периода:\nтест дошёл до последнего дня окна. Это штатный и хороший сценарий завершения.\n\nЛиквидация (ранний stop):\nбиржа принудительно закрыла позицию из-за критического убытка.\n\nРанний stop без ликвидации:\nпринудительного закрытия биржей не было; рабочий баланс был потерян серией убыточных сделок, и сработал сценарий руины (AccRuin).',
        tooltip: 'Почему период завершился именно здесь.'
    },
    Miss: {
        key: 'Miss',
        title: 'Miss',
        description:
            'Пропуски внутри [StartDay..EndDay] в формате "будни | выходные". Слева — невыходные пропуски (проблема покрытия данных: отсутствуют нужные дневные записи/trace для расчёта), справа — пропуски выходных (weekend-skip); выходные здесь пропускаются по дизайну и считаются нормальным поведением, а не ошибкой.',
        tooltip: 'Пропуски: "будни | выходные" (например, "0 | 21").'
    },
    'Trade%': {
        key: 'Trade%',
        title: 'Trade%',
        description:
            'Доля дней с реальной сделкой: TradeDays / Days * 100. День считается торговым только после всех фильтров: есть валидное направление, не сработал policy-skip, cap fraction больше 0 и вход не заблокирован риск-фильтром.',
        tooltip: 'Процент торговых дней.'
    },
    'Long%': {
        key: 'Long%',
        title: 'Long%',
        description:
            'Long% + Short% — распределение дней по направлению входа.\n\nLong% = LongDays / Days * 100,\nShort% = ShortDays / Days * 100.\n\nСумма Long% и Short% может быть меньше 100%: остаток приходится на дни без входа (NoTrade%).\n\nЧем выше Long%, тем сильнее смещение в сделки на рост; чем выше Short%, тем сильнее смещение в сделки на падение.',
        tooltip: 'Процент дней с LONG.'
    },
    'Short%': {
        key: 'Short%',
        title: 'Short%',
        description:
            'Доля дней, где стратегия открывала SHORT-позиции. Чем выше значение, тем сильнее стратегия смещена в сделки на падение. Читается как ShortDays / Days * 100.',
        tooltip: 'Процент дней с SHORT.'
    },
    'NoTrade%': {
        key: 'NoTrade%',
        title: 'NoTrade%',
        description:
            'Доля дней без сделки: NoTradeDays / Days * 100. Сюда попадают дни без направления, policy‑skip, риск‑фильтры и дни, где cap fraction оказался 0.',
        tooltip: 'Процент дней без сделки.'
    },
    'RiskDay%': {
        key: 'RiskDay%',
        title: 'RiskDay%',
        description:
            'Доля дней, которые SL‑модель пометила как рискованные: RiskDays / Days * 100. Если SL‑слой не применим, такие дни не считаются риск‑днями.',
        tooltip: 'Процент риск‑дней по SL‑логике.'
    },
    'AntiD%': {
        key: 'AntiD%',
        title: 'AntiD%',
        description:
            'Доля дней, где реально сработал anti‑direction overlay: AntiDAppliedDays / Days * 100. Отображается только для ветки ANTI‑D, для BASE ставится "—".',
        tooltip: 'Процент дней, где применилось anti‑direction.'
    },
    'AntiD|Risk%': {
        key: 'AntiD|Risk%',
        title: 'AntiD|Risk%',
        description:
            'Доля срабатываний anti‑direction только среди риск‑дней: AntiDAppliedDays / RiskDays * 100. Для ветки BASE выводится "—". Если риск‑дней нет, значение равно 0.0.',
        tooltip: 'Процент применений anti‑direction внутри RiskDay.'
    },
    'Lev avg/min/max': {
        key: 'Lev avg/min/max',
        title: 'Lev avg/min/max',
        description:
            'Плечо (leverage) — во сколько раз размер позиции больше залога (маржи). Здесь показаны среднее, минимум и максимум плеча по торговым дням.\n\nДля верхнего хвоста агрессии используется [[p90-quantile|p90]] в соседней колонке Lev p50/p90.\n\nБольшие значения означают более агрессивную торговлю: прибыль и убыток по залогу меняются быстрее.',
        tooltip: 'Среднее/мин/макс плечо по торговым дням.'
    },
    'Lev p50/p90': {
        key: 'Lev p50/p90',
        title: 'Lev p50/p90',
        description:
            'Распределение плеча по торговым дням: p50 (медиана, «обычное» значение) и p90 (высокий уровень, который стратегия достигает редко, но регулярно). Помогает видеть, насколько часто стратегия уходит в агрессивное плечо.',
        tooltip: 'Медиана и p90 по плечу.'
    },
    'Cap avg/min/max': {
        key: 'Cap avg/min/max',
        title: 'Cap avg/min/max',
        description:
            'Средняя/минимальная/максимальная [[cap-fraction|доля капитала]] на сделку, использованная в сделках.\n\nЗначение берётся из [[cap-policy|cap-политики]] и [[trace|trace]] и выводится в процентах от капитала.',
        tooltip: 'Среднее/мин/макс использование капитала.'
    },
    'Cap p50/p90': {
        key: 'Cap p50/p90',
        title: 'Cap p50/p90',
        description:
            'Квантили cap fraction по торговым дням: медиана и верхний хвост распределения. Полезно, чтобы видеть насколько часто кап ближе к максимуму.',
        tooltip: 'Медиана и p90 по cap‑доле.'
    },
    CapAp: {
        key: 'CapAp',
        title: 'CapAp',
        description:
            'Сколько дней cap‑фильтр был применён (cap fraction > 0) и сделка действительно произошла. Если значение сильно ниже TradeDays, часть входов была отфильтрована другими условиями.',
        tooltip: 'Дни, где cap применился.'
    },
    CapSk: {
        key: 'CapSk',
        title: 'CapSk',
        description:
            'Сколько дней были пропущены, потому что cap fraction обнулил размер входа. Это прямой запрет на сделку в этот день.',
        tooltip: 'Дни, где cap fraction обнулил размер входа и запретил сделку.'
    },
    'AvgStake%': {
        key: 'AvgStake%',
        title: 'AvgStake%',
        description:
            'AvgStake% + AvgStake$ — средний размер залога (маржи) на одну сделку.\n\nПоказатель отражает, какой суммой стратегия обычно рискует в одной позиции до применения плеча.\n\nРазница только в единицах измерения: AvgStake% показывает долю от [[start-cap|стартового капитала]] в процентах, AvgStake$ показывает ту же величину в долларах.',
        tooltip: 'Средняя маржа на сделку, % от total capital.'
    },
    AvgStake$: {
        key: 'AvgStake$',
        title: 'AvgStake$',
        description:
            'Средний размер залога (маржи) на одну сделку в долларах. Это денежная версия AvgStake%: чем выше число, тем больше абсолютный риск на сделку.',
        tooltip: 'Средняя маржа на сделку, $.'
    },
    'Exposure% (avg/p50/p90/p99/max)': {
        key: 'Exposure% (avg/p50/p90/p99/max)',
        title: 'Exposure% (avg/p50/p90/p99/max)',
        description:
            'Exposure% — фактическая нагрузка позиции на капитал в каждой сделке.\n\nФормула по сделке:\nExposure = ([[margin-used|MarginUsed]] * LeverageUsed / [[start-cap|StartCap$]]) * 100.\n\nВ колонке выводится распределение по сделкам:\navg (среднее), p50 (медиана), [[p90-quantile|p90]]/p99 (верхний риск-хвост), max (пиковое значение).\n\nКак читать:\nрост p90/p99 и max означает, что стратегия чаще уходит в агрессивные режимы с высоким хвостовым риском.',
        tooltip: 'Trade-level экспозиция: avg/p50/p90/p99/max.'
    },
    'HighExposureTr% (>=20/50)': {
        key: 'HighExposureTr% (>=20/50)',
        title: 'HighExposureTr% (>=20/50)',
        description:
            'Доля сделок с повышенной экспозицией: первая часть — процент сделок, где Exposure >= 20%, вторая часть — где Exposure >= 50%. Формат значения: >=20%/>=50%.',
        tooltip: 'Доля сделок с Exposure >=20% и >=50%.'
    },
    'DailyTP%': {
        key: 'DailyTP%',
        title: 'DailyTP%',
        description:
            'Take-profit (TP) — уровень прибыли, при котором позиция закрывается автоматически. В этой колонке показаны фактические TP-пороги для дневных сделок: средний/минимальный/максимальный процент от цены входа.',
        tooltip: 'Дневной TP: avg/min/max, % от входа.'
    },
    'DailySL%': {
        key: 'DailySL%',
        title: 'DailySL%',
        description:
            '[[tp-sl|Стоп лосс]] — уровень убытка, при котором позиция закрывается автоматически для ограничения потерь.\n\nВ этой колонке показаны фактические уровни стоп лосса для дневных сделок (avg/min/max, % от цены входа).\n\nВ режиме [[no-sl-mode|NO SL]] вместо чисел показывается «—», потому что стоп лосс отключён.',
        tooltip: 'Дневной стоп лосс: avg/min/max, % от входа.'
    },
    'DynTP/SL Days': {
        key: 'DynTP/SL Days',
        title: 'DynTP/SL Days',
        description:
            'Количество уникальных дней, где реально включился [[dynamic-tp-sl|DYNAMIC risk]]-оверлей.\n\nВ этих днях движок не только менял уровни [[tp-sl|stop-loss]] / [[tp-sl|take-profit]], но и масштабировал [[cap-fraction|cap fraction]] по уверенности модели.\n\nДень попадает сюда только после прохождения [[confidence-bucket|confidence-bucket]] по минимуму наблюдений и качеству (win-rate).',
        tooltip: 'Уникальные дни с dynamic TP/SL (Daily/Intraday).'
    },
    'DynTP/SL Tr': {
        key: 'DynTP/SL Tr',
        title: 'DynTP/SL Tr',
        description:
            'Количество сделок, где реально применился [[dynamic-tp-sl|DYNAMIC risk]]-оверлей.\n\nВ этом режиме движок масштабирует уровни [[tp-sl|stop-loss]] и [[tp-sl|take-profit]], а также [[cap-fraction|cap fraction]] по уверенности модели.\n\nОбычно таких сделок меньше общего числа: без подтверждения по [[confidence-bucket|confidence-bucket]] день не попадает в dynamic-срез.',
        tooltip: 'Число сделок с dynamic TP/SL.'
    },
    'DynTP/SL PnL%': {
        key: 'DynTP/SL PnL%',
        title: 'DynTP/SL PnL%',
        description:
            'Вклад в итоговую доходность только от сделок с [[dynamic-tp-sl|DYNAMIC risk]], в процентах от [[start-cap|стартового капитала]] выбранного бакета.\n\nЭто не отдельный бэктест, а часть общего результата строки.',
        tooltip: 'Вклад в PnL% только от dynamic TP/SL сделок.'
    },
    'StatTP/SL Days': {
        key: 'StatTP/SL Days',
        title: 'StatTP/SL Days',
        description:
            'Количество дней, где сделка прошла без [[dynamic-tp-sl|DYNAMIC risk]]-оверлея, то есть в режиме [[static-tp-sl|STATIC base]].\n\nВ этом режиме используются базовые правила сделки без dynamic-множителей по уровням выхода и [[cap-fraction|cap fraction]].',
        tooltip: 'Уникальные дни со static TP/SL (Daily/Intraday).'
    },
    'StatTP/SL Tr': {
        key: 'StatTP/SL Tr',
        title: 'StatTP/SL Tr',
        description:
            'Количество сделок, где [[dynamic-tp-sl|DYNAMIC risk]] не применился и расчёт остался в режиме [[static-tp-sl|STATIC base]].\n\nРост этой метрики означает, что dynamic-оверлей реже проходил условия допуска по исторической статистике.',
        tooltip: 'Число сделок со static TP/SL.'
    },
    'StatTP/SL PnL%': {
        key: 'StatTP/SL PnL%',
        title: 'StatTP/SL PnL%',
        description:
            'Вклад в итоговую доходность только от сделок режима [[static-tp-sl|STATIC base]], в процентах от [[start-cap|стартового капитала]] выбранного бакета.\n\nПоказатель читается вместе с [[dynamic-tp-sl|DynTP/SL PnL%]], чтобы видеть, какой режим дал основную часть результата.\n\nПереключатель dynamic-risk режима меняет состав сделок этого среза, но не пересчитывает задним числом уже применённые в сделке [[leverage|плечо]] и [[cap-fraction|долю капитала на сделку]].',
        tooltip: 'Вклад в PnL% только от static TP/SL сделок.'
    },
    'DelayedTP%': {
        key: 'DelayedTP%',
        title: 'DelayedTP%',
        description:
            'Средний TP для delayed-сделок (отложенный вход, то есть вход не в момент сигнала, а позже по правилу). Порог показан в процентах от цены входа.',
        tooltip: 'Средний intraday TP для delayed, % от входа.'
    },
    'DelayedSL%': {
        key: 'DelayedSL%',
        title: 'DelayedSL%',
        description:
            'Средний [[tp-sl|стоп лосс]] для [[bucket-delayed|delayed]]-сделок в процентах от цены входа.\n\nВ режиме [[no-sl-mode|NO SL]] вместо чисел показывается «—», потому что стоп лосс отключён.',
        tooltip: 'Средний intraday стоп лосс для delayed, % от входа.'
    },
    Tr: {
        key: 'Tr',
        title: 'Tr',
        description:
            'Общее число сделок в [[backtest|бэктесте]] по этой политике и ветке. Это количество отдельных позиций, а не количество дней.',
        tooltip: 'Количество сделок.'
    },
    'TotalPnl%': {
        key: 'TotalPnl%',
        title: 'TotalPnl%',
        description:
            'Итоговая доходность стратегии в процентах. В режиме REAL это фактический результат симуляции. В режиме NO BIGGEST LIQ LOSS это контрфактный тест: из расчёта убирается одна самая убыточная ликвидация (ликвидация = принудительное закрытие позиции биржей при критическом убытке), чтобы увидеть чувствительность к редкому экстремуму.',
        tooltip: 'Итоговая доходность, %.'
    },
    TotalPnl$: {
        key: 'TotalPnl$',
        title: 'TotalPnl$',
        description:
            'Суммарная прибыль/убыток в долларах по wealth-базе: (equity now + withdrawn) − start capital. Как и TotalPnl%, зависит от выбранного режима метрик: REAL или NO BIGGEST LIQ LOSS.',
        tooltip: 'Итоговый PnL в $ по wealth‑базе.'
    },
    BucketNow$: {
        key: 'BucketNow$',
        title: 'BucketNow$',
        description:
            'Текущий реальный баланс выбранного бакета после всех сделок, без учёта [[withdrawn-profit|выведенной прибыли]].\n\nДля [[bucket-daily|daily]] / [[bucket-intraday|intraday]] / [[bucket-delayed|delayed]] это локальный баланс бакета.\n\nДля [[bucket-total-aggregate|aggregate]] — сумма по всем бакетам.',
        tooltip: 'Текущий баланс бакета на бирже, $.'
    },
    'Wealth%': {
        key: 'Wealth%',
        title: 'Wealth%',
        description:
            'Доходность по wealth‑базе: (equity now + withdrawn − start capital) / start capital * 100. Отличается от TotalPnl% тем, что учитывает выводы.',
        tooltip: 'Доходность с учётом выводов, %.'
    },
    'MaxDD%': {
        key: 'MaxDD%',
        title: 'MaxDD%',
        description:
            'MaxDD% — максимальная просадка (drawdown): самое глубокое падение капитала от локального пика до следующего минимума. В REAL это фактическая просадка, в NO BIGGEST LIQ LOSS — пересчёт после удаления одной самой тяжёлой ликвидации.',
        tooltip: 'Максимальная просадка, %.'
    },
    'MaxDD_NoLiq%': {
        key: 'MaxDD_NoLiq%',
        title: 'MaxDD_NoLiq%',
        description:
            'Максимальная просадка без учёта сделок с ликвидацией (принудительным закрытием позиции биржей). Показывает, насколько глубоко стратегия проседает в обычных условиях, если убрать аварийные события.',
        tooltip: 'MaxDD без ликвидаций, %.'
    },
    'MaxDD_Active%': {
        key: 'MaxDD_Active%',
        title: 'MaxDD_Active%',
        description:
            'Максимальная просадка по active equity (живой сумме капиталов по бакетам). Это тоже падение от пика к минимуму, но по другой кривой, поэтому число может отличаться от MaxDD%.',
        tooltip: 'Просадка по active equity, %.'
    },
    Sharpe: {
        key: 'Sharpe',
        title: 'Sharpe',
        description:
            'Коэффициент Sharpe по дневным доходностям: средняя дневная доходность / стандартное отклонение * √252. Дневные доходности агрегируются из сделок с весом позиции относительно общего капитала.',
        tooltip: 'Sharpe по дневным доходностям (annualized).'
    },
    Sortino: {
        key: 'Sortino',
        title: 'Sortino',
        description:
            'Коэффициент Sortino: средняя дневная доходность / down‑std * √252. Down‑std считается только по отрицательным дневным доходностям, что делает метрику чувствительной именно к падениям.',
        tooltip: 'Sortino по дневным доходностям.'
    },
    Calmar: {
        key: 'Calmar',
        title: 'Calmar',
        description:
            'Calmar = CAGR / MaxDD (по дневной кривой из ratio‑метрик). Показывает доходность на единицу глубины просадки. Если MaxDD почти нулевая, выводится "—".',
        tooltip: 'CAGR, делённый на MaxDD.'
    },
    'CAGR%': {
        key: 'CAGR%',
        title: 'CAGR%',
        description:
            'Годовой темп роста (CAGR), рассчитанный на дневной кривой доходностей: years = N/252, CAGR = equity^(1/years) − 1. Это годовая скорость роста, а не просто среднее по дням.',
        tooltip: 'Годовой темп роста (CAGR), %.'
    },
    'WinRate%': {
        key: 'WinRate%',
        title: 'WinRate%',
        description:
            'Доля прибыльных сделок: сделки, где [[net-return-pct|NetReturnPct]] > 0, от общего числа сделок * 100.\n\nСчитается по отдельным сделкам, а не по дням.',
        tooltip: 'Процент прибыльных сделок.'
    },
    'MeanRet%': {
        key: 'MeanRet%',
        title: 'MeanRet%',
        description:
            'Средняя дневная доходность (mean) после агрегации сделок в дневную серию. Каждая сделка даёт вклад = NetReturn% * (использованная маржа / общий капитал). Выводится в процентах.',
        tooltip: 'Средняя дневная доходность, %.'
    },
    'StdRet%': {
        key: 'StdRet%',
        title: 'StdRet%',
        description:
            'Стандартное отклонение дневных доходностей (volatility) по той же дневной серии, что используется для [[sharpe-ratio|Sharpe]].\n\nВыводится в процентах.',
        tooltip: 'Волатильность дневных доходностей, %.'
    },
    'DownStd%': {
        key: 'DownStd%',
        title: 'DownStd%',
        description:
            'Downside deviation: стандартное отклонение отрицательных дневных доходностей (все положительные значения обнуляются).\n\nИспользуется в [[sortino-ratio|Sortino]].',
        tooltip: 'Downside‑волатильность, %.'
    },
    'MaxDD_Ratio%': {
        key: 'MaxDD_Ratio%',
        title: 'MaxDD_Ratio%',
        description:
            'Максимальная просадка на [[ratio-curve|ratio-кривой]]: глубина падения капитала от пика до минимума, рассчитанная по дневной ratio-серии.\n\nПоказатель сравнивается отдельно с MaxDD%, потому что строится по другой кривой.',
        tooltip: 'MaxDD на дневной ratio‑кривой.'
    },
    Withdrawn$: {
        key: 'Withdrawn$',
        title: 'Withdrawn$',
        description:
            'Сумма выведенной прибыли в долларах (WithdrawnTotal). Это деньги, которые «сняты» с баланса, когда equity превышал стартовый капитал.',
        tooltip: 'Сумма выведенной прибыли, $.'
    },
    OnExch$: {
        key: 'OnExch$',
        title: 'OnExch$',
        description:
            'Текущий капитал на бирже — сумма по всем бакетам. Это то, что осталось «в работе», без учёта выводов.',
        tooltip: 'Текущая equity на бирже, $.'
    },
    StartCap$: {
        key: 'StartCap$',
        title: 'StartCap$',
        description:
            'Стартовый капитал в долларах для выбранного среза.\n\nДля daily/intraday/delayed обычно равен 20 000$ на бакет.\n\nДля total aggregate это сумма стартов используемых бакетов (обычно 60 000$).',
        tooltip: 'Стартовый капитал, $.'
    },
    HadLiq: {
        key: 'HadLiq',
        title: 'HadLiq',
        description:
            'Были ли ликвидации. Ликвидация — принудительное закрытие позиции биржей, когда убыток почти «съел» залог позиции. Значение Yes означает аварийный риск в истории; это флаг риска, а не прямой ответ, почему остановился весь прогон.',
        tooltip: 'Была ли ликвидация (по правилу отображения).'
    },
    AccRuin: {
        key: 'AccRuin',
        title: 'AccRuin',
        description:
            'AccRuin — метрика руины рабочего капитала бакета.\n\nБакет считается руинированным, если:\n- бакет помечен как IsDead=true;\n- или EquityNow / StartCapital <= 20% (потеря 80% и более).\n\nКак читать:\nдля строки одного бакета это 0 или 1.\n\nДля total aggregate это число руинированных бакетов среди daily/intraday/delayed (0..3).',
        tooltip: 'Флаг/счётчик руины бакета: IsDead=true или EquityNow/StartCapital <= 20%.'
    },
    RealLiq: {
        key: 'RealLiq',
        title: 'RealLiq',
        description:
            'Сколько раз произошла реальная ликвидация сделок, где ликвидация — принудительное закрытие позиции биржей при критическом убытке. Рост метрики означает более частый аварийный режим. В строках, где показатель не применим к выбранному режиму маржи, выводится "—".',
        tooltip: 'Число реальных ликвидаций (Isolated).'
    },
    EODExit_n: {
        key: 'EODExit_n',
        title: 'EODExit_n',
        description:
            'Количество сделок, закрытых в конце торгового окна (EndOfDay), когда раньше не сработали ни TP (фиксация прибыли), ни SL (ограничение убытка), ни ликвидация (принудительное закрытие биржей). Рост метрики показывает, что стратегия чаще «дотягивает до конца дня» без раннего выхода.',
        tooltip:
            'Количество сделок с ExitReason=EndOfDay. Рост метрики означает, что TP/SL/ликвидация реже срабатывают до конца окна.'
    },
    'EODExit%': {
        key: 'EODExit%',
        title: 'EODExit%',
        description:
            'Доля принудительных EndOfDay-выходов среди всех сделок: EODExit_n / Tr * 100. Нужна, чтобы видеть, насколько часто позиция доживает до конца окна.',
        tooltip:
            'Formula: EODExit_n / Tr * 100. Нормирует EODExit_n на объём торгов и позволяет сравнивать политики с разным числом сделок.'
    },
    EODExit$: {
        key: 'EODExit$',
        title: 'EODExit$',
        description:
            'Суммарный NetPnL в долларах только по сделкам с принудительным EndOfDay-выходом. Показывает вклад EOD-сделок в общий денежный результат.',
        tooltip:
            'Сумма NetPnL по всем EndOfDay-сделкам. Отрицательное значение означает, что принудительное закрытие в конце окна ухудшает итоговый PnL.'
    },
    'EODExit_AvgRet%': {
        key: 'EODExit_AvgRet%',
        title: 'EODExit_AvgRet%',
        description:
            'Средняя NetReturn% по сделкам, закрытым принудительно в конце окна (EndOfDay). Это средняя доходность одной EOD-сделки без взвешивания по частоте других причин выхода.',
        tooltip:
            'Mean NetReturn% только по EndOfDay-сделкам. Используется для оценки качества «дефолтного» выхода в конце окна.'
    },
    LiqBeforeSL_n: {
        key: 'LiqBeforeSL_n',
        title: 'LiqBeforeSL_n',
        description:
            'Сколько раз при включённом SL ликвидация (принудительное закрытие позиции биржей) произошла раньше стоп-лосса. Простыми словами: защита была, но не успела сработать, и позицию закрыла биржа в аварийном режиме.',
        tooltip:
            'Количество случаев ликвидации раньше SL при включённом SL-режиме. Ненулевые значения требуют проверки leverage/cap/SL-порогов.'
    },
    LiqBeforeSL_BadSL_n: {
        key: 'LiqBeforeSL_BadSL_n',
        title: 'LiqBeforeSL_BadSL_n',
        description:
            'Подмножество LiqBeforeSL_n, где SL стоял "дальше", чем цена ликвидации (принудительного закрытия биржей). Это означает, что защитный стоп-лосс фактически бесполезен при выбранном плече и залоге.',
        tooltip:
            'Количество случаев, где SL расположен «дальше», чем уровень ликвидации. Для корректной риск-настройки метрика должна стремиться к нулю.'
    },
    LiqBeforeSL_Same1m_n: {
        key: 'LiqBeforeSL_Same1m_n',
        title: 'LiqBeforeSL_Same1m_n',
        description:
            'Подмножество LiqBeforeSL_n, где SL и ликвидация (принудительное закрытие биржей) коснулись цены в одной минутной свече. Это зона повышенной чувствительности к правилу приоритета событий внутри минуты.',
        tooltip:
            'Количество конфликтных кейсов в одной 1m-свече: одновременно касаются SL и ликвидации. Это редкие случаи, где особенно важно правило приоритета событий внутри минуты.'
    },
    LiqBeforeSL$: {
        key: 'LiqBeforeSL$',
        title: 'LiqBeforeSL$',
        description:
            'Суммарный денежный результат только по сделкам, где ликвидация (принудительное закрытие позиции биржей) произошла раньше SL. Чем сильнее отрицательное значение, тем дороже для стратегии обходится ситуация "SL не успел защитить".',
        tooltip:
            'Сумма NetPnL по сделкам LiqBeforeSL_n. Чем сильнее отрицательное значение, тем дороже обходятся ликвидации до срабатывания SL.'
    },
    'BalMin%': {
        key: 'BalMin%',
        title: 'BalMin%',
        description:
            'Минимальная active equity в процентах от стартового капитала. Active equity строится по сумме бакетов на выходах сделок.',
        tooltip: 'Минимум активной equity, % от старта.'
    },
    BalDead: {
        key: 'BalDead',
        title: 'BalDead',
        description:
            'Флаг «балансовой смерти»: true, если активная equity падала ниже 35% от старта (порог BalanceDeathThresholdFrac).',
        tooltip: 'Equity опускалась ниже 35%.'
    },
    Recovered: {
        key: 'Recovered',
        title: 'Recovered',
        description:
            'Recovered — флаг восстановления после MaxDD по active equity.\n\nЧто проверяется:\nпосле дна MaxDD текущий баланс должен вернуться к пику, который был до этой просадки.\n\ntrue — возврат к прежнему пику произошёл,\nfalse — к концу периода возврата не было.',
        tooltip: 'Было ли восстановление после MaxDD.'
    },
    RecovDays: {
        key: 'RecovDays',
        title: 'RecovDays',
        description:
            'RecovDays — сколько календарных дней прошло от дна MaxDD до возврата текущего баланса к пику перед этой просадкой.\n\nЕсли восстановления не было, в расчёте остаётся -1, а в таблице показывается «—».\n\nКак читать:\n20-60 дней — быстро,\n120+ дней — долгое восстановление.',
        tooltip: 'Дни от дна MaxDD до восстановления.'
    },
    RecovSignals: {
        key: 'RecovSignals',
        title: 'RecovSignals',
        description:
            'Количество уникальных trade‑дней между дном MaxDD и восстановлением. Это «сколько сигналов понадобилось» для возврата к пику.',
        tooltip: 'Сколько trade‑дней до восстановления.'
    },
    'Time<35%': {
        key: 'Time<35%',
        title: 'Time<35%',
        description:
            'Суммарное время (в днях), которое equity провела ниже 35% от старта. Считается по отрезкам active equity кривой, включая частичные пересечения порога.',
        tooltip: 'Сколько дней equity была ниже 35%.'
    },
    'ReqGain%': {
        key: 'ReqGain%',
        title: 'ReqGain%',
        description:
            'ReqGain% — какой рост нужен от дна MaxDD, чтобы вернуться к пику перед этой просадкой.\n\nФормула:\nReqGain% = (1 / (1 - MaxDD) - 1) * 100.\n\nКак читать:\nчем ниже значение, тем реалистичнее восстановление;\n100%+ уже означает тяжёлый возврат капитала,\n200%+ — очень тяжёлый.',
        tooltip: 'Сколько % нужно отыграть после MaxDD.'
    },
    'DD70_Min%': {
        key: 'DD70_Min%',
        title: 'DD70_Min%',
        description:
            'Минимальная equity в самом глубоком эпизоде, когда equity падала ниже 70% от старта. Это аналитический порог, а не правило выхода из сделки.',
        tooltip: 'Минимум в эпизоде equity < 70%.'
    },
    DD70_Recov: {
        key: 'DD70_Recov',
        title: 'DD70_Recov',
        description:
            'Флаг восстановления после глубокой просадки: поднялась ли equity обратно выше 70% после самого глубокого эпизода.',
        tooltip: 'Было ли восстановление выше 70%.'
    },
    DD70_RecovDays: {
        key: 'DD70_RecovDays',
        title: 'DD70_RecovDays',
        description:
            'Сколько календарных дней прошло от минимума глубокой просадки до восстановления выше 70%. Если восстановления не было — выводится "—".',
        tooltip: 'Дни до восстановления выше 70%.'
    },
    DD70_n: {
        key: 'DD70_n',
        title: 'DD70_n',
        description:
            'Количество эпизодов, когда equity опускалась ниже 70% от старта. Это отдельный счётчик глубоких просадок.',
        tooltip: 'Сколько эпизодов equity < 70%.'
    },
    HorizonDays: {
        key: 'HorizonDays',
        title: 'HorizonDays',
        description:
            'Длина периода симуляции в календарных днях между первой и последней сделкой. Это база для расчёта средних темпов AvgDay/Week/Month/Year.',
        tooltip: 'Календарная длина горизонта, дни.'
    },
    'AvgDay%': {
        key: 'AvgDay%',
        title: 'AvgDay%',
        description:
            'Средняя дневная доходность, полученная геометрическим способом: общий множитель wealth^(1/HorizonDays) − 1. Показывает «типичный день» на длинной дистанции.',
        tooltip: 'Геометрическая средняя дневная доходность.'
    },
    'AvgWeek%': {
        key: 'AvgWeek%',
        title: 'AvgWeek%',
        description:
            'Средняя недельная доходность, полученная из среднего дневного множителя: (dailyFactor^7 − 1) * 100. Это не простая сумма, а геометрия.',
        tooltip: 'Геометрическая средняя недельная доходность.'
    },
    'AvgMonth%': {
        key: 'AvgMonth%',
        title: 'AvgMonth%',
        description:
            'Средняя месячная доходность: (dailyFactor^30 − 1) * 100. Отражает «типичный месяц» при сохранении темпа роста.',
        tooltip: 'Геометрическая средняя месячная доходность.'
    },
    'AvgYear%': {
        key: 'AvgYear%',
        title: 'AvgYear%',
        description:
            'Средняя годовая доходность, полученная из дневного множителя: (dailyFactor^365 − 1) * 100. Не равна CAGR, так как базируется на календарных днях, а не 252 торговых.',
        tooltip: 'Геометрическая средняя годовая доходность.'
    },
    'Long n': {
        key: 'Long n',
        title: 'Long n',
        description:
            'Количество LONG-сделок (позиции на рост цены) по данной политике/ветке. Это число сделок, не число дней.',
        tooltip: 'Сколько long‑сделок.'
    },
    'Short n': {
        key: 'Short n',
        title: 'Short n',
        description:
            'Количество SHORT-сделок (позиции на падение цены) по данной политике/ветке. Это число сделок, не число дней.',
        tooltip: 'Сколько short‑сделок.'
    },
    'Long $': {
        key: 'Long $',
        title: 'Long $',
        description:
            'Денежный вклад LONG-сделок (сделок на рост) в общий результат. Помогает понять, на каком направлении стратегия реально зарабатывает или теряет больше.',
        tooltip: 'PnL по LONG‑сделкам, $.'
    },
    'Short $': {
        key: 'Short $',
        title: 'Short $',
        description:
            'Денежный вклад SHORT-сделок (сделок на падение) в общий результат. Нужен для сравнения, насколько стратегия зависит от падения рынка.',
        tooltip: 'PnL по SHORT‑сделкам, $.'
    },
    'AvgLong%': {
        key: 'AvgLong%',
        title: 'AvgLong%',
        description:
            'Средняя доходность одной LONG-сделки (позиции на рост) в процентах. Это среднее по сделкам, без учёта их размера.',
        tooltip: 'Средняя доходность long‑сделки, %.'
    },
    'AvgShort%': {
        key: 'AvgShort%',
        title: 'AvgShort%',
        description:
            'Средняя доходность одной SHORT-сделки (позиции на падение) в процентах. Это среднее по сделкам, без учёта их размера.',
        tooltip: 'Средняя доходность short‑сделки, %.'
    },
    inv_liq_mismatch: {
        key: 'inv_liq_mismatch',
        title: 'inv_liq_mismatch',
        description:
            'Технический индикатор качества симуляции: сколько найдено нарушений инвариантов по ликвидациям (принудительным закрытиям позиций биржей). Ноль — норма, любое ненулевое значение означает, что расчёт нужно перепроверить до бизнес-выводов.',
        tooltip: 'Диагностические несоответствия по ликвидациям.'
    },
    minutes_anomaly: {
        key: 'minutes_anomaly',
        title: 'minutes_anomaly',
        description:
            'Сколько обнаружено аномалий в минутных данных (пробелы, ошибки в 1m-серии) во время бэктеста, то есть проверки на исторических данных. Это индикатор качества данных, а не качества стратегии.',
        tooltip: 'Аномалии минутных данных.'
    }
}

export const POLICY_BRANCH_MEGA_TERM_KEYS = Object.freeze(Object.keys(TERMS)) as readonly string[]
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
    'MaxDD_Active%',
    'MaxDD_Ratio%',
    'BalMin%',
    'BalDead',
    'Time<35%',
    'DD70_Min%',
    'DD70_n'
])

const LIQUIDATION_RISK_KEYS = new Set<string>([
    'HadLiq',
    'AccRuin',
    'RealLiq',
    'LiqBeforeSL_n',
    'LiqBeforeSL_BadSL_n',
    'LiqBeforeSL_Same1m_n',
    'LiqBeforeSL$'
])

const RECOVERY_KEYS = new Set<string>([
    'Recovered',
    'RecovDays',
    'RecovSignals',
    'ReqGain%',
    'DD70_Recov',
    'DD70_RecovDays'
])

const PERFORMANCE_RESULT_KEYS = new Set<string>([
    'TotalPnl%',
    'TotalPnl$',
    'Wealth%',
    'WinRate%',
    'MeanRet%',
    'Sharpe',
    'Sortino',
    'Calmar',
    'CAGR%',
    'AvgDay%',
    'AvgWeek%',
    'AvgMonth%',
    'AvgYear%'
])

const ABSOLUTE_MONEY_KEYS = new Set<string>([
    'TotalPnl$',
    'BucketNow$',
    'Withdrawn$',
    'OnExch$',
    'StartCap$',
    'AvgStake$',
    'Long $',
    'Short $',
    'EODExit$',
    'LiqBeforeSL$'
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
    return /[.!?]$/.test(normalized) ? normalized : `${normalized}.`
}

function removeRedundantGlossaryFromDescription(text: string): string {
    let next = text

    // Убираем встроенные словарные вставки для LONG/SHORT: они теперь читаются через hover-термины.
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

function humanizeInternalTerms(text: string): string {
    let next = text

    next = next.replace(/\bpolicy-?skip\b/gi, 'политика пропускает день по своему правилу')
    next = next.replace(/\bcap fraction\b/gi, 'доля капитала на сделку')
    next = next.replace(/\bconfidence\b/gi, 'уверенность модели')
    next = next.replace(/\btrace-?сигнал(ы|ов)?\b/gi, 'дневные сигналы модели')
    next = next.replace(/\bbucket\b/gi, 'выбранный срез сделок')
    next = next.replace(/\bdynamic\b/gi, 'dynamic (адаптивный)')
    next = next.replace(/\bstatic\b/gi, 'static (фиксированный)')

    next = next.replace(/[ \t]{2,}/g, ' ')
    next = next.replace(/[ \t]+([,.;:!?])/g, '$1')
    return next.trim()
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

function _resolveTermImportanceHintOrDefault(key: string): string {
    if (key === 'Policy') {
        return 'по этой строке сравнивается конкретный набор торговых правил с другими политиками в одинаковых рыночных условиях.'
    }
    if (key === 'Branch') {
        return 'она показывает, как одна и та же политика ведёт себя в базовом и инверсном режиме риск-дней.'
    }
    if (key === 'SL Mode') {
        return 'режим SL определяет, есть ли жёсткая граница убытка на сделку; в NO SL хвостовой риск выше и возможны обнуления капитала.'
    }
    if (key === 'StopReason') {
        return 'по ней видно, завершился ли прогон штатно или стратегия остановилась из-за критической потери капитала.'
    }
    if (key === 'RiskDay%') {
        return 'чем выше доля риск-дней, тем чаще стратегия работала в стрессовом режиме рынка.'
    }
    if (key === 'Miss') {
        return 'пропуски данных могут искажать статистику и делать сравнение стратегий некорректным.'
    }
    if (key === 'Trade%' || key === 'NoTrade%' || key === 'Tr' || key === 'Days') {
        return 'это базовые метрики активности: без них нельзя понять, на какой частоте получен результат.'
    }
    if (key === 'Long%' || key === 'Short%' || key === 'Long n' || key === 'Short n') {
        return 'метрики направления показывают, куда стратегия смещена по рынку: в рост, в падение или нейтрально.'
    }
    if (key === 'Long $' || key === 'Short $' || key === 'AvgLong%' || key === 'AvgShort%') {
        return 'они показывают вклад каждой стороны рынка в итоговый результат, а не только общую сумму PnL.'
    }
    if (
        key === 'Lev avg/min/max' ||
        key === 'Lev p50/p90' ||
        key === 'Cap avg/min/max' ||
        key === 'Cap p50/p90' ||
        key === 'AvgStake%' ||
        key === 'AvgStake$' ||
        key === 'Exposure% (avg/p50/p90/p99/max)' ||
        key === 'HighExposureTr% (>=20/50)' ||
        key === 'CapAp' ||
        key === 'CapSk'
    ) {
        return 'это прямые индикаторы агрессивности риска: как сильно стратегия нагружает капитал и плечо.'
    }
    if (
        key === 'DailyTP%' ||
        key === 'DailySL%' ||
        key === 'DelayedTP%' ||
        key === 'DelayedSL%' ||
        key === 'DynTP/SL Days' ||
        key === 'DynTP/SL Tr' ||
        key === 'DynTP/SL PnL%' ||
        key === 'StatTP/SL Days' ||
        key === 'StatTP/SL Tr' ||
        key === 'StatTP/SL PnL%'
    ) {
        return 'эти метрики раскрывают механику выходов из сделок и показывают, где именно формируется прибыль или убыток.'
    }
    if (key === 'BucketNow$' || key === 'Withdrawn$' || key === 'OnExch$' || key === 'StartCap$') {
        return 'это балансный срез капитала: сколько уже выведено, сколько осталось в рынке и от какой базы считался результат.'
    }
    if (DRAW_DOWN_KEYS.has(key)) {
        return 'просадка и глубина падения капитала определяют практическую выживаемость стратегии при стрессе.'
    }
    if (LIQUIDATION_RISK_KEYS.has(key)) {
        return 'ликвидационные метрики отражают аварийный риск, который может уничтожить прибыль нескольких месяцев.'
    }
    if (key === 'EODExit_n' || key === 'EODExit%' || key === 'EODExit$' || key === 'EODExit_AvgRet%') {
        return 'они показывают, как часто стратегия не получает раннего выхода по TP/SL и доживает до принудительного закрытия окна.'
    }
    if (RECOVERY_KEYS.has(key)) {
        return 'восстановление показывает не только глубину падения, но и цену возврата к прежнему капиталу во времени и усилиях.'
    }
    if (key === 'HorizonDays') {
        return 'горизонт нужен для корректной интерпретации средних темпов: короткий и длинный период нельзя сравнивать напрямую.'
    }
    if (DIAGNOSTIC_ZERO_KEYS.has(key)) {
        return 'это контроль качества расчёта и данных: ненулевые значения требуют проверки до бизнес-решений.'
    }
    if (PERFORMANCE_RESULT_KEYS.has(key)) {
        return 'это итоговый результативный слой, который нужно читать вместе с просадкой и ликвидациями.'
    }
    if (ABSOLUTE_MONEY_KEYS.has(key)) {
        return 'денежные значения важны для бизнес-оценки: они показывают абсолютный финансовый эффект, а не только проценты.'
    }

    return 'метрика помогает сравнивать стратегии не по одному числу, а по устойчивости результата в одинаковом срезе.'
}

function resolveTermReadingHintOrDefault(key: string): string {
    if (key === 'Policy') {
        return 'В таблице Policy оценивается по колонкам: [[total-pnl|TotalPnl%]], [[wealth-pct|Wealth%]], [[drawdown|MaxDD%]], [[liquidation|HadLiq]], [[account-ruin|AccRuin]], [[recovered|Recovered]], [[recov-days|RecovDays]], [[req-gain|ReqGain%]].\n\nОриентир чтения:\n- лучше, когда [[total-pnl|TotalPnl%]] и [[wealth-pct|Wealth%]] выше;\n- лучше, когда [[drawdown|MaxDD%]] менее глубокая (например, -22% лучше, чем -48%);\n- лучший сценарий [[liquidation|HadLiq]]=0 и [[account-ruin|AccRuin]]=0;\n- лучше, когда [[recovered|Recovered]]=true, а [[recov-days|RecovDays]] и [[req-gain|ReqGain%]] ниже.'
    }
    if (key === 'Branch') {
        return 'Сравнение выполняется только внутри одной и той же Policy и одного среза режимов (bucket, SL mode, TP/SL mode, metric view).\n\nСначала оценивается риск: MaxDD%, HadLiq, AccRuin.\n\nЗатем оценивается цена улучшения риска по доходности: TotalPnl% и Wealth%.\n\nПример: BASE = TotalPnl% 26, MaxDD -44, HadLiq 2, AccRuin 1. ANTI-D = TotalPnl% 22, MaxDD -24, HadLiq 0, AccRuin 0.\n\nВывод: ANTI-D снижает аварийный риск; цена улучшения риска — 4 п.п. по TotalPnl%.'
    }
    if (key === 'SL Mode') {
        return 'Сравнение WITH SL и NO SL выполняется только внутри одной строки Policy/Branch.\n\nЕсли при NO SL растут MaxDD%, HadLiq и AccRuin, доходность куплена ценой риска обнуления бакета (а в cross-марже — всего торгового баланса).'
    }
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
        return 'чем выше, тем чаще стратегия работала в повышенном риске; интерпретация выполняется вместе с MaxDD%, HadLiq и AccRuin.'
    }
    if (key === 'AntiD%' || key === 'AntiD|Risk%') {
        return 'высокие значения показывают активную работу инверсии; далее оценивается, улучшает ли это PnL при тех же или меньших рисках.'
    }
    if (key === 'Lev avg/min/max' || key === 'Lev p50/p90') {
        return 'чем выше плечо, тем агрессивнее риск; особенно показателен верхний хвост (p90/max).'
    }
    if (key === 'Cap avg/min/max' || key === 'Cap p50/p90' || key === 'AvgStake%' || key === 'AvgStake$') {
        return 'чем выше доля капитала на сделку, тем сильнее влияние каждой ошибки; оценка выполняется вместе с MaxDD и Liq-метриками.'
    }
    if (key === 'Exposure% (avg/p50/p90/p99/max)' || key === 'HighExposureTr% (>=20/50)') {
        return 'рост верхних уровней (p90/p99/max, >=50%) означает рост хвостового риска.'
    }
    if (key === 'DailyTP%' || key === 'DelayedTP%') {
        return 'показывает целевой профит-уровень: сопоставляется с соответствующим SL, чтобы видеть профиль риск/прибыль.'
    }
    if (key === 'DailySL%' || key === 'DelayedSL%') {
        return 'слишком широкий SL увеличивает убыток на сделку; слишком узкий резко снижает долю успешных сделок.'
    }
    if (key === 'DynTP/SL Days' || key === 'DynTP/SL Tr') {
        return 'обычно меньше общего объёма, потому что [[dynamic-tp-sl|DYNAMIC risk]] требует подтверждённой статистики по [[confidence-bucket|confidence-bucket]].'
    }
    if (key === 'StatTP/SL Days' || key === 'StatTP/SL Tr') {
        return 'если сделок [[static-tp-sl|STATIC base]] резко больше, чем [[dynamic-tp-sl|DYNAMIC risk]], значит dynamic-оверлей редко проходит условия допуска в этом периоде.'
    }
    if (key === 'DynTP/SL PnL%' || key === 'StatTP/SL PnL%') {
        return 'вклад [[dynamic-tp-sl|DYNAMIC risk]] и [[static-tp-sl|STATIC base]] оценивается совместно: так видно, какой режим реально даёт результат.'
    }
    if (key === 'TotalPnl%' || key === 'TotalPnl$' || key === 'Wealth%') {
        return 'чем выше, тем лучше по доходности, но финальное решение только вместе с MaxDD%, HadLiq и AccRuin.'
    }
    if (key === 'Sharpe' || key === 'Sortino' || key === 'Calmar') {
        return 'чем выше, тем лучше соотношение доходности и риска, но сравнение корректно только внутри одного bucket и одного режима метрик.'
    }
    if (key === 'CAGR%' || key === 'MeanRet%' || key === 'StdRet%' || key === 'DownStd%' || key === 'WinRate%') {
        return 'совместная интерпретация обязательна: высокая средняя доходность без контроля разброса и просадки часто даёт нестабильный профиль риска.'
    }
    if (key === 'BucketNow$' || key === 'OnExch$' || key === 'Withdrawn$') {
        return 'интерпретация выполняется в связке: OnExch$ + Withdrawn$ должны объяснять итоговую wealth-доходность.'
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
        key === 'RealLiq' ||
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
        return 'эти темпы удобны для сравнения, но обязательна проверка рядом с просадками: средний рост скрывает тяжёлые провалы капитала.'
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

    return 'корректное сравнение возможно только для строк в одном и том же срезе (bucket, SL mode, TP/SL mode, zonal, metric view), иначе вывод будет некорректным.'
}

function resolveEnglishTermReadingHintOrDefault(key: string): string {
    if (key === 'Policy') {
        return 'Policy is assessed through [[total-pnl|TotalPnl%]], [[wealth-pct|Wealth%]], [[drawdown|MaxDD%]], [[liquidation|HadLiq]], [[account-ruin|AccRuin]], [[recovered|Recovered]], [[recov-days|RecovDays]], and [[req-gain|ReqGain%]].\n\nReading guide:\n- higher [[total-pnl|TotalPnl%]] and [[wealth-pct|Wealth%]] are better;\n- shallower [[drawdown|MaxDD%]] is better (for example, -22% is better than -48%);\n- best case is [[liquidation|HadLiq]]=0 and [[account-ruin|AccRuin]]=0;\n- better when [[recovered|Recovered]]=true and [[recov-days|RecovDays]] / [[req-gain|ReqGain%]] are lower.'
    }
    if (key === 'Branch') {
        return 'Comparison is valid only inside the same Policy and the same mode slice (bucket, SL mode, TP/SL mode, metric view).\n\nEvaluate risk first: MaxDD%, HadLiq, AccRuin.\n\nThen evaluate how much return was sacrificed or preserved: TotalPnl% and Wealth%.\n\nExample inside the branch comparison itself: BASE = TotalPnl% 26, MaxDD -44, HadLiq 2, AccRuin 1. ANTI-D = TotalPnl% 22, MaxDD -24, HadLiq 0, AccRuin 0.\n\nConclusion: ANTI-D reduces emergency risk; the price of that improvement is 4 p.p. of TotalPnl%.'
    }
    if (key === 'SL Mode') {
        return 'WITH SL and NO SL must be compared only inside the same Policy/Branch row.\n\nIf NO SL increases MaxDD%, HadLiq, and AccRuin, the extra return was bought at the cost of bucket wipeout risk (and, in cross margin, full trading-balance wipeout risk).'
    }
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
        return 'Higher values mean the strategy spent more time in elevated-risk conditions; interpret together with MaxDD%, HadLiq, and AccRuin.'
    }
    if (key === 'AntiD%' || key === 'AntiD|Risk%') {
        return 'High values mean direction inversion is active often; then assess whether that improves PnL at the same or lower risk.'
    }
    if (key === 'Lev avg/min/max' || key === 'Lev p50/p90') {
        return 'Higher leverage means more aggressive risk; the upper tail (p90/max) is especially informative.'
    }
    if (key === 'Cap avg/min/max' || key === 'Cap p50/p90' || key === 'AvgStake%' || key === 'AvgStake$') {
        return 'The larger the capital fraction per trade, the stronger the impact of each mistake; interpret together with MaxDD and liquidation metrics.'
    }
    if (key === 'Exposure% (avg/p50/p90/p99/max)' || key === 'HighExposureTr% (>=20/50)') {
        return 'Growth in the upper levels (p90/p99/max, >=50%) means tail risk is increasing.'
    }
    if (key === 'DailyTP%' || key === 'DelayedTP%') {
        return 'This is the profit target level; compare it with the matching SL to see the risk/reward profile.'
    }
    if (key === 'DailySL%' || key === 'DelayedSL%') {
        return 'An excessively wide SL increases loss per trade; an excessively tight SL sharply reduces the share of successful trades.'
    }
    if (key === 'DynTP/SL Days' || key === 'DynTP/SL Tr') {
        return 'These values are usually smaller than the full trade volume because [[dynamic-tp-sl|DYNAMIC risk]] requires confirmed statistics inside [[confidence-bucket|confidence-bucket]].'
    }
    if (key === 'StatTP/SL Days' || key === 'StatTP/SL Tr') {
        return 'If [[static-tp-sl|STATIC base]] trade count is much larger than [[dynamic-tp-sl|DYNAMIC risk]], the dynamic overlay rarely passes admission conditions in this period.'
    }
    if (key === 'DynTP/SL PnL%' || key === 'StatTP/SL PnL%') {
        return 'The contribution of [[dynamic-tp-sl|DYNAMIC risk]] and [[static-tp-sl|STATIC base]] must be read together to see which mode actually drives the result.'
    }
    if (key === 'TotalPnl%' || key === 'TotalPnl$' || key === 'Wealth%') {
        return 'Higher is better for return, but the final decision must always be made together with MaxDD%, HadLiq, and AccRuin.'
    }
    if (key === 'Sharpe' || key === 'Sortino' || key === 'Calmar') {
        return 'Higher is better for risk-adjusted return, but comparison is valid only inside the same bucket and the same metric mode.'
    }
    if (key === 'CAGR%' || key === 'MeanRet%' || key === 'StdRet%' || key === 'DownStd%' || key === 'WinRate%') {
        return 'These must be interpreted together: high average return without control over dispersion and drawdown usually means unstable risk profile.'
    }
    if (key === 'BucketNow$' || key === 'OnExch$' || key === 'Withdrawn$') {
        return 'Interpret them together: OnExch$ + Withdrawn$ must explain the final wealth-based return.'
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
        key === 'RealLiq' ||
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
        return 'These growth rates are convenient for comparison, but they must be read alongside drawdowns: average growth can hide severe capital collapses.'
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

    return 'Correct comparison is possible only for rows inside the same slice (bucket, SL mode, TP/SL mode, zonal, metric view); otherwise the conclusion is invalid.'
}

function _resolveTermDecisionContextHintOrDefault(key: string): string {
    if (key === 'Policy') {
        return 'в ежедневном решении это главный набор правил: открыть LONG, открыть SHORT или пропустить день, если условий для входа недостаточно.'
    }
    if (key === 'Branch') {
        return 'в сравнении это второй сценарий той же стратегии: BASE использует исходное направление сигнала, а ANTI-D либо инвертирует направление (при срабатывании anti-direction), либо пропускает день.'
    }
    if (key === 'SL Mode') {
        return 'в расчёте это переключатель механики выхода: WITH SL добавляет защитное ограничение убытка по стоп-лоссу, а NO SL оставляет позицию без этого предела до TP, ликвидации или EndOfDay.'
    }
    if (key === 'StartDay' || key === 'EndDay' || key === 'Days') {
        return 'для бизнеса это границы окна анализа: сравнивать стратегии корректно только на одинаковом периоде.'
    }
    if (key === 'StopReason') {
        return 'это причина, почему расчёт завершился: штатно до конца периода или аварийно раньше времени.'
    }
    if (key === 'Tr' || key === 'Trade%' || key === 'NoTrade%') {
        return 'это частота торговли: она показывает, как часто стратегия вообще принимает решение входить в рынок.'
    }
    if (key === 'Long%' || key === 'Short%' || key === 'Long n' || key === 'Short n') {
        return 'это профиль направления: куда стратегия чаще входила и насколько это совпадает с её фактической прибылью по направлениям.'
    }
    if (key === 'RiskDay%' || key === 'AntiD%' || key === 'AntiD|Risk%') {
        return 'это поведение в сложные дни: как часто активируется риск-режим и как часто стратегия меняет направление для защиты.'
    }
    if (
        key === 'Lev avg/min/max' ||
        key === 'Lev p50/p90' ||
        key === 'Cap avg/min/max' ||
        key === 'Cap p50/p90' ||
        key === 'AvgStake%' ||
        key === 'AvgStake$' ||
        key === 'Exposure% (avg/p50/p90/p99/max)' ||
        key === 'HighExposureTr% (>=20/50)' ||
        key === 'CapAp' ||
        key === 'CapSk'
    ) {
        return 'это фактический размер риска на сделку: сколько капитала ставится и насколько агрессивно используется плечо.'
    }
    if (key === 'DailyTP%' || key === 'DailySL%' || key === 'DelayedTP%' || key === 'DelayedSL%') {
        return 'это параметры выхода по прибыли и убытку для разных типов сделок; их смотрят парой, чтобы понимать баланс риск/прибыль.'
    }
    if (
        key === 'DynTP/SL Days' ||
        key === 'DynTP/SL Tr' ||
        key === 'DynTP/SL PnL%' ||
        key === 'StatTP/SL Days' ||
        key === 'StatTP/SL Tr' ||
        key === 'StatTP/SL PnL%'
    ) {
        return 'это разбор вклада двух режимов: [[dynamic-tp-sl|DYNAMIC risk]] меняет уровни выхода и [[cap-fraction|cap fraction]] по уверенности, а [[static-tp-sl|STATIC base]] оставляет базовые правила сделки.'
    }
    if (key === 'TotalPnl%' || key === 'TotalPnl$' || key === 'Wealth%') {
        return 'это итог результата: проценты удобны для сравнения стратегий, деньги показывают реальный финансовый эффект.'
    }
    if (key === 'Sharpe' || key === 'Sortino' || key === 'Calmar') {
        return 'это метрики качества результата с учётом риска: они нужны, чтобы не выбирать стратегию только по максимальной доходности.'
    }
    if (key === 'CAGR%' || key === 'MeanRet%' || key === 'StdRet%' || key === 'DownStd%' || key === 'WinRate%') {
        return 'это статистика распределения доходности: средний результат, разброс и устойчивость отрицательных дней.'
    }
    if (key === 'BucketNow$' || key === 'Withdrawn$' || key === 'OnExch$' || key === 'StartCap$') {
        return 'это структура капитала: сколько денег осталось в торговом срезе, сколько уже выведено и от какой базы считался результат.'
    }
    if (DRAW_DOWN_KEYS.has(key)) {
        return 'это фактическая глубина провалов капитала: сколько бизнес должен выдержать до восстановления.'
    }
    if (LIQUIDATION_RISK_KEYS.has(key)) {
        return 'это аварийные события: где позиция была закрыта принудительно и где защитные механизмы не успели сработать.'
    }
    if (key === 'EODExit_n' || key === 'EODExit%' || key === 'EODExit$' || key === 'EODExit_AvgRet%') {
        return 'это выход по времени, а не по целевым уровням; он показывает, как часто сделка доживает до конца дня.'
    }
    if (RECOVERY_KEYS.has(key)) {
        return 'это цена восстановления после крупной просадки: сколько дней и какого роста требуется до возврата к прошлому пику.'
    }
    if (key === 'HorizonDays' || key === 'AvgDay%' || key === 'AvgWeek%' || key === 'AvgMonth%' || key === 'AvgYear%') {
        return 'это темпы роста на разных горизонтах, полезные для планирования, но их нужно читать рядом с просадкой и ликвидациями.'
    }
    if (key === 'Long $' || key === 'Short $' || key === 'AvgLong%' || key === 'AvgShort%') {
        return 'это вклад каждого направления в деньги и проценты: где стратегия зарабатывала, а где теряла.'
    }
    if (DIAGNOSTIC_ZERO_KEYS.has(key) || key === 'Miss') {
        return 'это контроль качества данных и симуляции: любые аномалии нужно проверить до принятия финансового решения.'
    }

    return 'это часть общего профиля стратегии в выбранном срезе отчёта; корректный вывод возможен только при сравнении одинаковых режимов и периодов.'
}

function resolveFallbackExampleHint(key: string): string {
    if (key === 'StartDay' || key === 'EndDay') {
        return 'StartDay=2022-01-01 и EndDay=2025-12-31 означают, что сравнение выполнено на одном и том же историческом окне.'
    }
    if (key.includes('$')) {
        return `${key}=12 500 показывает денежный эффект именно в долларах, а не в процентах.`
    }
    if (key.includes('%')) {
        return `${key}=28 означает, что показатель равен 28% в выбранном срезе таблицы.`
    }
    if (/_n$/.test(key) || /Days|Tr|Signals|n$/.test(key)) {
        return `${key}=120 означает 120 событий (дней, сделок или сигналов) по выбранной строке.`
    }
    if (key === 'Policy') {
        return 'если у Policy A ниже доходность, но заметно ниже просадка и нет ликвидаций, бизнес часто выбирает её как более устойчивую.'
    }
    if (key === 'Branch') {
        return 'если у ANTI-D чуть ниже доходность, но существенно ниже просадка, этот режим даёт более безопасный риск-профиль для запуска.'
    }
    if (key === 'SL Mode') {
        return 'если в одной строке NO SL даёт немного выше PnL, но при этом растут MaxDD%, HadLiq или AccRuin, прирост доходности куплен ценой аварийного риска.'
    }

    return `${key} читается в связке с соседними метриками той же строки: доходность, просадка, ликвидации и восстановление.`
}

function resolveEnglishFallbackExampleHint(key: string): string {
    if (key === 'StartDay' || key === 'EndDay') {
        return 'StartDay=2022-01-01 and EndDay=2025-12-31 mean the comparison was run on the same historical window.'
    }
    if (key.includes('$')) {
        return `${key}=12,500 shows the effect in dollars, not in percentages.`
    }
    if (key.includes('%')) {
        return `${key}=28 means the metric equals 28% in the selected table slice.`
    }
    if (/_n$/.test(key) || /Days|Tr|Signals|n$/.test(key)) {
        return `${key}=120 means 120 events (days, trades, or signals) for the selected row.`
    }
    if (key === 'Policy') {
        return 'If Policy A has lower return but much lower drawdown and no liquidations, the business often chooses it as the more robust option.'
    }
    if (key === 'Branch') {
        return 'If ANTI-D has slightly lower return but materially lower drawdown, it provides a safer risk profile for launch.'
    }
    if (key === 'SL Mode') {
        return 'If NO SL gives slightly higher PnL in the same row but MaxDD%, HadLiq, or AccRuin rise, the extra return was bought at the cost of emergency risk.'
    }

    return `${key} must be read together with neighboring metrics in the same row: return, drawdown, liquidations, and recovery.`
}

function resolveTermExampleHintOrNull(key: string): string | null {
    if (key === 'Policy') {
        return 'если Policy A дала +48% при MaxDD -18%, а Policy B дала +55% при MaxDD -52%, бизнес чаще выберет A как более устойчивую.'
    }
    if (key === 'Branch') {
        return 'если BASE = +22%, а ANTI-D = +19%, но при этом MaxDD снижается с -40% до -24%, ANTI-D практичнее для риск-ограниченного запуска.'
    }
    if (key === 'SL Mode') {
        return 'для одной и той же строки Policy/Branch сравнение WITH SL и NO SL показывает цену риска: если NO SL даёт выше PnL, но приводит к росту ликвидаций и/или AccRuin, режим становится неприемлемым для рабочего запуска.'
    }
    if (key === 'Days') {
        return 'значение 365 означает, что расчёт охватил 365 торговых дней (без выходных).'
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
    if (key === 'Lev avg/min/max' || key === 'Lev p50/p90') {
        return 'avg=4, p90=9 означает, что в основном плечо умеренное, но в верхнем хвосте стратегия переходит в агрессивный режим.'
    }
    if (key === 'Cap avg/min/max' || key === 'Cap p50/p90' || key === 'AvgStake%' || key === 'AvgStake$') {
        return 'AvgStake%=12 означает, что в среднем в одной сделке рискуется около 12% от стартового капитала бакета.'
    }
    if (key === 'Exposure% (avg/p50/p90/p99/max)' || key === 'HighExposureTr% (>=20/50)') {
        return 'если доля >=50% выросла с 4% до 19%, стратегия стала заметно агрессивнее.'
    }
    if (key === 'DailyTP%' || key === 'DelayedTP%' || key === 'DailySL%' || key === 'DelayedSL%') {
        return 'TP=2.0% и SL=1.0% означает, что на бумаге цель прибыли в 2 раза больше лимита убытка.'
    }
    if (key === 'DynTP/SL Days' || key === 'DynTP/SL Tr') {
        return 'DynTP/SL Tr=120 при Tr=460 означает, что [[dynamic-tp-sl|DYNAMIC risk]] применился только к части сделок, а остальные остались в [[static-tp-sl|STATIC base]].'
    }
    if (key === 'StatTP/SL Days' || key === 'StatTP/SL Tr') {
        return 'StatTP/SL Tr=340 при DynTP/SL Tr=120 показывает, что основная масса сделок прошла без [[dynamic-tp-sl|DYNAMIC risk]]-оверлея.'
    }
    if (key === 'DynTP/SL PnL%' || key === 'StatTP/SL PnL%') {
        return 'DynTP/SL PnL%=14 и StatTP/SL PnL%=6 означает, что основной вклад в доходность дал [[dynamic-tp-sl|DYNAMIC risk]]-срез.'
    }
    if (key === 'Tr') {
        return 'Tr=520 означает, что в этом срезе у этой политики было 520 сделок.'
    }
    if (key === 'TotalPnl%') {
        return 'TotalPnl%=38 означает рост на 38% от стартового капитала выбранного бакета.'
    }
    if (key === 'TotalPnl$') {
        return 'TotalPnl$=19 000 означает чистую прибыль 19 000 долларов в этом срезе.'
    }
    if (key === 'BucketNow$') {
        return 'BucketNow$=62 000 означает текущий капитал бакета после всех закрытых сделок.'
    }
    if (key === 'Wealth%') {
        return 'Wealth%=52 означает совокупный прирост богатства с учетом выведенной прибыли.'
    }
    if (key === 'MaxDD%' || key === 'MaxDD_NoLiq%' || key === 'MaxDD_Active%' || key === 'MaxDD_Ratio%') {
        return 'MaxDD=-41% означает, что в худшей точке капитал падал на 41% от локального максимума.'
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
    if (key === 'HadLiq' || key === 'AccRuin' || key === 'RealLiq') {
        return 'HadLiq=1 означает, что хотя бы одна позиция была принудительно закрыта биржей.'
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
        return 'Формат "0 | 18" означает: будних пропусков нет (норма), 18 выходных пропущены по штатному weekend-skip.'
    }
    if (key === 'inv_liq_mismatch' || key === 'minutes_anomaly') {
        return 'Нормальный сценарий: 0. Любое заметное отклонение — повод перепроверить данные и логику расчёта.'
    }

    return resolveFallbackExampleHint(key)
}

function resolveEnglishTermExampleHintOrNull(key: string): string | null {
    if (key === 'Policy') {
        return 'If Policy A delivered +48% with MaxDD -18%, while Policy B delivered +55% with MaxDD -52%, the business usually prefers A as the more stable option.'
    }
    if (key === 'Branch') {
        return 'If BASE = +22% and ANTI-D = +19%, but MaxDD drops from -40% to -24%, ANTI-D is more practical for a risk-limited launch.'
    }
    if (key === 'SL Mode') {
        return 'For the same Policy/Branch row, WITH SL vs NO SL shows the price of risk: if NO SL improves PnL but increases liquidations and/or AccRuin, the mode becomes unacceptable for production use.'
    }
    if (key === 'Days') {
        return 'A value of 365 means the calculation covered 365 trading days (excluding weekends).'
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
    if (key === 'Lev avg/min/max' || key === 'Lev p50/p90') {
        return 'avg=4, p90=9 means leverage is moderate most of the time, but the upper tail shifts into aggressive mode.'
    }
    if (key === 'Cap avg/min/max' || key === 'Cap p50/p90' || key === 'AvgStake%' || key === 'AvgStake$') {
        return 'AvgStake%=12 means roughly 12% of bucket start capital is risked per trade on average.'
    }
    if (key === 'Exposure% (avg/p50/p90/p99/max)' || key === 'HighExposureTr% (>=20/50)') {
        return 'If the >=50% share rises from 4% to 19%, the strategy became materially more aggressive.'
    }
    if (key === 'DailyTP%' || key === 'DelayedTP%' || key === 'DailySL%' || key === 'DelayedSL%') {
        return 'TP=2.0% and SL=1.0% mean the paper profit target is twice the loss limit.'
    }
    if (key === 'DynTP/SL Days' || key === 'DynTP/SL Tr') {
        return 'DynTP/SL Tr=120 with Tr=460 means [[dynamic-tp-sl|DYNAMIC risk]] applied only to part of the trades, while the rest stayed in [[static-tp-sl|STATIC base]].'
    }
    if (key === 'StatTP/SL Days' || key === 'StatTP/SL Tr') {
        return 'StatTP/SL Tr=340 with DynTP/SL Tr=120 shows that most trades ran without the [[dynamic-tp-sl|DYNAMIC risk]] overlay.'
    }
    if (key === 'DynTP/SL PnL%' || key === 'StatTP/SL PnL%') {
        return 'DynTP/SL PnL%=14 and StatTP/SL PnL%=6 mean the main return contribution came from the [[dynamic-tp-sl|DYNAMIC risk]] slice.'
    }
    if (key === 'Tr') {
        return 'Tr=520 means this policy had 520 trades in the selected slice.'
    }
    if (key === 'TotalPnl%') {
        return 'TotalPnl%=38 means a 38% gain from the start capital of the selected bucket.'
    }
    if (key === 'TotalPnl$') {
        return 'TotalPnl$=19,000 means net profit of 19,000 USD in this slice.'
    }
    if (key === 'BucketNow$') {
        return 'BucketNow$=62,000 means the current bucket capital after all closed trades.'
    }
    if (key === 'Wealth%') {
        return 'Wealth%=52 means total wealth grew by 52% including withdrawn profit.'
    }
    if (key === 'MaxDD%' || key === 'MaxDD_NoLiq%' || key === 'MaxDD_Active%' || key === 'MaxDD_Ratio%') {
        return 'MaxDD=-41% means capital fell 41% from the local peak at the worst point.'
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
    if (key === 'HadLiq' || key === 'AccRuin' || key === 'RealLiq') {
        return 'HadLiq=1 means at least one position was force-closed by the exchange.'
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
        return 'The format "0 | 18" means: no weekday misses (normal), 18 weekends skipped by the expected weekend-skip rule.'
    }
    if (key === 'inv_liq_mismatch' || key === 'minutes_anomaly') {
        return 'Normal case: 0. Any visible deviation is a reason to recheck both data and calculation logic.'
    }

    return resolveEnglishFallbackExampleHint(key)
}

interface PolicyBranchMegaManualTranslation {
    description: string
    tooltip: string
    readingHint?: string
    example?: string | null
}

const POLICY_BRANCH_MEGA_MANUAL_EN: Record<string, PolicyBranchMegaManualTranslation> = {
    Policy: {
        description:
            'Name of the trading policy. A policy is the full rule set for this row: when a position may open, which action is chosen on that day (LONG, SHORT, or no trade), what size is used, what leverage is applied, and where stop-loss / take-profit are defined.\n\nThe day is skipped when entry conditions are not satisfied (for example: no valid signal direction, policy-skip fired, risk filter blocked entry, or cap fraction = 0).\n\nPolicy name therefore stands for the full entry, exit, and risk configuration.',
        tooltip:
            'Trading policy name and its full entry, exit, and risk configuration.'
    },
    Branch: {
        description:
            'Branch is the execution scenario of the same Policy.\n\nBASE keeps the original daily signal direction without inversion (LONG stays LONG, SHORT stays SHORT).\n\nANTI-D checks the anti-direction rule every day. If the rule fires, direction is forcibly inverted (LONG -> SHORT, SHORT -> LONG).\n\nOne mandatory anti-direction filter is MinMove inside the working range (0.5%-12%).\n\nThis comparison shows whether inversion reduces stress-day risk without causing a critical loss of return.',
        tooltip:
            'Execution scenario of the same Policy: BASE keeps the original direction, ANTI-D can invert it when anti-direction conditions fire.'
    },
    'SL Mode': {
        description:
            'SL Mode is the switch for trade-exit mechanics.\n\nWITH SL keeps protective stop-loss enabled. The trade can close by stop-loss, take-profit, liquidation, or EndOfDay.\n\nNO SL disables the protective stop-loss, so the trade can close only by take-profit, liquidation, or EndOfDay.\n\nRisk in NO SL:\nfor isolated margin this raises the chance of losing the full trade margin.\n\nFor cross margin this raises the chance of losing the whole bucket balance.',
        tooltip:
            'Exit-mechanics mode for the row: WITH SL keeps protective stop-loss, NO SL removes it and leaves only take-profit, liquidation, or EndOfDay exits.'
    },
    Days: {
        description: 'Total trading days in this policy/branch slice (trade and no-trade days).',
        tooltip: 'Total days in slice.'
    },
    StartDay: {
        description: 'First UTC day key of the analyzed period.',
        tooltip: 'Period start day (UTC).'
    },
    EndDay: {
        description: 'Last UTC day key of the analyzed period.',
        tooltip: 'Period end day (UTC).'
    },
    StopReason: {
        description:
            'Why the series ended.\n\nEnd of period means the test reached the final day of the window. That is the normal and healthy completion path.\n\nLiquidation (early stop) means the exchange force-closed a position because loss became critical.\n\nEarly stop without liquidation means the exchange did not force-close the trade, but the working balance was destroyed by a sequence of losses and the ruin scenario (AccRuin) fired.',
        tooltip: 'Why this simulation slice ended exactly here.'
    },
    Miss: {
        description:
            'Missing days inside [StartDay..EndDay] in "weekday | weekend" format. Weekend misses are expected under weekend-skip.',
        tooltip: 'Missing days: weekday | weekend.'
    },
    'Trade%': {
        description:
            'Share of days with a real trade: TradeDays / Days * 100. A day counts as a trading day only after all filters are passed: a valid direction exists, policy-skip did not fire, cap fraction is above 0, and entry is not blocked by the risk filter.',
        tooltip: 'Percent of days that actually turned into trades.'
    },
    'Long%': {
        description: 'Share of days where final action was LONG.',
        tooltip: 'Percent of LONG days.'
    },
    'Short%': {
        description: 'Share of days where final action was SHORT.',
        tooltip: 'Percent of SHORT days.'
    },
    'NoTrade%': {
        description:
            'Share of days without trades. A no-trade day appears when the model has no valid direction, policy-skip blocks the day, a risk filter blocks entry, or cap fraction is reduced to 0.\n\nA high value does not automatically mean the policy is bad, but it does mean the strategy acts less often and the sample of actual trades becomes thinner.',
        tooltip: 'Percent of days where the strategy did not open a trade.'
    },
    'RiskDay%': {
        description: 'Share of days flagged as risk days by the SL layer.',
        tooltip: 'Percent of risk days.'
    },
    'AntiD%': {
        description: 'Share of days where anti-direction overlay was actually applied.',
        tooltip: 'Percent of days with anti-direction applied.'
    },
    'AntiD|Risk%': {
        description: 'Anti-direction application rate inside risk days only.',
        tooltip: 'Anti-direction rate within risk days.'
    },
    'Lev avg/min/max': {
        description: 'Average, minimum, and maximum leverage used on trade days.',
        tooltip: 'Leverage avg/min/max.'
    },
    'Lev p50/p90': {
        description: 'Leverage distribution quantiles on trade days: median (p50) and upper tail (p90).',
        tooltip: 'Leverage p50/p90.'
    },
    'Cap avg/min/max': {
        description: 'Average, minimum, and maximum cap fraction used per trade.',
        tooltip: 'Cap fraction avg/min/max.'
    },
    'Cap p50/p90': {
        description: 'Cap fraction quantiles on trade days: p50 and p90.',
        tooltip: 'Cap fraction p50/p90.'
    },
    CapAp: {
        description: 'Count of days where cap filter was applied and trade was executed.',
        tooltip: 'Days with cap applied.'
    },
    CapSk: {
        description: 'Count of days skipped because cap fraction disabled entry.',
        tooltip: 'Days skipped by cap fraction.'
    },
    'AvgStake%': {
        description: 'Average margin per trade in percent of total start capital.',
        tooltip: 'Average stake, %.'
    },
    AvgStake$: {
        description: 'Average margin per trade in USD.',
        tooltip: 'Average stake, $.'
    },
    'Exposure% (avg/p50/p90/p99/max)': {
        description: 'Trade-level exposure distribution in %: avg, p50, p90, p99, max.',
        tooltip: 'Exposure distribution per trade.'
    },
    'HighExposureTr% (>=20/50)': {
        description: 'Share of trades with high exposure thresholds: >=20% and >=50%.',
        tooltip: 'High-exposure trade share (>=20% / >=50%).'
    },
    'DailyTP%': {
        description: 'Daily TP threshold distribution (avg/min/max), in % from entry.',
        tooltip: 'Daily TP avg/min/max, %.'
    },
    'DailySL%': {
        description: 'Daily SL threshold distribution (avg/min/max), in % from entry.',
        tooltip: 'Daily SL avg/min/max, %.'
    },
    'DynTP/SL Days': {
        description: 'Unique days where the DYNAMIC risk overlay was actually applied.',
        tooltip: 'Days with dynamic TP/SL.'
    },
    'DynTP/SL Tr': {
        description: 'Trades where the DYNAMIC risk overlay was actually applied.',
        tooltip: 'Trades with dynamic TP/SL.'
    },
    'DynTP/SL PnL%': {
        description: 'PnL contribution from DYNAMIC risk trades, in % of StartCap$.',
        tooltip: 'Dynamic TP/SL contribution, %.'
    },
    'StatTP/SL Days': {
        description: 'Unique days where trades stayed in STATIC base mode without dynamic overlay.',
        tooltip: 'Days with static TP/SL.'
    },
    'StatTP/SL Tr': {
        description: 'Trades that stayed in STATIC base mode without dynamic overlay.',
        tooltip: 'Trades with static TP/SL.'
    },
    'StatTP/SL PnL%': {
        description: 'PnL contribution from STATIC base trades, in % of StartCap$.',
        tooltip: 'Static TP/SL contribution, %.'
    },
    'DelayedTP%': {
        description: 'Average delayed-entry TP threshold, % from entry.',
        tooltip: 'Delayed TP, %.'
    },
    'DelayedSL%': {
        description: 'Average delayed-entry SL threshold, % from entry.',
        tooltip: 'Delayed SL, %.'
    },
    Tr: {
        description: 'Total number of trades in this row.',
        tooltip: 'Trade count.'
    },
    'TotalPnl%': {
        description:
            'Total profit or loss relative to the start capital of the selected slice, in %. This metric answers how much the slice earned or lost from its initial capital base.\n\nIts value also depends on the selected metric mode: in REAL it is the factual result, while in NO BIGGEST LIQ LOSS it is recalculated after removing one largest liquidation for tail-risk analysis.',
        tooltip: 'Total profit or loss relative to slice start capital, in %.'
    },
    TotalPnl$: {
        description:
            'Total profit or loss in USD for the selected slice. Unlike TotalPnl%, this is the absolute money result, not a normalized percentage.\n\nIt is useful for business reading because it shows how large the effect is in dollars, not only in relative return terms.',
        tooltip: 'Total profit or loss in USD for the slice.'
    },
    BucketNow$: {
        description: 'Current capital of selected bucket after all closed trades.',
        tooltip: 'Current bucket capital, $.'
    },
    'Wealth%': {
        description:
            'Wealth-based growth in %: (equity now + withdrawn profit - start capital) / start capital * 100.\n\nUnlike TotalPnl%, Wealth% explicitly includes money already withdrawn from the slice, so it reflects total accumulated wealth rather than only current in-slice capital.',
        tooltip: 'Total wealth growth including withdrawn profit, in %.'
    },
    'MaxDD%': {
        description:
            'Maximum drawdown: the deepest capital drop from a local peak to the following minimum, in %.\n\nIn REAL it is the factual drawdown. In NO BIGGEST LIQ LOSS it is recalculated after removing one largest liquidation.\n\nThis is one of the main survival metrics of the row: a deeper MaxDD means the business must tolerate a larger capital collapse before recovery starts.',
        tooltip: 'Deepest peak-to-trough capital decline, in %.'
    },
    'MaxDD_NoLiq%': {
        description: 'Maximum drawdown excluding liquidation effects, in %.',
        tooltip: 'Max drawdown without liquidation, %.'
    },
    'MaxDD_Active%': {
        description: 'Maximum drawdown based on active equity curve, in %.',
        tooltip: 'Max active drawdown, %.'
    },
    Sharpe: {
        description: 'Sharpe ratio for this row.',
        tooltip: 'Sharpe ratio.'
    },
    Sortino: {
        description: 'Sortino ratio for this row.',
        tooltip: 'Sortino ratio.'
    },
    Calmar: {
        description: 'Calmar ratio for this row.',
        tooltip: 'Calmar ratio.'
    },
    'CAGR%': {
        description: 'Compound annual growth rate, in %.',
        tooltip: 'CAGR, %.'
    },
    'WinRate%': {
        description: 'Share of profitable trades, in %.',
        tooltip: 'Win rate, %.'
    },
    'MeanRet%': {
        description: 'Average trade/day return in % (per row semantics).',
        tooltip: 'Mean return, %.'
    },
    'StdRet%': {
        description: 'Standard deviation of returns, in %.',
        tooltip: 'Return standard deviation, %.'
    },
    'DownStd%': {
        description: 'Downside standard deviation of returns, in %.',
        tooltip: 'Downside deviation, %.'
    },
    'MaxDD_Ratio%': {
        description: 'Drawdown ratio metric in % for risk diagnostics.',
        tooltip: 'MaxDD ratio, %.'
    },
    Withdrawn$: {
        description: 'Total withdrawn profit in USD.',
        tooltip: 'Withdrawn profit, $.'
    },
    OnExch$: {
        description: 'Capital still on exchange in USD.',
        tooltip: 'On-exchange capital, $.'
    },
    StartCap$: {
        description: 'Start capital baseline in USD for this row.',
        tooltip: 'Start capital, $.'
    },
    HadLiq: {
        description:
            'HadLiq tracks liquidation events in this row.\n\nFor a single bucket row it behaves like a flag: 0 means no liquidation, 1 means at least one position was force-closed by the exchange.\n\nFor total aggregate it can represent how many buckets among daily / intraday / delayed suffered liquidation.\n\nThis is an аварийный risk metric: even one liquidation can erase the profit of many normal days.',
        tooltip: 'Whether the row had liquidation events.'
    },
    AccRuin: {
        description:
            'AccRuin is the ruin metric of the working bucket capital.\n\nA bucket is considered ruined when it is explicitly marked as dead or when EquityNow / StartCapital falls to 20% or below, which means 80% or more of the start capital was lost.\n\nFor a single bucket row this is usually 0 or 1. For total aggregate it can show how many buckets were ruined.\n\nThis is stricter than ordinary drawdown: ruin means the strategy is no longer operational on that capital base.',
        tooltip: 'Whether working capital reached the ruin threshold.'
    },
    RealLiq: {
        description: 'Count/flag of real liquidations using strict liquidation criterion.',
        tooltip: 'Real liquidation.'
    },
    EODExit_n: {
        description: 'Number of trades closed by EndOfDay.',
        tooltip: 'EndOfDay exits count.'
    },
    'EODExit%': {
        description: 'Share of trades closed by EndOfDay: EODExit_n / Tr * 100.',
        tooltip: 'EndOfDay exits, %.'
    },
    EODExit$: {
        description: 'Sum of NetPnl$ for EndOfDay exits only.',
        tooltip: 'EndOfDay PnL, $.'
    },
    'EODExit_AvgRet%': {
        description: 'Average NetRet% for EndOfDay exits only.',
        tooltip: 'EndOfDay average return, %.'
    },
    LiqBeforeSL_n: {
        description: 'Cases where liquidation happened before SL trigger.',
        tooltip: 'Liquidation before SL, count.'
    },
    LiqBeforeSL_BadSL_n: {
        description: 'Subset of LiqBeforeSL_n where SL level was beyond liquidation level.',
        tooltip: 'Bad-SL liquidation-before-SL cases.'
    },
    LiqBeforeSL_Same1m_n: {
        description: 'Subset of LiqBeforeSL_n where SL and liquidation touched in the same 1m candle.',
        tooltip: 'Same-1m SL/liquidation conflicts.'
    },
    LiqBeforeSL$: {
        description: 'Total NetPnl$ of trades where liquidation happened before SL.',
        tooltip: 'PnL of liquidation-before-SL trades, $.'
    },
    'BalMin%': {
        description: 'Minimum active equity as % of StartCap$.',
        tooltip: 'Minimum active balance, %.'
    },
    BalDead: {
        description: 'Flag showing equity dropped below balance-death threshold.',
        tooltip: 'Balance-death flag.'
    },
    Recovered: {
        description:
            'Recovered is the recovery flag after the MaxDD episode on active equity.\n\nThe check is simple: after the MaxDD bottom, the current balance must return to the peak that existed before that drawdown.\n\ntrue means the old peak was regained; false means the series ended without full recovery.',
        tooltip: 'Whether the row fully recovered after its deepest drawdown.'
    },
    RecovDays: {
        description:
            'Calendar days from the MaxDD bottom to the moment when balance returns to the peak before that drawdown.\n\nIf recovery never happened, the raw calculation keeps -1 and the table renders an empty / unavailable marker instead.\n\nThis metric shows not only whether recovery exists, but also how long the business has to wait for it.',
        tooltip: 'Time needed to recover from MaxDD, in calendar days.'
    },
    RecovSignals: {
        description: 'Trade-day count needed for recovery after MaxDD.',
        tooltip: 'Recovery signals count.'
    },
    'Time<35%': {
        description: 'Time spent with equity below 35% of StartCap$, measured in days.',
        tooltip: 'Time below 35%, days.'
    },
    'ReqGain%': {
        description:
            'Required gain from the MaxDD bottom to return to the peak before that drawdown.\n\nFormula: ReqGain% = (1 / (1 - MaxDD) - 1) * 100.\n\nInterpretation is direct: the lower the value, the more realistic the recovery. 100%+ already means a heavy comeback requirement, and 200%+ is extremely demanding.',
        tooltip: 'Required rebound from drawdown bottom back to the previous peak, in %.'
    },
    'DD70_Min%': {
        description: 'Minimum equity in deepest episode where equity fell below 70% of start.',
        tooltip: 'Minimum in DD<70% episode.'
    },
    DD70_Recov: {
        description: 'Whether equity recovered above 70% after deepest DD<70% episode.',
        tooltip: 'Recovered above 70%.'
    },
    DD70_RecovDays: {
        description: 'Calendar days to recover above 70% after deepest DD<70% episode.',
        tooltip: 'Days to recover above 70%.'
    },
    DD70_n: {
        description: 'Count of episodes where equity dropped below 70% of start.',
        tooltip: 'Number of DD<70% episodes.'
    },
    HorizonDays: {
        description: 'Calendar length of simulation horizon in days.',
        tooltip: 'Simulation horizon, days.'
    },
    'AvgDay%': {
        description: 'Geometric average daily return, in %.',
        tooltip: 'Average day return, %.'
    },
    'AvgWeek%': {
        description: 'Geometric average weekly return, in %.',
        tooltip: 'Average week return, %.'
    },
    'AvgMonth%': {
        description: 'Geometric average monthly return, in %.',
        tooltip: 'Average month return, %.'
    },
    'AvgYear%': {
        description: 'Geometric average annual return, in %.',
        tooltip: 'Average year return, %.'
    },
    'Long n': {
        description: 'Number of LONG trades.',
        tooltip: 'LONG trades count.'
    },
    'Short n': {
        description: 'Number of SHORT trades.',
        tooltip: 'SHORT trades count.'
    },
    'Long $': {
        description: 'Total PnL contribution of LONG trades, in USD.',
        tooltip: 'LONG PnL, $.'
    },
    'Short $': {
        description: 'Total PnL contribution of SHORT trades, in USD.',
        tooltip: 'SHORT PnL, $.'
    },
    'AvgLong%': {
        description: 'Average return per LONG trade, in %.',
        tooltip: 'Average LONG return, %.'
    },
    'AvgShort%': {
        description: 'Average return per SHORT trade, in %.',
        tooltip: 'Average SHORT return, %.'
    },
    inv_liq_mismatch: {
        description: 'Diagnostic count of liquidation-invariant mismatches. Should be zero.',
        tooltip: 'Liquidation invariant mismatches.'
    },
    minutes_anomaly: {
        description: 'Diagnostic count of minute-level data anomalies. Should be zero in healthy datasets.',
        tooltip: 'Minute-data anomalies.'
    }
}

function resolveManualEnglishTermTranslationOrThrow(key: string): PolicyBranchMegaManualTranslation {
    const translation = POLICY_BRANCH_MEGA_MANUAL_EN[key]
    if (!translation) {
        throw new Error(`[policy-branch-mega] manual en translation is missing for term=${key}.`)
    }

    if (!translation.description || !translation.tooltip) {
        throw new Error(`[policy-branch-mega] manual en translation is empty for term=${key}.`)
    }

    return translation
}

function resolveEnglishTermContentOrThrow(key: string): PolicyBranchMegaResolvedLocaleContent {
    const translation = resolveManualEnglishTermTranslationOrThrow(key)

    return {
        description: translation.description,
        readingHint: translation.readingHint ?? resolveEnglishTermReadingHintOrDefault(key),
        example:
            typeof translation.example === 'undefined' ? resolveEnglishTermExampleHintOrNull(key) : translation.example,
        tooltip: translation.tooltip
    }
}

function resolveRuTermContentOrThrow(term: PolicyBranchMegaTermDraft, key: string): PolicyBranchMegaResolvedLocaleContent {
    if (!term.description || term.description.trim().length === 0) {
        throw new Error(`[policy-branch-mega] description is empty for term=${key}.`)
    }

    const tooltip =
        typeof term.tooltip === 'undefined' || term.tooltip === POLICY_BRANCH_MEGA_TOOLTIP_FROM_DESCRIPTION ?
            term.description
        :   term.tooltip

    if (typeof tooltip !== 'string' || tooltip.trim().length === 0) {
        throw new Error(`[policy-branch-mega] tooltip is empty for term=${key}.`)
    }

    return {
        description: term.description,
        readingHint: resolveTermReadingHintOrDefault(key),
        example: resolveTermExampleHintOrNull(key),
        tooltip
    }
}

function resolvePolicyBranchMegaTermContentOrThrow(
    term: PolicyBranchMegaTermDraft,
    key: string,
    locale: PolicyBranchMegaTermLocale
): PolicyBranchMegaResolvedLocaleContent {
    return locale === 'en' ? resolveEnglishTermContentOrThrow(key) : resolveRuTermContentOrThrow(term, key)
}

function buildUserFacingTermDescriptionOrThrow(
    term: PolicyBranchMegaTermDraft,
    key: string,
    locale: PolicyBranchMegaTermLocale
): string {
    const content = resolvePolicyBranchMegaTermContentOrThrow(term, key, locale)
    const base = normalizeLocaleAwareTermBlock(content.description, locale)
    const reading = normalizeLocaleAwareTermBlock(content.readingHint, locale)
    const exampleBlock =
        typeof content.example === 'string' && content.example.trim().length > 0 ?
            normalizeLocaleAwareTermBlock(`${resolveExampleLabel(locale)}: ${content.example}`, locale)
        :   ''

    const blocks = [
        base,
        `${resolveReadingLabel(locale)}: ${reading}`,
        exampleBlock
    ].filter((block): block is string => Boolean(block))

    return blocks.join('\n\n')
}

function resolvePolicyBranchMegaTermTooltipOrThrow(
    term: PolicyBranchMegaTermDraft,
    key: string,
    tooltipMode: PolicyBranchMegaTooltipResolutionMode,
    resolvedDescription: string,
    locale: PolicyBranchMegaTermLocale
): string {
    if (tooltipMode === 'description') {
        return resolvedDescription
    }

    const content = resolvePolicyBranchMegaTermContentOrThrow(term, key, locale)
    return normalizeLocaleAwareTermBlock(content.tooltip, locale)
}

function resolvePolicyBranchMegaTermDraftOrThrow(key: string): PolicyBranchMegaTermDraft {
    const term = TERMS[key]
    if (!term) {
        throw new Error(`[policy-branch-mega] unknown column term: ${key}`)
    }

    return term
}

export function getPolicyBranchMegaTermOrThrow(
    title: string,
    options?: PolicyBranchMegaTermResolveOptions
): PolicyBranchMegaTermDefinition {
    const key = normalizeTermKey(title ?? '')
    if (!key) {
        throw new Error('[policy-branch-mega] column title is empty.')
    }

    const term = resolvePolicyBranchMegaTermDraftOrThrow(key)

    const locale = options?.locale ?? 'ru'
    const resolvedDescription = buildUserFacingTermDescriptionOrThrow(term, key, locale)

    return {
        key: term.key,
        title: term.title,
        description: resolvedDescription,
        tooltip: resolvePolicyBranchMegaTermTooltipOrThrow(
            term,
            key,
            options?.tooltipMode ?? POLICY_BRANCH_MEGA_DEFAULT_TOOLTIP_MODE,
            resolvedDescription,
            locale
        )
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

        const term = resolvePolicyBranchMegaTermDraftOrThrow(column)
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

export function orderPolicyBranchMegaSectionsOrThrow(sections: TableSectionDto[]): TableSectionDto[] {
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

        const term = getPolicyBranchMegaTermOrThrow(column, options)
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

    if (upper.includes('PART 1/3')) {
        if (locale === 'en') {
            return `${prefix}Part 1/3: baseline summary for activity, risk days, leverage/cap usage and core PnL metrics (up to MaxDD_Ratio%).`
        }

        return `${prefix}Часть 1/3: базовая сводка по дням, риск‑дням, плечу/кап‑доле и ключевым PnL‑метрикам (до MaxDD_Ratio%).`
    }

    if (upper.includes('PART 2/3')) {
        if (locale === 'en') {
            return `${prefix}Part 2/3: balance and recovery metrics (Withdrawn/OnExch, liquidations, recovery, DD70).`
        }

        return `${prefix}Часть 2/3: балансные и восстановительные метрики (Withdrawn/OnExch, ликвидации, recovery, DD70).`
    }

    if (upper.includes('PART 3/3')) {
        if (locale === 'en') {
            return `${prefix}Part 3/3: horizon and average growth rates, long/short split and diagnostic counters.`
        }

        return `${prefix}Часть 3/3: горизонт и средние темпы роста, разрез long/short и диагностические счётчики.`
    }

    return null
}
