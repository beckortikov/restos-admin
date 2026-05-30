# RestOS Admin

Next.js админка для выдачи лицензионных Ed25519-токенов для RestOS POS.

## Workflow

```
Клиент в POS:                                  Ты в этой админке:
─────────────────                              ──────────────────
Settings → Лицензия → копирует:                Login → форма "Выдать":
  machine_id: A1B2-7K3M-9XQA                     • Вставляешь machine_id + rid
  restaurant_id: 7c4e3b2a-...                    • Выбираешь edition + days
                                                  • Получаешь signed token
        │                                                   │
        ▼   Telegram/звонок «вот код»            Telegram/SMS «вот ключ»
        ▼   ───────────────────────►             ◄───────────────────────
        ▼
Settings → Лицензия → "Ввести ключ" → вставляет токен → backend verify (offline)
```

## Стек

- Next.js 15 (App Router)
- Neon Postgres (`@neondatabase/serverless`)
- Ed25519 sign через Node native `crypto.sign('ed25519', ...)`
- Tailwind CSS
- bcrypt для пароля + HMAC cookie для session

## Local dev

```bash
pnpm install
pnpm dev
# → http://localhost:4000
```

`.env` уже создан с рабочими ключами (см. `.env.example` для формата).

**Дефолтный пароль:** `restos2026admin` — **поменяй сразу** через:

```bash
node -e "console.log(require('bcryptjs').hashSync('твой-новый-пароль', 10))"
# → bcrypt-hash, скопируй в .env / Vercel env как ADMIN_PASSWORD_HASH
```

## Deploy на Vercel

1. Repo уже push'нут в `https://github.com/beckortikov/restos-admin`.
2. Vercel → New Project → Import from GitHub → выбери `beckortikov/restos-admin`.
3. Framework Preset: **Next.js** (auto).
4. Environment Variables — добавь:

   | Key | Value |
   |---|---|
   | `ADMIN_PASSWORD_HASH` | bcrypt-hash твоего пароля |
   | `SESSION_SECRET` | random ≥32 байт (см. `.env` для текущего) |
   | `LICENSE_PRIVATE_KEY` | Ed25519 private (см. `.env`) |
   | `DATABASE_URL` | Neon connection string (см. `.env`) |

5. **Deploy.**

## Перегенерация Ed25519 keypair

Если нужно сменить keypair (compromise, ротация):

```bash
cd ../restos-v4/server && go run ./cmd/license-gen keypair
# → PUBLIC_KEY=... PRIVATE_KEY=...
```

- `PRIVATE_KEY` → `.env` тут + Vercel env vars.
- `PUBLIC_KEY` → restos-server бинарь через `LICENSE_PUBLIC_KEY` env (или вшить
  в `desktop/main.js` при build'е installer'а).

⚠️ После смены keypair все ранее выписанные токены **перестанут работать** —
клиенты должны заново активироваться. Делай только при компрометации.

## Neon schema

Применить один раз (уже сделано для текущего проекта):

```bash
psql "$DATABASE_URL" -f schema.sql
```

## Безопасность

- `LICENSE_PRIVATE_KEY` живёт ТОЛЬКО в `.env` и Vercel env, никогда не commit'ится.
- `ADMIN_PASSWORD_HASH` — bcrypt-hash, не plain password.
- `SESSION_SECRET` — random ≥32 байт, HMAC cookie sign.
- Все routes под `/api/issue-license` + `/api/licenses` проверяют session.
- Neon DATABASE_URL содержит пароль — `.gitignore` обязан исключать `.env`.
