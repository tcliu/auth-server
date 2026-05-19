# Better Auth Server Execution Plan

## Objective

Create a standalone `auth-server` that:

- runs on Vercel
- uses Better Auth as the core auth framework
- stores users, sessions, accounts, verification data, and JWKS material in Postgres
- issues JWTs for downstream services such as `portfolio-manager`
- exposes enough customization points to support future apps, roles, metadata, and provider changes

## Recommended Architecture

### Deployment topology

- `auth-server`: dedicated Vercel project, for example `https://auth.example.com`
- `portfolio-manager`: separate Vercel project, for example `https://app.example.com`
- shared or separate Neon/Postgres instances depending on operational preference

Recommendation:

- use a separate Postgres database or schema for auth data
- keep auth tables isolated from portfolio storage tables
- use custom JWT claims instead of direct cross-database joins from `portfolio-manager`

### Authentication model

- Better Auth manages primary user/session state
- Better Auth session cookie remains the source of truth for browser session continuity
- Better Auth JWT plugin issues short-lived JWTs for downstream APIs
- downstream apps validate JWTs against the auth server JWKS endpoint

Why this model:

- web app sessions stay simple and standard
- API-bearing clients such as Capacitor or future mobile apps can still authenticate with bearer tokens
- downstream services stay decoupled from Better Auth internals

### Customization model

Design the auth server around explicit extension points from day one:

- `user.additionalFields`
- `session.additionalFields`
- `databaseHooks`
- custom JWT payload mapping
- provider registration in one auth config module
- app-aware trusted origins and callback URL policy
- optional internal admin endpoints for provisioning, user lookup, and health checks

Recommendation:

- avoid hard-coding `portfolio-manager` names into core auth tables or JWT claims
- namespace app-specific claims under an `apps` object or similarly scoped shape

Example JWT payload shape:

```json
{
  "sub": "user_123",
  "email": "user@example.com",
  "name": "Example User",
  "preferred_username": "example",
  "apps": {
    "portfolio-manager": {
      "roles": ["user"]
    }
  }
}
```

## Tech Stack

## Runtime and framework

- SvelteKit with `@sveltejs/adapter-vercel`
- Node runtime on Vercel
- TypeScript

Why SvelteKit:

- Better Auth has first-class SvelteKit integration
- easy server routes and hooks
- simple local development story

## Core dependencies

- `better-auth`
- `@sveltejs/kit`
- `@sveltejs/adapter-vercel`
- Postgres driver supported by Better Auth
- `jose` for optional local JWT verification tests and tooling
- optional email provider SDK for password reset and verification mail

## Better Auth plugins

Start with:

- email/password
- username plugin
- JWT plugin

Add later only if needed:

- social providers
- two-factor
- admin
- organization or access-control related plugins

## Phase Plan

## Phase 1: Bootstrap the service

Deliverables:

- SvelteKit app scaffolded in `auth-server`
- Vercel adapter configured
- local dev scripts working
- `.env.example` committed

Tasks:

1. Initialize a new Node package in `auth-server`.
2. Install SvelteKit, adapter-vercel, Better Auth, and TypeScript dependencies.
3. Add a minimal `src/hooks.server.ts` that mounts Better Auth through `svelteKitHandler`.
4. Add a simple health endpoint such as `/api/health`.
5. Add `README.md` and the docs in this folder.

Acceptance criteria:

- local server boots
- `/api/health` returns 200
- Better Auth routes are mounted under `/api/auth`

## Phase 2: Define auth schema and customization surface

Deliverables:

- stable auth config module
- initial user and session field definitions
- explicit JWT payload contract

Tasks:

1. Create a single auth definition module, for example `src/lib/server/auth.ts`.
2. Set explicit `baseURL`, `basePath`, `secret`, and `trustedOrigins` handling.
3. Enable email/password.
4. Enable username plugin.
5. Add `user.additionalFields` only for fields with clear cross-app value.
6. Add `session.additionalFields` only if required for runtime state.
7. Add JWT plugin and define payload mapping.

Recommended initial additional fields:

- user:
  - `displayName` only if different from Better Auth `name`
  - `avatarUrl` if needed later
  - `defaultApp` if multi-app routing becomes useful
