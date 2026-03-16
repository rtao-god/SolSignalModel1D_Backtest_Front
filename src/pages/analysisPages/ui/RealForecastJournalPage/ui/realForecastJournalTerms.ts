import { normalizeComparableTerm } from '@/shared/ui/TermTooltip/lib/termTooltipMatcher'
import { resolveReportColumnTooltip, resolveReportKeyTooltip } from '@/shared/utils/reportTooltips'

export type RealForecastJournalTermsLocale = 'ru' | 'en'

export interface RealForecastJournalResolvedTooltip {
    description: string
    selfAliases?: string[]
}

function matchesTitle(normalizedTitle: string, labels: readonly string[]): boolean {
    return labels.some(label => normalizeComparableTerm(label) === normalizedTitle)
}

function buildRuTooltip(term: string, what: string, howToRead: string, extra?: string): string {
    return `${term}.\n\nЧто показывает:\n${what}\n\nКак читать:\n${howToRead}${extra ? `\n\n${extra}` : ''}`
}

function buildEnTooltip(term: string, what: string, howToRead: string, extra?: string): string {
    return `${term}.\n\nWhat it shows:\n${what}\n\nHow to read it:\n${howToRead}${extra ? `\n\n${extra}` : ''}`
}

function resolveSharedColumnTooltip(
    reportKind: string,
    title: string,
    locale: RealForecastJournalTermsLocale,
    selfAliases?: string[]
): RealForecastJournalResolvedTooltip {
    const description = resolveReportColumnTooltip(reportKind, undefined, title, locale)
    if (!description) {
        throw new Error(`[real-forecast-journal-terms] missing shared column tooltip: ${reportKind}:${title}.`)
    }

    return { description, selfAliases }
}

function resolveSharedKeyTooltip(
    reportKind: string,
    key: string,
    locale: RealForecastJournalTermsLocale,
    selfAliases?: string[]
): RealForecastJournalResolvedTooltip {
    const description = resolveReportKeyTooltip(reportKind, undefined, key, locale)
    if (!description) {
        throw new Error(`[real-forecast-journal-terms] missing shared key tooltip: ${reportKind}:${key}.`)
    }

    return { description, selfAliases }
}

