import { localizeReportCellValue } from './reportCellLocalization'

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
})