- session:
  - avoid custom fields at first unless there is a concrete use case

Recommendation:

- keep the initial schema minimal
- prefer app lookup tables outside Better Auth core tables for per-app authorization later

Acceptance criteria:

- sign-up creates users
- sign-in creates sessions
- `/api/auth/token` returns JWT when authenticated
- `/api/auth/jwks` exposes signing keys

## Phase 3: Database and migrations

Deliverables:

- Postgres connection wired
- Better Auth schema generated and applied
- migration instructions documented

Tasks:

1. Provision Neon/Postgres.
2. Configure `DATABASE_URL`.
3. Run Better Auth generate or migrate flow.
4. Commit generated schema or SQL migration artifacts appropriate to the chosen adapter.
5. Add a startup check or documented release step for migrations.

Recommendation:

- treat auth migrations as explicit release steps, not runtime side effects on every request
- if preview deploys need isolated databases, keep that as a later enhancement

Acceptance criteria:

- user, session, account, verification, and JWKS structures exist
- sign-up and sign-in succeed against Postgres

## Phase 4: Browser auth UX and flows

Deliverables:

- sign-in route
- sign-up route
- sign-out route or action
- forgot-password flow
- session probe endpoint or page

Tasks:

1. Create minimal UI routes for sign-in and sign-up.
2. Use Better Auth client APIs for email/password and username flows.
3. Implement password reset email flow.
4. Add email verification only if product requirements need it.
5. Add a session debug page for development only.

Recommendation:

- keep auth UI separate from downstream apps
- pass `callbackURL` back into the consuming app after successful auth

Acceptance criteria:

- a browser user can sign up, sign in, sign out, and reset password
- callback to a downstream app works with trusted origins enabled

## Phase 5: JWT contract for downstream apps

Deliverables:

- documented issuer/audience contract
- JWT verification example
- claims contract for downstream authorization

Tasks:

1. Set explicit JWT issuer and audience values.
2. Define JWT expiration policy.
3. Map payload claims to the minimal downstream needs:
   - `sub`
   - `email`
   - `name`
   - `preferred_username`
4. Document JWKS verification with `jose`.
5. Keep app-specific authorization claims optional unless needed now.

Recommended defaults:

- issuer: auth server public URL
- audience: auth server public URL initially, or a shared API audience string if multiple consumers need one
- expiration: short-lived, such as 15 minutes

Recommendation:

- do not put mutable app permissions directly into JWTs unless you need low-latency authorization without lookup
- for `portfolio-manager`, stable identity claims are enough at first because app authorization already lives in its own storage

Acceptance criteria:

- downstream service can validate JWT via JWKS
- `sub` maps cleanly into existing `portfolio-manager` access records

## Phase 6: Operational endpoints and admin utilities

Deliverables:

- health endpoint
- readiness checks
- optional internal endpoints for user lookup or token diagnostics

Tasks:

1. Keep `/api/health` simple and non-authenticated.
2. Add `/api/ready` if you want DB connectivity checks.
3. Optionally add an internal endpoint for looking up users by email or username.
4. Add logging around auth failures, reset flows, and JWT issuance failures.

Recommendation:

- keep any user lookup endpoint internal or protected
- avoid exposing account enumeration surfaces publicly

## Phase 7: Vercel deployment

Deliverables:

- working Vercel deployment
- env var inventory
- production domain wired

Tasks:

1. Create Vercel project for `auth-server`.
2. Set environment variables.
3. Set production domain such as `auth.example.com`.
4. Add preview domain wildcard handling if needed.
5. Validate trusted origins and callback URLs in preview and production.

Recommended environment variables:

```bash
DATABASE_URL=postgres://...
BETTER_AUTH_SECRET=...
BETTER_AUTH_URL=https://auth.example.com
AUTH_TRUSTED_ORIGINS=https://app.example.com,http://localhost:5173,capacitor://localhost,ionic://localhost
JWT_AUDIENCE=https://auth.example.com
MAIL_FROM=no-reply@example.com
MAIL_PROVIDER_API_KEY=...
```

If supporting Vercel previews:

- use Better Auth dynamic base URL support only if you truly need preview auth callbacks
- otherwise keep production auth on one stable origin and let previews point to that stable auth origin

