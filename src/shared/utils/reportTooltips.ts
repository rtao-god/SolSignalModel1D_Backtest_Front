import { POSITION_DESCRIPTION } from '@/shared/consts/tooltipDomainTerms'
import i18n from '@/shared/configs/i18n/i18n'
import {
    BACKTEST_SUMMARY_COLUMNS_EN,
    BACKTEST_SUMMARY_KEYS_EN,
    CURRENT_PREDICTION_COLUMNS_EN,
    CURRENT_PREDICTION_KEYS_EN,
    DIAGNOSTICS_DAY_TYPE_METRIC_EN,
    DIAGNOSTICS_DAY_TYPE_PREFIX_EN,
    DIAGNOSTICS_EXACT_EN,
    MODEL_STATS_COLUMNS_EN,
    PFI_COLUMNS_EN
} from './reportTooltips.en'

type ReportTooltipLocale = 'ru' | 'en'

function normalizeKey(value: string | undefined | null): string {
    if (!value) return ''
    return value.trim()
}

function resolveReportTooltipLocale(language: string | null | undefined): ReportTooltipLocale {
    const normalized = (language ?? '').trim().toLowerCase()
    return normalized.startsWith('ru') ? 'ru' : 'en'
}

function resolveLocalizedTooltip(
    ruMap: Record<string, string>,
    enMap: Record<string, string>,
    key: string,
    locale: ReportTooltipLocale
): string | null {
    if (locale === 'ru') {
        return ruMap[key] ?? null
    }

    return enMap[key] ?? null
}
const BACKTEST_SUMMARY_COLUMNS: Record<string, string> = {
    Name: 'Название политики из активного конфига.',
    Type: 'Тип логики политики (как стратегия принимает решения о входе/выходе). Используется для группировки.',
    Leverage: 'Плечо из конфигурации: фиксированное число или dynamic, если политика сама рассчитывает плечо.',
    MarginMode: 'Режим маржи сделки: Cross (общий кошелёк) или Isolated (риск ограничен позицией).',
    Policy: 'Имя политики/стратегии, к которой относится строка результата.',
    Margin: 'Режим маржи (Cross/Isolated) именно для этой политики в результате бэктеста.',
    Branch: 'Ветка симуляции: BASE — базовая логика, ANTI-D — анти-направление при триггере риска.',
    StopLoss: 'Используется ли дневной стоп-лосс в этой ветке: WITH_SL или NO_SL.',
    TotalPnlPct:
        'Суммарная доходность политики за период в процентах. Чем выше, тем лучше, но корректная интерпретация требует сопоставления с риском (MaxDD%).',
    MaxDdPct:
        'Максимальная просадка капитала в процентах от локального пика. Показывает, насколько «болезненной» была кривая.',
    Trades: 'Общее количество сделок по политике за период. Большие числа = больше статистической устойчивости.',
    WithdrawnTotal: 'Сумма выведенного профита в долларах (если капитал превышал базовый). Это «снятая» прибыль.',
    HadLiquidation: 'Были ли ликвидации в этой ветке (yes/no). Критичный риск‑флаг.',
    TradesBySource:
        'Разбивка сделок по источникам сигнала (Daily/DelayedA/DelayedB). Помогает понять, что реально торгует.'
}

