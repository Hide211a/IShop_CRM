# iShop Рівне — система управління товарними запасами

Бакалаврський дипломний проєкт: веб-застосунок для обліку товарних запасів магазину мобільної техніки **iShop Рівне** (м. Рівне).

## Стек

- **Frontend:** React, TypeScript, Vite, MUI, TanStack Query
- **Backend:** Node.js, Express, TypeScript, Prisma
- **БД (локально):** SQLite — `backend/prisma/dev.db`, Docker не потрібен
- **БД (production):** PostgreSQL на Railway

## Ролі (демо-акаунти)

| Роль | Email | Пароль |
|------|-------|--------|
| Адміністратор | admin@ishop-rivne.ua | demo123 |
| Менеджер | manager@ishop-rivne.ua | demo123 |
| Директор | director@ishop-rivne.ua | demo123 |

## Швидкий старт (без Docker)

Потрібні лише **Node.js** і **npm**.

### 1. Backend (термінал 1)

```bash
cd backend
cp .env.example .env
npm install
npm run db:setup
npm run dev
```

API: http://localhost:3001

### 2. Frontend (термінал 2)

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

UI: http://localhost:5173

## Деплой (production)

| Частина | Платформа | Статус |
|---------|-----------|--------|
| Frontend | [Vercel](https://vercel.com) | етап 8 |
| Backend + PostgreSQL | [Railway](https://railway.app) | готово до деплою (етап 7) |

**Production URL:** _(заповнити після деплою)_

### Railway (backend) — покроково

1. Створіть проєкт на [Railway](https://railway.app) → **New Project** → **Deploy from GitHub repo**
2. Додайте сервіс **PostgreSQL** (Add Plugin → PostgreSQL)
3. Додайте сервіс **backend** з репозиторію:
   - **Root Directory:** `backend`
   - Build і start беруться з `backend/railway.toml`
4. У змінних backend-сервісу:
   - `DATABASE_URL` — з PostgreSQL plugin (Reference Variable)
   - `JWT_SECRET` — довгий випадковий рядок (мін. 16 символів)
   - `CORS_ORIGIN` — URL Vercel (після етапу 8), напр. `https://ishop-rivne.vercel.app`
   - `NODE_ENV` = `production`
5. Після деплою перевірте: `GET https://<railway-host>/api/health` → `{"status":"ok",...}`
6. Seed виконується автоматично при старті (`start:prod`)

### Vercel (frontend) — після Railway

1. Import репозиторію → **Root Directory:** `frontend`
2. Build: `npm run build`, Output: `dist`
3. Env: `VITE_API_URL=https://<railway-host>/api`
4. Поверніться на Railway і оновіть `CORS_ORIGIN` на URL Vercel

### Змінні середовища

**Backend (Railway):**
- `DATABASE_URL` — PostgreSQL (автоматично з plugin)
- `JWT_SECRET` — довгий випадковий рядок
- `CORS_ORIGIN` — URL Vercel (можна кілька через кому)
- `PORT` — зазвичай задає Railway

**Frontend (Vercel):**
- `VITE_API_URL` — `https://<railway-app>.up.railway.app/api`
- `frontend/vercel.json` — SPA rewrites для React Router

## Що робить `db:setup`

Створює файл бази `prisma/dev.db` і наповнює демо-даними (товари, користувачі, документи).

## Можливості системи

- CRUD товарів, категорій, брендів, постачальників, користувачів
- Документи: надходження, витрата, інвентаризація, резерв
- Проведення документів з оновленням залишків
- Облік IMEI для смартфонів
- Звіти з фільтром по датах + експорт CSV
- Role-based інтерфейс (адмін / менеджер / директор)

## Документація (внутрішня, не здається окремо)

- `docs/WORK_PLAN.md` — **план до production** (головний для розробки)
- `docs/ROADMAP.md`, `REQUIREMENTS.md` тощо — нотатки для себе

**На здачу йде лише проєкт:** код + prod URL + README з логінами.

## Структура

```
├── backend/     # REST API (SQLite локально / PostgreSQL на Railway)
├── frontend/    # React SPA
└── docs/        # Вимоги, діаграми, інструкція
```

## PostgreSQL (production) vs SQLite (локально)

- **Локально:** SQLite — `npm run db:setup` (без Docker)
- **Railway:** PostgreSQL — схема вибирається автоматично за `DATABASE_URL`
- Джерела схем: `backend/prisma/schema.sqlite.prisma` та `schema.postgresql.prisma`
- Скрипт `backend/scripts/prepare-schema.mjs` копіює потрібну схему в `schema.prisma` при `npm install`
