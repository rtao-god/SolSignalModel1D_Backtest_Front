import {
    COMMON_HAD_LIQ_DESCRIPTION_EN,
    COMMON_MAX_DD_DESCRIPTION_EN,
    COMMON_POLICY_DESCRIPTION_EN,
    COMMON_TOTAL_PNL_DESCRIPTION_EN,
    COMMON_TRADES_DESCRIPTION_EN,
    COMMON_WITHDRAWN_DESCRIPTION_EN
} from '@/shared/terms/common'
import {
    DRAWDOWN_DESCRIPTION,
    LIQUIDATION_DESCRIPTION,
    POLICY_DESCRIPTION,
    TOTAL_PNL_DESCRIPTION,
    TRADE_COUNT_DESCRIPTION,
    WITHDRAWN_PROFIT_DESCRIPTION
} from '@/shared/consts/tooltipDomainTerms'
import { BACKTEST_SUMMARY_COLUMNS_EN } from './reportTooltips.en'

function buildRuTooltip(term: string, definition: string, what: string, howToRead: string, extra?: string): string {
    return `${term} — ${definition}\n\nЧто показывает:\n${what}\n\nКак читать:\n${howToRead}${extra ? `\n\n${extra}` : ''}`
}

function buildEnTooltip(term: string, definition: string, what: string, howToRead: string, extra?: string): string {
    return `${term} is ${definition}\n\nWhat it shows:\n${what}\n\nHow to read it:\n${howToRead}${extra ? `\n\n${extra}` : ''}`
}

// Execution pipeline использует один и тот же glossary и для колонок, и для key-value scope.
// Поэтому owner-описания держим в одном shared util-слое, а не размазываем по страницам.
const BACKTEST_EXECUTION_PIPELINE_COLUMNS_RU: Record<string, string> = {}
const BACKTEST_EXECUTION_PIPELINE_KEYS_RU: Record<string, string> = {}
const BACKTEST_EXECUTION_PIPELINE_COLUMNS_EN: Record<string, string> = {}
const BACKTEST_EXECUTION_PIPELINE_KEYS_EN: Record<string, string> = {}

