# Memorare Twin

A replica of [twin.memorare.ai](https://twin.memorare.ai), built on
[`iblai/vibe`](https://github.com/iblai/vibe) as a frontend for an ibl.ai
tenant, following the structure of [`iblai/os`](https://github.com/iblai/os).

Live at **https://ibl.vault-mind.com**, on desktop and mobile.

Built for the ibl.ai engineering assessment. The brief was to reproduce twin
on the ibl.ai SDK; where twin needed something the SDK does not ship, the
feature is implemented here and noted below.

## What is included

| Area | Notes |
|---|---|
| Sign in | ibl.ai Auth SPA, tenant resolution, cross-app session sync |
| Access | Free sign-up, a monthly free video allowance, Stripe upgrade for unlimited |
| Avatar | Catalogue grouped by character, grid and list views, category chips, voices |
| Generation | HeyGen avatar, video clip, and photo-avatar upload and training, through a server proxy |
| My Videos | Live status polling, player, share dialog |
| Settings | Account, Preferences, Personalization (profile survey, memory, brand glossary), Plan and Billing |
| Management | Users, roles and policies; invitations through the platform API |
| Notifications | Inbox for everyone; alerts and composer for admins only, gated by tenant RBAC |
| Static | FAQ, Privacy, Terms |

## How access works

Membership of the tenant is the entitlement. The platform's self-join switch
decides how someone gets it:

- **Switch open (current):** anyone who signs in becomes a member. Each member
  gets `FREE_VIDEOS_PER_MONTH` generations a month (default 3), counted by the
  HeyGen proxy before a request reaches HeyGen. Past that, the app offers an
  upgrade to unlimited on the tenant's own Stripe account. Admins are unlimited.
- **Switch closed:** a signed-in non-member is sent to `/join`, which hands off
  to Stripe Checkout; on return the server verifies the session and links them
  as a member. Nobody is charged twice: the platform ledger and Stripe are both
  checked before a checkout is created.

The owner publishes the plan on **Account → Access & payments**. The Stripe
key is saved from the browser to the platform through the SDK; this app's
server never sees it.

Server credentials, in `.env.local`: `IBLAI_API_KEY` (a Platform API Token for
the tenant) and `HEYGEN_API_KEY`. Neither is ever exposed with `NEXT_PUBLIC_`.

## Design notes

- **HeyGen behind a proxy.** `app/api/heygen/[...path]/route.ts` holds the key.
  The platform returns stored credentials masked, so masked values are rejected
  and the UI shows a clear "integration required" state instead of a 401.
- **Catalogue trim.** HeyGen's avatar list is about 3.9 MB. The proxy keeps the
  fields the gallery uses and caches per key: 272 KB cold, about 1.5 s warm.
- **RBAC fails closed.** vibe's admin surfaces default `enableRbac` to `false`,
  which lets every member see them. Here the tenant's permissions are loaded
  into the SDK's RBAC store and an empty map denies.
- **Tenant stored the SDK's way.** The SDK's cross-app sync compares its own
  cookie with local storage and redirects on a mismatch. The tenant is stored
  in the SDK's shape and mirrored to its cookies, which removed a redirect loop
  for new accounts.
- **Server-side stores.** Per-member usage and library data live in JSON files
  under `.data/` because the platform has no equivalent yet. Flagged to ibl.ai.

## Run

```bash
cp .env.example .env.local
cp iblai.env.example iblai.env
pnpm install
pnpm dev
```

## Test

```bash
pnpm typecheck
pnpm test        # 122 unit tests
pnpm test:e2e    # Playwright, against a real session in playwright/.auth (gitignored)
```

## Deploy

Built locally and shipped as a `.next` tarball to a small EC2 instance running
`ibl-twin.service` behind nginx and Let's Encrypt (`deploy/nginx.conf`). The
instance is too small to run `next build` itself.

## Desktop and mobile

`src-tauri/` wraps the deployed site, so SSO and generation behave exactly as
on the web. Built and verified on macOS and the iOS simulator.

```bash
pnpm tauri build --bundles app dmg
pnpm tauri ios dev
```

## Known upstream issues in `@iblai/iblai-js`

- Inbox previews strip notification HTML but keep email footer text.
- The composer registers tiptap's `link` and `underline` twice.
- The composer dialog has no `DialogTitle`, which raises an a11y warning.
- Opening a notification does not always mark it read.

## Author

Muhammad Aashir Tariq
