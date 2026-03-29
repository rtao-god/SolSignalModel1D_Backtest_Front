import {
    FIRST_EVENT_DESCRIPTION,
    FUNDING_DESCRIPTION
} from './trading'
import {
    CAP_P50_P90_DESCRIPTION,
    P90_QUANTILE_DESCRIPTION,
    STATIC_TP_SL_DESCRIPTION,
    WHY_DYNAMIC_RISK_DESCRIPTION
} from './risk'
import { COMMON_CAP_P50_P90_DESCRIPTION_EN } from './reportColumns.en'

describe('common shared term copy', () => {
    test('keeps funding timing concrete and page-agnostic', () => {
        expect(FUNDING_DESCRIPTION).toContain('раз в 8 часов')
        expect(FUNDING_DESCRIPTION).toContain('до 4, 2 или 1 часа')
        expect(FUNDING_DESCRIPTION).toContain('Точный интервал и часы начисления задаёт сама биржа по правилам этого контракта.')
        expect(FUNDING_DESCRIPTION).not.toContain('периодический платёж')
        expect(FUNDING_DESCRIPTION).not.toContain('funding не включён в расчёт результата')
    })

    test('keeps percentile and dynamic terms concrete', () => {
        expect(FIRST_EVENT_DESCRIPTION).not.toContain('редкий кейс')

        expect(P90_QUANTILE_DESCRIPTION).toContain('граница верхних 10% значений')
        expect(P90_QUANTILE_DESCRIPTION).not.toContain('обычно уже редко')

        expect(CAP_P50_P90_DESCRIPTION).toContain('верхние 10% исполненных входов')
        expect(CAP_P50_P90_DESCRIPTION).not.toContain('иногда уходит')

        expect(WHY_DYNAMIC_RISK_DESCRIPTION).toContain('пороги 30/45%')
        expect(WHY_DYNAMIC_RISK_DESCRIPTION).not.toContain('dynamic-сделок обычно меньше')

        expect(STATIC_TP_SL_DESCRIPTION).toContain('30 закрытых сделок и 45% успешных исходов')
        expect(COMMON_CAP_P50_P90_DESCRIPTION_EN).toContain('top 10% of executed trades')
        expect(COMMON_CAP_P50_P90_DESCRIPTION_EN).not.toContain('sometimes scales')
    })
})
