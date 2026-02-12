# AGENTS

## Scope
- Этот файл действует только для фронтенд-проекта `SolSignalModel1D_Backtest_Front/**`.
- Общие правила для всех задач находятся в `AGENTS.md`.
- Для backend-задач используй `backend/AGENTS_BACKEND.md`.
- Для fullstack-задач читай оба профильных файла и применяй правила в пределах соответствующих директорий.

## Работа с frontend
- Открывай только релевантные frontend-файлы из `SolSignalModel1D_Backtest_Front/.codex/`, не читай весь каталог подряд.
- По карте и зоне изменений: `SolSignalModel1D_Backtest_Front/.codex/PROJECT_MAP.md` и при необходимости `SolSignalModel1D_Backtest_Front/.codex/PROJECT_OVERVIEW.md`.
- По слоям/роутам/UI-инвариантам: `SolSignalModel1D_Backtest_Front/.codex/ARCH_GUARDS.md`.
- По навигации/добавлению страниц/вкладок/таблиц: `SolSignalModel1D_Backtest_Front/.codex/FRONTEND_NAV_PAGES_RULES.md`.
- По командам: `SolSignalModel1D_Backtest_Front/.codex/COMMON_COMMANDS.md`.
- По целостности данных в UI: `SolSignalModel1D_Backtest_Front/.codex/DATA_INTEGRITY_RULES.md`.

## Frontend-специфика
- Не меняй архитектуру фронтенда, UI-контракты и API-контракты без явного запроса.
- Для терминов, доменных сокращений и потенциально непонятного сложного поведения в UI добавляй подсказки через `TermTooltip` (`src/shared/ui/TermTooltip/ui/TermTooltip.tsx`).
- Не добавляй `TermTooltip` к очевидным словам; подсказка нужна там, где без контекста пользователь/разработчик может неверно понять смысл.
- Build/lint запускать целево: когда изменения реально затрагивают сборку, линт-правила или runtime-поведение UI.
- Для чисто документационных/организационных правок не запускать build/lint по умолчанию.
- Если проверки запускались, по возможности используй:
  - `npm run build`
  - `npm run lint`
- Если проверки не запускались или завершились с ошибкой, явно укажи это в отчёте.
