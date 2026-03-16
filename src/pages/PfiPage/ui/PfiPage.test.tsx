import '@testing-library/jest-dom'
import { render, screen, waitFor } from '@/shared/lib/tests/ComponentRender/ComponentRender'
import i18nForTests from '@/shared/configs/i18n/i18nForTests'
import PfiPage from './PfiPage'

const { usePfiPerModelReportWithFreshnessQuery } = vi.hoisted(() => ({
    usePfiPerModelReportWithFreshnessQuery: vi.fn()
}))

const { resolveReportSourceEndpoint } = vi.hoisted(() => ({
    resolveReportSourceEndpoint: vi.fn()
}))

vi.mock('@/shared/api/tanstackQueries/pfi', () => ({
    usePfiPerModelReportWithFreshnessQuery
}))

vi.mock('@/shared/utils/reportSourceEndpoint', () => ({
    resolveReportSourceEndpoint
}))

function createQueryResult<T>(overrides: Record<string, unknown> = {}) {
    return {
        data: undefined,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
        ...overrides
    } as T
}

function createPfiPayload() {
    return {
        report: {
            schemaVersion: 2,
            id: 'pfi-per-model-test',
            kind: 'pfi_per_model',
            title: 'PFI by model (binary)',
            generatedAtUtc: '2026-03-15T11:17:38.086081Z',
            sections: [
                {
                    title: 'train: move (AUC=0.9985)',
                    columns: ['Index', 'FeatureName', 'ImportanceAuc (abs ΔAUC)'],
                    rows: [['3', 'SolRet1', '5.41']]
                }
            ]
        },
        freshness: {
            sourceMode: 'actual' as const,
            state: 'fresh' as const,
            message: 'PFI report is fresh.',
            pfiReportId: 'pfi-per-model-test',
            pfiReportGeneratedAtUtc: '2026-03-15T11:17:38.086081Z',
            canonicalSnapshotCount: 9,
            tableSectionCount: 1
        }
    }
}

describe('PfiPage', () => {
    beforeEach(async () => {
        await i18nForTests.changeLanguage('en')
        vi.clearAllMocks()
        resolveReportSourceEndpoint.mockReturnValue('http://127.0.0.1:10000')
        usePfiPerModelReportWithFreshnessQuery.mockReturnValue(
            createQueryResult({
                data: createPfiPayload()
            })
        )
    })

    test('renders PFI report even when source endpoint metadata is unavailable', async () => {
        resolveReportSourceEndpoint.mockImplementation(() => {
            throw new Error('[report-source] API_BASE_URL is empty.')
        })

        render(<PfiPage />)

        await waitFor(() => {
            expect(screen.getByText('PFI by model (binary)')).toBeInTheDocument()
        })

        expect(screen.getByText('train: move (AUC=0.9985)')).toBeInTheDocument()
        expect(screen.queryByText('PFI source endpoint is invalid')).not.toBeInTheDocument()
    })
})
