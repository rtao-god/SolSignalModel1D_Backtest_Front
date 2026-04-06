import type {
    BacktestHistorySliceDto,
    CapturedMegaBucketDto,
    CapturedMegaMetricVariantDto,
    CapturedMegaModeDto,
    CapturedMegaTpSlModeDto,
    CapturedMegaZonalModeDto,
    CapturedTableKindDto
} from '@/shared/types/report.types'

type ReportEnumValue =
    | CapturedTableKindDto
    | CapturedMegaModeDto
    | BacktestHistorySliceDto
    | CapturedMegaTpSlModeDto
    | CapturedMegaZonalModeDto
    | CapturedMegaMetricVariantDto
    | CapturedMegaBucketDto

interface ReportEnumCodec<TCanonical extends ReportEnumValue> {
    parse: (raw: unknown, label: string) => TCanonical
}

interface ReportEnumCodecOptions<TCanonical extends ReportEnumValue> {
    numericAliases?: Readonly<Record<number, TCanonical>>
    stringAliases: Readonly<Record<string, TCanonical>>
}

// Report metadata enum-ы приходят из backend JSON как numbers, kebab/snake-case и PascalCase.
// Один owner-codec нормализует wire-format до каноничных UI union-типов; остальной UI работает только с canonical values.
function createReportEnumCodec<TCanonical extends ReportEnumValue>(
    options: ReportEnumCodecOptions<TCanonical>
): ReportEnumCodec<TCanonical> {
    return {
        parse(raw: unknown, label: string): TCanonical {
            if (typeof raw === 'number' && options.numericAliases?.[raw]) {
                return options.numericAliases[raw]
            }

            if (typeof raw === 'string') {
                const normalized = normalizeReportWireEnumToken(raw)
                const resolved = options.stringAliases[normalized]
                if (resolved) {
                    return resolved
                }
            }

            throw new Error(`[ui] ${label} has unsupported value: ${String(raw)}.`)
        }
    }
}

function normalizeReportWireEnumToken(value: string): string {
    return value
        .trim()
        .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
        .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
        .replace(/[\s_]+/g, '-')
        .toLowerCase()
}

export const reportTableKindCodec = createReportEnumCodec<CapturedTableKindDto>({
    numericAliases: {
        0: 'unknown',
        1: 'policy-branch-mega',
        2: 'top-trades'
    },
    stringAliases: {
        unknown: 'unknown',
        'policy-branch-mega': 'policy-branch-mega',
        'top-trades': 'top-trades'
    }
})

export const reportMegaModeCodec = createReportEnumCodec<CapturedMegaModeDto>({
    numericAliases: {
        0: 'with-sl',
        1: 'no-sl',
        2: 'all'
    },
    stringAliases: {
        all: 'all',
        'with-sl': 'with-sl',
        'no-sl': 'no-sl'
    }
})

export const reportHistorySliceCodec = createReportEnumCodec<BacktestHistorySliceDto>({
    numericAliases: {
        1: 'full_history',
        2: 'train',
        3: 'oos',
        4: 'recent'
    },
    stringAliases: {
        'full-history': 'full_history',
        train: 'train',
        oos: 'oos',
        recent: 'recent'
    }
})

export const reportMegaTpSlModeCodec = createReportEnumCodec<CapturedMegaTpSlModeDto>({
    numericAliases: {
        0: 'all',
        1: 'dynamic',
        2: 'static'
    },
    stringAliases: {
        all: 'all',
        dynamic: 'dynamic',
        static: 'static'
    }
})

export const reportMegaZonalModeCodec = createReportEnumCodec<CapturedMegaZonalModeDto>({
    numericAliases: {
        0: 'with-zonal',
        1: 'without-zonal'
    },
    stringAliases: {
        'with-zonal': 'with-zonal',
        'without-zonal': 'without-zonal'
    }
})

export const reportMegaMetricVariantCodec = createReportEnumCodec<CapturedMegaMetricVariantDto>({
    numericAliases: {
        0: 'real',
        1: 'no-biggest-liq-loss'
    },
    stringAliases: {
        real: 'real',
        'no-biggest-liq-loss': 'no-biggest-liq-loss'
    }
})

export const reportMegaBucketCodec = createReportEnumCodec<CapturedMegaBucketDto>({
    numericAliases: {
        0: 'daily',
        1: 'intraday',
        2: 'delayed',
        3: 'total-aggregate',
        4: 'total'
    },
    stringAliases: {
        daily: 'daily',
        intraday: 'intraday',
        delayed: 'delayed',
        total: 'total',
        'total-aggregate': 'total-aggregate'
    }
})