const BACKTEST_SUMMARY_KEYS: Record<string, string> = {
    FromDateUtc: 'Дата начала окна бэктеста (UTC). Все метрики считаются внутри этого диапазона.',
    ToDateUtc: 'Дата окончания окна бэктеста (UTC).',
    SignalDays: 'Количество дней с сигналом/записями, участвующих в расчёте.',
    PolicyCount: 'Сколько политик участвовало в бэктесте.',
    BestTotalPnlPct: 'Лучшая суммарная доходность среди политик за период.',
    WorstMaxDdPct: 'Худшая (максимальная) просадка среди политик.',
    PoliciesWithLiquidation: 'Сколько политик имели хотя бы одну ликвидацию.',
    TotalTrades: 'Общее количество сделок по всем политикам.',
    DailyStopPct:
        'Базовый дневной stop-loss (%). Dynamic overlay масштабирует его только в днях, которые проходят confidence-ограничения.',
    DailyTpPct:
        'Базовый дневной take-profit (%). Dynamic overlay масштабирует его только в днях с достаточной confidence-статистикой.',
    DynamicTpPctMin: 'Нижняя граница для итогового dynamic TP после всех множителей.',
    DynamicTpPctMax: 'Верхняя граница для итогового dynamic TP после всех множителей.',
    DynamicSlPctMin: 'Нижняя граница для итогового dynamic SL после всех множителей.',
    DynamicSlPctMax: 'Верхняя граница для итогового dynamic SL после всех множителей.',
    DynamicEvidenceMinBucketSamples: 'Минимум исторических наблюдений в confidence-bucket для включения dynamic TP/SL.',
    DynamicEvidenceMinBucketWinRate: 'Минимальный исторический win-rate confidence-bucket для включения dynamic TP/SL.',
    DynamicOutOfRangeBehavior: 'Поведение при невалидной confidence: NoTrade — пропуск дня, MinRisk — минимальный риск.'
}
const CURRENT_PREDICTION_COLUMNS: Record<string, string> = {
    Политика: 'Название торговой политики/стратегии. Показывает, к какой логике относится строка.',
    Ветка: 'BASE — базовая логика, ANTI-D — анти-направление при триггере риска.',
    Бакет: 'Контур исполнения сделки (daily/intraday/delayed) со своим капиталом и отдельной кривой результата.',
    Bucket: 'Контур исполнения сделки (daily/intraday/delayed) со своим капиталом и отдельной кривой результата.',
    Сторона: POSITION_DESCRIPTION,
    'Рискованный день': 'RiskDay: день с повышенным риском по SL-логике (модель сигнализирует риск).',
    'Есть направление': 'Есть ли у модели направление (long/short). Если нет — будет no-trade.',
    Пропущено: 'Признак, что политика пропустила день (no-trade).',
    Направление:
        'Финальное направление сделки: LONG, SHORT или no-trade (если день заблокирован фильтрами и вход не выполняется).',
    Плечо: 'Фактическое плечо, применённое политикой для входа.',
    'Цена входа': 'Цена входа в позицию (из отчёта).',
    'Вход, $': 'Цена входа в позицию (из отчёта).',
    'Цена выхода': 'Фактическая цена выхода из сделки по первому событию (TP/SL/ликвидация/закрытие окна).',
    'Выход, $': 'Фактическая цена выхода из сделки по первому событию (TP/SL/ликвидация/закрытие окна).',
    'Причина выхода': 'Что первым закрыло сделку: тейк-профит, стоп-лосс, ликвидация или принудительное закрытие.',
    'Выход PnL, %': 'Доходность конкретной сделки в процентах относительно цены входа.',
    'SL, %': 'Стоп-лосс в процентах от цены входа.',
    'TP, %': 'Тейк-профит в процентах от цены входа.',
    'Цена SL': 'Цена, при которой срабатывает стоп-лосс.',
    'Цена TP': 'Цена, при которой срабатывает тейк-профит.',
    'SL, $': 'Цена уровня стоп-лосса в абсолютном значении цены инструмента.',
    'TP, $': 'Цена уровня тейк-профита в абсолютном значении цены инструмента.',
    'Номинал позиции, $': 'Полный размер позиции после применения плеча. Используется для оценки экспозиции и расчёта количества актива; не равен марже.',
    'Размер позиции, qty': 'Количество актива в позиции (в штуках).',
    'Цена ликвидации': 'Расчётная цена ликвидации для выбранного плеча.',
    'Цена ликвидации, $': 'Расчётная цена ликвидации для выбранного плеча.',
    'Дистанция до ликвидации, %': 'Запас по цене до ликвидации в процентах.',
    'Капитал бакета, $': 'Размер капитала выбранного бакета на момент расчёта сделки.',
    'Ставка, $': 'Сколько долларов капитала бакета реально поставлено в эту сделку.',
    'Ставка, %': 'Доля капитала бакета, поставленная в сделку (Stake$ / BucketCapital$ * 100).',
    Trades: 'Сколько сделок уже было у этой политики в отчётном окне.',
    'TotalPnl%': 'Суммарная доходность политики в процентах.',
    'MaxDD%': 'Максимальная просадка политики в процентах.',
    HadLiq: 'Флаг наличия ликвидаций (yes/no).',
    Withdrawn$: 'Выведенный профит по политике, $ (если применимо).',
    Тип: 'Тип фактора в объяснении (например: feature, rule, сигнал и т.п.).',
    Имя: 'Имя фактора/фичи, которая повлияла на решение.',
    Описание: 'Человеческое объяснение фактора и его роли.',
    Значение: 'Текущее значение фактора (если есть).',
    Ранг: 'Место фактора в списке важности: меньше = сильнее влияние.'
}

