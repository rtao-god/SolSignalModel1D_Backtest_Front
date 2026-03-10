import type { PolicyBranchMegaReportQueryArgs } from '@/shared/api/tanstackQueries/policyBranchMega'

export const MAIN_DEMO_POLICY_BRANCH_MEGA_QUERY: PolicyBranchMegaReportQueryArgs = {
    bucket: 'daily',
    bucketView: 'aggregate',
    metric: 'real',
    tpSlMode: 'all',
    slMode: 'with-sl',
    zonalMode: 'with-zonal'
}
