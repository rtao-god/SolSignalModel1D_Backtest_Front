# Карта репозитория (Frontend)

- `src/app` — корневые провайдеры, глобальные стили, вход в приложение.
- `src/pages` — страницы (роуты), подключаются через `export const ROUTE_CONFIG`.
- `src/widgets` — крупные блоки UI (Navbar, SideBar и др.).
- `src/features` — пользовательские фичи (auth, registration и т.п.).
- `src/entities` — доменные сущности (User, date) и их состояния.
- `src/shared` — общий UI, типы, утилиты, API-клиент, конфиги.

## Точки входа
- `src/app/main.tsx` — root-провайдеры (Store, Router, Theme, ErrorBoundary, QueryClient).
- `src/app/App.tsx` — базовая оболочка приложения + `AppRouter`.

## Роутинг и навигация
- Канон конфигурации: `src/app/providers/router/config/routeConfig.tsx`.
- Пути: `src/app/providers/router/config/consts.ts`.
- Типы маршрутов: `src/app/providers/router/config/types.ts`.
- Ленивая загрузка: `src/app/providers/router/config/utils/lazyPage.ts`.
- Навигация для sidebar/navbar строится из `export const ROUTE_CONFIG`.

## Layout / Shell
- Основной layout: `src/pages/Layout/Layout`.
- “Голые” страницы (без Layout): `layout: 'bare'` в `export const ROUTE_CONFIG` (login/registration).

## Страницы (src/pages)
- `Main` — главная страница.
- `ModelStatsPage` — отчёт статистики ML‑моделей.
- `predictions/CurrentMLModelPredictionPage` — текущий прогноз.
- `predictions/PredictionHistoryPage` — история прогнозов.
- `BacktestBaselinePage` — baseline‑бэктест.
- `BacktestSummaryReport` — сводка бэктеста.
- `BacktestPage` — полный/экспериментальный бэктест.
- `PfiPage` — PFI‑отчёт.
- `docsPages/DocsPage` — обзор документации и базовые пояснения.
- `docsPages/DocsModelsPage` — описание моделей.
- `docsPages/DocsTestsPage` — описание тестов.
- `About` — страница “About”.
- `ContactPage` — контакты.
- `Login` — логин.
- `Registration` — регистрация.
- `profile/Profile` — профиль пользователя.
- `404/NotFound` — 404‑страница.
- `Layout` — общий shell (navbar/sidebar/контент).
- `Users` — legacy‑страница, не подключена к `export const ROUTE_CONFIG`.

## Состояние и данные
- Redux store: `src/app/providers/StoreProvider/config/configureStore.ts`.
- RTK Query API: `src/shared/api/api.ts` (+ endpoints в `src/shared/api/endpoints`).
- HTTP baseUrl: `src/shared/configs/config.ts` (`VITE_API_BASE_URL` -> `/api`).
- TanStack Query используется точечно (см. `src/shared/api/tanstackQueries`).

## Важные UI/Shared компоненты (использовать вместо самописных)
- `shared/ui/Btn` — стандартная кнопка (theme-aware colorScheme).
- `shared/ui/Input` — инпут с гибкой стилевой прокачкой.
- `shared/ui/Text` + `shared/ui/Element` — типографика/универсальный тег.
- `shared/ui/Modal` — модалка с Portal и click-outside.
- `shared/ui/Link` — роутер-ссылка с автозакрытием mobile меню.
- `shared/ui/Row`, `shared/ui/Rows`, `shared/ui/Line` — простые layout/building blocks.
- `shared/ui/WhiteContentBlock`, `shared/ui/BlueBox` — контейнеры с готовыми стилями.
- `shared/ui/TermTooltip` — термин с тултипом (docs/описания).
- `shared/ui/ReportDocumentView` — универсальный рендер отчётов `ReportDocumentDto`.
- `shared/ui/TableExportButton` — экспорт таблиц (PDF/CSV).
- `shared/ui/loaders` — `PageLoader`, `PageSuspense` и др. лоадеры.
- `shared/ui/animations` — `AnimateComponent`, `WaveAnimate`.

## Виджеты
- `widgets/components/Navbar` — верхнее меню (использует `export const NAVBAR_ITEMS`).
- `widgets/components/SideBar` — сайдбар (использует `export const SIDEBAR_NAV_ITEMS`).
- `widgets/components/Footer` — футер.
- `widgets/components/LogoutBtn` — кнопка выхода.
- `widgets/components/LangSwitcher` — переключение языка (i18n).

## Типичные поиски
- Роуты/навигация: `rg -n "export const ROUTE_CONFIG|export const ROUTE_PATH|export const SIDEBAR_NAV_ITEMS|export const NAVBAR_ITEMS" ./src/app/providers/router/config`.
- API endpoints: `rg -n "createApi|build.*Endpoints" src/shared/api`.
- Компоненты UI: `rg -n "shared/ui" src`.

## Важно про совместную работу Front/Back
- Если задача только про фронт/UI/вёрстку — не открывать `.codex` бэкенда.
- Если задача затрагивает контракты API или совместные изменения — читать оба `.codex`.
