/*
	policyRatios.types — типы.

	Зачем:
		- Описывает DTO и доменные типы.
*/
export interface PolicyRatiosPerPolicyDto {
    policyName: string
    tradesCount: number
    totalPnlPct: number
    maxDdPct: number
    mean: number
    std: number
    downStd: number
    sharpe: number
    sortino: number
    cagr: number
    calmar: number
    // WinRate в процентах (0–100).
    winRatePct: number
    // Суммарно выведенные средства по политике (USD).
    withdrawnUsd: number
    hadLiquidation: boolean
}

export interface PolicyRatiosReportDto {
    backtestId: string
    // Метаданные окна бэктеста (ISO-строки или null).
    fromDateUtc: string | null
    toDateUtc: string | null
    policies: PolicyRatiosPerPolicyDto[]
}


