# Memorare Twin (replica)

A working replica of [twin.memorare.ai](https://twin.memorare.ai) built on
[`iblai/vibe`](https://github.com/iblai/vibe) and running as a frontend of an
ibl.ai tenant. Live at **https://ibl.vault-mind.com** (desktop and mobile).

Task: *"follow github.com/iblai/vibe and the example of github.com/iblai/os to
create a replica of twin.memorare.ai."* Where twin needed something vibe doesn't
ship, the interface stays unified and functional rather than pixel-copied.

## What works

| Area | Status |
|---|---|
| ibl.ai SSO (`login.iblai.app`), tenant resolution, cross-SPA session | ✓ |
| **Access & payments**: free plan (3 videos/month) for everyone who signs in, upgrade to unlimited on the tenant's own Stripe; admin form on `/account` | ✓ end to end in Chromium: sign up → free banner → allowance exhausted → 402 → upgrade (test card) → unlimited |
| Sidebar shell, profile menu, footer, page titles, dark-mode-safe tokens | ✓ |
| AI Avatar gallery (grouped by character, paginated), voices, generate modal | ✓ |
| HeyGen video generation end to end (avatar, clip, photo-avatar upload + train) | ✓ real render produced |
| My Videos with live status polling, stalled-render cutoff, player, share | ✓ |
| Account → Management (Users / Roles / Policies), **Invite** wired to platform invitations | ✓ invite accepted end to end |
| Notifications inbox; admin-only Alerts + composer gated by tenant RBAC | ✓ |
| FAQ, Privacy, Terms, `/videos/generate` | ✓ |

## Access & payments

**Current model (the CEO's "first users enjoy for free and later pay if they
want more"):** membership is free — the platform's self-join switch is open,
so anyone who signs in joins — and every member gets `FREE_VIDEOS_PER_MONTH`
(default 3) video generations a month. A member who wants more subscribes to
the plan below on the tenant's own Stripe and is unlimited; admins are
unlimited. The app's HeyGen proxy counts generations per user per UTC month
(`lib/usage-store.ts`, a JSON file at `USAGE_STORE_FILE`, default
`.data/usage.json`), refuses a free member past the allowance with 402
`free_limit` before anything reaches HeyGen, and counts a generation only once
HeyGen accepted it. A banner in the app shows "n of 3 free videos used" with
an Upgrade link; once used up it says so and offers the upgrade. Tiers come
from the platform: `admin` (member list), `plus` (a live subscription in the
payment ledger), else `free`. `GET /api/paywall/usage` reports the caller's
allowance.

With the self-join switch closed, the older model applies unchanged:
membership of the tenant is the entitlement, and **paying is the only way to
get it**; nobody is invited by the app. The workspace owner publishes one plan on
**Account → Access & payments** (admins only), either by picking a price that
already exists in the workspace's Stripe account (listed live; USD, one-off or
billed monthly) or by creating a one-time or monthly fee there. Publish tags the
Stripe product (`metadata.app = PAYWALL_APP_SLUG`), creates the price when
needed, closes self-join, and records the plan in the tenant's public metadata
under `apps.<slug>`. The app never archives a price the owner made in Stripe.
The form asks for the tenant's Stripe **secret or restricted** key (`sk_…` /
`rk_…`; a publishable `pk_…` key cannot create products or checkouts) and saves
it browser → platform through the SDK credential hooks. This app's server never
sees it.

There is no sign-in screen of ours. The flow is:

| Who | What happens |
|---|---|
| Signed-out visitor, any route | Straight to the ibl.ai Auth SPA (`login?app=custom&redirect-to=<origin>&tenant=<key>`): sign in, or create an account with a password / Google / Apple / Microsoft. It returns to `/sso-login-complete?data=…`, which stores the tokens and lands on the route they asked for. |
| Signed in, not a member (new account, or an account from another workspace) | The SDK's self-join attempt is refused; the providers send them to `/join`, which shows only a loader: one call to `/api/paywall/checkout` answers "already paid" (membership re-asserted, app opens) or a Stripe Checkout URL on the tenant's Stripe, and the browser goes there. Stripe returns to `/join?session_id=…` (a loader), the server verifies the session is theirs and paid, links them as a member (`POST /api/core/users/platforms/`) and they land in the app. Stripe's cancel link returns to `/join?canceled=1`, the one screen with a button. |
| Signed in, a member | Never sees a payment step. `/join` bounces them into the app. |
| Member whose subscription lapsed | Caught on a later visit (checked once a minute per session). Conservative on purpose: the membership ends only when the ledger says they paid, the platform's live check says no, the payment is older than a day, and Stripe itself reports the subscription as canceled, unpaid or expired. Anything ambiguous keeps the member in. |
| Payer whose browser lost the membership | Before minting a checkout the server checks the platform's ledger and Stripe itself (a live subscription or a paid session of this app for the customer); if either says they paid, the membership is re-asserted and the app opens. An automatic redirect can never charge anyone twice. |
| No plan published yet | Non-members see "the owner hasn't published a plan yet" on the paywall (admins get a link to publish one); admins see a banner in the app. |

Server routes (`app/api/paywall/*`): `prices` (public: the plan and whether the
server is ready), `checkout` (mints the Checkout Session for the signed-in
caller through the platform's Stripe proxy, as the platform), `access`
(verifies a return and links the buyer; or a member's standing),
`admin/prices` (the owner's active Stripe prices) and `admin/setup` (publishes
the plan), both forwarding the admin's own token so the platform decides who
may. No webhooks: the platform's paywall is verified polling by design.

**Why the tenant is stored the SDK's way.** The SDK's AuthProvider keeps an
`ibl_current_tenant` cookie and localStorage `current_tenant` in sync every two
seconds and treats a difference as "another ibl.ai app switched tenant",
redirecting to the Auth SPA. The Auth SPA writes `{"key":"main"}` for a user
who is not a member yet, so the first load after paying used to bounce app →
SPA → app. The providers therefore store the tenant as the SDK's JSON object,
mirror it to the cookies through the SDK's own `syncAuthToCookies` whenever
TenantProvider saves, and ignore a "switch to another tenant" request for a
session that is already a member here.

Credentials the server needs (`.env.local`): `IBLAI_API_KEY`, a Platform API
Token for this tenant (os.ibl.ai → Integrations → APIs → Add API, or
`POST /api/core/platform/api-tokens/` with the admin's session token). Until it
exists, `IBLAI_ADMIN_TOKEN` (an admin's `dm_token` from localStorage after
sign-in) is accepted for checkout, joining and the ledger, but it expires with
that session. Without either, the paywall says payments are not connected and
the routes answer 500 naming the keys.

## Architecture notes

**Backend-for-frontend for HeyGen.** The browser never sees a provider key.
`app/api/heygen/[...path]/route.ts` proxies to HeyGen, resolving the key from
`HEYGEN_API_KEY` first and the tenant's `heygen` credential second. The
platform returns credentials **masked** (`sk_***…`) to every caller including
admins, so masked values are rejected (`lib/heygen/credential.ts`) and the UI
shows an honest "integration required" gate instead of a 401.

**Catalogue trim.** HeyGen's `GET /v2/avatars` is ~3.9 MB: 1,264 avatars plus
~8,000 public talking photos nothing here renders. The proxy keeps the four
fields the gallery reads, drops the rest (`?include=talking_photos` opts back
in), and memoises the result per key for ten minutes. Cold: 272 KB instead of
3.8 MB; warm: ~1.5 s.

**RBAC gating is not `isAdmin`.** vibe's `NotificationDisplay` and `Account`
gate admin surfaces with
`checkRbacPermission(rbacPermissions, "/platforms/<key>/#can_send_notifications", enableRbac)`.
`enableRbac` defaults to `false`, which makes the helper return `true` for
everyone, so members see the Alerts tab and composer and hit 403s. The starter
(and `iblai/video`) leave it that way. Here `TenantProvider`'s
`onLoadPlatformPermissions` feeds web-utils' `rbacReducer`, and the pages pass
`enableRbac` + `rbacPermissions` (`hooks/use-rbac-permissions.ts`). An empty
map fails closed.

**Invite.** vibe's `Account` raises `onInviteClick` and leaves the flow to the
host; the starter stubs it `() => {}`. `components/twin/invite-dialog.tsx`
posts to `dm/api/catalog/invitations/platform/`.

**Console hygiene.** `compiler.removeConsole` only reaches first-party code;
SDK bundles still log tokens. `lib/twin/silence-console.ts` overrides
`console.log/debug/info/…` in production before any provider mounts.

**Why the UI differs from twin.memorare.ai.** twin is built from `iblai/video`,
which pins `@iblai/iblai-js@^1.27`. vibe's starter pins `^2.8`, and this repo
follows vibe (`2.8.2`). Shared components such as `NotificationDisplay` render
the v2 markup.

## Run

```bash
cp .env.example .env.local      # tenant key, platform URLs
cp iblai.env.example iblai.env  # platform config
pnpm install
pnpm dev
```

Server-side only (never `NEXT_PUBLIC_`): `HEYGEN_API_KEY`.

## Desktop and mobile

vibe covers desktop and mobile through Tauri, and the starter's auth helpers
already branch on it: `isTauri()`, `isTauriMobile()` and a custom-scheme
redirect so SSO returns into the app rather than a browser tab.

`src-tauri/` wraps the deployed site rather than bundling a static export,
because the app is server-rendered and the HeyGen proxy runs as a route
handler. SSO and video generation therefore behave identically to the web.

```bash
pnpm tauri build --bundles app dmg   # macOS .app and .dmg
pnpm tauri ios build --target aarch64-sim --debug
pnpm tauri ios dev                   # run on a simulator
```

Built and verified: macOS (Apple silicon) and the iOS simulator. iOS on a
device and Android need a paid Apple developer account and the Android SDK
respectively; vibe ships CI workflows for both.

## Test

```bash
pnpm typecheck
pnpm vitest run                                  # 105 unit tests (config, HeyGen, RBAC, paywall lib + routes, tenant, auth hand-off)
PW_ENV=.env.live PW_STORAGE=playwright/.auth/user-live.json pnpm exec playwright test -c e2e/playwright.config.ts
```

Playwright runs against a real session (`playwright/.auth/*.json`, gitignored).
Journeys: shell (sidebar, profile, footer), pages (every route renders, titles,
no console errors), links (no dead internal links).

## Deploy

Built locally, shipped as a `.next` tarball (excluding cache) to a t3.small
running `ibl-twin.service` on `127.0.0.1:3100` behind nginx + Let's Encrypt
(`deploy/nginx.conf`: gzip, security headers, `client_max_body_size 120m` for
photo-avatar uploads). Do not `next build` on the box; 2 GB is not enough.

## Known upstream issues (inside `@iblai/iblai-js`, not patched here)

- Inbox previews strip notification HTML and keep the email footer boilerplate.
- tiptap registers `link` and `underline` twice in the composer.
- The composer `DialogContent` has no `DialogTitle` (a11y warning).
- Opening a notification does not always mark it read.

## Author

Muhammad Aashir Tariq — built as the ibl.ai engineering assessment.