Object.assign(BACKTEST_EXECUTION_PIPELINE_COLUMNS_RU, {
    Policy: POLICY_DESCRIPTION,
    Margin: buildRuTooltip(
        'Margin',
        'режим маржи строки pipeline: cross или isolated',
        'поле отвечает не за сумму денег, а за то, какой collateral-профиль переживает убыток этой Policy на всех следующих слоях отчёта.',
        'одинаковые PnL и drawdown при cross и isolated несут разный аварийный риск. Cross тянет общий баланс бакета, isolated ограничивает удар рамками маржи сделки.'
    ),
    CalcMode: buildRuTooltip(
        'CalcMode',
        'правило, по которому движок считает итоговую [[position|позицию]]',
        '1) [[budgeted-calc-mode|Budgeted]]: движок сначала выбирает допустимый денежный риск на одну позицию. Ключевой параметр здесь — [[margin|маржа]]. Она подбирается так, чтобы убыток до [[tp-sl|stop-loss]] укладывался в этот лимит.\n2) [[exchange-like-calc-mode|ExchangeLike]]: движок сразу берёт фиксированную долю текущего капитала [[bucket|бакета]] как маржу сделки.\n3) После этого к марже применяется [[leverage|плечо]], и из неё получается полный размер позиции.',
        '1) Строки с разным CalcMode напрямую не сравниваются: при одном и том же [[landing-signal|сигнале]] режимы могут открыть разный размер позиции.\n2) Budgeted сильнее завязан на расстояние до stop-loss.\n3) ExchangeLike сильнее завязан на текущий капитал бакета.',
        'Пример:\nесли два режима видят один и тот же [[landing-signal|сигнал]], Budgeted может открыть меньшую позицию, когда stop-loss стоит далеко и допустимый денежный риск приходится ужимать.'
    ),
    SignalDays: buildRuTooltip(
        'SignalDays',
        'число торговых дней, которые вообще вошли в pipeline до разреза по Policy',
        'это верхняя база model-level слоя: из этих дней считаются LONG, SHORT и no-direction, а ниже по цепочке именно этот объём превращается в TradeDays и NoTradeDays.',
        'SignalDays не равен числу сделок. Если значение маленькое, все доли LONG/SHORT/no-direction и все проценты покрытия дальше опираются на тонкую историческую выборку.',
        'Формула:\nLongSignalDays + ShortSignalDays + NoDirectionDays = SignalDays.'
    ),
    LongSignalDays: buildRuTooltip(
        'LongSignalDays',
        'сколько дней модельный слой отдал в сторону LONG до применения Policy',
        'считается именно сырой directional-ответ модели, а не уже финальная сделка. На этом шаге ещё нет policy-skip, cap-zero и прочих decision-layer блокировок.',
        'если LongSignalDays высокий, это означает bias model-layer в сторону роста. Дальше нужно смотреть, доходит ли этот bias до TradeDays и не ломается ли на risk-layer.'
    ),
    ShortSignalDays: buildRuTooltip(
        'ShortSignalDays',
        'сколько дней модельный слой отдал в сторону SHORT до применения Policy',
        'это число отражает только исходный directional-ответ модели и ещё не учитывает no-trade решения, size cuts и исполнение по бакетам.',
        'рост ShortSignalDays означает bias model-layer в сторону падения. Смысл этого роста нужно проверять на decision и aggregation слоях, а не читать как готовую торговую победу.'
    ),
    NoDirectionDays: buildRuTooltip(
        'NoDirectionDays',
        'сколько дней на model-layer завершились без торгового направления',
        'в эти даты модель не дала ни LONG, ни SHORT, поэтому до policy-решений и trade execution такой день уже не доходит как полноценный directional candidate.',
        'если NoDirectionDays высокий, слабое покрытие может начинаться ещё до Policy. Тогда проблема не в leverage или exit reason, а в самом верхнем слое directional-сигнала.'
    ),
    'LongSignalRate%': buildRuTooltip(
        'LongSignalRate%',
        'долю LONG-дней внутри полного SignalDays',
        'метрика показывает, какую часть истории model-layer чаще всего отправляет в сторону роста ещё до Policy.',
        'читать её нужно только вместе с ShortSignalRate% и NoDirectionRate%. Рост одной доли имеет смысл только относительно двух остальных.',
        'Формула:\nLongSignalDays / SignalDays * 100.'
    ),
    'ShortSignalRate%': buildRuTooltip(
        'ShortSignalRate%',
        'долю SHORT-дней внутри полного SignalDays',
        'поле отвечает на вопрос, как часто верхний слой модели видел сценарий падения как основной directional output.',
        'если ShortSignalRate% растёт без роста TradeDays, bias модели в сторону SHORT не превращается в реальное покрытие сделками и ломается ниже по цепочке.',
        'Формула:\nShortSignalDays / SignalDays * 100.'
    ),
    'NoDirectionRate%': buildRuTooltip(
        'NoDirectionRate%',
        'долю дней без направления внутри полного SignalDays',
        'это верхнеуровневая частота no-direction ещё до Policy, leverage и исполнения сделки.',
        'высокое значение означает, что большая часть no-trade рождается уже на model-layer. Тогда низкое покрытие нельзя объяснять только risk-фильтрами или размером позиции.',
        'Формула:\nNoDirectionDays / SignalDays * 100.'
    ),
    TradeDays: buildRuTooltip(
        'TradeDays',
        'количество уникальных дней, в которых Policy реально дошла до хотя бы одной сделки',
        'внутри decision-layer поле считает distinct trade dates, а не число всех отдельных трейдов. Один день с несколькими intraday-перезаходами всё равно даёт один TradeDay.',
        'если TradeDays заметно ниже SignalDays, owner-причина слабого покрытия сидит между model и execution слоями: в skip-логике, risk cuts или правилах самой Policy.'
    ),
    NoTradeDays: buildRuTooltip(
        'NoTradeDays',
        'количество дней, которые вошли в историю, но не дали ни одной сделки для текущей Policy',
        'это уже decision-layer no-trade: день существовал в истории, но после Policy, cap и risk checks не превратился в trade day.',
        'рост NoTradeDays показывает потерю покрытия именно на уровне решений. Чтобы понять причину, его нужно читать вместе с Coverage % и соседними diagnostics-отчётами.'
    ),
    'Coverage %': buildRuTooltip(
        'Coverage %',
        'долю торговых дней текущей Policy внутри полного SignalDays',
        'поле сжимает TradeDays и SignalDays в один показатель и отвечает на вопрос, какой кусок истории Policy реально довела до сделки.',
        'низкое значение означает, что между верхним directional-сигналом и фактическим execution много блокировок. Высокое значение говорит, что Policy почти всегда конвертирует день в торговлю.',
        'Формула:\nTradeDays / SignalDays * 100.'
    ),
    'Average leverage': buildRuTooltip(
        'Average leverage',
        'среднее фактическое плечо по уже исполненным сделкам текущей Policy',
        'это не просто конфиг из Policy. Значение берётся из decision-ledger и уже отражает реальные leverage cuts после risk-layer.',
        'если среднее плечо заметно ниже ожиданий Policy, основной размер риска урезается не на execution-layer, а ещё на decision-layer до входа в рынок.',
        `Пример:\nесли configured leverage высокий, а Average leverage стабильно ниже, значит risk-слои регулярно режут ${'[[leverage|плечо]]'} до более защитного режима.`
    ),
    'Average cap requested %': buildRuTooltip(
        'Average cap requested %',
        'среднюю долю капитала, которую Policy просила на сделку до финальных ограничений',
        'поле берётся из CapFractionRequested и показывает исходное намерение размера позиции до того, как cap будет порезан risk-layer или другими owner-checks.',
        'если requested сильно выше applied, значит проблема не в самой Policy-идее размера, а в том, что нижележащие ограничения системно урезают stake перед входом.'
    ),
    'Average cap applied %': buildRuTooltip(
        'Average cap applied %',
        'среднюю долю капитала, которая реально дошла до исполненной сделки',
        'это CapFractionApplied после всех risk checks и финальных size cuts. Поле уже показывает реальное capital usage, а не исходное желание Policy.',
        'сравнение с Average cap requested % быстро показывает, насколько агрессивно pipeline режет размер позиции перед execution. Чем сильнее разрыв, тем жёстче owner-layer риска.'
    )
})

