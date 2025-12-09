import type { CSSOptions } from 'vite'

export const css: CSSOptions = {
    preprocessorOptions: {
        scss: {
            // Эта строка будет автоматически подмешиваться во все SCSS-файлы
            additionalData: `@import '@/app/styles/includeMixinsAndVariables';`
        }
    },
    modules: {
        // Явно валидное значение для CSSModulesOptions.scopeBehaviour
        scopeBehaviour: 'local',
        // Шаблон имени класса: ИмяФайла__локальныйКласс___хеш
        generateScopedName: '[name]__[local]___[hash:base64:5]'
    }
}
