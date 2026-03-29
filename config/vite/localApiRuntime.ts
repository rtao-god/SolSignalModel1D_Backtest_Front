import { spawn, spawnSync, type ChildProcess } from 'node:child_process'
import { readFileSync } from 'node:fs'
import type { IncomingMessage } from 'node:http'
import { basename, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = dirname(fileURLToPath(import.meta.url))
const frontendRoot = resolve(currentDir, '..', '..')
const repoRoot = resolve(frontendRoot, '..')
const backendApiProjectPath = resolve(
    repoRoot,
    'backend',
    'SolSignalModel1D_Backtest',
    'SolSignalModel1D_Backtest.Api',
    'SolSignalModel1D_Backtest.Api.csproj'
)
const backendWorkspaceRootPath = resolve(
    repoRoot,
    'backend',
    'SolSignalModel1D_Backtest'
)
const backendLaunchSettingsPath = resolve(
    repoRoot,
    'backend',
    'SolSignalModel1D_Backtest',
    'SolSignalModel1D_Backtest.Api',
    'Properties',
    'launchSettings.json'
)

interface LaunchSettingsProfile {
    commandName?: string
    applicationUrl?: string
}

interface LaunchSettingsDocument {
    profiles?: Record<string, LaunchSettingsProfile>
}

export interface LocalApiRuntimeContract {
    origin: string
    port: string
    launchProfile: string
    probeUrl: string
    workspaceRoot: string
    cacheRoot: string
    backendProjectPath: string
    managedBuildOutputPath: string
    managedBuildObjPath: string
    managedRuntimeDllPath: string
}

export interface LocalApiRuntimeProblem {
    owner: string
    code: string
    message: string
    expected: string
    actual: string
    requiredAction: string
    context: Record<string, unknown>
}

export class LocalApiRuntimeError extends Error {
    public readonly detail: LocalApiRuntimeProblem

    public constructor(detail: LocalApiRuntimeProblem) {
        super(buildLocalApiRuntimeErrorMessage(detail))
        this.name = 'LocalApiRuntimeError'
        this.detail = detail
    }
}

let ownedLocalBackendProcess: ChildProcess | null = null
let managedLocalApiReadyPromise: Promise<string> | null = null

/**
 * Локальный frontend не должен дублировать host/port backend-а в env и helper-ах.
 * Канонический dev-origin берётся из backend launch profile `http`, а Vite только
 * оркестрирует этот контракт и поднимает API, если хост ещё не запущен.
 */
export function readLocalApiRuntimeContract(): LocalApiRuntimeContract {
    let rawDocument: string
    try {
        rawDocument = readFileSync(backendLaunchSettingsPath, 'utf8')
    } catch (error) {
        const actual = error instanceof Error ? error.message : String(error)
        throw new LocalApiRuntimeError({
            owner: 'frontend.local-api-runtime',
            code: 'backend_launch_settings_unreadable',
            message: 'Frontend dev runtime could not read backend launch settings.',
            expected: `Readable backend launch settings at ${backendLaunchSettingsPath}.`,
            actual,
            requiredAction: 'Restore the backend API project next to the frontend workspace or point local development to an explicit backend target.',
            context: {
                launchSettingsPath: backendLaunchSettingsPath
            }
        })
    }

    let parsed: LaunchSettingsDocument
    try {
        parsed = JSON.parse(rawDocument) as LaunchSettingsDocument
    } catch (error) {
        const actual = error instanceof Error ? error.message : String(error)
        throw new LocalApiRuntimeError({
            owner: 'frontend.local-api-runtime',
            code: 'backend_launch_settings_invalid_json',
            message: 'Frontend dev runtime could not parse backend launch settings.',
            expected: `Valid JSON document at ${backendLaunchSettingsPath}.`,
            actual,
            requiredAction: 'Fix launchSettings.json so frontend can discover the backend owner profile for local development.',
            context: {
                launchSettingsPath: backendLaunchSettingsPath
            }
        })
    }

    const profiles = parsed.profiles ?? {}

    const orderedProfiles = Object.entries(profiles)
        .filter(([, profile]) => profile.commandName === 'Project' && typeof profile.applicationUrl === 'string')
        .map(([name, profile]) => ({
            name,
            applicationUrl: profile.applicationUrl as string
        }))

    const httpProfile = orderedProfiles.find(profile => profile.name === 'http')
        ?? orderedProfiles.find(profile => extractHttpOrigin(profile.applicationUrl) !== null)

    if (!httpProfile) {
        throw new LocalApiRuntimeError({
            owner: 'frontend.local-api-runtime',
            code: 'backend_launch_profile_missing',
            message: 'Backend launch settings do not expose an HTTP project profile for local frontend runtime.',
            expected: `A backend launch profile in ${backendLaunchSettingsPath} should contain commandName=Project and an http:// applicationUrl.`,
            actual: `profiles=${orderedProfiles.length}`,
            requiredAction: 'Add or restore the HTTP launch profile in backend launchSettings.json so local frontend can discover the API host.',
            context: {
                launchSettingsPath: backendLaunchSettingsPath,
                availableProfiles: Object.keys(profiles)
            }
        })
    }

    const origin = extractHttpOrigin(httpProfile.applicationUrl)
    if (!origin) {
        throw new LocalApiRuntimeError({
            owner: 'frontend.local-api-runtime',
            code: 'backend_http_origin_missing',
            message: 'Backend launch profile does not contain a valid HTTP origin for local frontend runtime.',
            expected: `Launch profile '${httpProfile.name}' in ${backendLaunchSettingsPath} should expose an http:// applicationUrl.`,
            actual: httpProfile.applicationUrl,
            requiredAction: `Restore a valid http:// URL in profile '${httpProfile.name}' so frontend dev proxy can reuse the backend owner contract.`,
            context: {
                launchSettingsPath: backendLaunchSettingsPath,
                launchProfile: httpProfile.name
            }
        })
    }

    return {
        origin,
        port: String(new URL(origin).port || 80),
        launchProfile: httpProfile.name,
        probeUrl: `${origin}/api/system/registry`,
        workspaceRoot: backendWorkspaceRootPath,
        cacheRoot: resolve(backendWorkspaceRootPath, 'cache'),
        backendProjectPath: backendApiProjectPath,
        managedBuildOutputPath: resolve(repoRoot, 'tmp', 'frontend-local-api-runtime', 'out'),
        managedBuildObjPath: resolve(repoRoot, 'tmp', 'frontend-local-api-runtime', 'obj'),
        managedRuntimeDllPath: resolve(
            repoRoot,
            'tmp',
            'frontend-local-api-runtime',
            'out',
            basename(backendApiProjectPath, '.csproj') + '.dll'
        )
    }
}

export function normalizeDevProxyTargetInput(rawTarget: string | undefined): string {
    return rawTarget?.trim().replace(/\/+$/, '').replace(/\/api$/i, '') ?? ''
}

export function resolveDevApiProxyTargetFromContract(args: {
    rawTarget?: string
    contract: LocalApiRuntimeContract
}): string {
    const normalized = normalizeDevProxyTargetInput(args.rawTarget)
    if (!normalized) {
        return args.contract.origin
    }

    const withProtocol = /^https?:\/\//i.test(normalized) ? normalized : `http://${normalized}`
    const parsed = tryParseUrl(withProtocol)
    return parsed?.origin ?? args.contract.origin
}

export function shouldAutoStartManagedLocalApi(args: {
    rawTarget?: string
    resolvedTarget: string
    contract: LocalApiRuntimeContract
}): boolean {
    const normalizedRawTarget = normalizeDevProxyTargetInput(args.rawTarget)
    return normalizedRawTarget.length === 0 || args.resolvedTarget === args.contract.origin
}

export async function ensureManagedLocalApiReady(args: {
    rawTarget?: string
    contract: LocalApiRuntimeContract
}): Promise<string> {
    const resolvedTarget = resolveDevApiProxyTargetFromContract(args)

    if (!shouldAutoStartManagedLocalApi({
        rawTarget: args.rawTarget,
        resolvedTarget,
        contract: args.contract
    })) {
        return resolvedTarget
    }

    if (await isHttpEndpointReachable(args.contract.probeUrl)) {
        return resolvedTarget
    }

    if (managedLocalApiReadyPromise) {
        return managedLocalApiReadyPromise
    }

    managedLocalApiReadyPromise = ensureManagedLocalApiReadyInternal({
        resolvedTarget,
        contract: args.contract
    })

    try {
        return await managedLocalApiReadyPromise
    } finally {
        managedLocalApiReadyPromise = null
    }
}

export function buildLocalApiRuntimeErrorMessage(detail: LocalApiRuntimeProblem): string {
    return `${detail.message} owner=${detail.owner} | code=${detail.code} | expected=${detail.expected} | actual=${detail.actual} | requiredAction=${detail.requiredAction} | context=${JSON.stringify(detail.context)}`
}

export function buildLocalApiRuntimeFailurePayload(args: {
    error: unknown
    req: IncomingMessage
    target: string
}): LocalApiRuntimeProblem & {
    status: number
} {
    const method = args.req.method ?? 'GET'
    const path = args.req.url ?? '/api'

    if (args.error instanceof LocalApiRuntimeError) {
        return {
            status: 502,
            ...args.error.detail,
            context: {
                ...args.error.detail.context,
                method,
                path,
                proxyTarget: args.target
            }
        }
    }

    const actual = args.error instanceof Error
        ? args.error.message
        : String(args.error)

    return {
        status: 502,
        owner: 'frontend.local-api-runtime',
        code: 'backend_autostart_unknown_failure',
        message: 'Frontend dev runtime could not prepare the managed local backend before forwarding an API request.',
        expected: `Managed local backend should be reachable at ${args.target} before proxying ${method} ${path}.`,
        actual,
        requiredAction: 'Inspect the local backend startup/build logs and fix the failing managed runtime contract.',
        context: {
            method,
            path,
            proxyTarget: args.target
        }
    }
}

export function buildManagedLocalBackendBuildArgs(contract: LocalApiRuntimeContract): string[] {
    return [
        'build',
        contract.backendProjectPath,
        `-p:OutputPath=${contract.managedBuildOutputPath}\\`,
        `-p:IntermediateOutputPath=${contract.managedBuildObjPath}\\`,
        '-p:UseSharedCompilation=false'
    ]
}

export function buildManagedLocalBackendRunArgs(contract: LocalApiRuntimeContract): string[] {
    return [contract.managedRuntimeDllPath]
}

function extractHttpOrigin(applicationUrl: string): string | null {
    for (const candidate of applicationUrl.split(';').map(token => token.trim()).filter(Boolean)) {
        const parsed = tryParseUrl(candidate)
        if (parsed?.protocol === 'http:') {
            return parsed.origin
        }
    }

    return null
}

function tryParseUrl(value: string): URL | null {
    try {
        return new URL(value)
    } catch {
        return null
    }
}

function buildManagedLocalBackend(contract: LocalApiRuntimeContract): void {
    const buildArgs = buildManagedLocalBackendBuildArgs(contract)
    const result = spawnSync('dotnet', buildArgs, {
        cwd: repoRoot,
        windowsHide: true,
        encoding: 'utf8'
    })

    if (result.status === 0) {
        return
    }

    const actual = [result.stdout, result.stderr]
        .filter(chunk => typeof chunk === 'string' && chunk.trim().length > 0)
        .join('\n')
        .trim()

    throw new LocalApiRuntimeError({
            owner: 'frontend.local-api-runtime',
            code: 'backend_isolated_build_failed',
            message: 'Frontend dev runtime could not build an isolated local backend host.',
            expected: `Running 'dotnet ${buildArgs.join(' ')}' should produce ${contract.managedRuntimeDllPath}.`,
            actual: actual || `dotnet build exited with status ${result.status ?? 'unknown'}`,
            requiredAction: 'Fix the backend build error, then restart `npm run dev`.',
            context: {
                backendProjectPath: contract.backendProjectPath,
                managedBuildOutputPath: contract.managedBuildOutputPath,
                managedBuildObjPath: contract.managedBuildObjPath,
                managedRuntimeDllPath: contract.managedRuntimeDllPath,
                buildArgs
            }
        })
}

async function ensureManagedLocalApiReadyInternal(args: {
    resolvedTarget: string
    contract: LocalApiRuntimeContract
}): Promise<string> {
    buildManagedLocalBackend(args.contract)

    const startArgs = buildManagedLocalBackendRunArgs(args.contract)
    const child = spawn(
        'dotnet',
        startArgs,
        {
            cwd: args.contract.workspaceRoot,
            stdio: 'inherit',
            windowsHide: true,
            env: {
                ...process.env,
                HTTP_PORTS: args.contract.port,
                SSM_WORKSPACE_ROOT: args.contract.workspaceRoot,
                SSM_CACHE_ROOT: args.contract.cacheRoot
            }
        }
    )

    ownedLocalBackendProcess = child
    registerOwnedProcessCleanup(child)

    let spawnError: Error | null = null
    child.once('error', error => {
        spawnError = error
    })

    const waitResult = await waitForManagedApiAvailability({
        url: args.contract.probeUrl,
        child,
        getSpawnError: () => spawnError,
        timeoutMs: 90_000,
        pollDelayMs: 500
    })
    if (waitResult === 'ready') {
        return args.resolvedTarget
    }

    throw new LocalApiRuntimeError({
        owner: 'frontend.local-api-runtime',
        code: waitResult === 'spawn_error'
            ? 'backend_autostart_spawn_failed'
            : waitResult === 'child_exited'
                ? 'backend_autostart_process_exited'
                : 'backend_autostart_timeout',
        message: 'Frontend dev runtime could not bring the local backend online in time.',
        expected: `Running 'dotnet ${startArgs.join(' ')}' should expose ${args.contract.probeUrl}.`,
        actual: waitResult === 'spawn_error'
            ? `Backend process failed to spawn. error=${spawnError?.message ?? 'unknown spawn error'}`
            : waitResult === 'child_exited'
                ? `Backend process exited before exposing the local API host. exitCode=${child.exitCode}`
                : `Backend process stayed unreachable for 90000ms. target=${args.contract.origin}`,
        requiredAction: 'Inspect the backend startup logs, fix the failing host, and restart `npm run dev`.',
        context: {
            backendProjectPath: args.contract.backendProjectPath,
            workspaceRoot: args.contract.workspaceRoot,
            cacheRoot: args.contract.cacheRoot,
            managedBuildOutputPath: args.contract.managedBuildOutputPath,
            managedBuildObjPath: args.contract.managedBuildObjPath,
            managedRuntimeDllPath: args.contract.managedRuntimeDllPath,
            startArgs,
            launchProfile: args.contract.launchProfile,
            probeUrl: args.contract.probeUrl,
            target: args.contract.origin
        }
    })
}

async function isHttpEndpointReachable(url: string): Promise<boolean> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 1500)

    try {
        const response = await fetch(url, {
            method: 'GET',
            signal: controller.signal
        })

        return response.status >= 200 && response.status < 600
    } catch {
        return false
    } finally {
        clearTimeout(timeoutId)
    }
}

async function waitForManagedApiAvailability(args: {
    url: string
    child: ChildProcess
    getSpawnError: () => Error | null
    timeoutMs: number
    pollDelayMs: number
}): Promise<'ready' | 'child_exited' | 'spawn_error' | 'timeout'> {
    const startedAt = Date.now()

    while (Date.now() - startedAt < args.timeoutMs) {
        if (await isHttpEndpointReachable(args.url)) {
            return 'ready'
        }

        if (args.getSpawnError() != null) {
            return 'spawn_error'
        }

        if (args.child.exitCode != null) {
            return 'child_exited'
        }

        await new Promise(resolvePromise => setTimeout(resolvePromise, args.pollDelayMs))
    }

    return 'timeout'
}

function registerOwnedProcessCleanup(child: ChildProcess): void {
    const cleanup = () => {
        if (ownedLocalBackendProcess !== child || child.killed) {
            return
        }

        try {
            child.kill()
        } catch {
            // Игнорируем cleanup-ошибки процесса, который уже завершился.
        }
    }

    process.once('exit', cleanup)
    process.once('SIGINT', () => {
        cleanup()
        process.exit(130)
    })
    process.once('SIGTERM', () => {
        cleanup()
        process.exit(143)
    })
}