Object.assign(BACKTEST_EXECUTION_PIPELINE_COLUMNS_EN, {
    Policy: COMMON_POLICY_DESCRIPTION_EN,
    Margin:
        BACKTEST_SUMMARY_COLUMNS_EN.Margin ??
        buildEnTooltip(
            'Margin',
            'the row-level margin regime: cross or isolated',
            'the field is not a money amount. It tells which collateral model absorbs losses on all downstream execution and accounting layers.',
            'the same return profile means different emergency risk under cross and isolated margin because cross can pull on the whole bucket balance.'
        ),
    CalcMode: buildEnTooltip(
        'CalcMode',
        'the rule that turns the daily decision into the final [[position|position]] size',
        '1) [[budgeted-calc-mode|Budgeted]]: the engine first chooses the allowed cash risk for one position. The key parameter here is [[margin|margin]]. It is adjusted so the loss up to [[tp-sl|stop-loss]] stays inside that limit.\n2) [[exchange-like-calc-mode|ExchangeLike]]: the engine immediately takes a fixed share of the current [[bucket|bucket]] capital as trade margin.\n3) Then [[leverage|leverage]] is applied on top of that margin, and the full position size appears.',
        '1) Rows with different CalcMode values should not be compared directly: the same [[landing-signal|signal]] can open a different position size.\n2) Budgeted depends more on the distance to stop-loss.\n3) ExchangeLike depends more on the current bucket capital.',
        'Example:\nif two modes see the same [[landing-signal|signal]], Budgeted can open a smaller position when stop-loss stands far away and the allowed cash risk has to stay tight.'
    ),
    SignalDays: buildEnTooltip(
        'SignalDays',
        'the number of trading days that entered the pipeline before policy-level branching',
        'this is the top-level base for the model layer: LONG, SHORT, and no-direction are all counted against this history, and downstream TradeDays / NoTradeDays are derived from the same pool.',
        'SignalDays is not the number of trades and not the number of policies. A thin value makes every downstream share materially less stable.',
        'Formula:\nLongSignalDays + ShortSignalDays + NoDirectionDays = SignalDays.'
    ),
    LongSignalDays: buildEnTooltip(
        'LongSignalDays',
        'how many days the model layer sent toward LONG before Policy logic',
        'this is still the raw directional answer of the model stack rather than the final executed trade. Policy skip, cap cuts, and execution events have not fired yet.',
        'a high value means model-layer bias toward upside. The next question is whether that bias survives decision filters and actually reaches TradeDays.'
    ),
    ShortSignalDays: buildEnTooltip(
        'ShortSignalDays',
        'how many days the model layer sent toward SHORT before Policy logic',
        'the count reflects only the original directional output of the model and still ignores downstream no-trade decisions, size cuts, and execution mechanics.',
        'if ShortSignalDays rises without a similar rise in TradeDays, the bearish model bias is being lost on lower layers rather than converted into real trading coverage.'
    ),
    NoDirectionDays: buildEnTooltip(
        'NoDirectionDays',
        'how many days the model layer ended without a trading direction',
        'on those dates the model produced neither LONG nor SHORT, so the day never becomes a full directional candidate for later policy and execution layers.',
        'a high count means weak coverage starts at the model layer itself. Then the root cause is not leverage or exit logic but the missing directional signal.'
    ),
    'LongSignalRate%': buildEnTooltip(
        'LongSignalRate%',
        'the share of LONG days inside total SignalDays',
        'the metric shows how much of the top-layer history the model sends toward upside before Policy logic starts filtering the day.',
        'it only makes sense next to ShortSignalRate% and NoDirectionRate%. A rising share must be interpreted relative to the other two rates.',
        'Formula:\nLongSignalDays / SignalDays * 100.'
    ),
    'ShortSignalRate%': buildEnTooltip(
        'ShortSignalRate%',
        'the share of SHORT days inside total SignalDays',
        'the field answers how often the model layer treated downside as the dominant directional output of the day.',
        'if the rate rises while TradeDays does not, bearish model bias is being blocked or diluted on lower decision and execution layers.',
        'Formula:\nShortSignalDays / SignalDays * 100.'
    ),
    'NoDirectionRate%': buildEnTooltip(
        'NoDirectionRate%',
        'the share of no-direction days inside total SignalDays',
        'this is an upper-layer no-direction frequency before Policy, leverage, and trade execution are even considered.',
        'a high value means much of the no-trade behavior is born at the model layer. Then lower risk filters are not the primary explanation for poor coverage.',
        'Formula:\nNoDirectionDays / SignalDays * 100.'
    ),
    TradeDays: buildEnTooltip(
        'TradeDays',
        'the number of unique dates where the current Policy reached at least one executed trade',
        'the decision layer counts distinct trade dates rather than the full number of trade records. One day with multiple intraday re-entries still contributes one TradeDay.',
        'when TradeDays sits far below SignalDays, the root cause of weak coverage lives between model and execution: policy skip logic, risk cuts, or the policy rules themselves.'
    ),
    NoTradeDays: buildEnTooltip(
        'NoTradeDays',
        'the number of history days that produced no trade for the current Policy',
        'this is decision-layer no-trade: the day existed in history, but after Policy, cap, and risk checks it never became a trade day.',
        'rising NoTradeDays means coverage is being lost on the decision layer rather than on the model layer. Coverage % and diagnostics then become the next place to read.'
    ),
    'Coverage %': buildEnTooltip(
        'Coverage %',
        'the share of trade days for the current Policy inside full SignalDays',
        'the metric compresses TradeDays and SignalDays into one coverage ratio and answers how much of the available history the Policy truly converted into trades.',
        'a low value means many days are blocked between the model signal and real execution. A high value means the Policy usually succeeds in turning the day into trading activity.',
        'Formula:\nTradeDays / SignalDays * 100.'
    ),
    'Average leverage':
        BACKTEST_SUMMARY_COLUMNS_EN.Leverage ??
        buildEnTooltip(
            'Average leverage',
            'the average effective leverage of the executed trades',
            'the value comes from the decision ledger and already reflects real leverage cuts after risk layers rather than only the configured policy number.',
            'if the average sits materially below the policy expectation, the risk size is being reduced before the trade reaches execution.'
        ),
    'Average cap requested %': buildEnTooltip(
        'Average cap requested %',
        'the average share of capital the Policy asked for before final cuts',
        'the field uses CapFractionRequested and reflects the intended trade size before risk layers and owner checks trim the position.',
        'if requested is much higher than applied, the weakness does not sit in the policy idea itself but in the lower layers that keep cutting position size.'
    ),
    'Average cap applied %': buildEnTooltip(
        'Average cap applied %',
        'the average share of capital that actually reached the executed trade',
        'this is CapFractionApplied after all risk checks and final size cuts, so it reflects real capital usage rather than desired size.',
        'the gap versus requested cap shows how aggressively the pipeline trims stake before market entry. A large gap means the owner risk layer is very active.'
    )
})