const CURRENT_PREDICTION_KEYS: Record<string, string> = {
    Набор: 'Live — прогноз на текущий день; Backfilled — исторический пересчёт.',
    Строгость: 'Уровень strictness пайплайна (насколько жёстко отфильтрованы пропуски данных).',
    'Время генерации отчёта (UTC)': 'Когда отчёт был собран (UTC).',
    'Дата прогноза (UTC)': 'День, для которого делается прогноз.',
    SessionDayKeyUtc: 'Дневной ключ сессии (UTC), используется для идентификации торгового дня.',
    EntryUtc: 'Ожидаемое время входа (UTC).',
    ExitUtc: 'Ожидаемое время выхода (UTC).',
    AsOfUtc: 'Срез данных, на котором построен прогноз.',
    DataCutoffUtc: 'Время отсечения данных (что было доступно модели).',
    'Основная модель (Daily)': 'Ответ основной дневной модели (3 класса: UP/FLAT/DOWN).',
    'Микро-модель': 'Ответ микро-модели (используется внутри боковика).',
    'Общий ответ (интерпретация моделей)': 'Финальная интерпретация с учётом micro и SL.',
    'Обучение моделей (диапазон)': 'Какая обучающая выборка использовалась (scope + диапазон + records).',
    'Режим рынка': 'Фаза рынка по режиму (обычный / фаза снижения).',
    'Вероятность срабатывания стоп-лосса': 'Вероятность SL по SL-модели (если доступна).',
    'Сигнал SL-модели': 'Интерпретация SL-сигнала (нормальный риск / высокий риск).',
    'Текущая цена SOL/USDT': 'Текущая цена инструмента, на которой строится прогноз.',
    'Минимальный осмысленный ход цены': 'Порог минимального значимого движения цены (minMove).',
    'Комментарий модели': 'Текстовое объяснение причины решения (если есть).',
    'Daily (основная модель)': 'Вероятности UP/FLAT/DOWN для базовой дневной модели.',
    'Day + Micro': 'Вероятности после применения микро-оверлея.',
    'Total (Day + Micro + SL)': 'Вероятности после применения SL-оверлея.',
    'Максимальная цена за 24 часа': 'Максимальная цена за следующие 24 часа (исторический baseline).',
    'Минимальная цена за 24 часа': 'Минимальная цена за следующие 24 часа (исторический baseline).',
    'Цена закрытия через 24 часа': 'Цена закрытия через 24 часа (исторический baseline).',
    'Фактический исход дня':
        'Реальный исход за 24ч после входа (рост/боковик/падение/микро-исход). Показывается только для backfilled.',
    'Прогноз модели (Total)':
        'Главный класс из слоя Total (Day + Micro + SL), с которым сравнивается фактический исход дня.',
    'Совпадение с прогнозом':
        'Сравнение факта и прогноза: полное совпадение, частичное (класс совпал, микро нет) или расхождение.',
    'Почему отличается': 'Короткое объяснение расхождения на основе вероятностей Total и explain-слоя модели.',
    'Ключевой фактор explain/PFI':
        'Топ-фактор из explain/PFI, который сильнее всего связан с выбранным моделью сценарием.',
    'Доходность к закрытию, %': 'Изменение цены от входа до закрытия окна 24ч: (Close24 / Entry - 1) * 100.',
    'Максимум за 24ч от входа, %': 'Максимальное движение вверх относительно цены входа за окно 24ч.',
    'Минимум за 24ч от входа, %': 'Максимальное движение вниз относительно цены входа за окно 24ч.',
    'Диапазон high-low за 24ч, %': 'Ширина диапазона MaxHigh24 - MinLow24 относительно цены входа, в процентах.',
    'Факт MinMove за 24ч':
        'Реализованный MinMove по forward-окну (omniscient/backfilled). В causal/live не используется.',
    'Прогнозный MinMove (causal)': 'MinMove, доступный модели в момент прогноза (causal-срез, без future).',
    'Δ MinMove (факт - прогноз)': 'Разница между реализованным и прогнозным MinMove, в процентных пунктах.',
    'Вероятность фактического исхода (Total)':
        'Какую вероятность в слое Total модель давала тому классу, который потом случился по факту.',
    'Источник факта':
        'Факт берётся из backfilled/omniscient после закрытия окна 24ч и не подмешивается в causal/live решение.'
}
const PFI_COLUMNS: Record<string, string> = {
    '#': 'Порядковый номер признака в списке (ранжирование внутри таблицы).',
    Index: 'Индекс признака в исходном списке фичей.',
    Фича: 'Имя признака (feature), который подаётся в модель.',
    FeatureName: 'Имя признака (feature), техническое название.',
    'Важность (ΔAUC)': 'Насколько падает AUC при перемешивании признака (Permutation). Чем выше, тем важнее фича.',
    'ImportanceAuc (abs ΔAUC)': 'Абсолютное падение AUC при перемешивании признака.',
    'ΔAUC (сырое)': 'Сырой ΔAUC = baseline AUC − permuted AUC.',
    'DeltaAuc (baseline - perm)': 'Сырой ΔAUC (baseline − permuted).',
    'ΔMean (1-0)': 'Разница средних значений признака между классами 1 и 0 (MeanPos − MeanNeg).',
    'MeanPos - MeanNeg': 'Разница средних значений признака между классами 1 и 0.',
    'MeanPos (Label=1)': 'Среднее значение признака по положительному классу.',
    'MeanNeg (Label=0)': 'Среднее значение признака по отрицательному классу.',
    'Mean[1]': 'Среднее значение признака по положительному классу.',
    'Mean[0]': 'Среднее значение признака по отрицательному классу.',
    'Corr(score)': 'Корреляция признака с модельным скором (Pearson).',
    'CorrScore (Pearson)': 'Корреляция признака с модельным скором (Pearson).',
    'Corr(label)': 'Корреляция признака с целевой меткой (Pearson).',
    'CorrLabel (Pearson)': 'Корреляция признака с целевой меткой (Pearson).',
    'Support (pos/neg)': 'Сколько примеров в каждом классе: pos/neg.',
    'CountPos / CountNeg': 'Количество примеров класса 1 и класса 0.'
}
const MODEL_STATS_COLUMNS: Record<string, string> = {
    Class: 'Класс истинной метки (UP/DOWN/FLAT).',
    Summary: 'Короткое описание качества по этому классу (сколько попаданий/промахов).',
    TRUE: 'Истинный класс (True label).',
    'Pred DOWN': 'Сколько дней было предсказано как DOWN (для строки TRUE).',
    'Pred FLAT': 'Сколько дней было предсказано как FLAT (для строки TRUE).',
    'Pred UP': 'Сколько дней было предсказано как UP (для строки TRUE).',
    'Hit %': 'Доля правильных предсказаний для строки (accuracy).',
    'Тип дня': 'Истинное направление тренда (UP/DOWN) для строки.',
    'True trend': 'Истинное направление тренда (UP/DOWN).',
    'pred DOWN': 'Количество предсказаний DOWN.',
    'pred UP': 'Количество предсказаний UP.',
    correct: 'Количество правильных предсказаний.',
    total: 'Всего примеров в строке.',
    'Точность, %': 'Accuracy: доля правильных предсказаний, в процентах.',
    'day type': 'Тип дня по исходу: TP-day или SL-day.',
    'pred LOW': 'Сколько раз модель предсказала низкий риск (LOW).',
    'pred HIGH': 'Сколько раз модель предсказала высокий риск (HIGH).',
    metric: 'Название метрики.',
    value: 'Значение метрики.',
    Порог: 'Порог SL-модели (threshold), по которому считаются метрики.',
    'TPR(SL), %': 'True Positive Rate для SL-дней: доля правильных HIGH на SL-днях.',
    'FPR(TP), %': 'False Positive Rate для TP-дней: доля ошибочных HIGH на TP-днях.',
    'pred HIGH, %': 'Доля предсказаний HIGH при данном пороге.',
    'high / total': 'Сколько HIGH предсказаний от общего числа дней.'
}
const DIAGNOSTICS_EXACT: Record<string, string> = {
    Policy: 'Название торговой политики/стратегии. Показывает, к какой логике относится строка.',
    Branch: 'Ветка симуляции: BASE (базовая) или ANTI-D (анти-направление).',
    Margin: 'Режим маржи сделки (Cross/Isolated).',
    Days: 'Количество дней в выборке/группе. Это не количество сделок.',
    StartDay: 'Первая дата периода (UTC), с которой строится агрегат.',
    EndDay: 'Последняя дата периода (UTC), до которой строится агрегат.',
    StopReason: 'Причина остановки/завершения периода для политики (если применимо).',
    MissingDays: 'Сколько дней отсутствует в ряду между StartDay и EndDay.',
    'TradeDays%': 'Доля дней, когда были сделки.',
    'Long%': 'Доля дней с long-сделками.',
    'Short%': 'Доля дней с short-сделками.',
    'NoTrade%': 'Доля дней без сделок.',
    'RiskDay%': 'Доля дней, где SL-логика пометила день как рискованный.',
    'AntiD%': 'Доля дней, где применилось anti-direction.',
    'Cap avg/min/max':
        'Средняя/минимальная/максимальная доля капитала (cap fraction), использованная в сделках. Значения в % от бакета.',
    'Cap p50/p90': 'Квантили p50/p90 по cap fraction — медиана и верхний хвост распределения.',
    CapApplied: 'Сколько дней cap-фильтр применился (ограничил размер позиции).',
    CapSkipped: 'Сколько дней cap-фильтр был пропущен (не ограничивал позицию).',
    Trades: 'Количество сделок в этой группе.',
    'TotalPnl%': 'Суммарная доходность в % по марже за период.',
    'MaxDD%': 'Максимальная просадка equity (drawdown) в %.',
    'MaxDD_NoLiq%': 'Максимальная просадка без учёта ликвидаций.',
    HadLiq: 'Были ли ликвидации (yes/no).',
    Withdrawn$: 'Выведенная прибыль в долларах (если капитал превышал базовый).',
    inv_liq_mismatch: 'Количество диагностических несоответствий по ликвидациям (инварианты).',
    minutes_anomaly: 'Количество аномалий по минутным данным (gap/ошибки).',
    Date: 'Дата сделки (UTC) по торговому дню/сигналу.',
    Day: 'День (UTC) для агрегированной статистики.',
    Side: POSITION_DESCRIPTION,
    IsLong: 'Признак направления: true = long, false = short.',
    Lev: 'Фактическое плечо, применённое в сделке.',
    Margin$: 'Маржа, реально использованная в сделке (USDT).',
    NetPnl$: 'Чистый PnL по сделке в USDT после комиссий.',
    'Gross%': 'Грубая доходность (до комиссий) по цене, без учёта издержек.',
    'NetPnl%': 'Чистая доходность сделки в % по использованной марже.',
    'NetRet%': 'Чистая доходность сделки в % (после комиссий).',
    Cap: 'Доля капитала (cap fraction), применённая в сделке.',
    Comm$: 'Комиссии по сделке (USDT) за вход и выход.',
    'MAE%': 'Максимальное неблагоприятное движение против позиции (Max Adverse Excursion).',
    'MFE%': 'Максимальное благоприятное движение в пользу позиции (Max Favorable Excursion).',
    LiqPx: 'Backtest-цена ликвидации, по которой позиция закрылась в модели.',
    LiqBacktest: 'Backtest-цена ликвидации (консервативная, ближе к входу).',
    RealLiq: 'Флаг «реальной» ликвидации: цена дошла до backtest-уровня.',
    IsLiq: 'Флаг ликвидации в модели (бакет обнулился или ликвидация).',
    IsRealLiq: 'Более строгий флаг реальной ликвидации (backtest-уровень достигнут).',
    Source: 'Источник сигнала: Daily / DelayedA / DelayedB.',
    DayType: 'Тип дня рынка: UP / DOWN / FLAT.',
    'AbsRet%': 'Абсолютная дневная доходность рынка (|return|) в %.',
    MinMove:
        'Порог минимального значимого движения цены за день (в долях цены входа). Чем выше значение, тем более сильный ход рынка нужен для торгового дня.',
    'MaxAdv%': 'Максимальное неблагоприятное движение в сделке, в %.',
    StartEq$: 'Equity на старте периода.',
    EndEq$: 'Equity на конце периода.',
    MinEq$: 'Минимальная equity в периоде.',
    MaxEq$: 'Максимальная equity в периоде.',
    'LiqDays#': 'Количество дней, когда была ликвидация.',
    'RealLiq#': 'Количество реальных ликвидаций (backtest-level).',
    FirstLiqDay: 'Первая дата ликвидации.',
    LastLiqDay: 'Последняя дата ликвидации.',
    MinDistPct: 'Минимальная дистанция до ликвидации, % (liqDist − adverse).',
    DistTrade_Min: 'Минимальная дистанция до ликвидации по сделкам.',
    'DistTrade_P10/P50/P90': 'Квантили расстояния до ликвидации по сделкам (p10/p50/p90).',
    DistDay_Min: 'Минимальная дистанция до ликвидации по дням.',
    'DistDay_P10/P50/P90': 'Квантили расстояния до ликвидации по дням (p10/p50/p90).',
    data_anomaly_gap_count: 'Количество разрывов (gaps) в данных.',
    data_anomaly_max_gap: 'Максимальный размер разрыва в минутах.',
    data_anomaly_missing_days: 'Сколько полностью отсутствующих дней в ряду.',
    data_anomaly_missing_weekday: 'Сколько пропущенных будних дней.',
    data_anomaly_missing_weekend: 'Сколько пропущенных выходных дней.',
    data_anomaly_order_violation: 'Нарушения порядка данных (дни вне последовательности).',
    AbsRetP90: 'Глобальный p90 по |return| (порог специфичности).',
    MinMoveP90: 'Глобальный p90 по MinMove (порог специфичности).',
    AbsRetP90_Last: 'Последний рассчитанный p90 по |return| (rolling).',
    MinMoveP90_Last: 'Последний рассчитанный p90 по MinMove (rolling).',
    'AbsP90_vs_global_delta%': 'Отклонение p90(|return|) от глобального, в %.',
    'MinMoveP90_vs_global_delta%': 'Отклонение p90(MinMove) от глобального, в %.',
    Defined: 'Порог специфичности определён (yes/no).',
    DefinedDays: 'Сколько дней имели определённый порог специфичности.',
    LastSamples: 'Размер выборки, на которой считались пороги (последний срез).',
    MinSamples: 'Минимальный размер выборки для определения порога.',
    Samples: 'Размер выборки, на которой считались пороги.',
    SpecUndefined: 'Сколько дней без определённого порога специфичности (недостаточно выборки).',
    SpecDays: 'Сколько дней классифицированы как специфичные.',
    'SpecTrade%': 'Доля торговых дней среди специфичных.',
    'SpecNoTrade%': 'Доля no-trade среди специфичных.',
    'SpecOpp%': 'Доля противоположных решений среди специфичных.',
    NormDays: 'Сколько дней классифицированы как нормальные (не специфичные).',
    'NormTrade%': 'Доля торговых дней среди нормальных.',
    'NormNoTrade%': 'Доля no-trade среди нормальных.',
    'NormOpp%': 'Доля противоположных решений среди нормальных.',
    Specific: 'Флаг специфичности дня (yes/no).',
    'Specific%': 'Доля специфичных дней внутри выборки.',
    'SpecDefined%': 'Доля дней, где порог специфичности определён.',
    Specificity: 'Specificity = TN / (TN + FP) для guardrail (по BAD-дням).',
    Sensitivity: 'Sensitivity (TPR) для guardrail: доля пойманных BAD-дней.',
    PrecisionBad: 'Precision для BAD-дней: из заблокированных доля действительно BAD.',
    BlockRate: 'Доля дней, которые guardrail блокирует.',
    TradeRate: 'Доля дней, которые guardrail разрешает к торговле.',
    AvoidedLoss$: 'Оценка избегаемых потерь, $.',
    MissedProfit$: 'Оценка упущенной прибыли, $.',
    NetBenefit$: 'Избежанные потери минус упущенная прибыль, $.',
    'AvoidedLoss%': 'Оценка избегаемых потерь, %.',
    'MissedProfit%': 'Оценка упущенной прибыли, %.',
    'NetBenefit%': 'Суммарный эффект guardrail в %, AvoidedLoss% − MissedProfit%.',
    TP: 'True Positive (BAD-день правильно заблокирован).',
    FP: 'False Positive (хороший день заблокирован).',
    TN: 'True Negative (хороший день разрешён).',
    FN: 'False Negative (плохой день пропущен).',
    BaseTradeDays: 'Сколько дней базовая политика хотела бы торговать.',
    Actor: 'Основной актор решения (модель/политика/SL и т.п.).',
    PrimaryActor: 'Первичный актор финального решения.',
    Reason: 'Причина/код, почему принято такое решение.',
    Action: 'Финальное действие (trade / no-trade / block и т.п.).',
    Bucket: 'Корзина исхода в blame-split (кто «виноват»).',
    Count: 'Количество строк/дней в группе.',
    'Rate%': 'Доля группы от общего количества, %.',
    'CorrectDir%': 'Доля правильного направления среди торговых дней.',
    'Opposite%': 'Доля противоположных решений (против направления дня).',
    'AvgAbsRet%': 'Средний |return| рынка в группе, %.',
    'P90AbsRet%': 'p90 по |return| рынка в группе, %.',
    'OppHarmSum%': 'Суммарный вред от противоположных решений, %.',
    'MissedOppSum%': 'Суммарная упущенная выгода от no-trade, %.',
    'OOD%': 'Доля OOD-дней в группе.',
    'OOD_severe%': 'Доля тяжёлых OOD-дней в группе.',
    Weekday: 'День недели (Mon..Sun).',
    Причина: 'Причина NoTrade/Skip (агрегировано).',
    'Share%': 'Доля от общего, %.',
    'ShareAll%': 'Доля от общего по всем дням, %.',
    'ShareSkipped%': 'Доля пропущенных дней по причине, %.',
    'NoDir%': 'Доля дней без направления (модель не дала сигнал).',
    'PolicySkip%': 'Доля пропусков из-за правил политики.',
    'CapZero%': 'Доля пропусков из-за нулевого cap fraction.',
    'LowEdge%': 'Доля пропусков из-за слабого edge.',
    'RiskThrottle%': 'Доля пропусков из-за risk throttling.',
    'Unknown%': 'Доля пропусков по неизвестной причине.',
    OOD: 'Категория OOD (вне распределения).',
    'Trade%': 'Доля торговых дней.',
    'OppDir%': 'Доля сделок против направления дня (UP→SHORT или DOWN→LONG).',
    OppDirDays: 'Сколько дней с противоположным направлением сделки.',
    'OppHarmAvg%': 'Средний вред от противоположных решений, %.',
    'NoTradeOppAvg%': 'Средний объём упущенной выгоды из-за no-trade, %.',
    'NoTradeOppSum%': 'Суммарная упущенная выгода из-за no-trade, %.',
    UpTrades: 'Количество сделок в дни роста (UP).',
    DownTrades: 'Количество сделок в дни падения (DOWN).',
    FlatTrades: 'Количество сделок в дни боковика (FLAT).',
    'UpWin%': 'WinRate в дни роста: доля прибыльных сделок.',
    'DownWin%': 'WinRate в дни падения: доля прибыльных сделок.',
    'FlatWin%': 'WinRate в дни боковика: доля прибыльных сделок.',
    'UpPnL%': 'Суммарная доходность в дни роста (UP).',
    'DownPnL%': 'Суммарная доходность в дни падения (DOWN).',
    'FlatPnL%': 'Суммарная доходность в дни боковика (FLAT).',
    'UpNoTrade%': 'Доля no-trade в дни роста (UP).',
    'DownNoTrade%': 'Доля no-trade в дни падения (DOWN).',
    'FlatNoTrade%': 'Доля no-trade в дни боковика (FLAT).',
    'UpOpp%': 'Доля противоположных решений в дни роста (UP).',
    'DownOpp%': 'Доля противоположных решений в дни падения (DOWN).',
    'FlatOppAvg%': 'Средний вред от противоположных решений в дни боковика.',
    'FlatOppSum%': 'Суммарный вред от противоположных решений в дни боковика.',
    'DownOppAvg%': 'Средний вред от противоположных решений в дни падения.',
    'DownOppSum%': 'Суммарный вред от противоположных решений в дни падения.',
    'UpOppAvg%': 'Средний вред от противоположных решений в дни роста.',
    'UpOppSum%': 'Суммарный вред от противоположных решений в дни роста.',
    DayOfWeek: 'День недели для агрегирования пропусков/NoTrade.',
    Policies: 'Количество политик в группе.',
    Type: 'Тип/категория строки в агрегате (см. заголовок таблицы).',
    Mode: 'Режим/слой принятия решения (см. таблицу решений).',
    ModelRaw: 'Сырой ответ модели (до правил/фильтров).',
    Detail: 'Доп. детализация причины (подробное поле).',
    UndefinedReason: 'Причина, почему значение/метка недоступна.'
}