// Локальный resolver нужен потому, что журнал смешивает current-prediction термины,
// live monitoring и comparison-таблицы. Общий report glossary не знает этот mix как один reportKind.
export function resolveRealForecastJournalColumnTooltip(
    title: string,
    locale: RealForecastJournalTermsLocale
): RealForecastJournalResolvedTooltip | null {
    const normalizedTitle = normalizeComparableTerm(title)
    if (!normalizedTitle) {
        return null
    }

    if (matchesTitle(normalizedTitle, ['Policy'])) {
        return resolveSharedColumnTooltip('current_prediction_history', 'Policy', locale, ['Policy', 'Политика'])
    }

    if (matchesTitle(normalizedTitle, ['Branch', 'Ветка'])) {
        return resolveSharedColumnTooltip('current_prediction_history', 'Branch', locale, ['Branch', 'Ветка'])
    }

    if (matchesTitle(normalizedTitle, ['Bucket', 'Бакет'])) {
        return resolveSharedColumnTooltip('current_prediction_history', 'Bucket', locale, ['Bucket', 'Бакет'])
    }

    if (matchesTitle(normalizedTitle, ['Margin mode', 'Режим маржи'])) {
        return resolveSharedColumnTooltip('backtest_summary', 'MarginMode', locale, [
            'Margin mode',
            'MarginMode',
            'Режим маржи'
        ])
    }

    if (matchesTitle(normalizedTitle, ['Direction', 'Направление'])) {
        return resolveSharedColumnTooltip('current_prediction_history', 'Direction', locale, [
            'Direction',
            'Направление'
        ])
    }

    if (matchesTitle(normalizedTitle, ['Risk day', 'Риск-день'])) {
        return resolveSharedColumnTooltip('current_prediction_history', 'Risk day', locale, [
            'Risk day',
            'Рискованный день',
            'Риск-день'
        ])
    }

    if (matchesTitle(normalizedTitle, ['Skipped', 'Пропуск'])) {
        return resolveSharedColumnTooltip('current_prediction_history', 'Skipped', locale, [
            'Skipped',
            'Пропущено',
            'Пропуск'
        ])
    }

    if (matchesTitle(normalizedTitle, ['Leverage', 'Плечо'])) {
        return resolveSharedColumnTooltip('current_prediction_history', 'Leverage', locale, ['Leverage', 'Плечо'])
    }

    if (matchesTitle(normalizedTitle, ['Bucket balance, $', 'Баланс бакета, $'])) {
        return resolveSharedColumnTooltip('current_prediction_history', 'Bucket capital, $', locale, [
            'Bucket balance, $',
            'Bucket capital, $',
            'Баланс бакета, $',
            'Капитал бакета, $'
        ])
    }

    if (matchesTitle(normalizedTitle, ['Margin, $', 'Маржа, $'])) {
        return resolveSharedColumnTooltip('current_prediction_history', 'Stake, $', locale, [
            'Margin, $',
            'Stake, $',
            'Маржа, $',
            'Ставка, $'
        ])
    }

    if (matchesTitle(normalizedTitle, ['Margin, %', 'Маржа, %'])) {
        return resolveSharedColumnTooltip('current_prediction_history', 'Stake, %', locale, [
            'Margin, %',
            'Stake, %',
            'Маржа, %',
            'Ставка, %'
        ])
    }

    if (matchesTitle(normalizedTitle, ['Published notional, $', 'Опубликованный notional, $'])) {
        return resolveSharedColumnTooltip('current_prediction_history', 'Position notional, $', locale, [
            'Published notional, $',
            'Position notional, $',
            'Опубликованный notional, $',
            'Номинал позиции, $'
        ])
    }

    if (matchesTitle(normalizedTitle, ['Entry price', 'Цена входа'])) {
        return resolveSharedColumnTooltip('current_prediction_history', 'Entry price', locale, [
            'Entry price',
            'Цена входа'
        ])
    }

    if (matchesTitle(normalizedTitle, ['Stop-loss price', 'Цена стоп-лосса'])) {
        return resolveSharedColumnTooltip('current_prediction_history', 'Stop-loss price', locale, [
            'Stop-loss price',
            'Цена стоп-лосса'
        ])
    }

    if (matchesTitle(normalizedTitle, ['Take-profit price', 'Цена тейк-профита'])) {
        return resolveSharedColumnTooltip('current_prediction_history', 'Take-profit price', locale, [
            'Take-profit price',
            'Цена тейк-профита'
        ])
    }

    if (matchesTitle(normalizedTitle, ['Liquidation price', 'Цена ликвидации'])) {
        return resolveSharedColumnTooltip('current_prediction_history', 'Liquidation price', locale, [
            'Liquidation price',
            'Цена ликвидации'
        ])
    }

    if (matchesTitle(normalizedTitle, ['Distance to liquidation, %', 'Дистанция до ликвидации, %'])) {
        return resolveSharedColumnTooltip('current_prediction_history', 'Distance to liquidation, %', locale, [
            'Distance to liquidation, %',
            'Дистанция до ликвидации, %'
        ])
    }

    if (matchesTitle(normalizedTitle, ['Actual exit price', 'Фактическая цена выхода'])) {
        return resolveSharedColumnTooltip('current_prediction_history', 'Exit price', locale, [
            'Actual exit price',
            'Exit price',
            'Фактическая цена выхода',
            'Цена выхода'
        ])
    }

    if (matchesTitle(normalizedTitle, ['Actual exit reason', 'Фактическая причина выхода'])) {
        return resolveSharedColumnTooltip('current_prediction_history', 'Exit reason', locale, [
            'Actual exit reason',
            'Exit reason',
            'Фактическая причина выхода',
            'Причина выхода'
        ])
    }

    if (matchesTitle(normalizedTitle, ['Actual exit PnL, %', 'Фактический PnL выхода, %'])) {
        return resolveSharedColumnTooltip('current_prediction_history', 'Exit return, %', locale, [
            'Actual exit PnL, %',
            'Exit return, %',
            'Фактический PnL выхода, %'
        ])
    }

    if (matchesTitle(normalizedTitle, ['Trades', 'Сделки'])) {
        return resolveSharedColumnTooltip('current_prediction_history', 'Trades', locale, ['Trades', 'Сделки'])
    }

    if (matchesTitle(normalizedTitle, ['Total PnL, %', 'Итоговый PnL, %'])) {
        return resolveSharedColumnTooltip('current_prediction_history', 'Total return, %', locale, [
            'Total PnL, %',
            'Total return, %',
            'Итоговый PnL, %',
            'TotalPnl%'
        ])
    }

    if (matchesTitle(normalizedTitle, ['MaxDD, %'])) {
        return resolveSharedColumnTooltip('current_prediction_history', 'Max drawdown, %', locale, [
            'MaxDD, %',
            'Max drawdown, %',
            'MaxDD%'
        ])
    }

    if (matchesTitle(normalizedTitle, ['Had liquidation', 'Была ликвидация'])) {
        return resolveSharedColumnTooltip('current_prediction_history', 'Had liquidation', locale, [
            'Had liquidation',
            'HadLiq',
            'Была ликвидация'
        ])
    }

    if (matchesTitle(normalizedTitle, ['Withdrawn, $', 'Выведено, $'])) {
        return resolveSharedColumnTooltip('current_prediction_history', 'Withdrawn, $', locale, [
            'Withdrawn, $',
            'Выведено, $'
        ])
    }

    if (matchesTitle(normalizedTitle, ['Current SOL price', 'Текущая цена SOL'])) {
        return resolveSharedKeyTooltip('current_prediction_history', 'Current SOL/USDT price', locale, [
            'Current SOL price',
            'Current SOL/USDT price',
            'Текущая цена SOL',
            'Текущая цена SOL/USDT'
        ])
    }

    if (matchesTitle(normalizedTitle, ['Morning forecast', 'Утренний прогноз'])) {
        return {
            description:
                locale === 'ru' ?
                    buildRuTooltip(
                        'Утренний прогноз — флаг того, была ли эта строка опубликована в неизменяемом утреннем snapshot',
                        'значение отделяет реально опубликованный план Policy от строк, которые видны только после финализации дня при сопоставлении утреннего и фактического payload.',
                        'если строка не была опубликована утром, её нельзя использовать как доказательство того, что система знала этот план заранее. Для causal-чтения важны только опубликованные утренние строки.'
                    )
                :   buildEnTooltip(
                        'Morning forecast is the flag showing whether the row existed in the immutable morning snapshot',
                        'the field separates the truly published Policy plan from rows that appear only after day finalization when the morning and realized payloads are compared.',
                        'if the row was not published in the morning, it cannot be used as evidence that the system already knew this plan before the outcome existed.'
                    )
        }
    }

    if (matchesTitle(normalizedTitle, ['Derived notional, $', 'Рассчитанный notional, $'])) {
        return {
            description:
                locale === 'ru' ?
                    buildRuTooltip(
                        'Рассчитанный notional, $ — полный размер позиции, который страница пересчитывает как stakeUsd * leverage',
                        'это контрольное значение для проверки, совпадает ли опубликованный notional с фактической логикой размера позиции из morning payload.',
                        'если derived notional расходится с published notional, причина сидит не в market move, а в самом payload размера позиции или в его интерпретации на странице.'
                    )
                :   buildEnTooltip(
                        'Derived notional, $ is the full position size recomputed on the page as stakeUsd * leverage',
                        'the value is a control number used to check whether published notional stays consistent with the morning stake and leverage payload.',
                        'if derived notional diverges from published notional, the issue sits in position-size payload interpretation rather than in market behavior.'
                    )
        }
    }

    if (matchesTitle(normalizedTitle, ['Live status', 'Текущий статус'])) {
        return {
            description:
                locale === 'ru' ?
                    buildRuTooltip(
                        'Текущий статус — последнее подтверждённое intraday-состояние строки внутри ещё открытого дня',
                        'поле показывает, остаётся ли позиция открытой, уже дошла до тейк-профита, стоп-лосса, ликвидации, конца окна или вообще не отслеживается live-монитором.',
                        'статус нужно читать вместе с минутой события и дистанциями до TP/SL/liquidation. Тогда видно, это уже resolved outcome или ещё только живая позиция без финального факта.'
                    )
                :   buildEnTooltip(
                        'Live status is the latest confirmed intraday state of the row while the day is still open',
                        'the field shows whether the position is still open, already hit take-profit, stop-loss, liquidation, end-of-day, or is not tracked by the live monitor.',
                        'read it together with event minute and current-vs-level distances to distinguish a resolved intraday outcome from a still-open live position.'
                    )
        }
    }

    if (matchesTitle(normalizedTitle, ['Event minute (UTC)', 'Минута события (UTC)'])) {
        return {
            description:
                locale === 'ru' ?
                    buildRuTooltip(
                        'Минута события (UTC) — первая подтверждённая 1m-свеча, на которой live monitor зафиксировал итоговое intraday-событие',
                        'это не время публикации прогноза и не время закрытия дня. Поле появляется только когда у строки уже есть confirmed TP, SL, liquidation или EOD.',
                        'если минуты нет, строка либо ещё открыта, либо для неё нет live-tracking. Поэтому поле важно для causal-порядка: сначала утренний forecast, потом конкретная подтверждённая минута события.'
                    )
                :   buildEnTooltip(
                        'Event minute (UTC) is the first confirmed 1m candle where the live monitor fixed the row outcome',
                        'it is not the forecast publication time and not the day close. The field appears only when TP, SL, liquidation, or EOD was already confirmed for the row.',
                        'if the minute is missing, the row is either still open or not tracked in live mode. That makes the field the causal timestamp of the resolved intraday event.'
                    )
        }
    }

    if (matchesTitle(normalizedTitle, ['Current vs TP', 'Текущая цена vs TP'])) {
        return {
            description:
                locale === 'ru' ?
                    buildRuTooltip(
                        'Текущая цена vs TP — оставшаяся дистанция между текущей live-ценой и уровнем take-profit',
                        'поле показывает, насколько близко открытая позиция сейчас находится к плановой фиксации прибыли. Для already-resolved rows значение читается как последнее расстояние перед событием.',
                        'малое по модулю расстояние означает, что TP уже рядом. Отрицательный или нулевой уровень обычно означает, что цель уже была достигнута или цена её прошла.'
                    )
                :   buildEnTooltip(
                        'Current vs TP is the remaining distance between current live price and the take-profit level',
                        'the field shows how close the open position currently is to planned profit realization. For already resolved rows it is the last tracked distance before the event.',
                        'a small absolute distance means TP is already near. A zero or negative gap usually means the target was already touched or passed.'
                    )
        }
    }

    if (matchesTitle(normalizedTitle, ['Current vs SL', 'Текущая цена vs SL'])) {
        return {
            description:
                locale === 'ru' ?
                    buildRuTooltip(
                        'Текущая цена vs SL — оставшаяся дистанция между текущей live-ценой и стоп-лоссом',
                        'поле показывает, насколько тонким стал защитный буфер у ещё открытой позиции. Для resolved rows это последний зафиксированный gap до stop-loss перед финальным событием.',
                        'чем ближе значение к нулю, тем слабее запас безопасности до защитного выхода. Если gap уже отрицательный, stop-loss фактически был достигнут или пройден.'
                    )
                :   buildEnTooltip(
                        'Current vs SL is the remaining distance between current live price and the stop-loss level',
                        'the field shows how thin the defensive buffer of an open position has become. For resolved rows it is the last tracked gap before the final event.',
                        'the closer the value is to zero, the weaker the remaining safety margin. A negative gap means stop-loss was already reached or crossed.'
                    )
        }
    }

    if (matchesTitle(normalizedTitle, ['Current vs liquidation', 'Текущая цена vs ликвидация'])) {
        return {
            description:
                locale === 'ru' ?
                    buildRuTooltip(
                        'Текущая цена vs ликвидация — текущий запас цены до аварийного уровня liquidation',
                        'поле нужно для live-чтения tail risk: оно показывает, сколько пространства ещё остаётся до forced close именно сейчас, пока день не финализирован.',
                        'если значение быстро сжимается, риск уже не теоретический, а оперативный. Такое сжатие нужно читать вместе с плечом, margin mode и live status.'
                    )
                :   buildEnTooltip(
                        'Current vs liquidation is the current price buffer to the emergency liquidation level',
                        'the field is a live tail-risk read. It shows how much room still remains before forced close while the day is not finalized yet.',
                        'when the gap compresses quickly, liquidation risk is no longer theoretical but operational. Read it together with leverage, margin mode, and live status.'
                    )
        }
    }

    if (matchesTitle(normalizedTitle, ['Group', 'Группа'])) {
        return {
            description:
                locale === 'ru' ?
                    buildRuTooltip(
                        'Группа — семейство индикаторов, к которому относится строка detailed indicator table',
                        'поле помогает не смешивать trend, volatility и другие indicator families в один список. Оно не описывает само значение, а только owner-контекст, из какого блока оно пришло.',
                        'группу удобно читать первой. После неё уже сравниваются утреннее значение, закрытие дня и delta только между близкими индикаторами одного класса.'
                    )
                :   buildEnTooltip(
                        'Group is the indicator family the detailed table row belongs to',
                        'the field keeps trend, volatility, and other indicator families separated instead of mixing every metric into one flat list. It is context rather than the value itself.',
                        'read Group first, then compare morning value, close, and delta only inside similar indicators from the same family.'
                    )
        }
    }

    if (matchesTitle(normalizedTitle, ['Indicator', 'Индикатор'])) {
        return {
            description:
                locale === 'ru' ?
                    buildRuTooltip(
                        'Индикатор — конкретная метрика, которая была доступна утром при публикации прогноза и потом пересчитана к концу дня',
                        'строка держит один и тот же показатель в causal и factual фазах, чтобы сравнение шло по одному сигналу, а не по разным данным.',
                        'если утром и на закрытии дня indicator сильно расходится, важно смотреть не только delta, но и сам класс индикатора: trend, volatility или price-level context.'
                    )
                :   buildEnTooltip(
                        'Indicator is the concrete metric that existed at morning publication time and was later re-read by day close',
                        'the row keeps the same signal across causal and factual phases so the comparison stays on one metric rather than on different data sources.',
                        'when morning and close differ strongly, delta should be read together with the indicator family and not in isolation.'
                    )
        }
    }

    if (matchesTitle(normalizedTitle, ['Morning', 'Утро', 'Session open'])) {
        return {
            description:
                locale === 'ru' ?
                    buildRuTooltip(
                        'Утро — причинно зафиксированное значение индикатора в момент публикации прогноза',
                        'это именно то число, которое модель уже могла видеть до появления факта дня. Поле не должно включать later candles и не переписывается после публикации.',
                        'если утреннее значение уже объясняет будущий outcome слишком хорошо, именно здесь нужно проверять causal-контракт и временные границы данных.'
                    )
                :   buildEnTooltip(
                        'Morning is the causally fixed indicator value at forecast publication time',
                        'this is the number the model could already see before the day outcome existed. The field must not include later candles and does not rewrite after publication.',
                        'if the morning value already seems to explain the future too perfectly, this is the place where causal timing and data boundaries should be checked.'
                    )
        }
    }

    if (matchesTitle(normalizedTitle, ['Day close', 'Закрытие дня', 'Close'])) {
        return {
            description:
                locale === 'ru' ?
                    buildRuTooltip(
                        'Закрытие дня — итоговое значение того же индикатора после завершения нью-йоркской сессии',
                        'это уже factual reading после появления полного дня. Поле не участвует в утреннем прогнозе, а нужно только для честного сравнения того, как indicator изменился после публикации.',
                        'сравнивать утро и закрытие корректно только как path одного и того же индикатора. Это не новая модельная фича, а later state уже завершённого дня.'
                    )
                :   buildEnTooltip(
                        'Day close is the final reading of the same indicator after the New York session finished',
                        'this is already the factual post-close state. It is not part of the morning forecast and exists only for an honest comparison of how the indicator changed after publication.',
                        'morning and close should be read as one indicator path rather than as two different model features.'
                    )
        }
    }

    if (matchesTitle(normalizedTitle, ['Delta', 'Изменение', 'Отклонение'])) {
        return {
            description:
                locale === 'ru' ?
                    buildRuTooltip(
                        'Delta / Изменение / Отклонение — разница между live-значением и выбранным ориентиром в этой конкретной таблице',
                        'в indicator table это разница между утром и закрытием дня. В comparison table это разрыв между живой выборкой и историческим benchmark. Смысл зависит от блока, но всегда показывает gap между двумя сопоставляемыми числами.',
                        'знак и размер delta нужно читать только вместе с соседними колонками, иначе неясно, что именно с чем сравнивается. Delta без базовых чисел не является самостоятельной метрикой качества.'
                    )
                :   buildEnTooltip(
                        'Delta is the gap between the live number and the chosen reference inside this specific table',
                        'in the indicator table it is the change from morning to day close. In comparison tables it is the difference between the live sample and the selected benchmark. The role depends on the block, but the term always means a two-number gap.',
                        'the sign and size of delta only make sense together with the neighboring base columns. Delta alone is not a standalone quality metric.'
                    )
        }
    }

    if (matchesTitle(normalizedTitle, ['Metric', 'Метрика'])) {
        return {
            description:
                locale === 'ru' ?
                    buildRuTooltip(
                        'Метрика — имя показателя, по которому живая выборка журнала сравнивается с историческим ориентиром',
                        'это не значение и не итоговый verdict. Строка только задаёт, о каком именно аспекте идёт речь: точность, log-loss, калибровочный разрыв или размер выборки.',
                        'метрику нужно читать вместе с соседними колонками live / history / delta. Только так видно, лучше или хуже ведёт себя текущая живая выборка относительно истории.'
                    )
                :   buildEnTooltip(
                        'Metric is the name of the indicator used to compare the live journal sample with the historical benchmark',
                        'it is not the value and not a final verdict. The row simply tells whether the table is talking about accuracy, log-loss, calibration gap, or sample size.',
                        'read Metric together with live / history / delta columns. Only then does it become clear whether the current live sample is above or below history.'
                    )
        }
    }

    if (matchesTitle(normalizedTitle, ['Live sample', 'Живая выборка', 'Live days', 'Live-дни'])) {
        return {
            description:
                locale === 'ru' ?
                    buildRuTooltip(
                        'Живая выборка / Live-дни — фактические real-journal наблюдения после публикации прогноза, а не историческая симуляция',
                        'в колонке может стоять либо числовой объём live-дней, либо само live-значение метрики. В обоих случаях источник один: только уже зафиксированные реальные дни без знания будущего в момент публикации.',
                        'если live sample маленькая, даже заметное отклонение от истории ещё неустойчиво. Поэтому колонку всегда нужно читать вместе с размером выборки и delta.'
                    )
                :   buildEnTooltip(
                        'Live sample or Live days means factual journal observations collected after forecast publication rather than historical simulation',
                        'the column may contain either the number of live days or the live value of the metric, but the source is always the same: real captured days without future knowledge at publication time.',
                        'when the live sample is still small, even a noticeable deviation from history is not yet stable. Read the column together with sample size and delta.'
                    )
        }
    }

    if (
        matchesTitle(normalizedTitle, [
            'Historical benchmark',
            'Исторический ориентир',
            'Historical accuracy',
            'Историческая точность'
        ])
    ) {
        return {
            description:
                locale === 'ru' ?
                    buildRuTooltip(
                        'Исторический ориентир / Историческая точность — базовый reference из прошлой истории, с которым сопоставляется живая выборка журнала',
                        'источник зависит от блока: это либо aggregation benchmark всего forecast layer, либо историческая точность соответствующего confidence-bucket.',
                        'колонка не описывает текущий день. Она нужна как baseline, чтобы понять, насколько live-сигналы пока похожи на ту историю, на которой система раньше уже выглядела рабочей.'
                    )
                :   buildEnTooltip(
                        'Historical benchmark or Historical accuracy is the reference taken from past history and used to compare the live journal sample',
                        'the exact source depends on the block: either the full aggregation benchmark of the forecast layer or the historical accuracy of the matching confidence bucket.',
                        'the column does not describe the current day. It is the baseline used to judge whether live signals still resemble the history that previously looked acceptable.'
                    )
        }
    }

    if (matchesTitle(normalizedTitle, ['Range', 'Диапазон'])) {
        return {
            description:
                locale === 'ru' ?
                    buildRuTooltip(
                        'Диапазон — границы confidence-bucket, в который попали live-дни этой строки',
                        'поле отвечает не за качество само по себе, а за то, какой именно кусок шкалы model confidence сравнивается с историей в текущей bucket-row.',
                        'диапазон нужен, чтобы не смешивать соседние корзины уверенности. Только внутри одного range корректно сравнивать live accuracy и historical accuracy.'
                    )
                :   buildEnTooltip(
                        'Range is the confidence-bucket interval the live days of the row fell into',
                        'the field is not quality by itself. It tells which exact slice of model confidence is being compared with history in the current bucket row.',
                        'the range matters because neighboring buckets should not be mixed. Live and historical accuracy are only directly comparable inside the same interval.'
                    )
        }
    }

    if (matchesTitle(normalizedTitle, ['Realized accuracy', 'Фактическая точность'])) {
        return {
            description:
                locale === 'ru' ?
                    buildRuTooltip(
                        'Фактическая точность — доля live-дней, где опубликованный прогноз совпал с фактическим направлением дня',
                        'это уже честный realized hit-rate на real journal sample, а не историческая оценка и не модельная вероятность.',
                        'если фактическая точность заметно ниже истории, вопрос уже не в bucket label, а в том, переносится ли historical edge на новые реальные дни после запуска.'
                    )
                :   buildEnTooltip(
                        'Realized accuracy is the share of live days where the published forecast matched the realized direction of the day',
                        'this is the honest hit-rate on the real journal sample rather than a historical estimate or a model probability.',
                        'when realized accuracy is materially below history, the main question is no longer the bucket label but whether historical edge truly transfers to new post-launch days.'
                    )
        }
    }

    if (matchesTitle(normalizedTitle, ['Live avg confidence', 'Средняя live-уверенность'])) {
        return {
            description:
                locale === 'ru' ?
                    buildRuTooltip(
                        'Средняя live-уверенность — средняя присвоенная вероятность среди live-дней текущего confidence-bucket',
                        'поле показывает не границы bucket, а фактический средний уровень уверенности тех дней, которые реально попали в строку журнала.',
                        'если live avg confidence заметно смещена к краю диапазона, bucket используется неравномерно. Тогда соседние buckets стоит читать осторожнее и не считать строку идеально типичной.'
                    )
                :   buildEnTooltip(
                        'Live avg confidence is the average assigned probability across the live days inside the current confidence bucket',
                        'the field is not the bucket boundary itself. It is the realized mean confidence of the journal days that actually landed in the row.',
                        'if the mean is pushed toward one edge of the interval, the bucket is populated unevenly and neighboring buckets should be compared with extra care.'
                    )
        }
    }

    return null
}
