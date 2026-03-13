import { resolveCommonReportColumnTooltipOrNull, type CommonReportTooltipLocale } from '@/shared/terms/common'

export const DIAGNOSTICS_SHARED_TERM_KEYS = Object.freeze([
    'Policy',
    'Branch',
    'Long%',
    'Short%',
    'NoTrade%',
    'RiskDay%',
    'AntiD%',
    'Cap avg/min/max',
    'Cap p50/p90',
    'SL Mode',
    'AccRuin',
    'Recovered',
    'RecovDays',
    'ReqGain%',
    'StartCap$',
    'MarginUsed',
    'MinMove',
    'Trades',
    'TotalPnl%',
    'MaxDD%',
    'HadLiq',
    'Withdrawn$'
])

const DIAGNOSTICS_CANONICAL_TERM_ALIAS_GROUPS = Object.freeze([
    {
        canonicalKey: 'SpecificDays',
        aliases: ['SpecificDays', 'SpecDays']
    },
    {
        canonicalKey: 'SpecificTrade%',
        aliases: ['SpecificTrade%', 'SpecTrade%']
    },
    {
        canonicalKey: 'SpecificNoTrade%',
        aliases: ['SpecificNoTrade%', 'SpecNoTrade%']
    },
    {
        canonicalKey: 'SpecificOpposite%',
        aliases: ['SpecificOpposite%', 'SpecOpp%']
    },
    {
        canonicalKey: 'NormalDays',
        aliases: ['NormalDays', 'NormDays']
    },
    {
        canonicalKey: 'NormalTrade%',
        aliases: ['NormalTrade%', 'NormTrade%']
    },
    {
        canonicalKey: 'NormalNoTrade%',
        aliases: ['NormalNoTrade%', 'NormNoTrade%']
    },
    {
        canonicalKey: 'NormalOpposite%',
        aliases: ['NormalOpposite%', 'NormOpp%']
    },
    {
        canonicalKey: 'SpecificityUndefinedDays',
        aliases: ['SpecificityUndefinedDays', 'SpecUndefined']
    }
])

const DIAGNOSTICS_CANONICAL_TERM_ALIAS_MAP = new Map<string, string>(
    DIAGNOSTICS_CANONICAL_TERM_ALIAS_GROUPS.flatMap(group =>
        group.aliases.map(alias => [alias, group.canonicalKey] as const)
    )
)

export function resolveDiagnosticsReportCanonicalTermKey(title: string | undefined): string | null {
    if (!title) {
        return null
    }

    return DIAGNOSTICS_CANONICAL_TERM_ALIAS_MAP.get(title) ?? null
}

export function resolveDiagnosticsReportTermTooltipOrNull(
    title: string | undefined,
    locale: CommonReportTooltipLocale = 'ru'
): string | null {
    // В diagnostics не все одинаково названные колонки означают тот же доменный объект,
    // поэтому shared glossary разрешён только для этого whitelist-а.
    if (!title || !DIAGNOSTICS_SHARED_TERM_KEYS.includes(title as (typeof DIAGNOSTICS_SHARED_TERM_KEYS)[number])) {
        return null
    }

    return resolveCommonReportColumnTooltipOrNull(title, locale)
}