function buildDayTypeDescription(prefix: string, metric: string, locale: ReportTooltipLocale): string | null {
    const prefixMap: Record<string, string> = {
        Up: 'в дни роста рынка (UP)',
        Down: 'в дни падения рынка (DOWN)',
        Flat: 'в дни боковика (FLAT)'
    }

    const metricMap: Record<string, string> = {
        Trades: 'Количество сделок',
        'Win%': 'Доля прибыльных сделок',
        'PnL%': 'Суммарная доходность, %',
        'NoTrade%': 'Доля дней без сделок',
        'Opp%': 'Доля противоположных решений',
        'OppAvg%': 'Средний вред от противоположных решений, %',
        'OppSum%': 'Суммарный вред от противоположных решений, %',
        'OppDir%': 'Доля сделок против направления дня',
        OppDirDays: 'Количество дней с противоположной сделкой'
    }

    const resolvedPrefixMap = locale === 'ru' ? prefixMap : DIAGNOSTICS_DAY_TYPE_PREFIX_EN
    const resolvedMetricMap = locale === 'ru' ? metricMap : DIAGNOSTICS_DAY_TYPE_METRIC_EN
    const prefixLabel = resolvedPrefixMap[prefix]
    const metricLabel = resolvedMetricMap[metric]
    if (!prefixLabel || !metricLabel) return null
    return `${metricLabel} ${prefixLabel}.`
}

