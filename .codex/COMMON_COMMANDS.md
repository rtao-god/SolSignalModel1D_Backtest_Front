# Commands (Frontend)

## Dev / build
- Dev-сервер:
  - `npm run dev`
- Production build:
  - `npm run build`
- Preview:
  - `npm run preview`

## Lint / format
- Все линты:
  - `npm run lint`
- ESLint:
  - `npm run lint:eslint`
- Prettier:
  - `npm run lint:prettier`

## Search (ripgrep)
- По всему `src`:
  - `rg -n --hidden "<pattern>" ./src`
- Только TS/TSX:
  - `rg -n --hidden --glob "**/*.{ts,tsx}" "<pattern>" ./src`

## Частые поиски
- Роуты/навигация:
  - `rg -n "export const ROUTE_CONFIG|export const ROUTE_PATH|export const SIDEBAR_NAV_ITEMS|export const NAVBAR_ITEMS" ./src/app/providers/router/config`
- API/RTK Query:
  - `rg -n "createApi|useGet.*Query|use.*Mutation" ./src/shared/api`
- Shared UI:
  - `rg -n "shared/ui" ./src`
