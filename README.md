# ConfirmRoute

Travel agency booking management MVP — supplier document intake, local rule-based text extraction, human review, exception handling, and approval.

ConfirmRoute helps travel agency teams process booking confirmations, review booking details, track exceptions, and keep approval decisions auditable.

**This is currently a portfolio project. Seed data is fictional. PDF extraction uses local JavaScript rules, not AI, and must be reviewed by an operator.**

## What it does

1. **Document intake** — Upload a PDF confirmation or run a predefined sample scenario
2. **Local extraction** — PDF.js reads selectable PDF text in the browser; deterministic JavaScript rules identify common booking fields and show source text for each match
3. **Human review** — Inspect extracted fields, resolve exceptions, add missing information
4. **Exception handling** — Missing fields, changed values, duplicate references all block approval until resolved
5. **Approval** — Explicit human verification step; bookings are never auto-approved

## Extraction disclosure

- Predefined scenarios return **fixed demo data**, not the result of AI parsing
- Uploaded text-based PDFs are parsed locally with label matching and conservative heuristics; unsupported labels/layouts can produce missing or incorrect fields
- Scanned PDFs are not OCR'd yet and must be entered manually
- All seed bookings, customers, suppliers, and documents are **fictional**
- The UI distinguishes local text parsing from simulated scenarios and does not describe the parser as AI

## Tech stack

- **Framework**: Next.js 16.4 (App Router, Turbopack, Partial Prerendering)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS v4 (CSS-first theming, oklch tokens)
- **Components**: shadcn/ui (nova preset, radix primitives)
- **Icons**: Lucide React
- **Forms**: React Hook Form + Zod v4 (with preprocess for nullable fields)
- **PDF**: pdfjs-dist (client-side text extraction) plus a local JavaScript rule-based booking parser
- **Persistence/authentication**: File-backed fictional demo mode, or Supabase PostgreSQL + Auth with organization-scoped access
- **Email**: Optional Resend notifications for intake, approvals, and exception resolution
- **Testing**: Vitest + React Testing Library
- **Deployment**: Vercel

## Project structure

```
src/
├── app/                    # Next.js App Router
│   └── (dashboard)/        # Authenticated routes
│       ├── dashboard/      # Metrics, recent bookings, activity
│       ├── bookings/       # List, detail, create, edit
│       ├── exceptions/     # Exception queue
│       ├── intake/         # Document upload + scenarios
│       └── settings/       # Workspace notification preferences
├── components/
│   ├── bookings/           # Booking-specific UI
│   ├── dashboard/          # Dashboard widgets
│   ├── exceptions/         # Exception list
│   ├── intake/             # Intake UI
│   ├── layout/             # Shell, nav, banners
│   └── ui/                 # shadcn primitives
├── features/
│   ├── bookings/           # Business logic, actions, service
│   ├── extraction/         # Local parser, sample provider, types
│   └── settings/           # Workspace settings actions
├── lib/
│   ├── data/               # Store abstraction, queries, demo and Supabase stores
│   ├── email/              # Optional server-side notification delivery
│   ├── validation/         # Zod schemas
│   ├── config.ts           # Environment checks
│   ├── format.ts           # Date, money, bytes formatters
│   └── utils.ts            # cn helper
└── types/
    └── domain.ts           # Core domain types
```

## Getting started

### Prerequisites

- Node.js 20+ (tested on 24.18.0)
- npm 10+ or pnpm 9+

### Install

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The app runs in **demo mode** by default (fictional data, file-backed persistence).

### Supabase authentication and persistence (optional)

To enable multi-user workspaces:

1. Create a Supabase project
2. Run `supabase/migrations/0001_init.sql`, then `supabase/migrations/0002_auth_multitenancy.sql` in order. The second migration provisions a workspace for each confirmed new user, applies organization-scoped RLS, and configures private PDF storage.
3. Enable email confirmations in Supabase Auth and allow the app callback URL (`/auth/callback`) in the Supabase redirect URL settings.
4. Set environment variables:

```bash
SUPABASE_URL=your-project-url
SUPABASE_ANON_KEY=your-anon-key
APP_URL=https://your-app.example.com
```

5. Restart the app and create a workspace through `/signup`. The first user is the workspace administrator. The Settings page controls the workspace notification recipient.

