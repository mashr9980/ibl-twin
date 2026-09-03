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
| Sidebar shell, profile menu, footer, page titles, dark-mode-safe tokens | ✓ |
| AI Avatar gallery (grouped by character, paginated), voices, generate modal | ✓ |
| HeyGen video generation end to end (avatar, clip, photo-avatar upload + train) | ✓ real render produced |
| My Videos with live status polling, stalled-render cutoff, player, share | ✓ |
| Account → Management (Users / Roles / Policies), **Invite** wired to platform invitations | ✓ invite accepted end to end |
| Notifications inbox; admin-only Alerts + composer gated by tenant RBAC | ✓ |
| FAQ, Privacy, Terms, `/videos/generate` | ✓ |

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

## Test

```bash
pnpm typecheck
pnpm vitest run                                  # 23 unit tests (config, HeyGen credential parsing, RBAC fallback)
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
