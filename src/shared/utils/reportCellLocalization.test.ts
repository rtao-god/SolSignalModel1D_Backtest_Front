import {
    localizeExitReasonLabel,
    localizeReportCellValue,
    resolveReportLiquidationFallbackLabel
} from './reportCellLocalization'

describe('reportCellLocalization', () => {
    test('localizes through-end stop reason without redundant no-liquidations suffix for ru locale', () => {
        expect(localizeReportCellValue('StopReason', 'Through end of period (no liquidations)', 'ru')).toBe(
            'До конца периода'
        )
    })

    test('does not change other localized stop reasons contract', () => {
        expect(localizeReportCellValue('StopReason', 'Early stop (ruin)', 'ru')).toBe('Ранняя остановка (руина)')
        expect(localizeReportCellValue('StopReason', 'Through end of period (no liquidations)', 'en')).toBe(
            'Through end of period (no liquidations)'
        )
    })

    test('adds explicit units to percent and usd metric values', () => {
        expect(localizeReportCellValue('TotalPnl%', '23.48', 'ru')).toBe('23,48%')
        expect(localizeReportCellValue('BucketNow$', '19.79k', 'ru')).toBe('$19 790')
        expect(localizeReportCellValue('BucketNow$', '19.79k', 'en')).toBe('$19,790')
    })

    test('trims redundant trailing zeroes from percent values', () => {
        expect(localizeReportCellValue('WinRate%', '56.4000', 'ru')).toBe('56,4%')
        expect(localizeReportCellValue('WinRate%', '56.0000', 'en')).toBe('56%')
    })

    test('replaces raw account ruin flags with human-readable state', () => {
        expect(localizeReportCellValue('AccRuin', '0', 'ru')).toBe('Нет, бакет жив')
        expect(localizeReportCellValue('AccRuin', '1', 'ru')).toBe('Да, бакет потратил стартовый капитал')
        expect(localizeReportCellValue('AccRuin', '2', 'en')).toBe(
            'Yes, 2 buckets exhausted their starting capital'
        )
    })

    test('formats recovery days and liquidation flag for display', () => {
        expect(localizeReportCellValue('RecovDays', '140', 'ru')).toBe('140 дн.')
        expect(localizeReportCellValue('RecovDays', '-1', 'en')).toBe('Not yet recovered')
        expect(localizeReportCellValue('HadLiq', '1', 'ru')).toBe('Да')
        expect(localizeReportCellValue('HadLiq', '0', 'en')).toBe('No')
    })

    test('adds shared tooltip markup to localized exit reasons', () => {
        expect(localizeExitReasonLabel('Take profit', 'ru')).toBe('[[tp-sl|Тейк-профит]]')
        expect(localizeExitReasonLabel('Stop loss', 'en')).toBe('[[tp-sl|Stop-loss]]')
        expect(localizeExitReasonLabel('Liquidation', 'ru')).toBe('[[liquidation|Ликвидация]]')
    })

    test('resolves liquidation fallback for spot rows without duplicating page-local logic', () => {
        expect(
            resolveReportLiquidationFallbackLabel(
                {
                    leverage: 1,
                    policyName: 'spot_fixed1pct',
                    branch: 'BASE',
                    bucket: 'daily',
                    hasDirection: true,
                    skipped: false,
                    direction: 'LONG',
                    isSpotPolicy: true,
                    margin: 'isolated',
                    notionalUsd: 100,
                    bucketCapitalUsd: 1000,
                    stakeUsd: 100
                },
                'ru'
            )
        ).toContain('ликвидация')
    })
})
