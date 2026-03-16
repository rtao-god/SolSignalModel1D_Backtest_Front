import {
    localizeReportKeyValue,
    localizeReportDocumentTitle,
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
})
