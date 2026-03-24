import { expect, test } from 'vitest'
import {
    buildPolicySetupOverlayAutoscaleRange,
    buildPolicySetupVisibleCandlePriceRange
} from './PolicySetupDayOverlayPrimitive'

test('buildPolicySetupVisibleCandlePriceRange keeps the candle high/low envelope', () => {
    const range = buildPolicySetupVisibleCandlePriceRange([
        { low: 82.41, high: 97.68 } as never,
        { low: 80.26, high: 95.41 } as never,
        { low: 81.59, high: 96.2 } as never
    ])

    expect(range).toEqual({
        minValue: 80.26,
        maxValue: 97.68
    })
})

test('buildPolicySetupOverlayAutoscaleRange merges candle range with overlay levels', () => {
    const range = buildPolicySetupOverlayAutoscaleRange({
        days: [
            {
                startUnixSeconds: 1,
                endUnixSeconds: 10,
                levels: [{ price: 120 }] as never,
                markers: [] as never
            } as never
        ],
        hoveredTimestamp: null,
        showDayBoundaries: true,
        lineVisibilityMode: 'strong',
        visibleTimeRange: null,
        visibleCandlePriceRange: {
            minValue: 80,
            maxValue: 90
        }
    })

    expect(range).toEqual({
        minValue: 80,
        maxValue: 120.3
    })
})
