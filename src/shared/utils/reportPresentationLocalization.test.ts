import {
    localizeReportColumnTitle,
    localizeReportKeyValue,
    localizeReportDocumentTitle,
    localizeReportKeyLabel,
    localizeReportSectionCompactTitle,
    localizeReportSectionTitle
} from './reportPresentationLocalization'

describe('reportPresentationLocalization', () => {
    test('localizes diagnostics ratings section titles in RU', () => {
        expect(
            localizeReportSectionTitle(
                'backtest_diagnostics',
                'Top 20 trades by CapitalDeltaUsd',
                'ru'
            )
        ).toBe('Топ-20 сделок по изменению капитала, $')

        expect(
            localizeReportSectionTitle(
                'backtest_diagnostics',
                'Top 20 trades by NetReturnPct (best, ALL SL, all buckets together)',
                'ru'
            )
        ).toBe('Топ-20 сделок по доходности сделки, % (лучшие, все SL-режимы, все бакеты вместе)')
    })

    test('localizes named diagnostics and execution pipeline section titles in RU', () => {
        expect(
            localizeReportSectionTitle('backtest_diagnostics', 'Policy NoTrade by Weekday', 'ru')
        ).toBe('Дни без сделки по дням недели')

        expect(
            localizeReportSectionTitle('backtest_execution_pipeline', 'Accounting Level', 'ru')
        ).toBe('Денежный итог сделки')
    })

    test('builds compact diagnostics labels for navigation in RU', () => {
        expect(
            localizeReportSectionCompactTitle(
                'backtest_diagnostics',
                'Top 20 trades by NetReturnPct (best, ALL SL, daily bucket)',
                'ru'
            )
        ).toBe('Лучшие сделки по доходности, %')

        expect(
            localizeReportSectionCompactTitle(
                'backtest_diagnostics',
                'Policy NoTrade Hotspots (BASE, ALL HISTORY, WITH SL)',
                'ru'
            )
        ).toBe('Зоны без сделки: BASE')
    })

    test('keeps raw section titles outside RU locale', () => {
        expect(
            localizeReportSectionTitle(
                'backtest_diagnostics',
                'Top 20 trades by CapitalDeltaUsd',
                'en'
            )
        ).toBe('Top 20 trades by CapitalDeltaUsd')
    })

    test('localizes execution pipeline document title in RU', () => {
        expect(localizeReportDocumentTitle('backtest_execution_pipeline', 'Execution Pipeline', 'ru')).toBe(
            'Путь расчёта бэктеста'
        )
    })

    test('drops technical preview metadata from current prediction status in RU', () => {
        const localized = localizeReportKeyValue(
            'current_prediction',
            'Prediction status',
            'PREVIEW_EARLY: forecast was built before NY entry on partially closed current candles; accuracy may be lower than the standard daily run after NY entry. asOfUtc=2026-03-11T05:51:08.7560000Z, nyLocal=2026-03-11 01:51, sessionEntryUtc=2026-03-11T13:30:00.0000000Z, sessionExitUtc=2026-03-11T20:00:00.0000000Z, featureAnchorUtc=2026-03-11T05:51:08.7560000Z.',
            'ru'
        )

        expect(localized).toBe(
            'Предварительный прогноз построен до начала основного торгового окна на частично закрытых текущих свечах, поэтому точность может быть ниже, чем у стандартного дневного расчёта.'
        )
    })

    test('localizes full current prediction metadata labels and values in RU', () => {
        expect(localizeReportKeyLabel('current_prediction', 'Training recipe', 'ru')).toBe('Рецепт обучения')
        expect(localizeReportKeyLabel('current_prediction', 'Score rows presence in train', 'ru')).toBe(
            'Пересечение окна прогноза с обучением'
        )
        expect(localizeReportKeyLabel('current_prediction', 'View mode', 'ru')).toBe('Режим показа')
        expect(localizeReportKeyLabel('current_prediction', 'Train window end (UTC)', 'ru')).toBe(
            'Конец train-окна (UTC)'
        )

        expect(
            localizeReportKeyValue('current_prediction', 'Training recipe', 'full_history_retrospective_refit', 'ru')
        ).toBe('Полное переобучение на 100% завершённой истории')
        expect(localizeReportKeyValue('current_prediction', 'Training recipe', 'split_train_oos', 'ru')).toBe(
            'Базовая пара Train 70% / OOS 30%'
        )

        expect(
            localizeReportKeyValue('current_prediction', 'Prediction semantics', 'mutable_retrospective_full', 'ru')
        ).toBe('Ретроспективный полный режим: прошлые прогнозы могут меняться после пересчёта')

        expect(
            localizeReportKeyValue('current_prediction', 'Prediction semantics', 'full_history_snapshot_forecast', 'ru')
        ).toBe('Прогноз на новый день после полного обучения на 100% завершённой истории')
        expect(
            localizeReportKeyValue('current_prediction', 'Prediction semantics', 'oos_scored_by_train_recent_tail', 'ru')
        ).toBe('Короткий OOS-хвост 15%: показан только самый свежий хвост внутри OOS 30%')
        expect(
            localizeReportKeyValue('current_prediction', 'Prediction semantics', 'train_diagnostics_in_sample', 'ru')
        ).toBe('Диагностика Train 70%: разбор ошибок на обучающей части')
        expect(localizeReportKeyValue('current_prediction', 'View mode', 'train_diagnostics', 'ru')).toBe(
            'Train 70%'
        )
        expect(localizeReportKeyValue('current_prediction', 'Display slice mode', 'recent_tail', 'ru')).toBe(
            'Короткий хвост 15%'
        )

        expect(
            localizeReportKeyValue('current_prediction', 'Score rows presence in train', 'some_outside', 'ru')
        ).toBe('Часть дней окна прогноза лежит вне обучающего окна')

        expect(localizeReportKeyValue('current_prediction', 'Uses train/OOS split', 'no', 'ru')).toBe('Нет')
    })

    test('localizes current prediction top-factor column titles in RU', () => {
        expect(localizeReportColumnTitle('current_prediction_history', 'Type', 'ru')).toBe('Тип фактора')
        expect(localizeReportColumnTitle('current_prediction_history', 'Name', 'ru')).toBe('Название фактора')
        expect(localizeReportColumnTitle('current_prediction_history', 'Description', 'ru')).toBe(
            'Человеческое описание'
        )
        expect(localizeReportColumnTitle('current_prediction_history', 'Value', 'ru')).toBe('Число')
        expect(localizeReportColumnTitle('current_prediction_history', 'Rank', 'ru')).toBe('Порядок')
    })

    test('localizes current prediction train diagnostics section titles in RU', () => {
        expect(localizeReportSectionTitle('current_prediction_train', 'Train diagnostics summary', 'ru')).toBe(
            'Сводка диагностики train'
        )
        expect(localizeReportSectionTitle('current_prediction_train', 'Worst mistakes (in-sample)', 'ru')).toBe(
            'Худшие ошибки train (in-sample)'
        )
    })

    test('localizes current model-stats overview titles in RU', () => {
        expect(localizeReportSectionTitle('backtest_model_stats', 'Models overview', 'ru')).toBe('Обзор моделей')
        expect(localizeReportColumnTitle('backtest_model_stats', 'Family', 'ru')).toBe('Семейство моделей')
        expect(localizeReportColumnTitle('backtest_model_stats', 'BaselineAuc', 'ru')).toBe('Базовый AUC')
        expect(localizeReportColumnTitle('backtest_model_stats', 'EvalRows', 'ru')).toBe('Строк проверки')
    })

    test('localizes PFI column titles in RU', () => {
        expect(localizeReportColumnTitle('pfi_per_model', 'Index', 'ru')).toBe('Индекс')
        expect(localizeReportColumnTitle('pfi_per_model', 'FeatureDescription', 'ru')).toBe('Человеческое описание')
        expect(localizeReportColumnTitle('pfi_per_model', 'FeatureName', 'ru')).toBe('Имя признака')
        expect(localizeReportColumnTitle('pfi_per_model_feature_detail', 'Mean contribution', 'ru')).toBe(
            'Средний вклад'
        )
    })
})
