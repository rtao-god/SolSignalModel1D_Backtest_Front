import '@testing-library/jest-dom'
import fs from 'node:fs'
import path from 'node:path'
import { ROUTE_CONFIG } from '@/app/providers/router/config/routeConfig'
import { AppRoute } from '@/app/providers/router/config/types'

const pagesRoot = path.resolve(__dirname)

const MODE_SCOPED_ROUTE_IDS = [
    AppRoute.CURRENT_PREDICTION,
    AppRoute.CURRENT_PREDICTION_HISTORY,
    AppRoute.CURRENT_PREDICTION_OOS_PRESETS,
    AppRoute.MODELS_STATS,
    AppRoute.AGGREGATION_STATS,
    AppRoute.PFI_PER_MODEL,
    AppRoute.PFI_SL_MODEL,
    AppRoute.PFI_PER_MODEL_FEATURE_DETAIL,
    AppRoute.BACKTEST_POLICY_BRANCH_MEGA,
    AppRoute.BACKTEST_POLICY_SETUPS,
    AppRoute.BACKTEST_POLICY_SETUP_DETAIL,
    AppRoute.BACKTEST_CONFIDENCE_RISK,
    AppRoute.BACKTEST_SHARP_MOVE_STATS,
    AppRoute.BACKTEST_BOUNDED_PARAMETER_STATS,
    AppRoute.BACKTEST_EXECUTION_PIPELINE,
    AppRoute.ANALYSIS_REAL_FORECAST_JOURNAL,
    AppRoute.BACKTEST_DIAGNOSTICS,
    AppRoute.BACKTEST_DIAGNOSTICS_GUARDRAIL,
    AppRoute.BACKTEST_DIAGNOSTICS_DECISIONS,
    AppRoute.BACKTEST_DIAGNOSTICS_HOTSPOTS,
    AppRoute.BACKTEST_DIAGNOSTICS_OTHER,
    AppRoute.BACKTEST_DIAGNOSTICS_RATINGS,
    AppRoute.BACKTEST_DIAGNOSTICS_DAYSTATS
] as const

function collectPageSourceFiles(currentPath: string): string[] {
    return fs.readdirSync(currentPath, { withFileTypes: true }).flatMap(entry => {
        const nextPath = path.join(currentPath, entry.name)

        if (entry.isDirectory()) {
            return collectPageSourceFiles(nextPath)
        }

        if (!/\.(ts|tsx)$/.test(entry.name) || /\.test\.(ts|tsx)$/.test(entry.name)) {
            return []
        }

        return [nextPath]
    })
}

describe('mode-scoped route contract', () => {
    test('every mode-sensitive route declares an owner page key in route config', () => {
        const offenders = MODE_SCOPED_ROUTE_IDS.filter(routeId => {
            const route = ROUTE_CONFIG.find(candidate => candidate.id === routeId)
            return !route?.modePageKey
        })

        expect(offenders).toEqual([])
    })

    test('page files no longer own manual fixed-vs-walk-forward switching', () => {
        const offenders = collectPageSourceFiles(pagesRoot)
            .filter(filePath => !filePath.includes(`${path.sep}shared${path.sep}walkForward${path.sep}`))
            .filter(filePath => !filePath.includes(`${path.sep}shared${path.sep}modeScope${path.sep}`))
            .filter(filePath => {
                const source = fs.readFileSync(filePath, 'utf-8')
                return (
                    source.includes('FixedSplitOnlyModeBoundary') ||
                    (
                        source.includes('selectActiveMode') &&
                        source.includes('WalkForwardMode')
                    )
                )
            })
            .map(filePath => path.relative(pagesRoot, filePath))

        expect(offenders).toEqual([])
    })
})
