# Конвенции и инварианты (Frontend)

## Границы слоёв (FSD)
- `app` не импортирует из `pages/widgets/features/entities` напрямую (только wiring провайдеров).
- `pages` могут собирать `widgets/features/entities/shared`.
- `widgets` собирают `features/entities/shared`, но не наоборот.
- `features` используют `entities/shared`.
- `entities` используют только `shared`.

## Роутинг — один источник правды
- Любые новые страницы добавлять в `export const ROUTE_CONFIG` + `export const ROUTE_PATH`.
- Навигация (sidebar/navbar) строится из `export const ROUTE_CONFIG` — не создавать отдельные списки вручную.
- Для ленивых страниц использовать `lazyPage`.

## UI и стили
- Сначала искать компоненты в `shared/ui` и `widgets`.
- Не плодить дублей: если нужен общий компонент — добавлять в `shared/ui`.
- Использовать `classNames` helper, CSS Modules и существующие миксины.
- Инлайновые стили — только для динамических значений (width/height и т.п.).

## API / данные
- API-вызовы оформлять через RTK Query в `src/shared/api`.
- Типы API держать в `src/shared/types` и переиспользовать.
- Если нужно новое API-основание — править `API_BASE_URL` и/или `shared/api/httpClient`.

## Ошибки и загрузки
- Для страниц использовать `PageSuspense`/`PageLoader`.
- Глобальные ошибки ловятся `ErrorBoundary` в `main.tsx` — не глотать ошибки молча.

## Гигиена диффа
- Минимальные правки, без лишнего форматирования.
- Если правка только frontend — не трогать backend и его `.codex/` папку. Если для контекста нужно посмотреть backend проект - посмотри.
