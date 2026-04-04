import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ErrorBlock } from '@/shared/ui/errors/ErrorBlock/ui/ErrorBlock'
import Text from '@/shared/ui/Text/ui/Text/Text'
import cls from './PageLocalIssuesProvider.module.scss'

export interface PageLocalIssueDescriptor {
    id: string
    title: string
    description?: string
}

interface PageLocalIssuesContextValue {
    issues: PageLocalIssueDescriptor[]
    upsertIssue: (issue: PageLocalIssueDescriptor) => void
    clearIssue: (id: string) => void
}

export const PageLocalIssuesContext = createContext<PageLocalIssuesContextValue | null>(null)

interface PageLocalIssuesProviderProps {
    scopeKey: string
    children: ReactNode
}

function PageLocalIssuesBanner({ issues }: { issues: readonly PageLocalIssueDescriptor[] }) {
    if (issues.length === 0) {
        return null
    }

    return (
        <div className={cls.banner}>
            <ErrorBlock
                title='На странице есть локальные ошибки'
                details={
                    <div className={cls.issueList}>
                        {issues.map(issue => (
                            <div key={issue.id} className={cls.issueItem}>
                                <Text className={cls.issueTitle}>{issue.title}</Text>
                                {issue.description && <Text className={cls.issueDescription}>{issue.description}</Text>}
                            </div>
                        ))}
                    </div>
                }
                compact
            />
        </div>
    )
}

export function PageLocalIssuesProvider({ scopeKey, children }: PageLocalIssuesProviderProps) {
    const [issues, setIssues] = useState<PageLocalIssueDescriptor[]>([])

    useEffect(() => {
        setIssues([])
    }, [scopeKey])

    const upsertIssue = useCallback((issue: PageLocalIssueDescriptor) => {
        setIssues(prevIssues => {
            const existingIndex = prevIssues.findIndex(candidate => candidate.id === issue.id)
            if (existingIndex === -1) {
                return [...prevIssues, issue]
            }

            const nextIssues = [...prevIssues]
            nextIssues[existingIndex] = issue
            return nextIssues
        })
    }, [])

    const clearIssue = useCallback((id: string) => {
        setIssues(prevIssues => prevIssues.filter(issue => issue.id !== id))
    }, [])

    const contextValue = useMemo(
        () => ({
            issues,
            upsertIssue,
            clearIssue
        }),
        [issues, upsertIssue, clearIssue]
    )

    return (
        <PageLocalIssuesContext.Provider value={contextValue}>
            <PageLocalIssuesBanner issues={issues} />
            {children}
        </PageLocalIssuesContext.Provider>
    )
}

export function usePageLocalIssueReporter(issue: PageLocalIssueDescriptor | null) {
    const context = useContext(PageLocalIssuesContext)

    useEffect(() => {
        if (!context || !issue) {
            return
        }

        context.upsertIssue(issue)

        return () => {
            context.clearIssue(issue.id)
        }
    }, [context, issue])
}
