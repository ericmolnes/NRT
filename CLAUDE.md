# CLAUDE.md - NRT Internal Tools

## Overview

NRT Internal Tools is a Next.js enterprise platform for Nordic Rig Tech. It manages personnel, evaluations, estimating, quality control (ISO 9001), and integrations with PowerOffice and Recman. The UI is in Norwegian.

## Quick Reference

```bash
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build
npm run lint         # ESLint
npm run db:seed      # Seed database (uses .env.local)
npx prisma migrate dev --name <name>  # Create migration
npx tsx scripts/<name>.ts             # Run utility scripts
```

## Tech Stack

- **Framework**: Next.js 16 (App Router), React 19, TypeScript (strict mode)
- **Database**: PostgreSQL (Neon) via Prisma ORM 7.x
- **Auth**: NextAuth.js v5 beta with Microsoft Entra ID (Azure AD)
- **UI**: shadcn/ui (base-nova style), Tailwind CSS 4, Lucide icons
- **Validation**: Zod 4
- **AI**: Anthropic Claude SDK for document parsing
- **Deployment**: Vercel with cron jobs

## Project Structure

```
src/
  app/
    (authenticated)/   # Protected routes requiring login
    (public)/          # Public routes (login, shared forms)
    api/               # API route handlers
  components/
    ui/                # shadcn/ui base components
    layout/            # Sidebar, header
    personell/         # Personnel management
    evaluering/        # Evaluations
    estimering/        # Estimating
    jobber/            # Job management
    dokumenter/        # Document control
    leverandorer/      # Supplier management
    poweroffice/       # PowerOffice integration
    recman/            # Recman integration
  lib/
    auth.ts            # NextAuth setup
    auth.config.ts     # NextAuth config
    db.ts              # Prisma client singleton
    rbac.ts            # Role-based access control
    utils.ts           # Core utilities (cn, getInitials, etc.)
    tools-registry.ts  # Navigation tool definitions
    queries/           # Database query functions per domain
    validations/       # Zod schemas per domain
    ai/                # Claude API integration
    poweroffice/       # PowerOffice API wrapper
    recman/            # Recman API wrapper
    microsoft-graph/   # Azure AD graph queries
  hooks/               # Custom React hooks
  types/               # TypeScript type augmentations
  generated/prisma/    # Generated Prisma client (do not edit)
prisma/
  schema.prisma        # Database schema
  migrations/          # Migration history
  seed.ts              # Database seed script
scripts/               # Utility & maintenance scripts
```

## Key Conventions

### Path Alias
All imports use `@/*` which maps to `./src/*`.

### File Naming
- Components: `PascalCase.tsx`
- Utilities/modules: `kebab-case.ts`
- API routes: `route.ts` in feature directories

### Adding a New Feature
1. Zod schema in `src/lib/validations/<domain>.ts`
2. Query functions in `src/lib/queries/<domain>.ts`
3. API route in `src/app/api/<domain>/route.ts`
4. Components in `src/components/<domain>/`
5. Page in `src/app/(authenticated)/<domain>/page.tsx`
6. Register in `src/lib/tools-registry.ts` for sidebar navigation

### Component Patterns
- Default to **Server Components** (App Router default)
- Add `"use client"` only when needed (hooks, event handlers, browser APIs)
- Use `cn()` from `@/lib/utils` for conditional class merging
- Use shadcn/ui components from `@/components/ui/`

### API Route Pattern
```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });
  }
  // ... handler logic
}
```

### Authentication & Authorization
- Auth enforced via middleware for all `(authenticated)` routes
- Public routes: `/login`, `/s/*` (shareable forms)
- Admin check: `isAdmin()` / `assertAdmin()` from `@/lib/rbac`
- Admins identified by `ADMIN_EMAILS` env or `ADMIN_GROUP_ID` Azure AD group

### Database
- IDs: `cuid()` primary keys
- Timestamps: `createdAt` (default now), `updatedAt` (@updatedAt)
- Prisma client generated to `src/generated/prisma/` (postinstall hook)
- After schema changes: `npx prisma migrate dev --name <descriptive_name>`

### Validation
- Zod schemas in `src/lib/validations/`
- Use `z.infer<typeof schema>` for TypeScript types
- Error messages in Norwegian

### Form Handling
- Prefer Server Actions for form submissions
- Use `getFormString()` / `getFormStringOptional()` from `@/lib/utils` for FormData extraction

## Security

- Middleware sets security headers (CSP, HSTS, X-Frame-Options, etc.)
- JWT sessions via NextAuth
- Cron endpoint (`/api/cron/sync`) protected with `CRON_SECRET`
- Form auth uses `crypto.scryptSync` for password hashing
- Never commit `.env.local`, `.mcp.json`, or credentials

## Environment Variables

Required in `.env.local` (see `.env.example`):
- `AUTH_SECRET` - NextAuth secret
- `AUTH_MICROSOFT_ENTRA_ID_ID/SECRET/ISSUER` - Azure AD app registration
- `DATABASE_URL` - Neon PostgreSQL connection string
- `ADMIN_EMAILS` - Comma-separated admin email addresses
- `ANTHROPIC_API_KEY` - Claude API key (for document parsing)
- `POWEROFFICE_*` - PowerOffice integration credentials
- `RECMAN_*` - Recman API credentials
- `CRON_SECRET` - Secret for cron endpoint verification

## Deployment

- Deployed on **Vercel**
- Cron: `/api/cron/sync` runs daily at 06:00 UTC (configured in `vercel.json`)
- `postinstall` script runs `prisma generate` automatically
- `next.config.ts` sets 50MB server action body limit for file uploads

## No Test Framework

There is currently no test runner (Jest/Vitest) configured. Validation is done through:
- `npm run lint` for static analysis
- `npm run build` for type checking
- Utility scripts in `scripts/` for data verification
