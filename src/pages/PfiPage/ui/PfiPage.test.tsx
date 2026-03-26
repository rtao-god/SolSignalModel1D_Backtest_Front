import '@testing-library/jest-dom'
import { render, screen, waitFor } from '@/shared/lib/tests/ComponentRender/ComponentRender'
import i18nForTests from '@/shared/configs/i18n/i18nForTests'
import PfiPage from './PfiPage'

const { usePfiReportReadQuery } = vi.hoisted(() => ({
    usePfiReportReadQuery: vi.fn()
}))

const { resolveReportSourceEndpoint } = vi.hoisted(() => ({
    resolveReportSourceEndpoint: vi.fn()
}))

vi.mock('@/shared/api/tanstackQueries/pfi', () => ({
    usePfiReportReadQuery
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
        id: 'pfi-per-model-test',
        kind: 'pfi_per_model',
        familyKey: 'daily_model',
        title: 'PFI by model (binary)',
        generatedAtUtc: '2026-03-15T11:17:38.086081Z',
        sections: [
            {
                sectionKey: 'train_oof_move',
                title: 'train: move (AUC=0.9985)',
                familyKey: 'daily_model',
                modelKey: 'move',
                modelDisplayName: 'Move',
                scoreScopeKey: 'train_oof',
                featureSchemaKey: 'daily',
                baselineAuc: 0.9985,
                columns: ['Index', 'FeatureName', 'ImportanceAuc (abs ΔAUC)'],
                columnKeys: ['index', 'feature_name', 'importance_auc'],
                rows: [['3', 'SolRet1', '5.41']]
            }
        ]
    }
}

describe('PfiPage', () => {
    beforeEach(async () => {
        await i18nForTests.changeLanguage('en')
        vi.clearAllMocks()
        resolveReportSourceEndpoint.mockReturnValue('http://127.0.0.1:10000')
        usePfiReportReadQuery.mockReturnValue(
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
