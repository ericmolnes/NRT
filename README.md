# NRT Internal Tools

Internal tools platform for Nordic Rig Tech. Built with Next.js, shadcn/ui, and Microsoft Entra ID authentication.

## Getting Started

### Prerequisites

- Node.js 18+
- Microsoft Entra ID app registration (see Setup below)

### Setup

1. Clone the repository and install dependencies:

```bash
npm install
```

2. Copy the environment template and fill in your Azure AD credentials:

```bash
cp .env.example .env.local
```

3. Register an app in [Microsoft Entra admin center](https://entra.microsoft.com):
   - Name: "NRT Internal Tools"
   - Supported account types: Single tenant
   - Redirect URI: `http://localhost:3000/api/auth/callback/microsoft-entra-id`
   - Copy Client ID, Tenant ID, and create a Client Secret

4. Generate an auth secret:

```bash
npx auth secret
```

5. Fill in `.env.local` with your credentials.

6. Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Adding New Tools

1. Create a new route folder: `src/app/(authenticated)/tools/<tool-name>/page.tsx`
2. Register the tool in `src/lib/tools-registry.ts`
3. The sidebar and dashboard update automatically

## Tech Stack

- **Framework**: Next.js (App Router) + TypeScript
- **UI**: shadcn/ui + Tailwind CSS
- **Auth**: Auth.js v5 with Microsoft Entra ID
- **Deployment**: Vercel
