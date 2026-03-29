import { formatTimingUtc } from './ReportTimingSection'

describe('ReportTimingSection', () => {
    test('removes the redundant russian year marker from UTC timestamps', () => {
        const formatted = formatTimingUtc('2026-03-27T13:30:00.000Z', 'ru-RU')

        expect(formatted).toContain('2026')
        expect(formatted).not.toContain('г.')
        expect(formatted).not.toContain(' г,')
    })
})