Supabase mode requires a live project and both migrations; database policies, signup confirmation, private storage, and tenant isolation must be verified in that project before production use. Do not run the fixed demo `supabase/seed.sql` against multi-tenant workspaces. Team invitations and role-management UI are not implemented.

### Optional email alerts

Set `RESEND_API_KEY` and `TRIPOPS_EMAIL_FROM` to enable delivery through Resend. Workspace admins set the recipient in **Settings**. If the provider or recipient is not configured, the booking workflow still succeeds and the UI reports that no email was sent. Delivery failures are surfaced separately from the saved booking action.

### Audit export

Use **Export audit CSV** on the bookings page to download booking changes and exception records/resolutions for the signed-in workspace. The export is scoped by Supabase RLS and protects spreadsheet formula-like values.

### Seed data

Demo mode seeds automatically on first run with 12 fictional bookings, plus open/resolved exceptions and change history. Representative records include:

- **MVR-1038** — Hotel booking pending review (PKR 82,000)
- **HGD-2091** — Missing end date (exception blocks approval)
- **MVR-1025** — Changed price amendment (PKR 75,000 → 82,000)
- **TRS-5510** — Duplicate reference warning

### Reset demo data

Click the **Reset demo data** button in the sidebar footer (demo mode only). This restores the seed state.

## Testing

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
```

Coverage includes the local PDF parser, mock provider determinism, intake scenarios, amendment/change history, and booking validation. Run `npm test` for the current suite.

## Build

```bash
npm run build
```

Production build generates static + partial-prerendered pages. Demo mode warning about dynamic filesystem access is expected (file-backed JSON store).

## Deploy

### Vercel

```bash
vercel
```

Or connect the GitHub repository to Vercel for automatic deployments.

### Environment variables for production

```bash
SUPABASE_URL=
SUPABASE_ANON_KEY=
APP_URL=https://your-app.example.com
RESEND_API_KEY=       # Optional
TRIPOPS_EMAIL_FROM=   # Optional, verified sender address
TRIPOPS_ACTOR_NAME=  # Optional: override "Demo operator"
MAX_UPLOAD_MB=5       # Optional: default PDF upload limit
```

## Sample scenarios

The intake page includes 4 predefined scenarios:

| Scenario | Description | Expected behavior |
|----------|-------------|-------------------|
| **Clean hotel booking** | Complete Mountain View Resort confirmation (PKR 88,000) | All fields populated, can be approved |
| **Missing information** | SkyWing Airlines confirmation without cost | Missing amount highlighted, approval blocked |
| **Changed price** | Amended MVR-1025 confirmation (PKR 75,000 → 82,000) | Value change exception, accept/keep options |
| **Duplicate reference** | SkyWing confirmation matching SWA-8842 | Duplicate reference warning, needs review |

## Business rules

- **Amendment detection**: Same normalized reference + same normalized customer name → amendment (value_change exception)
- **Duplicate detection**: Same reference + different customer → new booking with duplicate_reference exception
- **Approval gating**: Missing required fields + date order + open exceptions all block approval
- **Exception auto-sync**: Exceptions update automatically when booking fields change
- **Value change resolution**: Requires explicit human accept; previous value preserved in change history
- **No auto-approval**: Bookings are never auto-approved; explicit human verification required

## Troubleshooting

### "Next.js encountered uncached data during prerendering"

Next.js 16.4 instant navigation validation requires `loading.tsx` in the page's own segment folder, not a route group. If you see this error, ensure `loading.tsx` is at `src/app/(dashboard)/<page>/loading.tsx`, not `src/app/(dashboard)/loading.tsx`.

### "usePathname() in a Client Component outside of <Suspense>"

Dynamic-param routes (e.g., `/bookings/[id]`) require client components using `usePathname()` to be wrapped in `<Suspense>`. The app shell nav is already wrapped.

### Demo data not persisting

Demo mode stores data in `.demo-data/db.json` in the project root. This file is gitignored. If you reset demo data, the file is overwritten with seed data.

### Build warning: "Dynamic filesystem access causes tracing"

Expected in demo mode. The demo store uses `process.cwd()` to locate `.demo-data/db.json`. This warning does not affect functionality.

## License

MIT — portfolio project, not for production use.
