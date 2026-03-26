import { describe, expect, test } from 'vitest'
import { build404DeepLinkTarget, restorePathFrom404 } from './deepLinkFrom404'

describe('deepLinkFrom404', () => {
    test('builds a redirect target that preserves the original path', () => {
        expect(build404DeepLinkTarget('/analysis/policy-branch-mega', '?bucket=daily', '#part-2')).toBe(
            '/?__ssm_deeplink=%2Fanalysis%2Fpolicy-branch-mega%3Fbucket%3Ddaily%23part-2'
        )
    })

    test('restores a safe relative path from 404 query params', () => {
        expect(restorePathFrom404('?__ssm_deeplink=%2Fanalysis%2Fpolicy-branch-mega%3Fbucket%3Ddaily')).toBe(
            '/analysis/policy-branch-mega?bucket=daily'
        )
    })

    test('rejects unsafe or malformed deep links', () => {
        expect(restorePathFrom404('?__ssm_deeplink=https%3A%2F%2Fevil.example')).toBeNull()
        expect(restorePathFrom404('?__ssm_deeplink=%2F%2Fevil.example')).toBeNull()
        expect(restorePathFrom404('?__ssm_deeplink=%E0%A4%A')).toBeNull()
    })
})