Object.assign(BACKTEST_EXECUTION_PIPELINE_COLUMNS_RU, {
    TradesCount: TRADE_COUNT_DESCRIPTION,
    Daily: buildRuTooltip(
        'Daily',
        'сколько сделок текущей Policy пришло из daily execution-path',
        'это сделки, где день дал один основной вход без delayed-логики и без intraday-перезаходов как источника строки execution-level.',
        'если Daily доминирует, итог Policy в основном строится главным дневным каналом. Тогда проблемы delayed или intraday уже не являются корневой причиной агрегированного результата.'
    ),
    Intraday: buildRuTooltip(
        'Intraday',
        'сколько сделок текущей Policy пришло из intraday execution-path',
        'поле считает именно trades со сценарием внутридневного исполнения и перезаходов, а не все сделки дня в целом.',
        'рост Intraday означает, что заметная часть результата Policy формируется минутным execution-loop. Это делает важнее анализ exit reasons, commissions и liquidation distance.'
    ),
    DelayedA: buildRuTooltip(
        'DelayedA',
        'количество сделок, которые открылись через первый delayed execution-channel',
        'это не отдельная Policy, а один из отложенных путей входа в сделку после того, как день уже получил направление и базовые risk-параметры.',
        'если DelayedA заметен в объёме trades, значит итог Policy зависит не только от мгновенного входа, но и от того, как рынок дошёл до отложенной цены исполнения.'
    ),
    DelayedB: buildRuTooltip(
        'DelayedB',
        'количество сделок, которые открылись через второй delayed execution-channel',
        'поле показывает альтернативный delayed-path и помогает отделить вклад второго канала исполнения от Daily, Intraday и DelayedA.',
        'если DelayedB редок, по нему не стоит делать сильные выводы из одной-двух строк. Если он стабильно высок, execution quality уже зависит от второго delayed-механизма.'
    ),
    ExitTakeProfitCount: buildRuTooltip(
        'ExitTakeProfitCount',
        'сколько сделок закрылись штатно по take-profit',
        'поле считает именно финальное exit event, а не просто факт, что цена когда-то была в прибыли. В счёт идут только строки, где закрытие реально произошло по TP.',
        'высокая доля take-profit exits означает, что execution-path часто доводит идею до плановой фиксации прибыли, а не до EOD, stop-loss или liquidation.'
    ),
    ExitStopLossCount: buildRuTooltip(
        'ExitStopLossCount',
        'сколько сделок закрылись защитно по stop-loss',
        'это число показывает, сколько trade paths дошло именно до защитной границы убытка, а не до EOD или аварийной liquidation.',
        'если stop-loss exits много при умеренном TradeDays, Policy часто формирует направления, которые доходят до рынка, но не выдерживают adverse path после входа.'
    ),
    ExitLiquidationCount: buildRuTooltip(
        'ExitLiquidationCount',
        'сколько сделок завершились аварийно по liquidation как по финальной причине выхода',
        'поле отвечает именно за итоговый exit reason. Оно не считает просто близкие подходы к ликвидации или случаи, где уровень был достижим, но trade закрылся раньше по другому событию.',
        'даже небольшой рост этого счётчика означает хвостовой риск execution-layer. Его нужно читать вместе с RealLiquidationCount, HadLiquidation и aggregation drawdown.'
    ),
    ExitEndOfWindowCount: buildRuTooltip(
        'ExitEndOfWindowCount',
        'сколько сделок дожили до принудительного закрытия по концу торгового окна',
        'эти строки не дошли ни до take-profit, ни до stop-loss, ни до liquidation и были закрыты правилом времени EndOfDay.',
        'высокий счётчик EOD означает, что стратегия часто не реализует явный выходной сценарий внутри окна. Тогда полезно отдельно смотреть gross PnL, commissions и итоговый net result.'
    ),
    LiqReachableTrades: buildRuTooltip(
        'LiqReachableTrades',
        'сколько сделок вообще имели рабочий достижимый сценарий ликвидации в своей конфигурации',
        'поле не означает, что ликвидация уже случилась. Оно лишь показывает, что для сделки был рассчитан реальный liquidation boundary и аварийный исход оставался достижимым сценарием пути цены.',
        'если почти все trades liquidation-reachable, безопасность Policy сильнее зависит от distance to liquidation и leverage discipline, чем от самого факта, случилась ли ликвидация сейчас.'
    ),
    RealLiquidationCount: buildRuTooltip(
        'RealLiquidationCount',
        'сколько сделок строго дошли до консервативной backtest-цены ликвидации',
        'это более жёсткий счётчик, чем просто liquidation exit. Здесь считаются только строки, где trade path реально достиг критической liquidation boundary.',
        'если RealLiquidationCount ниже ExitLiquidationCount, часть аварийных исходов пришла через более широкий liquidation outcome, а не через строгий touch критической цены.'
    ),
    SumPositionGrossPnlUsd: buildRuTooltip(
        'SumPositionGrossPnlUsd',
        'сумму валового PnL позиции до комиссий по всем trades текущей Policy',
        'это чистый результат движения цены по позициям без вычета комиссий и без bucket-level capital adjustments. Поле отвечает на вопрос, что дало само направление и price move.',
        'сравнение с SumCommissionUsd и SumTradeNetUsd показывает, сколько gross результата осталось после торговых издержек и доменной бухгалтерии бакета.'
    ),
    SumCommissionUsd: buildRuTooltip(
        'SumCommissionUsd',
        'суммарные комиссии по всем trades текущей Policy',
        'в счёт идут все торговые fees, которые были списаны между gross результатом позиции и итоговой visible wealth delta бакета.',
        'если gross PnL выглядит сильным, а net result слабый, именно комиссии часто объясняют, где часть edge растворяется до итоговой денежной дельты.'
    ),
    SumTradeNetUsd: buildRuTooltip(
        'SumTradeNetUsd',
        'сумму фактической visible wealth delta бакета по всем trades текущей Policy',
        'это уже каноничный денежный итог на уровне капитала бакета после комиссий. Поле считает не raw move позиции, а то, что реально осталось в bucket visible wealth.',
        'именно этот показатель ближе всего к деньгам, которые стратегия принесла или потеряла на accounting-layer. Его нужно читать вместе с gross PnL и capital adjustments.'
    ),
    SumCapitalAdjustmentUsd: buildRuTooltip(
        'SumCapitalAdjustmentUsd',
        'суммарную разницу между net PnL позиции и фактической visible wealth delta бакета',
        'ненулевое значение означает, что между trade net result и bucket accounting работали доменные capital adjustments. Это уже не price move и не комиссия, а отдельная корректировка бухгалтерии капитала.',
        'если показатель заметен, слабое совпадение между trade-level PnL и bucket wealth уже нельзя объяснять только fees. Причина сидит в accounting-правилах бакета.'
    ),
    MaxAbsCapitalAdjustmentUsd: buildRuTooltip(
        'MaxAbsCapitalAdjustmentUsd',
        'наибольшую по модулю капиталовую корректировку на одной сделке',
        'поле показывает не сумму всех adjustments, а самый тяжёлый единичный эпизод, где bucket accounting сильнее всего отклонился от net PnL позиции.',
        'если максимум большой, хвостовой accounting-эффект сидит в нескольких отдельных trades. Тогда нужно проверять не средний режим, а конкретные экстремальные строки.'
    ),
    InvariantBreaks: buildRuTooltip(
        'InvariantBreaks',
        'количество сделок, где ledger-проверка visible wealth не сошлась в пределах epsilon',
        'здесь сравнивается, равна ли фактическая visible wealth delta разнице bucket wealth after и before. Ненулевое значение уже означает проблему целостности accounting-layer, а не обычный рыночный убыток.',
        'здоровое значение — 0. Любой рост InvariantBreaks указывает на broken accounting contract, который нужно разбирать как дефект расчёта, а не как плохую торговую метрику.'
    ),
    'TotalPnl%': TOTAL_PNL_DESCRIPTION,
    'MaxDD%': DRAWDOWN_DESCRIPTION,
    'MaxDDNoLiq%': buildRuTooltip(
        'MaxDDNoLiq%',
        'максимальную просадку после удаления liquidation-эпизодов из кривой капитала',
        'метрика отделяет обычную болезненную динамику Policy от той части провала, которая пришла именно через liquidation tails.',
        'если обычный MaxDD% сильно хуже этого поля, основная тяжесть результата сидит в liquidation-сценариях. Если значения близки, слабость стратегии шире и не сводится к аварийному хвосту.'
    ),
    'WinRate%': buildRuTooltip(
        'WinRate%',
        'долю trades текущей Policy, у которых visible wealth delta оказалась положительной',
        'в pipeline этот показатель считается на aggregation-layer по фактическому денежному итогу сделки, а не по raw move цены или формальному направлению.',
        'WinRate% нельзя читать отдельно от TotalPnl% и MaxDD%. Высокая доля побед при слабом return обычно означает, что проигравшие trades крупнее победителей.',
        'Формула:\nколичество trades с положительной visible wealth delta / общее число trades * 100.'
    ),
    HadLiquidation: LIQUIDATION_DESCRIPTION,
    WithdrawnTotalUsd: WITHDRAWN_PROFIT_DESCRIPTION
})

