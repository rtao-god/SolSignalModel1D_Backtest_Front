import fs from 'node:fs'
import path from 'node:path'
import { afterEach, describe, expect, test, vi } from 'vitest'
import i18n from '@/shared/configs/i18n/i18n'
import { resolveCurrentPredictionTrainingScopeMeta } from './currentPredictionTrainingScopeMeta'

const RU_REPORTS_PATH = path.resolve(process.cwd(), 'public/locales/ru/reports.json')

describe('currentPredictionTrainingScopeMeta', () => {
    afterEach(() => {
        vi.restoreAllMocks()
    })

    test('keeps human full-history hint in fallback and RU locale', () => {
        vi.spyOn(i18n, 't').mockImplementation((key: string, options?: { defaultValue?: string }) => {
            return options?.defaultValue ?? key
        })

        expect(resolveCurrentPredictionTrainingScopeMeta('full').hint).toBe(
            'The model is trained on the whole completed history where each day already has a known outcome'
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
            'Модель обучается на всей завершённой истории, где итог дня уже известен'
        )
    })
})
