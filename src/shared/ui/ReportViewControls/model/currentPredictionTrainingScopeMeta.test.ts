import fs from 'node:fs'
import path from 'node:path'
import { afterEach, describe, expect, test, vi } from 'vitest'
import i18n from '@/shared/configs/i18n/i18n'
import type { CurrentPredictionBackfilledTrainingScopeStats } from '@/shared/api/tanstackQueries/currentPrediction'
import { resolveCurrentPredictionTrainingScopeMeta } from './currentPredictionTrainingScopeMeta'

const RU_REPORTS_PATH = path.resolve(process.cwd(), 'public/locales/ru/reports.json')

const MOCK_SPLIT_STATS: CurrentPredictionBackfilledTrainingScopeStats = {
    fullStartDateUtc: '2021-10-11',
    fullEndDateUtc: '2026-03-18',
    fullDays: 1327,
    trainStartDateUtc: '2021-10-11',
    trainEndDateUtc: '2025-11-18',
    trainDays: 1246,
    oosStartDateUtc: '2025-11-19',
    oosEndDateUtc: '2026-03-18',
    oosDays: 81,
    recentStartDateUtc: '2025-11-19',
    recentEndDateUtc: '2026-03-18',
    recentDays: 81,
    oosHistoryDaySharePercent: 30,
    recentHistoryDaySharePercent: 15,
    recentMatchesOos: true,
    totalDays: 1327,
    trainShare: 1246 / 1327,
    oosShare: 81 / 1327,
    lastTrainDateUtc: '2025-11-18',
    firstOosDateUtc: '2025-11-19'
}

describe('currentPredictionTrainingScopeMeta', () => {
    afterEach(() => {
        vi.restoreAllMocks()
    })

    test('keeps exact full-history hint in fallback and RU locale', () => {
        vi.spyOn(i18n, 't').mockImplementation((key: string, options?: { defaultValue?: string }) => {
            return options?.defaultValue ?? key
        })
        Object.defineProperty(i18n, 'language', { configurable: true, value: 'en' })
        Object.defineProperty(i18n, 'resolvedLanguage', { configurable: true, value: 'en' })

        expect(resolveCurrentPredictionTrainingScopeMeta('full').hint).toBe(
            '100% completed history. The model is trained on the whole finished archive up to the last day whose outcome is already known.'
        )

        const ruReports = JSON.parse(fs.readFileSync(RU_REPORTS_PATH, 'utf-8')) as {
            currentPrediction: {
                scope: {
                    options: {
                        full: {
                            hint: string
                        }
                    }
                }
            }
        }

        expect(ruReports.currentPrediction.scope.options.full.hint).toBe(
            'Полная история. Модель обучается на 100% завершённой истории до последнего дня, по которому уже известен итог.'
        )
    })

    test('appends actual day counts when split stats are available', () => {
        vi.spyOn(i18n, 't').mockImplementation((key: string, options?: { defaultValue?: string }) => {
            return options?.defaultValue ?? key
        })
        Object.defineProperty(i18n, 'language', { configurable: true, value: 'en' })
        Object.defineProperty(i18n, 'resolvedLanguage', { configurable: true, value: 'en' })

        const oosMeta = resolveCurrentPredictionTrainingScopeMeta('oos', MOCK_SPLIT_STATS)
        const recentMeta = resolveCurrentPredictionTrainingScopeMeta('recent', MOCK_SPLIT_STATS)

        expect(oosMeta.hint).toContain('Base user OOS tail.')
        expect(oosMeta.hint).toContain('This currently contains 81 days.')
        expect(recentMeta.hint).toContain('Short user OOS tail.')
        expect(recentMeta.hint).toContain('This currently contains 81 days and fully matches the current OOS slice.')
    })
})
