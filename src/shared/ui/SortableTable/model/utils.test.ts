import { describe, expect, test } from 'vitest'
import type { RowEntry } from './types'
import { stableSortByCol } from './utils'

describe('SortableTable custom sort value', () => {
    test('sorts by resolved coefficient instead of raw cell text when resolver is provided', () => {
        const entries: RowEntry[] = [
            { row: ['A', '10 / 20'], originalIndex: 0 },
            { row: ['B', '20 / 10'], originalIndex: 1 },
            { row: ['C', '30 / 30'], originalIndex: 2 }
        ]

        const sorted = stableSortByCol(entries, 1, 'asc', (_row, _rowIndex, _colIdx, value) => {
            if (typeof value !== 'string') {
                return value
            }

            const [correctRaw = '0', wrongRaw = '0'] = value.split('/').map(part => part.trim())
            const correct = Number(correctRaw)
            const wrong = Number(wrongRaw)
            const total = correct + wrong

            return total > 0 ? wrong / total : Number.POSITIVE_INFINITY
        })

        expect(sorted.map(entry => entry.originalIndex)).toEqual([1, 2, 0])
    })

    test('supports composed comparator when coefficient matches but sample size differs', () => {
        const entries: RowEntry[] = [
            { row: ['A', 'tie-a'], originalIndex: 0 },
            { row: ['B', 'tie-b'], originalIndex: 1 },
            { row: ['C', 'worse'], originalIndex: 2 }
        ]

        const scores = new Map<number, { errorShare: number; predictionCount: number }>([
            [0, { errorShare: 0.25, predictionCount: 40 }],
            [1, { errorShare: 0.25, predictionCount: 120 }],
            [2, { errorShare: 0.4, predictionCount: 80 }]
        ])

        const sorted = stableSortByCol(entries, 1, 'asc', undefined, (left, right) => {
            const leftScore = scores.get(left.rowIndex)
            const rightScore = scores.get(right.rowIndex)
            if (!leftScore || !rightScore) {
                return 0
            }

            if (leftScore.errorShare !== rightScore.errorShare) {
                return leftScore.errorShare - rightScore.errorShare
            }

            return rightScore.predictionCount - leftScore.predictionCount
        })

        expect(sorted.map(entry => entry.originalIndex)).toEqual([1, 0, 2])
    })
})