Object.assign(BACKTEST_EXECUTION_PIPELINE_COLUMNS_EN, {
    TradesCount: COMMON_TRADES_DESCRIPTION_EN,
    Daily: buildEnTooltip(
        'Daily',
        'how many trades of the current Policy came from the daily execution path',
        'these are trades where the main day-level entry path created the execution event rather than delayed channels or intraday re-entry mechanics.',
        'if Daily dominates, the policy result is mostly built by the primary daily channel. Then delayed or intraday issues are not the main source of the aggregate result.'
    ),
    Intraday: buildEnTooltip(
        'Intraday',
        'how many trades of the current Policy came from the intraday execution path',
        'the field counts only trades produced by the intraday loop and re-entry mechanics rather than every trade that happened during the day.',
        'a higher value means more of the policy outcome depends on minute-level execution behavior, which makes exit reasons, commissions, and liquidation buffers more important.'
    ),
    DelayedA: buildEnTooltip(
        'DelayedA',
        'the number of trades opened through the first delayed execution channel',
        'this is not a separate Policy. It is one delayed entry path that activates after direction and base risk settings are already known for the day.',
        'if DelayedA matters in volume, the policy outcome depends not only on instant entry but also on whether price reaches the delayed execution level.'
    ),
    DelayedB: buildEnTooltip(
        'DelayedB',
        'the number of trades opened through the second delayed execution channel',
        'the field exposes the alternative delayed path and separates its contribution from Daily, Intraday, and DelayedA activity.',
        'if DelayedB is rare, it should not drive strong conclusions from one or two rows. If it stays large, the second delayed mechanism materially shapes execution quality.'
    ),
    ExitTakeProfitCount: buildEnTooltip(
        'ExitTakeProfitCount',
        'how many trades closed normally by take-profit',
        'the count tracks the final exit event rather than the mere fact that price was once in profit. Only rows whose actual close happened by TP are included.',
        'a higher count means the execution path often reaches planned profit realization instead of ending by stop-loss, end-of-window, or liquidation.'
    ),
    ExitStopLossCount: buildEnTooltip(
        'ExitStopLossCount',
        'how many trades closed defensively by stop-loss',
        'the field shows how many trade paths actually reached the protective loss boundary rather than simply having a weak outcome later.',
        'if stop-loss exits stay high while TradeDays is moderate, the policy frequently reaches the market but then fails to survive the adverse path after entry.'
    ),
    ExitLiquidationCount: buildEnTooltip(
        'ExitLiquidationCount',
        'how many trades finished by liquidation as their final exit reason',
        'the field counts only the actual final exit event. It does not include trades that merely came close to liquidation or had a reachable liquidation level but closed for another reason.',
        'even a small rise signals tail risk on the execution layer and must be judged together with RealLiquidationCount, HadLiquidation, and aggregate drawdown.'
    ),
    ExitEndOfWindowCount: buildEnTooltip(
        'ExitEndOfWindowCount',
        'how many trades survived until the forced end-of-window close',
        'these trades hit neither take-profit nor stop-loss nor liquidation inside the working window and were therefore closed by the EndOfDay time rule.',
        'a high count means the strategy often does not realize a clear exit event inside the window. Gross PnL, commissions, and net result then become more important for interpretation.'
    ),
    LiqReachableTrades: buildEnTooltip(
        'LiqReachableTrades',
        'how many trades had a real reachable liquidation scenario in their configuration',
        'the field does not say liquidation already happened. It only says the trade had a working liquidation boundary and emergency close was a reachable path under its leverage and margin setup.',
        'if most trades are liquidation-reachable, safety depends heavily on liquidation distance and leverage discipline even when actual liquidations remain rare.'
    ),
    RealLiquidationCount: buildEnTooltip(
        'RealLiquidationCount',
        'how many trades strictly reached the conservative backtest liquidation price',
        'this is stricter than a broad liquidation outcome count. Only trades whose path actually touched the critical liquidation boundary are included here.',
        'if RealLiquidationCount stays below ExitLiquidationCount, part of the emergency outcomes came through a wider liquidation scenario rather than a strict touch of the critical price.'
    ),
    SumPositionGrossPnlUsd: buildEnTooltip(
        'SumPositionGrossPnlUsd',
        'the total gross position PnL before commissions for all trades of the current Policy',
        'this is the pure price-move result before fees and before bucket-level capital adjustments. It answers what the position path itself generated.',
        'comparing it with SumCommissionUsd and SumTradeNetUsd shows how much of the raw edge survives after trading costs and bucket accounting.'
    ),
    SumCommissionUsd: buildEnTooltip(
        'SumCommissionUsd',
        'the total commissions charged across all trades of the current Policy',
        'the field aggregates every trading fee paid between gross position PnL and the final visible wealth delta of the bucket.',
        'if gross PnL looks strong while the net result is weak, commissions are often the layer where meaningful edge disappears before it reaches capital.'
    ),
    SumTradeNetUsd: buildEnTooltip(
        'SumTradeNetUsd',
        'the total visible wealth delta of the bucket across all trades of the current Policy',
        'this is the canonical cash result on bucket-capital level after commissions. It is closer to actual money than raw position PnL.',
        'the field should be read together with gross PnL and capital adjustments to see where the trade-level result turns into actual bucket wealth.'
    ),
    SumCapitalAdjustmentUsd: buildEnTooltip(
        'SumCapitalAdjustmentUsd',
        'the total gap between position net PnL and the actual visible wealth delta of the bucket',
        'a non-zero value means domain capital adjustments operated between trade net result and bucket accounting. This is not pure price move and not a commission line.',
        'if the value is meaningful, weak alignment between trade-level PnL and bucket wealth cannot be explained by fees alone. The root cause sits in bucket accounting rules.'
    ),
    MaxAbsCapitalAdjustmentUsd: buildEnTooltip(
        'MaxAbsCapitalAdjustmentUsd',
        'the largest absolute capital adjustment observed on a single trade',
        'the field does not show the sum of adjustments. It highlights the heaviest single accounting episode where bucket wealth deviated most from position net PnL.',
        'a large maximum means tail accounting effects sit in a few specific trades, so the dangerous behavior is concentrated rather than evenly spread.'
    ),
    InvariantBreaks: buildEnTooltip(
        'InvariantBreaks',
        'how many trades failed the ledger invariant that visible wealth delta must equal bucket wealth after minus before',
        'the field is an accounting-integrity counter rather than a return metric. Any non-zero value already points to a broken accounting contract on the pipeline layer.',
        'the healthy value is 0. When it rises, the problem is not market behavior but a mismatch inside calculation or serialization of bucket accounting.'
    ),
    'TotalPnl%': COMMON_TOTAL_PNL_DESCRIPTION_EN,
    'MaxDD%': COMMON_MAX_DD_DESCRIPTION_EN,
    'MaxDDNoLiq%': buildEnTooltip(
        'MaxDDNoLiq%',
        'the maximum drawdown after liquidation episodes are removed from the equity path',
        'the metric isolates ordinary capital pain from the part of the collapse that came specifically through liquidation tails.',
        'if regular MaxDD% is much worse than this field, liquidation scenarios drive the damage. If both values stay close, the weakness is broader than emergency liquidation alone.'
    ),
    'WinRate%': buildEnTooltip(
        'WinRate%',
        'the share of trades whose visible wealth delta ended positive',
        'inside the pipeline this is computed on the actual bucket-capital outcome rather than on raw price move or only on directional correctness.',
        'win rate never stands alone. A high win share with weak total return usually means losers are fewer but materially larger than winners.',
        'Formula:\ncount of trades with positive visible wealth delta / total trades * 100.'
    ),
    HadLiquidation: COMMON_HAD_LIQ_DESCRIPTION_EN,
    WithdrawnTotalUsd: COMMON_WITHDRAWN_DESCRIPTION_EN
})

