import '@testing-library/jest-dom'
import { fireEvent, render, screen, waitFor } from '@/shared/lib/tests/ComponentRender/ComponentRender'
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

vi.mock('@/pages/ModelStatsPage', () => ({
    default: ({ embedded, familyFilter }: { embedded?: boolean; familyFilter?: string | null }) => (
        <div data-testid='model-stats-stub'>
            {embedded ? 'embedded-model-stats' : 'model-stats'}:{familyFilter ?? 'all'}
        </div>
    )
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
                columns: ['Index', 'FeatureDescription', 'FeatureName', 'ImportanceAuc (abs ΔAUC, p.p.)'],
                columnKeys: ['index', 'feature_description', 'name', 'importance_auc'],
                rows: [['3', 'Как изменилась цена монеты Solana за последний шестичасовой шаг.', 'SolRet1', '5.41']]
            }
        ]
    }
}

describe('PfiPage', () => {
    beforeEach(async () => {
        await i18nForTests.changeLanguage('ru')
        vi.clearAllMocks()
        resolveReportSourceEndpoint.mockReturnValue('http://127.0.0.1:10000')
        usePfiReportReadQuery.mockReturnValue(
            createQueryResult({
                data: createPfiPayload()
            })
        )
    })

    test('daily page opens with model-quality layer and does not load PFI diagnostics immediately', async () => {
        render(<PfiPage family='daily' />)

        await waitFor(() => {
            expect(screen.getByTestId('model-stats-stub')).toBeInTheDocument()
        })

        expect(screen.getByText('Что показать')).toBeInTheDocument()
        expect(screen.getByText('Качество моделей')).toBeInTheDocument()
        expect(screen.getByText('Влияние признаков')).toBeInTheDocument()
        expect(screen.getByText('embedded-model-stats:daily_model')).toBeInTheDocument()
        expect(screen.queryByText('PFI by model (binary)')).not.toBeInTheDocument()
        expect(usePfiReportReadQuery).not.toHaveBeenCalled()
    })

    test('daily page loads PFI diagnostics only after explicit mode switch', async () => {
        render(<PfiPage family='daily' />)

        fireEvent.click(screen.getByRole('button', { name: 'Влияние признаков' }))

        await waitFor(() => {
            expect(screen.getByText('PFI by model (binary)')).toBeInTheDocument()
        })

        expect(usePfiReportReadQuery).toHaveBeenCalledTimes(1)
        expect(usePfiReportReadQuery).toHaveBeenCalledWith('daily')
        expect(screen.queryByTestId('model-stats-stub')).not.toBeInTheDocument()
        expect(screen.getByRole('columnheader', { name: 'Индекс' })).toBeInTheDocument()
        expect(screen.getByRole('columnheader', { name: 'Человеческое описание' })).toBeInTheDocument()
        expect(screen.getByRole('columnheader', { name: 'Имя признака' })).toBeInTheDocument()
        expect(screen.getByText('Как изменилась цена монеты Solana за последний шестичасовой шаг.')).toBeInTheDocument()
        expect(
            screen.queryByText('This page reads the published report directly and does not re-check freshness while opening.')
        ).not.toBeInTheDocument()
    })

    test('sl page opens with model-quality layer and keeps PFI diagnostics lazy until click', async () => {
        render(<PfiPage family='sl' />)

        await waitFor(() => {
            expect(screen.getByText('embedded-model-stats:sl_model')).toBeInTheDocument()
        })

        expect(screen.getByText('Что показать')).toBeInTheDocument()
        expect(usePfiReportReadQuery).not.toHaveBeenCalled()
    })

    test('sl page loads PFI diagnostics only after explicit mode switch', async () => {
        render(<PfiPage family='sl' />)

        fireEvent.click(screen.getByRole('button', { name: 'Влияние признаков' }))

        await waitFor(() => {
            expect(screen.getByText('PFI by model (binary)')).toBeInTheDocument()
        })

        expect(usePfiReportReadQuery).toHaveBeenCalledTimes(1)
        expect(usePfiReportReadQuery).toHaveBeenCalledWith('sl')
        expect(screen.queryByTestId('model-stats-stub')).not.toBeInTheDocument()
    })

    test('renders PFI report even when source endpoint metadata is unavailable', async () => {
        resolveReportSourceEndpoint.mockImplementation(() => {
            throw new Error('[report-source] API_BASE_URL is empty.')
        })

        render(<PfiPage family='sl' />)

        fireEvent.click(screen.getByRole('button', { name: 'Влияние признаков' }))

        await waitFor(() => {
            expect(screen.getByText('PFI by model (binary)')).toBeInTheDocument()
        })

        expect(screen.getByText('train: move (AUC=0.9985)')).toBeInTheDocument()
        expect(screen.queryByText('PFI source endpoint is invalid')).not.toBeInTheDocument()
    })
})
