import js from '@eslint/js'
import globals from 'globals'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import prettierConfig from 'eslint-config-prettier'
import tseslint from 'typescript-eslint'

const reportWireEnumLiterals = [
    'PolicyBranchMega',
    'TopTrades',
    'WithSl',
    'NoSl',
    'FullHistory',
    'Dynamic',
    'Static',
    'WithZonal',
    'WithoutZonal',
    'NoBiggestLiqLoss',
    'TotalAggregate'
]

const pageBoundaryArchitecturePlugin = {
    rules: {
        'require-page-data-state-root-with-section-boundary': {
            meta: {
                type: 'problem'
            },
            create(context) {
                let sectionImportNode = null
                let hasPageDataState = false

                return {
                    ImportDeclaration(node) {
                        if (node.source.value !== '@/shared/ui/errors/PageDataState') {
                            return
                        }

                        for (const spec of node.specifiers) {
                            if (spec.type !== 'ImportSpecifier') {
                                continue
                            }

                            if (spec.imported.name === 'PageSectionDataState') {
                                sectionImportNode = node
                            }

                            if (spec.imported.name === 'PageDataState') {
                                hasPageDataState = true
                            }
                        }
                    },
                    'Program:exit'() {
                        if (sectionImportNode && !hasPageDataState) {
                            context.report({
                                node: sectionImportNode,
                                message:
                                    'Route page files must import PageDataState when they import PageSectionDataState: use PageDataState as the root boundary (shell + page-level fetch) and PageSectionDataState only for nested sections.'
                            })
                        }
                    }
                }
            }
        }
    }
}

const reportArchitecturePlugin = {
    rules: {
        'no-raw-report-wire-enum-literal': {
            meta: {
                type: 'problem'
            },
            create(context) {
                return {
                    Literal(node) {
                        if (typeof node.value !== 'string') {
                            return
                        }

                        if (!reportWireEnumLiterals.includes(node.value)) {
                            return
                        }

                        context.report({
                            node,
                            message: `Raw report wire enum literal '${node.value}' is forbidden outside reportWireEnumCodec. Use the shared report enum codec at the API boundary.`
                        })
                    }
                }
            }
        }
    }
}

export default tseslint.config(
    {
        ignores: ['node_modules/**', 'dist/**', '.vscode/**', '.husky/**', '.codex/**', 'coverage/**', '../backend/**']
    },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    prettierConfig,
    {
        files: ['src/shared/api/**/*.{ts,tsx}'],
        ignores: ['src/**/*.{test,spec}.{ts,tsx}', 'src/shared/api/contracts/reportWireEnumCodec.ts'],
        plugins: {
            'report-architecture': reportArchitecturePlugin
        },
        rules: {
            'report-architecture/no-raw-report-wire-enum-literal': 'error'
        }
    },
    {
        files: ['src/pages/**/*Page*.tsx'],
        ignores: ['src/pages/**/shared/**'],
        plugins: {
            'page-boundary-architecture': pageBoundaryArchitecturePlugin
        },
        rules: {
            'page-boundary-architecture/require-page-data-state-root-with-section-boundary': 'error',
            'no-restricted-imports': [
                'error',
                {
                    paths: [
                        {
                            name: '@/shared/ui/errors/SectionDataState',
                            message:
                                'Route pages must use PageDataState for the route shell + page-level boundary and PageSectionDataState for nested section boundaries only.'
                        }
                    ]
                }
            ]
        }
    },
    {
        files: ['src/**/*.{ts,tsx}'],
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.node,
                ...globals.es2021
            }
        },
        plugins: {
            react,
            'react-hooks': reactHooks,
            'react-refresh': reactRefresh
        },
        rules: {
            'no-undef': 'off',
            'no-empty': 'warn',
            'react/react-in-jsx-scope': 'off',
            'react/jsx-uses-react': 'off',
            'react/prop-types': 'off',
            'react-hooks/rules-of-hooks': 'warn',
            'react-hooks/exhaustive-deps': 'warn',
            'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/ban-ts-comment': 'off',
            '@typescript-eslint/ban-types': 'off',
            '@typescript-eslint/no-unused-vars': ['warn', { varsIgnorePattern: '^_', argsIgnorePattern: '^_' }]
        },
        settings: {
            react: {
                version: 'detect'
            }
        }
    }
)
