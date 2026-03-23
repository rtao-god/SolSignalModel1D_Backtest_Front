import '@testing-library/jest-dom'
import fs from 'node:fs'
import path from 'node:path'

const pagesRoot = path.resolve(__dirname)

function collectPageSourceFiles(currentPath: string): string[] {
    return fs.readdirSync(currentPath, { withFileTypes: true }).flatMap(entry => {
        const nextPath = path.join(currentPath, entry.name)

        if (entry.isDirectory()) {
            return collectPageSourceFiles(nextPath)
        }

        if (!/\.(ts|tsx)$/.test(entry.name)) {
            return []
        }

        if (/\.test\.(ts|tsx)$/.test(entry.name)) {
            return []
        }

        return [nextPath]
    })
}

describe('pages shell-first contract', () => {
    test('page files do not use root PageDataBoundary anymore', () => {
        const offenders = collectPageSourceFiles(pagesRoot)
            .filter(filePath => !filePath.endsWith(`${path.sep}Layout${path.sep}ui${path.sep}Layout.tsx`))
            .filter(filePath => fs.readFileSync(filePath, 'utf-8').includes('PageDataBoundary'))

        expect(offenders).toEqual([])
    })

    test('page files do not use root PageSuspense anymore', () => {
        const offenders = collectPageSourceFiles(pagesRoot)
            .filter(filePath => !filePath.endsWith(`${path.sep}Layout${path.sep}ui${path.sep}Layout.tsx`))
            .filter(filePath => fs.readFileSync(filePath, 'utf-8').includes('PageSuspense'))

        expect(offenders).toEqual([])
    })

    test('page files do not render PageError directly outside layout fallback', () => {
        const offenders = collectPageSourceFiles(pagesRoot)
            .filter(filePath => !filePath.endsWith(`${path.sep}Layout${path.sep}ui${path.sep}Layout.tsx`))
            .filter(filePath => {
                const source = fs.readFileSync(filePath, 'utf-8')
                return source.includes('return <PageError') || source.includes('<PageError')
            })

        expect(offenders).toEqual([])
    })
})
