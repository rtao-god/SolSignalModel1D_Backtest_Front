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

const MEGA_TITLE_MARKER = 'Policy Branch Mega'
const TERMS: Record<string, PolicyBranchMegaTermDefinition> = {
    Policy: {
        key: 'Policy',
        title: 'Policy',
        description:
            'Имя торговой политики (PolicySpec.Name). Это именно логика принятия решений и управления риском, а не режим ветки. Одно и то же имя встречается в разных ветках (BASE/ANTI-D).',
        tooltip: 'Название торговой политики.'
    },
    Branch: {
        key: 'Branch',
        title: 'Branch',
        description:
            'Ветка симуляции: BASE использует базовое направление, ANTI-D включает анти-направление в риск‑дни. Anti‑D применяется только если SL‑слой пометил день как рискованный, MinMove в диапазоне 0.5–12% и запас до ликвидации ≥ 2× MinMove.',
        tooltip: 'BASE или ANTI-D (с анти-направлением при риск‑триггере).'
    },
    Days: {
        key: 'Days',
        title: 'Days',
        description:
            'Количество календарных дней, попавших в расчёт по данной политике и ветке. Включает торговые и no‑trade дни. Для динамических политик берётся длина trace‑сигналов, для статических — число записей дневного ряда после учёта раннего stop.',
        tooltip: 'Сколько дней было в расчёте для этой политики/ветки.'
    },
    StartDay: {
        key: 'StartDay',
        title: 'StartDay',
        description:
            'Первая дата (UTC day‑key) среди дней, реально наблюдавшихся в расчёте. Нужна, чтобы правильно считать пропуски и границы периода.',
        tooltip: 'Первая дата периода (UTC).'
    },
    EndDay: {
        key: 'EndDay',
        title: 'EndDay',
        description:
            'Последняя дата (UTC day‑key) среди наблюдавшихся дней. Если был ранний stop, EndDay фиксируется на день остановки.',
        tooltip: 'Последняя дата периода (UTC).'
    },
    StopReason: {
        key: 'StopReason',
        title: 'StopReason',
        description:
            'Причина завершения периода: "До конца периода" — дошли до последнего дня истории; "Ликвидация (ранний stop)" — ранняя остановка только когда умерли все реально используемые бакеты; "Ранний stop без ликвидации" — ранняя остановка без hard-stop. Важно: отдельные liquidation-сделки при этом могут быть (см. HadLiq).',
        tooltip: 'Почему период завершился именно здесь.'
    },
    Miss: {
        key: 'Miss',
        title: 'Miss',
        description:
            'Пропуски внутри [StartDay..EndDay] в формате "будни | выходные". Слева — невыходные пропуски (обычно аномалии данных/trace), справа — выходные пропуски (ожидаемые при weekend-skip).',
        tooltip: 'Пропуски: "будни | выходные" (например, "0 | 21").'
    },
    'Trade%': {
        key: 'Trade%',
        title: 'Trade%',
        description:
            'Доля дней с реальной сделкой: TradeDays / Days * 100. День считается торговым только после всех фильтров (направление, policy‑skip, cap=0 и т.п.).',
        tooltip: 'Процент торговых дней.'
    },
    'Long%': {
        key: 'Long%',
        title: 'Long%',
        description:
            'Доля дней, где финальное решение было LONG: LongDays / Days * 100. Учитывает anti‑direction, если он применён.',
        tooltip: 'Процент дней с LONG.'
    },
    'Short%': {
        key: 'Short%',
        title: 'Short%',
        description:
            'Доля дней, где финальное решение было SHORT: ShortDays / Days * 100. Учитывает anti‑direction, если он применён.',
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
            'Доля дней, которые SL‑модель пометила как рискованные (SlHighDecision == true): RiskDays / Days * 100. Если SL‑слой не применим, такие дни не считаются риск‑днями.',
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
            'Среднее/минимальное/максимальное плечо по торговым дням. Для статических политик плечо берётся из ResolveLeverage, для динамических — из trace. Если плечо константное, может выводиться одно значение.',
        tooltip: 'Среднее/мин/макс плечо по торговым дням.'
    },
    'Lev p50/p90': {
        key: 'Lev p50/p90',
        title: 'Lev p50/p90',
        description:
            'Квантили плеча по торговым дням: p50 (медиана) и p90 (верхний хвост). Считаются по тем же значениям плеча, что и Lev avg/min/max.',
        tooltip: 'Медиана и p90 по плечу.'
    },
    'Cap avg/min/max': {
        key: 'Cap avg/min/max',
        title: 'Cap avg/min/max',
        description:
            'Средняя/минимальная/максимальная доля капитала (cap fraction), использованная в сделках. Значение берётся из cap‑политики или trace и выводится в процентах от капитала.',
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
            'Сколько дней cap‑фильтр был применён (cap fraction > 0) и сделка действительно произошла. Для динамических политик обычно совпадает с TradeDays.',
        tooltip: 'Дни, где cap применился.'
    },
    CapSk: {
        key: 'CapSk',
        title: 'CapSk',
        description:
            'Сколько дней были пропущены из‑за cap fraction = 0. Для статических политик это прямой запрет на сделку; для динамических обычно 0.',
        tooltip: 'Дни, где cap=0 запретил сделку.'
    },
    'AvgStake%': {
        key: 'AvgStake%',
        title: 'AvgStake%',
        description:
            'Средняя маржа на сделку (Daily + Delayed) в процентах от total capital (сумма стартовых бакетов). Считается по MarginUsed, то есть это доля депозита ДО плеча, не notional.',
        tooltip: 'Средняя маржа на сделку, % от total capital.'
    },
    'AvgStake$': {
        key: 'AvgStake$',
        title: 'AvgStake$',
        description:
            'Средняя маржа на сделку (Daily + Delayed) в долларах. Это та же AvgStake%, но в денежном эквиваленте.',
        tooltip: 'Средняя маржа на сделку, $.'
    },
    'DailyTP%': {
        key: 'DailyTP%',
        title: 'DailyTP%',
        description:
            'Фактический дневной take‑profit, который использовался в daily‑сделках. Формат: avg/min/max в процентах от цены входа. Значение динамическое и меняется по уверенности модели.',
        tooltip: 'Дневной TP: avg/min/max, % от входа.'
    },
    'DailySL%': {
        key: 'DailySL%',
        title: 'DailySL%',
        description:
            'Фактический дневной stop‑loss, который использовался в daily‑сделках. Формат: avg/min/max в процентах от цены входа. В режиме NO SL значения равны 0.',
        tooltip: 'Дневной SL: avg/min/max, % от входа.'
    },
    'DelayedTP%': {
        key: 'DelayedTP%',
        title: 'DelayedTP%',
        description:
            'Средний intraday TP порог для delayed‑сделок (DelayedA/DelayedB) по дням, где delayed действительно была. Берётся из DelayedIntradayTpPct (causal‑слой).',
        tooltip: 'Средний intraday TP для delayed, % от входа.'
    },
    'DelayedSL%': {
        key: 'DelayedSL%',
        title: 'DelayedSL%',
        description:
            'Средний intraday SL порог для delayed‑сделок по дням, где delayed была. В режиме NO SL всегда 0, потому что intraday SL отключён.',
        tooltip: 'Средний intraday SL для delayed, % от входа.'
    },
    Tr: {
        key: 'Tr',
        title: 'Tr',
        description:
            'Общее число сделок в бэктесте по данной политике/ветке (Trades.Count). Это не число дней, а количество отдельных позиций.',
        tooltip: 'Количество сделок.'
    },
    'TotalPnl%': {
        key: 'TotalPnl%',
        title: 'TotalPnl%',
        description:
            'Суммарная доходность в процентах по результату PnL-движка. В режиме REAL считается по фактическому прогону. В режиме NO BIGGEST LIQ LOSS это контрфакт: из расчёта исключена одна самая убыточная ликвидационная сделка.',
        tooltip: 'Итоговая доходность, %.'
    },
    'TotalPnl$': {
        key: 'TotalPnl$',
        title: 'TotalPnl$',
        description:
            'Суммарная прибыль/убыток в долларах по wealth-базе: (equity now + withdrawn) − start capital. Как и TotalPnl%, зависит от выбранного режима метрик: REAL или NO BIGGEST LIQ LOSS.',
        tooltip: 'Итоговый PnL в $ по wealth‑базе.'
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
            'Максимальная просадка из PnL-кривой. В REAL — фактическая просадка. В NO BIGGEST LIQ LOSS — пересчитанная контрфактическая просадка после исключения одной самой убыточной ликвидации.',
        tooltip: 'Максимальная просадка, %.'
    },
    'MaxDD_NoLiq%': {
        key: 'MaxDD_NoLiq%',
        title: 'MaxDD_NoLiq%',
        description:
            'Максимальная просадка без учёта ликвидаций. Помогает понять «обычную» глубину падения, если исключить крайние события.',
        tooltip: 'MaxDD без ликвидаций, %.'
    },
    'MaxDD_Active%': {
        key: 'MaxDD_Active%',
        title: 'MaxDD_Active%',
        description:
            'Максимальная просадка по active equity (сумма bucket‑equity), рассчитанная по реальным выходам сделок. Часто отличается от MaxDD%, так как использует другую кривую.',
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
            'Доля прибыльных сделок: trades with NetReturnPct > 0 / total trades * 100. Считается по отдельным сделкам, а не по дням.',
        tooltip: 'Процент прибыльных сделок.'
    },
    'MeanRet%': {
        key: 'MeanRet%',
        title: 'MeanRet%',
        description:
            'Средняя дневная доходность (mean) после агрегации сделок в дневную серию. Каждая сделка даёт вклад = NetReturn% * (PositionUsd / TotalCapital). Выводится в процентах.',
        tooltip: 'Средняя дневная доходность, %.'
    },
    'StdRet%': {
        key: 'StdRet%',
        title: 'StdRet%',
        description:
            'Стандартное отклонение дневных доходностей (volatility) по той же дневной серии, что используется для Sharpe. Выводится в процентах.',
        tooltip: 'Волатильность дневных доходностей, %.'
    },
    'DownStd%': {
        key: 'DownStd%',
        title: 'DownStd%',
        description:
            'Downside deviation: стандартное отклонение отрицательных дневных доходностей (все положительные значения обнуляются). Используется в Sortino.',
        tooltip: 'Downside‑волатильность, %.'
    },
    'MaxDD_Ratio%': {
        key: 'MaxDD_Ratio%',
        title: 'MaxDD_Ratio%',
        description:
            'Максимальная просадка на дневной кривой ratio‑метрик (equity строится из дневных доходностей). Это отдельная кривая, поэтому значение может отличаться от MaxDD%.',
        tooltip: 'MaxDD на дневной ratio‑кривой.'
    },
    'Withdrawn$': {
        key: 'Withdrawn$',
        title: 'Withdrawn$',
        description:
            'Сумма выведенной прибыли в долларах (WithdrawnTotal). Это деньги, которые «сняты» с баланса, когда equity превышал стартовый капитал.',
        tooltip: 'Сумма выведенной прибыли, $.'
    },
    'OnExch$': {
        key: 'OnExch$',
        title: 'OnExch$',
        description:
            'Текущая equity на бирже (equityNow) — сумма по всем бакетам. Это то, что осталось «в работе», без учёта выводов.',
        tooltip: 'Текущая equity на бирже, $.'
    },
    'StartCap$': {
        key: 'StartCap$',
        title: 'StartCap$',
        description:
            'Стартовый капитал, суммарно по всем бакетам (StartCapital). Используется как база для wealth‑метрик.',
        tooltip: 'Стартовый капитал, $.'
    },
    HadLiq: {
        key: 'HadLiq',
        title: 'HadLiq',
        description:
            'Флаг ликвидации: для фьючерсов — есть хотя бы одна сделка с IsLiquidated; для спота — финальная equity ≤ 10% от старта (ruin). Это флаг риска, не причина stop.',
        tooltip: 'Была ли ликвидация (по правилу отображения).'
    },
    AccRuin: {
        key: 'AccRuin',
        title: 'AccRuin',
        description:
            'Account Ruin Count: 1, если к концу активного периода умерли все бакеты, реально используемые политикой; иначе 0. Это метрика hard-stop, а не просто факт отдельных liquidation-сделок.',
        tooltip: 'Hard-stop: умерли все используемые бакеты (1/0).'
    },
    RealLiq: {
        key: 'RealLiq',
        title: 'RealLiq',
        description:
            'Количество реальных ликвидаций (IsRealLiquidation) по сделкам. Для Cross выводится "—", потому что там важнее сам факт смерти, а не число ликвидаций.',
        tooltip: 'Число реальных ликвидаций (Isolated).'
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
            'Показывает, восстановилась ли equity после максимальной просадки до своего предыдущего пика. Считается по active equity кривой.',
        tooltip: 'Было ли восстановление после MaxDD.'
    },
    RecovDays: {
        key: 'RecovDays',
        title: 'RecovDays',
        description:
            'Сколько календарных дней прошло от дна максимальной просадки до восстановления выше пика. Если восстановления не было — выводится "—".',
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
            'Требуемый рост от дна MaxDD до прежнего пика: (1 / (1 − MaxDD) − 1) * 100. Если MaxDD почти 100%, значение становится INF.',
        tooltip: 'Сколько % нужно отыграть после MaxDD.'
    },
    'DD70_Min%': {
        key: 'DD70_Min%',
        title: 'DD70_Min%',
        description:
            'Минимальная equity в самом глубоком эпизоде, когда equity падала ниже 70% от старта. Это аналитический порог, не стоп.',
        tooltip: 'Минимум в эпизоде equity < 70%.'
    },
    'DD70_Recov': {
        key: 'DD70_Recov',
        title: 'DD70_Recov',
        description:
            'Флаг восстановления после глубокой просадки: поднялась ли equity обратно выше 70% после самого глубокого эпизода.',
        tooltip: 'Было ли восстановление выше 70%.'
    },
    'DD70_RecovDays': {
        key: 'DD70_RecovDays',
        title: 'DD70_RecovDays',
        description:
            'Сколько календарных дней прошло от минимума глубокой просадки до восстановления выше 70%. Если восстановления не было — выводится "—".',
        tooltip: 'Дни до восстановления выше 70%.'
    },
    'DD70_n': {
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
            'Длина тестового горизонта в календарных днях между первой и последней сделкой. Используется для расчёта AvgDay/AvgWeek/AvgMonth/AvgYear.',
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
            'Количество LONG‑сделок по данной политике/ветке. Это именно число сделок, не дней.',
        tooltip: 'Сколько long‑сделок.'
    },
    'Short n': {
        key: 'Short n',
        title: 'Short n',
        description:
            'Количество SHORT‑сделок по данной политике/ветке. Это именно число сделок, не дней.',
        tooltip: 'Сколько short‑сделок.'
    },
    'Long $': {
        key: 'Long $',
        title: 'Long $',
        description:
            'Денежный PnL по LONG‑сделкам. Сначала считается как сумма PositionUsd * NetReturn%, затем масштабируется так, чтобы Long$ + Short$ совпадали с TotalPnl$.',
        tooltip: 'PnL по LONG‑сделкам, $.'
    },
    'Short $': {
        key: 'Short $',
        title: 'Short $',
        description:
            'Денежный PnL по SHORT‑сделкам. Логика та же, что у Long$, с финальной подгонкой к общему TotalPnl$.',
        tooltip: 'PnL по SHORT‑сделкам, $.'
    },
    'AvgLong%': {
        key: 'AvgLong%',
        title: 'AvgLong%',
        description:
            'Средняя NetReturn% по LONG‑сделкам (простое среднее по сделкам). Не учитывает размер позиции.',
        tooltip: 'Средняя доходность long‑сделки, %.'
    },
    'AvgShort%': {
        key: 'AvgShort%',
        title: 'AvgShort%',
        description:
            'Средняя NetReturn% по SHORT‑сделкам (простое среднее по сделкам). Не учитывает размер позиции.',
        tooltip: 'Средняя доходность short‑сделки, %.'
    },
    inv_liq_mismatch: {
        key: 'inv_liq_mismatch',
        title: 'inv_liq_mismatch',
        description:
            'Количество диагностических несоответствий по ликвидации (инварианты). Любое ненулевое значение требует проверки пайплайна.',
        tooltip: 'Диагностические несоответствия по ликвидациям.'
    },
    minutes_anomaly: {
        key: 'minutes_anomaly',
        title: 'minutes_anomaly',
        description:
            'Количество аномалий по минутным данным (gaps/ошибки в 1m‑серии), выявленных во время бэктеста. Это не метрика стратегии, а качество данных.',
        tooltip: 'Аномалии минутных данных.'
    }
}
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

