import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
    buildLocalApiRuntimeFailurePayload,
    buildManagedLocalBackendBuildArgs,
    buildManagedLocalBackendRunArgs,
    LocalApiRuntimeError,
    buildLocalApiRuntimeErrorMessage,
    normalizeDevProxyTargetInput,
    readLocalApiRuntimeContract,
    resolveDevApiProxyTargetFromContract,
    shouldAutoStartManagedLocalApi
} from './localApiRuntime'

describe('readLocalApiRuntimeContract', () => {
    it('reads canonical local backend origin from backend launch settings', () => {
        const contract = readLocalApiRuntimeContract()

        expect(contract.origin).toMatch(/^http:\/\/.+:\d+$/)
        expect(contract.port).toMatch(/^\d+$/)
        expect(contract.launchProfile).toBeTruthy()
        expect(contract.probeUrl).toBe(`${contract.origin}/api/system/registry`)
        expect(contract.workspaceRoot).toMatch(/backend[\\/]SolSignalModel1D_Backtest$/)
        expect(contract.cacheRoot).toMatch(/backend[\\/]SolSignalModel1D_Backtest[\\/]cache$/)
        expect(contract.backendProjectPath).toMatch(/SolSignalModel1D_Backtest\.Api\.csproj$/)
        expect(contract.managedBuildOutputPath).toContain('frontend-local-api-runtime')
        expect(contract.managedBuildObjPath).toContain('frontend-local-api-runtime')
        expect(contract.managedRuntimeDllPath).toMatch(/SolSignalModel1D_Backtest\.Api\.dll$/)
    })

    it('keeps local env files free from duplicated proxy target owner values', () => {
        const frontendRoot = process.cwd()
        const developmentEnv = readFileSync(resolve(frontendRoot, '.env.development'), 'utf8')
        const exampleEnv = readFileSync(resolve(frontendRoot, '.env.example'), 'utf8')

        expect(developmentEnv).not.toContain('VITE_DEV_API_PROXY_TARGET=')
        expect(exampleEnv).not.toContain('VITE_DEV_API_PROXY_TARGET=')
    })
})

describe('resolveDevApiProxyTargetFromContract', () => {
    const contract = {
        origin: 'http://127.0.0.1:10000',
        port: '10000',
        launchProfile: 'http',
        probeUrl: 'http://127.0.0.1:10000/api/system/registry',
        workspaceRoot: 'backend-root',
        cacheRoot: 'backend-root/cache',
        backendProjectPath: 'backend.csproj',
        managedBuildOutputPath: 'tmp/out',
        managedBuildObjPath: 'tmp/obj',
        managedRuntimeDllPath: 'tmp/out/backend.dll'
    }

    it('uses backend owner contract when env override is missing', () => {
        expect(resolveDevApiProxyTargetFromContract({ rawTarget: undefined, contract })).toBe(contract.origin)
    })

    it('normalizes custom target and removes /api suffix', () => {
        expect(resolveDevApiProxyTargetFromContract({ rawTarget: 'localhost:5289/api', contract })).toBe('http://localhost:5289')
    })

    it('falls back to backend owner contract for invalid override', () => {
        expect(resolveDevApiProxyTargetFromContract({ rawTarget: 'http://::bad', contract })).toBe(contract.origin)
    })
})

describe('shouldAutoStartManagedLocalApi', () => {
    const contract = {
        origin: 'http://127.0.0.1:10000',
        port: '10000',
        launchProfile: 'http',
        probeUrl: 'http://127.0.0.1:10000/api/system/registry',
        workspaceRoot: 'backend-root',
        cacheRoot: 'backend-root/cache',
        backendProjectPath: 'backend.csproj',
        managedBuildOutputPath: 'tmp/out',
        managedBuildObjPath: 'tmp/obj',
        managedRuntimeDllPath: 'tmp/out/backend.dll'
    }

    it('auto-starts when frontend uses the owner local target', () => {
        expect(
            shouldAutoStartManagedLocalApi({
                rawTarget: undefined,
                resolvedTarget: contract.origin,
                contract
            })
        ).toBe(true)
    })

    it('does not auto-start for an explicit foreign backend target', () => {
        expect(
            shouldAutoStartManagedLocalApi({
                rawTarget: 'https://remote.example.com/api',
                resolvedTarget: 'https://remote.example.com',
                contract
            })
        ).toBe(false)
    })
})

