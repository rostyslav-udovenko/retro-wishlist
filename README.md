# Retro Wishlist

[![Live Website](https://img.shields.io/badge/Live-retro--wishlist.pages.dev-7c3aed?logo=cloudflarepages&logoColor=white)](https://retro-wishlist.pages.dev/)
![GitHub License](https://img.shields.io/github/license/rostyslav-udovenko/retro-wishlist)
[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-FE5196?logo=conventionalcommits&logoColor=white)](https://www.conventionalcommits.org/)
![GitHub commit activity](https://img.shields.io/github/commit-activity/m/rostyslav-udovenko/retro-wishlist)
[![Supabase Health Check](https://github.com/rostyslav-udovenko/retro-wishlist/actions/workflows/supabase-health-check.yml/badge.svg)](https://github.com/rostyslav-udovenko/retro-wishlist/actions/workflows/supabase-health-check.yml)

A colorful retro desktop birthday wishlist for choosing gifts without duplicates or unnecessary coordination.

Visitors can browse public wishlists, open an unlisted wishlist through its exact URL, reserve an available gift, and later release their own reservation. Active browser sessions stay synchronized through Supabase Realtime.

**Live application:** [retro-wishlist.pages.dev](https://retro-wishlist.pages.dev/)

## How It Works

Each wishlist has its own route:

```text
/w/rostyslav
/w/example-unlisted-slug
```

A visitor can:

- Browse featured public wishlists from the homepage
- Open a public or unlisted wishlist
- Review available and reserved gifts
- Reserve an available gift without creating an account
- Release a reservation from the same browser
- Receive live updates when another visitor reserves or releases a gift
- Follow optional product links and view emoji or remote gift images

Reservation names and ownership tokens remain private. Public clients only receive whether a gift is available or reserved.

## Features

- **Colorful Retro Interface:** Responsive desktop-inspired interface with bright neobrutalist details
- **Wishlist Directory:** Featured public wishlists are available from the homepage
- **Public and Unlisted Lists:** Unlisted wishlists are available only through their exact URL
- **Gift Reservations:** Visitors can reserve gifts without creating an account
- **Reservation Ownership:** Only the browser that created a reservation can release it
- **Duplicate Protection:** Atomic conditional updates prevent simultaneous reservations
- **Realtime Updates:** Reservation changes are broadcast between active browser sessions
- **Recovery Refreshes:** Data refreshes after Realtime connection, window focus, and visibility changes
- **Optimistic Interface:** Successful reserve and release operations update the local interface immediately
- **Wishlist Prefetch:** Directory interactions preload wishlist data before navigation
- **In-memory Cache:** Previously loaded wishlists and the public directory render immediately while data revalidates in the background
- **Gift Media:** Gifts support emoji and direct image URLs with a fallback state
- **Product Links:** Gifts can include an optional external store URL
- **Management Tools:** Private JSON definitions can be validated, imported, exported, and synchronized
- **Atomic Synchronization:** Wishlist and gift changes are applied through dedicated PostgreSQL functions
- **Availability Monitoring:** A scheduled GitHub Actions workflow checks the public Supabase API
- **Backup Procedure:** Supabase roles, schema, and data can be exported with the included script
- **Cloudflare Deployment:** The frontend is deployed through Cloudflare Pages

## Technology

- **Frontend:** React, TypeScript, Vite
- **Routing:** React Router
- **Backend:** Supabase
- **Database:** PostgreSQL
- **Live Updates:** Supabase Realtime Broadcast
- **Hosting:** Cloudflare Pages
- **Automation:** GitHub Actions
- **Definition Validation:** Zod
- **Management Runtime:** Node.js with TSX

## Application Routes

```text
/                    Public wishlist directory
/w/:slug             Public or unlisted wishlist
/*                    Not-found page
```

Featured public wishlists appear in the directory.

Unlisted wishlists do not appear in the directory and can be opened only through their exact URL.

## Reservation Model

Each browser receives a private visitor token stored locally.

When a gift is reserved:

1. The visitor enters a name.
2. The browser sends the name and visitor token to a dedicated Supabase RPC.
3. A conditional PostgreSQL update succeeds only if the gift is still available.
4. The browser records local ownership of the reservation.
5. The interface updates immediately.
6. Other active visitors receive a Realtime notification and reload canonical data.

A reservation can be released only when the supplied visitor token matches the token stored with that reservation.

Public wishlist responses do not expose:

- Reservation names
- Reservation tokens
- Reservation timestamps
- Private browser ownership information

Other visitors receive only the public reservation state:

```text
Available
Reserved
```

## Performance Model

Wishlist and directory data are cached in application memory.

The cache provides:

- Immediate rendering of recently visited wishlists
- Immediate return to the public directory
- Background revalidation against Supabase
- Request deduplication for overlapping prefetch, navigation, focus, and Realtime refreshes
- Optimistic reservation updates

Wishlist prefetch starts when a directory card receives pointer interaction, keyboard focus, or touch interaction.

The cache is not persisted across a full browser reload. This avoids retaining potentially stale reservation state between browser sessions.

## Gift Images and Product Links

The `image` field supports either an emoji or a direct image URL.

Emoji example:

```json
{
  "image": "⌨️"
}
```

Image URL example:

```json
{
  "image": "https://example.com/images/keyboard.webp"
}
```

If an external image cannot be loaded, the interface displays a gift fallback icon.

An optional HTTPS product URL can be provided through `storeUrl`:

```json
{
  "storeUrl": "https://example.com/products/keyboard"
}
```

External product links open in a separate browser tab.

## Getting Started

### Prerequisites

- Node.js
- npm
- A Supabase project

Docker is additionally required for logical database backups.

### Installation

Clone the repository:

```bash
git clone https://github.com/rostyslav-udovenko/retro-wishlist.git
cd retro-wishlist
```

Install dependencies:

```bash
npm install
```

Create the frontend environment file from the repository example if one is available, or create `.env.local` manually:

```dotenv
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your-key
```

Start the development server:

```bash
npm run dev
```

The application is available at the local URL printed by Vite.

## Development Commands

```bash
npm run dev
npm run lint
npm run build
npm run preview
```

Management commands:

```bash
npm run wishlist:validate -- <file>
npm run wishlist:preflight -- <file>
npm run wishlist:import -- <file>
npm run wishlist:import -- <file> --confirm
npm run wishlist:export -- <slug>
npm run wishlist:export -- <slug> --output <file>
npm run wishlist:sync -- <file>
npm run wishlist:sync -- <file> --confirm
npm run supabase:backup
```

Before committing changes, run:

```bash
npm run lint
npm run build
git diff --check
git status
```

## Wishlist Management

Wishlist administration uses private JSON definitions and dedicated management-only PostgreSQL functions.

The workflow supports:

- Runtime validation with Zod
- Read-only import preflight
- Duplicate slug protection
- Atomic wishlist import
- Safe definition export
- Read-only synchronization preview
- Atomic synchronization
- Gift addition, content updates, reordering, hiding, and restoration
- Reservation protection during synchronization

### Configure Management Credentials

Create the local environment file:

```bash
cp .env.wishlist-management.example .env.wishlist-management
```

Configure the project URL and **secret** server-side key:

```dotenv
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SECRET_KEY=sb_secret_your-secret-key
```

The secret key is used only by local Node.js management scripts.

The secret key must never be:

- Prefixed with `VITE_`
- Added to `.env.local`
- Exposed through frontend code
- Added to Cloudflare Pages frontend variables
- Committed to Git
- Included in logs, screenshots, issues, or pull requests

Verify that Git ignores the local management file:

```bash
git check-ignore -v .env.wishlist-management
```

### Create a Private Definition

Copy the synthetic example:

```bash
cp \
  wishlists/examples/example-wishlist.json \
  wishlists/private/new-wishlist.json
```

Edit only the private copy. Files under `wishlists/private/` are excluded from Git except for `.gitkeep`.

### Definition Format

A definition contains wishlist metadata and all managed gifts:

```json
{
  "slug": "sample-birthday-list",
  "title": "Sample Birthday Wishlist",
  "ownerName": "Sample Person",
  "description": "A synthetic example wishlist.",
  "icon": "🎂",
  "visibility": "unlisted",
  "isFeatured": false,
  "isActive": true,
  "displayOrder": 100,
  "gifts": [
    {
      "key": "mechanical-keyboard",
      "name": "Mechanical Keyboard",
      "description": "A compact wireless keyboard.",
      "price": "Around €100",
      "image": "⌨️",
      "storeUrl": null,
      "accent": "blue",
      "displayOrder": 10,
      "isVisible": true
    }
  ]
}
```

Gift keys are stable identifiers used to synchronize records safely.

### Validate a Definition

```bash
npm run wishlist:validate -- \
  wishlists/private/new-wishlist.json
```

Validation covers:

- Required fields and field types
- Slug and stable gift-key formats
- Supported visibility values
- Supported gift accents
- Field-length constraints
- HTTPS product URLs
- Duplicate gift keys
- Duplicate display orders
- Visible and hidden gift states
- Unknown properties

### Run an Import Preflight

```bash
npm run wishlist:preflight -- \
  wishlists/private/new-wishlist.json
```

The preflight validates the file, checks whether the slug already exists, prints the planned operation, and makes no database changes.

### Import a Wishlist

Check confirmation requirements without writing data:

```bash
npm run wishlist:import -- \
  wishlists/private/new-wishlist.json
```

Apply the atomic import:

```bash
npm run wishlist:import -- \
  wishlists/private/new-wishlist.json \
  --confirm
```

The wishlist and all gifts are created in one PostgreSQL operation. A failure rolls back the complete import.

### Export a Wishlist

Export to the default private directory:

```bash
npm run wishlist:export -- sample-birthday-list
```

Export to a custom location:

```bash
npm run wishlist:export -- \
  sample-birthday-list \
  --output /tmp/sample-birthday-list.json
```

Exports exclude reservation names, tokens, timestamps, database identifiers, and audit timestamps.

### Synchronize a Wishlist

Preview changes without modifying the database:

```bash
npm run wishlist:sync -- \
  wishlists/private/sample-birthday-list.json
```

Apply the complete plan atomically:

```bash
npm run wishlist:sync -- \
  wishlists/private/sample-birthday-list.json \
  --confirm
```

Synchronization supports:

```text
ADD
UPDATE
REORDER
HIDE
RESTORE
UNCHANGED
```

Synchronization preserves `reserved_by`, `reservation_token`, and `reserved_at`.

A reserved gift can be renamed, reordered, or have its product information updated. A reserved gift cannot be hidden or removed from the definition until the reservation is released.

## Supabase Migrations

Database changes are stored in:

```text
supabase/migrations/
```

Preview pending migrations:

```bash
npx supabase db push --dry-run
```

Apply migrations:

```bash
npx supabase db push
```

Verify local and remote migration history:

```bash
npx supabase migration list
```

The Supabase CLI access token used for migrations is separate from the application publishable key and the management secret key.

## Supabase Backup and Restore

Run a logical backup after configuring `SUPABASE_DB_URL` for the current shell:

```bash
npm run supabase:backup
```

Each completed backup contains:

```text
backups/<timestamp>/
├── roles.sql
├── schema.sql
├── data.sql
├── SHA256SUMS
└── metadata.txt
```

Generated backups are confidential and excluded from Git.

The backup procedure supports direct, Session pooler, and Transaction pooler connections. IPv4-only environments such as some GitHub Codespaces may require a Supavisor pooler connection. Database passwords containing reserved URL characters must be URL-encoded.

Before destructive schema changes, create and verify a fresh backup.

For connection setup, password handling, checksum verification, encrypted off-site storage, restoration, and troubleshooting, see [Supabase Backup and Restore](docs/BACKUP_RESTORE.md).

## Availability Monitoring

The repository includes a scheduled GitHub Actions workflow:

```text
.github/workflows/supabase-health-check.yml
```

The workflow:

- Runs automatically on a schedule
- Supports manual execution through `workflow_dispatch`
- Calls a minimal read-only public Supabase RPC
- Uses the project URL and publishable key from GitHub Actions secrets
- Validates the HTTP response and JSON structure
- Does not query reservation names, ownership tokens, or unlisted wishlist content

Required repository secrets:

```text
SUPABASE_URL
SUPABASE_PUBLISHABLE_KEY
```

The workflow does not require a Supabase secret key or database password.

## Deployment

The frontend is deployed through Cloudflare Pages:

[https://retro-wishlist.pages.dev/](https://retro-wishlist.pages.dev/)

Production configuration:

```text
Production branch: main
Framework preset: Vite
Build command: npm run build
Build output directory: dist
Root directory: /
```

Required Cloudflare Pages environment variables:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
```

The SPA fallback in `public/_redirects` allows direct requests and refreshes on routes such as `/w/rostyslav`.

Never add the following values to Cloudflare Pages frontend variables:

```text
SUPABASE_SECRET_KEY
SUPABASE_ACCESS_TOKEN
SUPABASE_SERVICE_ROLE_KEY
Database password
```

## File Structure

```text
retro-wishlist/
├── .github/
│   └── workflows/
│       └── supabase-health-check.yml
├── docs/
│   └── BACKUP_RESTORE.md
├── public/
│   └── _redirects
├── scripts/
│   ├── backup-supabase.sh
│   └── wishlist/
│       ├── definition.ts
│       ├── export.ts
│       ├── import.ts
│       ├── management-client.ts
│       ├── preflight.ts
│       ├── sync.ts
│       └── validate.ts
├── src/
│   ├── components/
│   ├── hooks/
│   ├── lib/
│   ├── pages/
│   ├── services/
│   ├── types/
│   ├── utils/
│   ├── App.css
│   ├── App.tsx
│   ├── index.css
│   └── main.tsx
├── supabase/
│   └── migrations/
├── wishlists/
│   ├── examples/
│   │   └── example-wishlist.json
│   └── private/
│       └── .gitkeep
├── .env.wishlist-management.example
├── .gitignore
├── LICENSE
├── package-lock.json
├── package.json
├── README.md
├── tsconfig.app.json
├── tsconfig.json
├── tsconfig.node.json
└── vite.config.ts
```

## Privacy and Security

- Reservation names are not returned by public wishlist APIs
- Reservation ownership tokens remain private
- Unlisted wishlists are absent from the public directory
- Atomic conditional updates prevent duplicate reservations
- Public clients use dedicated RPC functions instead of direct table access
- Management RPC functions are unavailable to `anon` and `authenticated` roles
- Management credentials are stored only in a local ignored environment file
- Supabase secret keys are never exposed through Vite
- Private wishlist definitions are excluded from Git
- Reservation data is excluded from wishlist exports
- Reserved gifts are protected from accidental hiding during synchronization
- Imports and synchronizations are atomic
- Database backups are excluded from Git and must be treated as confidential

## Development Workflow

Development uses short-lived feature branches and Conventional Commits.

Example branch names:

```text
feat/gift-reservations
fix/realtime-reservation-latency
perf/wishlist-prefetch-cache
docs/project-documentation
```

Example commit messages:

```text
feat: add gift reservations
fix: reduce reservation synchronization latency
perf: add wishlist prefetch and cache
docs: improve project documentation
```

Before submitting a pull request:

```bash
npm run lint
npm run build
git diff --check
```

Prefer squash-and-merge to keep the `main` branch history concise.

## Contributing

Contributions are welcome. Before opening an issue or pull request, review the existing repository activity to avoid duplicates.

Repository: [github.com/rostyslav-udovenko/retro-wishlist](https://github.com/rostyslav-udovenko/retro-wishlist)

## License

Licensed under the MIT License. See [LICENSE](LICENSE) for details.

---

Made with ❤️ by [Rostyslav Udovenko](mailto:rostyslav.udovenko@gmail.com)