function resolveDiagnosticsColumnTooltip(title: string, locale: ReportTooltipLocale): string | null {
    const key = normalizeKey(title)
    if (!key) return null

    if (locale === 'ru' && DIAGNOSTICS_EXACT[key]) {
        return DIAGNOSTICS_EXACT[key]
    }

    if (locale === 'en' && DIAGNOSTICS_EXACT_EN[key]) {
        return DIAGNOSTICS_EXACT_EN[key]
    }

    const dayTypeMatch = key.match(/^(Up|Down|Flat)(.+)$/)
    if (dayTypeMatch) {
        const prefix = dayTypeMatch[1]
        const metric = dayTypeMatch[2]
        const desc = buildDayTypeDescription(prefix, metric, locale)
        if (desc) return desc
    }
    if (/(p50\/p90|P10\/P50\/P90)/.test(key)) {
        if (locale === 'en') {
            return 'Distribution quantiles for this metric (typically p10/p50/p90 or p50/p90). Useful for tail-risk interpretation.'
        }

        return 'Квантили распределения для показателя (обычно p10/p50/p90 или p50/p90). Помогают понять «хвосты».'
    }

    const lower = key.toLowerCase()

    if (lower.includes('pnl') || lower.includes('ret')) {
        if (locale === 'en') {
            return 'Return/result metric for this group. Positive means profit, negative means loss.'
        }

        return 'Доходность/результат по группе. Положительное значение = прибыль, отрицательное = убыток.'
    }

    if (lower.includes('dd')) {
        if (locale === 'en') {
            return 'Drawdown metric: how deep equity fell from local peak.'
        }

        return 'Метрика просадки (drawdown): насколько сильно падал капитал от локального пика.'
    }

    if (lower.includes('liq')) {
        if (locale === 'en') {
            return 'Liquidation-related metric: event flag, count, or distance to liquidation level.'
        }

        return 'Метрика ликвидации: факт, количество или дистанция до уровня ликвидации.'
    }

    if (lower.includes('trade') && lower.endsWith('%')) {
        if (locale === 'en') {
            return 'Percentage metric tied to trading activity (share of trading days/trades).'
        }

        return 'Процентное значение, связанное с торговой активностью (доля торговых дней/сделок).'
    }

    if (lower.includes('trade')) {
        if (locale === 'en') {
            return 'Trade count metric or count of days with trades in this group.'
        }

        return 'Количество сделок или дни со сделками в этой группе.'
    }

    if (lower.includes('notrade')) {
        if (locale === 'en') {
            return 'No-trade metric: count/share of days without trades.'
        }

        return 'Показатель пропусков: сколько дней или какая доля дней без сделок.'
    }

    if (lower.includes('risk')) {
        if (locale === 'en') {
            return 'Risk-day metric or risk-filter related indicator (SL/guardrail).'
        }

        return 'Показатель риск‑дней или фильтров риска (SL/guardrail).'
    }

    if (lower.includes('opp')) {
        if (locale === 'en') {
            return 'Opposite-direction metric and its impact (trades against day direction).'
        }

        return 'Показатель противоположных решений (сделки против направления дня) и их эффекта.'
    }

    if (lower.includes('comm') || lower.includes('commission')) {
        if (locale === 'en') {
            return 'Commissions and trading costs (amount or share of result).'
        }

        return 'Комиссии и издержки торговли (сумма или доля от результата).'
    }

    if (lower.includes('lev')) {
        if (locale === 'en') {
            return 'Leverage metric: average/quantiles or win/loss-side values.'
        }

        return 'Показатель плеча (leverage): среднее/квантили или значения для побед/поражений.'
    }

    if (lower.includes('cap')) {
        if (locale === 'en') {
            return 'Cap-fraction metric: share of capital actually used in trades.'
        }

        return 'Показатель доли капитала (cap fraction), которая реально использовалась в сделках.'
    }

    if (lower.includes('minmove')) {
        if (locale === 'en') {
            return 'Minimum meaningful daily price-move threshold (MinMove). Higher values imply stricter trade-day criteria.'
        }

        return 'Порог минимального значимого движения цены за день (MinMove). Большее значение означает более жёсткий порог торгового дня.'
    }

    if (lower.includes('absret')) {
        if (locale === 'en') {
            return 'Absolute daily market return (|return|). Captures movement strength without direction.'
        }

        return 'Абсолютная дневная доходность рынка (|return|). Показывает силу движения без учёта направления.'
    }

    if (lower.includes('mae')) {
        if (locale === 'en') {
            return 'Max Adverse Excursion: maximum move against the position.'
        }

        return 'Max Adverse Excursion: максимальное движение против позиции.'
    }

    if (lower.includes('mfe')) {
        if (locale === 'en') {
            return 'Max Favorable Excursion: maximum move in favor of the position.'
        }

        return 'Max Favorable Excursion: максимальное движение в пользу позиции.'
    }

    if (lower.includes('dur')) {
        if (locale === 'en') {
            return 'Trade duration metric (typically minutes), including averages and quantiles.'
        }

        return 'Длительность сделок (обычно в минутах), средние значения и квантили.'
    }

    if (lower.includes('day') || lower.includes('date') || lower.includes('year')) {
        if (locale === 'en') {
            return 'Calendar/date field or count of days in this group.'
        }

        return 'Поле календаря/даты или количество дней в группе.'
    }

    if (lower.endsWith('%')) {
        if (locale === 'en') {
            return 'Percentage metric. Exact definition depends on the table and section context.'
        }

        return 'Процентная метрика. Точное определение зависит от таблицы и её описания.'
    }

    if (locale === 'en') {
        return `Metric "${key}". Exact definition depends on table context; see section description.`
    }

    return `Показатель «${key}». Точное определение зависит от таблицы; см. описание секции выше.`
}
export function resolveReportColumnTooltip(
    reportKind: string | undefined,
    sectionTitle: string | undefined,
    columnTitle: string | undefined,
    locale?: ReportTooltipLocale
): string | null {
    const col = normalizeKey(columnTitle)
    if (!col) return null
    const resolvedLocale = locale ?? resolveReportTooltipLocale(i18n.resolvedLanguage ?? i18n.language)

    if (reportKind === 'backtest_summary') {
        return resolveLocalizedTooltip(BACKTEST_SUMMARY_COLUMNS, BACKTEST_SUMMARY_COLUMNS_EN, col, resolvedLocale)
    }

    if (reportKind === 'pfi_per_model') {
        return resolveLocalizedTooltip(PFI_COLUMNS, PFI_COLUMNS_EN, col, resolvedLocale)
    }

    if (reportKind === 'backtest_model_stats') {
        return resolveLocalizedTooltip(MODEL_STATS_COLUMNS, MODEL_STATS_COLUMNS_EN, col, resolvedLocale)
    }

    if (reportKind?.startsWith('current_prediction')) {
        const localized = resolveLocalizedTooltip(
            CURRENT_PREDICTION_COLUMNS,
            CURRENT_PREDICTION_COLUMNS_EN,
            col,
            resolvedLocale
        )
        if (localized) {
            return localized
        }

        return resolvedLocale === 'ru' ?
                `Показатель отчёта current prediction: «${col}».`
            :   `Current prediction report metric: "${col}".`
    }
    if (reportKind === 'backtest_diagnostics') {
        return resolveDiagnosticsColumnTooltip(col, resolvedLocale)
    }

    return null
}