describe('normalizeDevProxyTargetInput', () => {
    it('drops trailing slash and /api suffix', () => {
        expect(normalizeDevProxyTargetInput('http://localhost:10000/api/')).toBe('http://localhost:10000')
    })
})

describe('buildLocalApiRuntimeErrorMessage', () => {
    it('keeps full owner context in startup failures', () => {
        const message = buildLocalApiRuntimeErrorMessage({
            owner: 'frontend.local-api-runtime',
            code: 'backend_autostart_timeout',
            message: 'Frontend dev runtime could not bring the local backend online in time.',
            expected: 'Backend host should expose the local API origin.',
            actual: 'probe timeout',
            requiredAction: 'Inspect backend startup logs.',
            context: {
                target: 'http://127.0.0.1:10000'
            }
        })

        expect(message).toContain('owner=frontend.local-api-runtime')
        expect(message).toContain('code=backend_autostart_timeout')
        expect(message).toContain('"target":"http://127.0.0.1:10000"')
    })
})

describe('buildLocalApiRuntimeFailurePayload', () => {
    it('keeps structured owner context for managed runtime failures during /api requests', () => {
        const payload = buildLocalApiRuntimeFailurePayload({
            error: new LocalApiRuntimeError({
                owner: 'frontend.local-api-runtime',
                code: 'backend_autostart_timeout',
                message: 'Frontend dev runtime could not bring the local backend online in time.',
                expected: 'Managed backend host should become reachable.',
                actual: 'probe timeout',
                requiredAction: 'Inspect backend startup logs.',
                context: {
                    launchProfile: 'http'
                }
            }),
            req: {
                method: 'GET',
                url: '/api/backtest/policy-branch-mega'
            } as never,
            target: 'http://127.0.0.1:10000'
        })

        expect(payload.status).toBe(502)
        expect(payload.owner).toBe('frontend.local-api-runtime')
        expect(payload.code).toBe('backend_autostart_timeout')
        expect(payload.context).toMatchObject({
            launchProfile: 'http',
            method: 'GET',
            path: '/api/backtest/policy-branch-mega',
            proxyTarget: 'http://127.0.0.1:10000'
        })
    })

    it('falls back to a detailed managed-runtime payload for unknown request-time failures', () => {
        const payload = buildLocalApiRuntimeFailurePayload({
            error: new Error('unexpected local api runtime crash'),
            req: {
                method: 'GET',
                url: '/api/system/registry'
            } as never,
            target: 'http://127.0.0.1:10000'
        })

        expect(payload.owner).toBe('frontend.local-api-runtime')
        expect(payload.code).toBe('backend_autostart_unknown_failure')
        expect(payload.actual).toContain('unexpected local api runtime crash')
        expect(payload.context).toMatchObject({
            method: 'GET',
            path: '/api/system/registry',
            proxyTarget: 'http://127.0.0.1:10000'
        })
    })
})

describe('buildManagedLocalBackendBuildArgs', () => {
    it('builds the backend into an isolated tmp output instead of locked bin/obj', () => {
        const contract = readLocalApiRuntimeContract()
        const args = buildManagedLocalBackendBuildArgs(contract)

        expect(args.slice(0, 2)).toEqual([
            'build',
            contract.backendProjectPath
        ])
        expect(args).toContain(`-p:OutputPath=${contract.managedBuildOutputPath}\\`)
        expect(args).toContain(`-p:IntermediateOutputPath=${contract.managedBuildObjPath}\\`)
        expect(args).toContain('-p:UseSharedCompilation=false')
    })
})

describe('buildManagedLocalBackendRunArgs', () => {
    it('runs the isolated backend DLL instead of the locked project output', () => {
        const contract = readLocalApiRuntimeContract()
        const args = buildManagedLocalBackendRunArgs(contract)

        expect(args).toEqual([contract.managedRuntimeDllPath])
        expect(existsSync(contract.managedRuntimeDllPath)).toBeTypeOf('boolean')
    })
})