export function getPolicyBranchMegaTermOrThrow(title: string): PolicyBranchMegaTermDefinition {
    const key = normalizeTermKey(title ?? '')
    if (!key) {
        throw new Error('[policy-branch-mega] column title is empty.')
    }

    const term = TERMS[key]
    if (!term) {
        throw new Error(`[policy-branch-mega] unknown column term: ${key}`)
    }

    return term
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
export function buildPolicyBranchMegaTermsForColumns(columns: string[]): PolicyBranchMegaTermDefinition[] {
    if (!columns || columns.length === 0) {
        throw new Error('[policy-branch-mega] columns list is empty.')
    }

    return columns.map(column => {
        const term = getPolicyBranchMegaTermOrThrow(column)
        return {
            ...term,
            title: column
        }
    })
}
export function resolvePolicyBranchMegaSectionDescription(title: string | undefined): string | null {
    const normalized = normalizePolicyBranchMegaTitle(title)
    if (!normalized) return null

    const upper = normalized.toUpperCase()
    const mode = resolveMegaModeKey(normalized)
    const metric = resolvePolicyBranchMegaMetricFromTitle(normalized)
    const modePrefix = mode === 'NO SL' ? 'NO SL: ' : mode === 'WITH SL' ? 'WITH SL: ' : ''
    const metricPrefix = metric === 'no-biggest-liq-loss' ? 'NO BIGGEST LIQ LOSS: ' : 'REAL: '
    const prefix = `${modePrefix}${metricPrefix}`

    if (upper.includes('PART 1/3')) {
        return `${prefix}Часть 1/3: базовая сводка по дням, риск‑дням, плечу/кап‑доле и ключевым PnL‑метрикам (до MaxDD_Ratio%).`
    }

    if (upper.includes('PART 2/3')) {
        return `${prefix}Часть 2/3: балансные и восстановительные метрики (Withdrawn/OnExch, ликвидации, recovery, DD70).`
    }

    if (upper.includes('PART 3/3')) {
        return `${prefix}Часть 3/3: горизонт и средние темпы роста, разрез long/short и диагностические счётчики.`
    }

    return null
}