Recommendation:

- prefer one stable auth origin even for preview app deployments
- it simplifies cookies, issuer config, and debugging

Acceptance criteria:

- prod deploy signs in successfully
- JWTs verify from prod JWKS
- password reset links resolve correctly

## Phase 8: Rollout to portfolio-manager

Deliverables:

- `portfolio-manager` switched from Clerk to Better Auth integration
- old Clerk envs removed or feature-flagged
- tests updated

Tasks:

1. Add Better Auth provider implementation to `portfolio-manager`.
2. Replace Clerk client flows.
3. Verify private portfolio access still uses `event.locals.user.id`.
4. Migrate or reset existing shared-access user IDs.
5. Update tests and deployment docs.

## Auth Server File Layout

Recommended structure:

```text
auth-server/
  src/
    hooks.server.ts
    lib/
      auth-client.ts
      server/
        auth.ts
        auth-env.ts
        jwt.ts
        mail.ts
    routes/
      api/
        health/
          +server.ts
        ready/
          +server.ts
      auth/
        sign-in/
          +page.svelte
        sign-up/
          +page.svelte
        reset-password/
          +page.svelte
  docs/
    execution-plan.md
    portfolio-manager-integration.md
  .env.example
  package.json
  README.md
```

## Configuration Decisions For Better Customization

Use these defaults unless there is a stronger product requirement.

### Identity contract

- make Better Auth user `id` the canonical cross-app user ID
- never derive access control from email address
- treat username as mutable display/login data, not authorization identity

### Claim strategy

- keep JWT claims small and stable
- include identity claims only at first
- use app database lookups for app-specific ACLs

### App registration

If multiple downstream apps are expected, create a lightweight app registry config:

```ts
type DownstreamApp = {
  name: string;
  origin: string;
  callbackUrls: string[];
  audiences?: string[];
};
```

Use this registry to drive:

- trusted origins
- post-login callbacks
- future app-specific claims

### Mail integration

Abstract mail sending behind one module so provider changes stay localized.

### Provider integration

Keep all Better Auth plugins and providers in one config module.

Recommendation:

- do not spread auth behavior across many route files
- keep one canonical auth config and one client config

## Risks and Mitigations

## Risk: existing Clerk user IDs do not match Better Auth user IDs

Impact:

- private portfolio sharing records break for migrated users unless remapped

Mitigation:

- either perform a one-time mapping migration
- or accept a clean auth cutover and rebuild shares

## Risk: cookie flows become hard across origins

Impact:

- browser login callback or session continuity is harder to debug

Mitigation:

- keep auth on a stable first-party domain
- use JWTs for downstream API auth instead of cross-site cookie dependency in `portfolio-manager`

## Risk: over-customizing JWT claims too early

Impact:

- brittle downstream coupling

Mitigation:

- start with identity-only claims
- keep authorization inside each app until there is a proven need to centralize it

## Test Plan

## Unit tests

- auth config loads with required env
- JWT payload mapping is correct
- user lookup and hooks behave as expected

## Integration tests

- sign-up flow
- sign-in flow
- sign-out flow
- request password reset
- reset password
- fetch session
- fetch JWT token
- verify JWT against JWKS

## Deployment tests

- verify production issuer and audience
- verify callback URLs for local, preview, and production consumers
- verify downstream bearer auth against real deployed JWKS

## Recommended Build Order

1. Bootstrap SvelteKit service.
2. Wire Better Auth with Postgres.
3. Add username and JWT plugins.
4. Implement minimal auth UI.
5. Add password reset email flow.
6. Deploy to Vercel.
7. Add JWT validation provider in `portfolio-manager`.
8. Replace Clerk client flow in `portfolio-manager`.
9. Migrate user/share IDs if needed.
10. Remove Clerk config and docs after cutover.

## Definition of Done

- users can sign up and sign in through `auth-server`
- `portfolio-manager` can authenticate users through `auth-server`
- `portfolio-manager` can validate bearer tokens via JWKS
- private portfolio access control still works based on stable user IDs
- Vercel deployment is documented and reproducible
- integration guide is complete enough for another engineer to follow without reverse-engineering source code