Object.assign(BACKTEST_EXECUTION_PIPELINE_KEYS_RU, {
    CalcMode: BACKTEST_EXECUTION_PIPELINE_COLUMNS_RU.CalcMode,
    Policies: buildRuTooltip(
        'Policies',
        'количество Policy, которые попали в текущий execution pipeline report',
        'это размер активного policy-пула в выбранном фиксированном run mode. Поле не показывает качество стратегий, а только ширину сравниваемого набора.',
        'если Policies мало, итоговый pipeline отражает только узкое семейство конфигураций. Если Policies много, дальнейшие слои сравнивают более широкий пул решений.'
    ),
    SignalDays: BACKTEST_EXECUTION_PIPELINE_COLUMNS_RU.SignalDays,
    TradesCount: buildRuTooltip(
        'TradesCount',
        'суммарное число trades по всем Policy текущего pipeline',
        'это общий объём фактического execution material, который прошёл через decision, execution, accounting и aggregation уровни.',
        'поле удобно читать как меру массы отчёта. Чем больше TradesCount, тем больше реальных событий лежит под итоговыми средними, долями и финансовыми суммами.'
    ),
    RunMode: buildRuTooltip(
        'RunMode',
        'фиксированный режим среза, под который был собран pipeline report',
        'в текущем контракте значение показывает конкретную комбинацию branch/sl slice, например with_sl_base. Это owner-подпись того, какой именно execution contour сейчас открыт.',
        'пока RunMode не совпадает, числа между разными pipeline-отчётами нельзя смешивать напрямую. Иначе сравниваются уже разные trade universes и разные правила выхода.'
    )
})

