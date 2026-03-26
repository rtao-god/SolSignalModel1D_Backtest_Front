import type { TableSectionDto } from '@/shared/types/report.types'
import { buildDiagnosticsTabsFromSections, toDiagnosticsSectionRefs } from './backtestDiagnosticsSections'

describe('backtestDiagnosticsSections', () => {
    test('builds compact localized labels for diagnostics tabs', () => {
        const sections: TableSectionDto[] = [
            {
                title: 'Top 20 trades by CapitalDeltaUsd (worst, ALL SL, daily bucket)',
                columns: ['Policy', 'PnL'],
                rows: [['UltraSafe', '-12.4']],
                metadata: { kind: 'top-trades' }
            },
            {
                title: 'Policy Opposite Hotspots (ANTI-D, ALL HISTORY, WITH SL)',
                columns: ['Policy', 'Days'],
                rows: [['UltraSafe', '8']],
                metadata: { kind: 'unknown' }
            }
        ]

        expect(buildDiagnosticsTabsFromSections(toDiagnosticsSectionRefs(sections), 'ru')).toEqual([
            {
                id: 'diag-section-1',
                anchor: 'diag-section-1',
                label: 'Худшие сделки по изменению капитала, $'
            },
            {
                id: 'diag-section-2',
                anchor: 'diag-section-2',
                label: 'Зоны входа против рынка: ANTI-D'
            }
        ])
    })
})