export function resolveReportKeyTooltip(
    reportKind: string | undefined,
    sectionTitle: string | undefined,
    key: string | undefined,
    locale?: ReportTooltipLocale
): string | null {
    const normalized = normalizeKey(key)
    if (!normalized) return null
    const resolvedLocale = locale ?? resolveReportTooltipLocale(i18n.resolvedLanguage ?? i18n.language)

    if (reportKind === 'backtest_summary') {
        return resolveLocalizedTooltip(BACKTEST_SUMMARY_KEYS, BACKTEST_SUMMARY_KEYS_EN, normalized, resolvedLocale)
    }

    if (reportKind?.startsWith('current_prediction')) {
        const localized = resolveLocalizedTooltip(
            CURRENT_PREDICTION_KEYS,
            CURRENT_PREDICTION_KEYS_EN,
            normalized,
            resolvedLocale
        )
        if (localized) {
            return localized
        }

        return resolvedLocale === 'ru' ?
                `Поле отчёта current prediction: «${normalized}».`
            :   `Current prediction report field: "${normalized}".`
    }

    return null
}

export function resolveDiagnosticsColumnTooltipPublic(title: string, locale?: ReportTooltipLocale): string | null {
    const resolvedLocale = locale ?? resolveReportTooltipLocale(i18n.resolvedLanguage ?? i18n.language)
    return resolveDiagnosticsColumnTooltip(title, resolvedLocale)
}
