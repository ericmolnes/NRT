# @nrt/internal-tools

Interne verktøy for Nordic Rig Tech. Next.js 16 + Prisma + Neon (serverless Postgres).

## Utvikling
```bash
pnpm dev                    # Start dev-server
pnpm build                  # Produksjonsbygg
pnpm db:seed                # Seed database
npx prisma studio           # Database GUI
npx prisma migrate dev      # Kjør migrasjoner
```

## Stack
- **Next.js 16** med App Router
- **Prisma 7** med Neon serverless adapter
- **NextAuth v5** (beta) for autentisering
- **Tailwind CSS 4** + shadcn/ui
- **Vercel** for deploy

## Viktig
- Prisma-schema i `prisma/schema.prisma`, config i `prisma.config.ts`
- Env-variabler i `.env.local` (ikke `.env`)
- `postinstall` kjører `prisma generate` automatisk
