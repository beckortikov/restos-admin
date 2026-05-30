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

## Setup

```bash
pnpm install

# 1. Сгенерируй keypair (один раз, из restos-v4):
cd ../restos-v4/server && go run ./cmd/license-gen keypair
# → PUBLIC_KEY=... PRIVATE_KEY=...
# PUBLIC_KEY → restos-server бинарь (LICENSE_PUBLIC_KEY env)
# PRIVATE_KEY → этот .env

# 2. Создай Supabase project + примени schema:
psql $SUPABASE_DB_URL < supabase-schema.sql
# Или: открой supabase.com → SQL Editor → вставь содержимое supabase-schema.sql

# 3. Скопируй .env.example → .env, заполни значения

# 4. Запусти dev:
pnpm dev
# → http://localhost:4000

# 5. Сгенерируй bcrypt-hash для ADMIN_PASSWORD_HASH:
node -e "console.log(require('bcryptjs').hashSync('your-password', 10))"
```

## Deploy на Vercel

1. Push в GitHub repo `restos-admin`.
2. Vercel → New Project → Import from GitHub.
3. Settings → Environment Variables → добавь все из `.env.example`.
4. Deploy.

## Безопасность

- `LICENSE_PRIVATE_KEY` живёт ТОЛЬКО в Vercel env, никогда не commit'ится.
- `ADMIN_PASSWORD_HASH` — bcrypt-hash, не plain password.
- `SESSION_SECRET` — random ≥32 байт, используется для HMAC cookie.
- Все routes под `/api/issue-license` + `/api/licenses` проверяют session.
- Supabase Service Role key — server-side only, никогда не уходит в client bundle.
