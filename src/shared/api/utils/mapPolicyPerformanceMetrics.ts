import type { PolicyPerformanceMetricsDto } from '@/shared/types/policyPerformanceMetrics.types'

interface PolicyPerformanceMetricsParserOptions {
    owner: string
    label: string
    allowPascalCase?: boolean
    allowStringPrimitives?: boolean
}

function toObject(raw: unknown, owner: string, label: string): Record<string, unknown> {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
        throw new Error(`[${owner}] ${label} must be an object.`)
    }

    return raw as Record<string, unknown>
}

function toPascalCase(name: string): string {
    return name.length === 0 ? name : `${name[0].toUpperCase()}${name.slice(1)}`
}

function readField(
    record: Record<string, unknown>,
    name: string,
    allowPascalCase: boolean
): unknown {
    if (Object.prototype.hasOwnProperty.call(record, name)) {
        return record[name]
    }

    if (!allowPascalCase) {
        return undefined
    }

    const pascalName = toPascalCase(name)
    return Object.prototype.hasOwnProperty.call(record, pascalName) ? record[pascalName] : undefined
}

function toNullableNumber(
    raw: unknown,
    owner: string,
    label: string,
    allowStringPrimitives: boolean
): number | null {
    if (raw === null || typeof raw === 'undefined') {
        return null
    }

    if (typeof raw === 'number' && Number.isFinite(raw)) {
        return raw
    }

    if (allowStringPrimitives && typeof raw === 'string' && raw.trim()) {
        const parsed = Number(raw)
        if (Number.isFinite(parsed)) {
            return parsed
        }
    }

    throw new Error(`[${owner}] ${label} must be a finite number or null.`)
}

function toNullableInteger(
    raw: unknown,
    owner: string,
    label: string,
    allowStringPrimitives: boolean
): number | null {
    const parsed = toNullableNumber(raw, owner, label, allowStringPrimitives)
    if (parsed === null) {
        return null
    }

    if (!Number.isInteger(parsed)) {
        throw new Error(`[${owner}] ${label} must be an integer or null.`)
    }

    return parsed
}

function toNullableBoolean(
    raw: unknown,
    owner: string,
    label: string,
    allowStringPrimitives: boolean
): boolean | null {
    if (raw === null || typeof raw === 'undefined') {
        return null
    }

    if (typeof raw === 'boolean') {
        return raw
    }

    if (allowStringPrimitives && typeof raw === 'string') {
        const normalized = raw.trim().toLowerCase()
        if (normalized === 'true') return true
        if (normalized === 'false') return false
    }

    throw new Error(`[${owner}] ${label} must be a boolean or null.`)
}

function mapMetrics(
    record: Record<string, unknown>,
    options: PolicyPerformanceMetricsParserOptions
): PolicyPerformanceMetricsDto {
    const allowPascalCase = options.allowPascalCase ?? false
    const allowStringPrimitives = options.allowStringPrimitives ?? false
    const readNumber = (name: string) =>
        toNullableNumber(
            readField(record, name, allowPascalCase),
            options.owner,
            `${options.label}.${name}`,
            allowStringPrimitives
        )
    const readInteger = (name: string) =>
        toNullableInteger(
            readField(record, name, allowPascalCase),
            options.owner,
            `${options.label}.${name}`,
            allowStringPrimitives
        )
    const readBoolean = (name: string) =>
        toNullableBoolean(
            readField(record, name, allowPascalCase),
            options.owner,
            `${options.label}.${name}`,
            allowStringPrimitives
        )

    return {
        tradesCount: readInteger('tradesCount'),
        totalPnlPct: readNumber('totalPnlPct'),
        totalPnlUsd: readNumber('totalPnlUsd'),
        maxDdPct: readNumber('maxDdPct'),
        maxDdNoLiqPct: readNumber('maxDdNoLiqPct'),
        mean: readNumber('mean'),
        std: readNumber('std'),
        downStd: readNumber('downStd'),
        sharpe: readNumber('sharpe'),
        sortino: readNumber('sortino'),
        cagr: readNumber('cagr'),
        calmar: readNumber('calmar'),
        winRate: readNumber('winRate'),
        startCapitalUsd: readNumber('startCapitalUsd'),
        equityNowUsd: readNumber('equityNowUsd'),
        withdrawnTotalUsd: readNumber('withdrawnTotalUsd'),
        fundingNetUsd: readNumber('fundingNetUsd'),
        fundingPaidUsd: readNumber('fundingPaidUsd'),
        fundingReceivedUsd: readNumber('fundingReceivedUsd'),
        fundingEventCount: readInteger('fundingEventCount'),
        tradesWithFundingCount: readInteger('tradesWithFundingCount'),
        fundingLiquidationCount: readInteger('fundingLiquidationCount'),
        fundingBucketDeathCount: readInteger('fundingBucketDeathCount'),
        mixedBucketDeathCount: readInteger('mixedBucketDeathCount'),
        hadLiquidation: readBoolean('hadLiquidation'),
        realLiquidationCount: readInteger('realLiquidationCount'),
        accountRuinCount: readInteger('accountRuinCount'),
        balanceDead: readBoolean('balanceDead')
    }
}

export function mapPolicyPerformanceMetricsResponse(
    raw: unknown,
    options: PolicyPerformanceMetricsParserOptions
): PolicyPerformanceMetricsDto {
    return mapMetrics(toObject(raw, options.owner, options.label), options)
}

export function mapPolicyPerformanceMetricsOrNull(
    raw: unknown,
    options: PolicyPerformanceMetricsParserOptions
): PolicyPerformanceMetricsDto | null {
    if (raw === null || typeof raw === 'undefined') {
        return null
    }

    return mapPolicyPerformanceMetricsResponse(raw, options)
}
