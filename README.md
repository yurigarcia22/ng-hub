# NG Hub

Painel interno de campanhas Meta Ads — Grupo NG.

## Setup Local

```bash
npm install
cp .env.local.example .env.local   # preencher valores
npm run dev
```

Acesse: http://localhost:3000

## Stack

- **Framework:** Next.js (App Router)
- **Auth:** Supabase Auth
- **Banco:** Supabase (PostgreSQL)
- **UI:** Tailwind CSS + shadcn/ui
- **Ads API:** Meta Ads API v21.0
- **Deploy:** Vercel

## Estrutura

```
src/app/          # Rotas (App Router)
src/components/   # Componentes React
src/lib/          # Clients (Supabase, Meta)
src/types/        # TypeScript types
supabase/migrations/  # SQL migrations
docs/stories/     # Development stories
```

## Renovar Token Meta

O System User Token expira a cada 60 dias.
1. developers.facebook.com > Seu app > Ferramentas > Explorador da API Graph
2. Gere novo System User Token com: `ads_read`, `ads_management`
3. Atualize `META_SYSTEM_USER_TOKEN` no Vercel Environment Variables