Object.assign(BACKTEST_EXECUTION_PIPELINE_KEYS_EN, {
    CalcMode: BACKTEST_EXECUTION_PIPELINE_COLUMNS_EN.CalcMode,
    Policies: buildEnTooltip(
        'Policies',
        'the number of policies included in the current execution pipeline report',
        'the field is the width of the active policy pool under the selected fixed run mode. It does not describe quality by itself; it describes comparison breadth.',
        'a small value means the pipeline reflects only a narrow family of configurations. A large value means downstream layers compare a broader pool of decisions.'
    ),
    SignalDays: BACKTEST_EXECUTION_PIPELINE_COLUMNS_EN.SignalDays,
    TradesCount: buildEnTooltip(
        'TradesCount',
        'the total number of trades across all policies in the current pipeline',
        'this is the full volume of factual execution material that passed through decision, execution, accounting, and aggregation layers.',
        'the field works as a mass indicator of the report. The more TradesCount it contains, the more event evidence sits under averages, shares, and financial sums.'
    ),
    RunMode: buildEnTooltip(
        'RunMode',
        'the fixed mode slice under which the pipeline report was built',
        'in the current contract the value identifies the concrete branch and SL slice, for example with_sl_base. It is the owner tag of which execution contour is currently open.',
        'pipeline numbers should only be compared directly when RunMode matches. Otherwise the report is already describing different trade universes and different exit rules.'
    )
})

export const BACKTEST_EXECUTION_PIPELINE_COLUMN_KEYS = Object.freeze(
    Object.keys(BACKTEST_EXECUTION_PIPELINE_COLUMNS_RU)
)

export const BACKTEST_EXECUTION_PIPELINE_KEY_KEYS = Object.freeze(Object.keys(BACKTEST_EXECUTION_PIPELINE_KEYS_RU))

export function resolveExecutionPipelineColumnTooltip(title: string, locale: 'ru' | 'en'): string | null {
    const source = locale === 'en' ? BACKTEST_EXECUTION_PIPELINE_COLUMNS_EN : BACKTEST_EXECUTION_PIPELINE_COLUMNS_RU
    return source[title] ?? null
}

export function resolveExecutionPipelineKeyTooltip(key: string, locale: 'ru' | 'en'): string | null {
    const source = locale === 'en' ? BACKTEST_EXECUTION_PIPELINE_KEYS_EN : BACKTEST_EXECUTION_PIPELINE_KEYS_RU
    return source[key] ?? null
}
