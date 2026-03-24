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

    expect(range).not.toBeNull()
    expect(range!.minValue).toBeCloseTo(79.39, 2)
    expect(range!.maxValue).toBeCloseTo(98.55, 2)
})

test('buildPolicySetupOverlayAutoscaleRange keeps candle range stable against overlay levels', () => {
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

    expect(range).not.toBeNull()
    expect(range!.minValue).toBeCloseTo(80, 2)
    expect(range!.maxValue).toBeCloseTo(90, 2)
})
