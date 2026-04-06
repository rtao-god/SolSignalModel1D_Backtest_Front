import { UserConfig } from '@commitlint/types'

const Configuration: UserConfig = {
    extends: ['@commitlint/config-conventional'],
    rules: {
        'type-enum': [
            2,
            'always',
            [
                'build', // Changes that affect the build system or external dependencies
                'ci', // Changes to our CI configuration files and scripts
                'feat', // Introducing new features
                'fix', // Bug fixes
                'chore', // Routine tasks and maintenance
                'docs', // Add or Update Documentation
                'style', // Code style changes (formatting, missing semi-colons, etc.)
                'refactor', // Improve code structure or code formatting. Code refactoring without changing functionality.
                'test', // Only changes to existing test files (per .codex/Git/GIT_COMMIT_RULES.md Tests vs New tests)
                'new-tests', // Only new test files, no edits to existing tests (maps to GIT_COMMIT_RULES `New tests`)
                'revert', // Reverts a previous commit
                'config', // Changes to configuration files
                'deps', // Dependency updates
                'ui', // Changes to user interface or visual elements
                'layout', // Changes to layout and structure of the page
                'git', // Add or modify git files
                'tag', // post a new tag
                'init', // Initial commit or initialize project
                'publish', // release a new version
                'perf', // Improve performance or optimize
                'patch', // Add critical patches
                'format', //  format code
                'security', // Changes related to security, such as fixing vulnerabilities
                'localization', //  Adding or updating localizations for different languages
                'assets', // Adding or updating assets (e.g., images, fonts)
                'analytics', // Adding or updating analytics and tracking
                'rollback' // Rolling back changes or versions to a previous state
            ]
        ],
        'subject-case': [2, 'never', ['sentence-case']],
        'subject-empty': [0, 'never'],
        'subject-full-stop': [2, 'never', '.'],
        'body-max-line-length': [2, 'always', 100],
        'header-max-length': [2, 'always', 100],
        'type-empty': [2, 'never']
    }
}

export default Configuration
