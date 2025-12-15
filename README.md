# AI Automatization (Browser AI Agent)

CLI‑агент, который сам управляет видимым браузером (Playwright) и решает многошаговые задачи через tool‑calling (OpenAI Responses API или Claude Messages API). В терминале видно, какие инструменты он вызывает и с какими аргументами; в браузере видно реальные действия.

## Быстрый старт
1) `cp .env.example .env` и поставь ключи + выбери `PROVIDER=openai | anthropic`.
2) `npm install` (загрузит Playwright Chromium).
3) `npm start` — откроется браузер с persistent‑профилем (`PROFILE_DIR`), в терминале вводишь задачу для агента.
4) Можно один раз залогиниться вручную; сессия сохранится в профиле и агент продолжит работать с теми же куками.

Полезное:
- Скриншоты каждого `observe` складываются в `SCREENSHOT_DIR`.
- `HEADLESS=false` по умолчанию, чтобы видеть действия.
- Security‑prompt спросит подтверждение перед опасными кликами/вводом (оплата, удаление, password поля).

## Как это устроено
- **Planner → Actor → Critic** (sub‑agents): план строится без инструментов; Actor управляет браузером через функции; Critic обновляет короткую память и может завершить задачу.
- **Tool‑calling:** OpenAI Responses API (function calls) и Claude tool_use (Messages API + `tool_choice:any`). Для каждого шага Actor видит только сжатый контекст и список интерактивных элементов.
- **Контекст экономный:** вместо сырого HTML отправляем:
  - URL, title, путь до скрина;
  - компактный список интерактивных элементов с `element_id`, tag/role/text/placeholder/bbox;
  - память (краткие summary от Critic).
- **Persistent sessions:** Playwright `launchPersistentContext` с настраиваемой папкой профиля, так что логины и куки сохраняются между запусками.
- **Security layer:** регэксп по опасным действиям + ручное подтверждение в терминале.

## Поток работы агента
1) Planner формирует цель и чекпоинты.
2) BrowserController делает первое `observe` (скрин + интерактивные элементы).
3) Actor выбирает инструмент(ы): `browser_goto`, `browser_click`, `browser_type`, `browser_scroll`, `browser_press`, `browser_wait`, `browser_observe`, `browser_back`.
4) После каждого действия делаем новый `observe`; Critic обновляет краткую память и решает, завершать ли задачу или спросить пользователя.

## Дальнейшие улучшения
- Добавить работу с несколькими вкладками/iframe и загрузкой файлов.
- Ретраи/таймауты вокруг действий браузера.
- Локальные правила для доменных политик (SOP, приватные данные) в security‑layer.
