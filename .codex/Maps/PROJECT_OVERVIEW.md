# Обзор проекта (Frontend)

## Факты
- Frontend для SolSignalModel1D Backtest: React + TypeScript + Redux Toolkit + Vite.
- Архитектура близка к FSD: `app / pages / widgets / features / entities / shared`.
- Роутинг через `react-router-dom`, все страницы описаны в `export const ROUTE_CONFIG`.
- Состояние: Redux Toolkit + RTK Query, локально также используется TanStack Query.
- UI: SCSS modules + глобальные миксины (auto-import через Vite).
- Тема: `ThemeProvider` (dark/light), классы темы на `.app`.

## Основные пользовательские зоны
- Прогнозы ML: текущий прогноз и история.
- Бэктесты: baseline, сводка и полный/экспериментальный.
- Статистика моделей и PFI-отчёты.
- Docs/описания (термины, тесты, модели).
- Auth: login/registration/profile.

## Сборка и окружение
- Vite конфиг: `vite.config.ts` (plugins/css/alias вынесены в `config/vite`).
- Alias `@` указывает на `src`.
- `VITE_API_BASE_URL` задаёт базовый URL API (фолбэк `/api`).
- SCSS миксины/переменные подключаются автоматически через `additionalData`.

## Что важно сохранять при правках
- Не дублировать UI: сначала искать в `shared/ui` и `widgets`.
- Навигация/страницы только через `export const ROUTE_CONFIG`.
- API вызовы — через RTK Query (`shared/api`), типы — в `shared/types`.
- Минимальные изменения и единый стиль (classNames + CSS modules)
- Если задача касается страницы/вкладки/SideBar/таблицы/Navbar, создание новых страниц/таблиц, то открой файл SolSignalModel1D_Backtest_Front/.codex/FRONTEND_NAV_PAGES_RULES.md, там будут правила и заметки по таким задачам
