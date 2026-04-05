import { describe, expect, test } from 'vitest'
import { normalizeLightweightChartColor } from './lightweightChartColor'

describe('normalizeLightweightChartColor', () => {
    test('нормализует hsla в rgba для lightweight-charts', () => {
        expect(normalizeLightweightChartColor('hsla(306, 68%, 63%, 0.42)', 'tests.hsla')).toBe(
            'rgba(225, 96, 212, 0.42)'
        )
    })

    test('пропускает hex без изменений', () => {
        expect(normalizeLightweightChartColor('#7dd3fc', 'tests.hex')).toBe('#7dd3fc')
    })

    test('падает на неподдерживаемом цветовом контракте', () => {
        expect(() => normalizeLightweightChartColor('oklch(65% 0.18 320)', 'tests.bad')).toThrow(
            /unsupported color contract/i
        )
    })
})
