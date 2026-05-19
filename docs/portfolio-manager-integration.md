# Integrating `portfolio-manager` With `auth-server`

## Goal

Connect `../portfolio-manager` to the standalone Better Auth service in `../auth-server` while preserving:

- `event.locals.user` on the server
- bearer-token authentication for portfolio API calls
- private portfolio authorization by stable user ID
- Vercel deployment compatibility
- future room for auth customization without reworking portfolio storage

## Current `portfolio-manager` Integration Points

The existing app already has the right abstraction boundaries.

### Server side

- `src/hooks.server.ts`
  - resolves `event.locals.user`
  - applies API CORS headers
- `src/lib/server/auth/index.ts`
  - chooses the auth provider
- `src/lib/server/auth/types.ts`
  - defines the user shape consumed by the app
- `src/lib/server/portfolio-auth.ts`
  - derives app authorization from `event.locals.user.id`

### Client side

- `src/lib/auth.svelte.ts`
  - owns sign-in, sign-up, logout, session refresh, and auth headers
- `src/routes/api/session/+server.ts`
  - returns current session info
- `src/routes/api/auth/check/+server.ts`
  - probes whether auth is configured

These seams should be preserved.

## Integration Strategy

Use this strategy:

1. `portfolio-manager` browser UI authenticates against `auth-server`.
2. The client retrieves a Better Auth JWT for API use.
3. `portfolio-manager` sends that JWT as `Authorization: Bearer <token>` to its own API.
4. `portfolio-manager` validates the JWT against `auth-server` JWKS.
5. `portfolio-manager` maps claims into its existing `AuthenticatedUser` shape.

This keeps `portfolio-manager` independent from Better Auth session storage internals.

## Required Auth Server Contract

Before integrating, `auth-server` should provide:

- public auth origin, for example `https://auth.example.com`
- Better Auth client-compatible routes under `/api/auth`
- JWT plugin enabled
- JWKS endpoint available
- a stable JWT payload including:
  - `sub`
  - `email`
  - `name`
  - optional `preferred_username`

Recommended invariant:

- `sub` must be the canonical user ID used everywhere in `portfolio-manager`

## Portfolio Manager Changes

## 1. Add new environment variables

Add these to `portfolio-manager/.env.example`:

```bash
AUTH_PROVIDER=better-auth
AUTH_SERVER_URL=http://localhost:3001
AUTH_JWKS_URL=http://localhost:3001/api/auth/jwks
AUTH_JWT_ISSUER=http://localhost:3001
AUTH_JWT_AUDIENCE=http://localhost:3001
VITE_AUTH_SERVER_URL=http://localhost:3001
VITE_AUTH_SIGN_IN_URL=http://localhost:3001/auth/sign-in
VITE_AUTH_SIGN_UP_URL=http://localhost:3001/auth/sign-up
VITE_AUTH_RESET_PASSWORD_URL=http://localhost:3001/auth/reset-password
```

Recommended usage:

- server-only validation settings stay non-`VITE_`
- browser navigation or client fetch settings use `VITE_`

## 2. Add a Better Auth server provider

Create a new provider, for example:

- `src/lib/server/auth/better-auth.ts`

Responsibilities:

- extract bearer token from request headers
- validate JWT with `jose` using remote JWKS from `AUTH_JWKS_URL`
- verify issuer and audience
- map claims to:

```ts
type AuthenticatedUser = {
  id: string;
  email?: string | null;
  name?: string | null;
};
```

Suggested implementation outline:

```ts
import { createRemoteJWKSet, jwtVerify } from 'jose';

const jwks = createRemoteJWKSet(new URL(process.env.AUTH_JWKS_URL!));

export async function resolveBetterAuthUser(request: Request) {
  const header = request.headers.get('authorization') ?? request.headers.get('Authorization');
  const token = header?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return null;

  const { payload } = await jwtVerify(token, jwks, {
    issuer: process.env.AUTH_JWT_ISSUER,
    audience: process.env.AUTH_JWT_AUDIENCE
  });

  if (typeof payload.sub !== 'string' || !payload.sub.trim()) return null;

  return {
    id: payload.sub,
    email: typeof payload.email === 'string' ? payload.email : null,
    name: typeof payload.name === 'string' ? payload.name : null
  };
}
```

Recommendation:

- keep this provider narrowly focused on token verification
- do not add app authorization logic here

## 3. Update auth provider selection

Update `src/lib/server/auth/index.ts` so provider selection becomes env-driven rather than Clerk-specific.

Recommended order:

1. local auth when `LOCAL_AUTH_ENABLED=true`
2. Better Auth when `AUTH_PROVIDER=better-auth`
3. fallback noop provider otherwise

Recommendation:

- remove direct provider inference from Clerk env presence
- make the auth provider explicit

## 4. Replace Clerk-specific auth probe endpoint

Update `src/routes/api/auth/check/+server.ts` to return Better Auth config status when `AUTH_PROVIDER=better-auth`.

Suggested response shape:

```json
{
  "configured": true,
  "provider": "better-auth",
  "authServerUrlConfigured": true,
  "jwksUrlConfigured": true,
  "issuerConfigured": true,
  "audienceConfigured": true
}
```

Optional enhancement:

- call the auth server health endpoint in development diagnostics only

## 5. Replace Clerk client logic in `src/lib/auth.svelte.ts`

The biggest client change is here.

Remove or isolate Clerk-specific concerns:

- Clerk SDK loading
- Clerk redirect callback handling
- Clerk session token acquisition
- Clerk sign-in and sign-up APIs
- Clerk forgot-password flow

Replace them with a Better Auth client integration.

### Recommended client approach

Create a small wrapper module, for example:

- `src/lib/better-auth-client.ts`

Responsibilities:

- create Better Auth client pointed at `VITE_AUTH_SERVER_URL`
- expose methods for sign-in, sign-up, sign-out, get session, get JWT token, request password reset, reset password

Then adapt `src/lib/auth.svelte.ts` to use that wrapper while keeping the existing store contract stable.

Existing store contract worth preserving:

- `user`
- `accessToken`
- `loading`
- `rememberMe`
- `login()`
- `signup()`
- `logout()`
- `refreshSession()`
- `getAuthHeaders()`
- `forgotPassword()`

Recommendation:

- preserve the public store API so fewer UI components need to change

### Better Auth browser flow

Recommended flow for `portfolio-manager`:

1. call Better Auth sign-in or sign-up client method against `auth-server`
2. fetch Better Auth session
3. fetch Better Auth JWT token
4. store the JWT as `accessToken` in the existing auth store
5. send that JWT to `portfolio-manager` API via `Authorization` header

This mirrors the current bearer-token contract and minimizes downstream churn.

## 6. Session route behavior

Keep `src/routes/api/session/+server.ts`.

Recommended behavior:

- `GET /api/session` continues returning `event.locals.user`
- local auth `POST` actions remain available only when local auth is enabled
- Better Auth sign-in and sign-up should happen against `auth-server`, not `portfolio-manager`

Recommendation:

- do not make `portfolio-manager` a proxy auth server unless there is a concrete product need

## 7. Authorization and storage compatibility

No major changes are required in:

- `src/lib/server/portfolio-auth.ts`
- portfolio access routes
- portfolio storage backends

Reason:

- those parts already depend only on `event.locals.user.id`

Critical requirement:

- Better Auth `sub` must become the ID stored in `createdByUserId`, `updatedByUserId`, and access entries going forward

## 8. Handle existing Clerk data

You need one policy decision.

### Option A: clean cutover

- stop using Clerk
- start with new Better Auth user IDs
- existing private shares tied to Clerk IDs are considered legacy and may need to be recreated manually

Use this if:

- the app is low-volume
- you can tolerate recreating shares

### Option B: one-time migration

- export a mapping of Clerk user IDs to Better Auth user IDs
- update `createdByUserId`, `updatedByUserId`, and private access rows in storage

Use this if:

- existing private portfolios or shares must continue working seamlessly

Recommendation:

- if private sharing is already in active use, plan a one-time ID migration

## 9. Native/Capacitor considerations

`portfolio-manager` already supports remote API use from native clients.

To preserve that:

- keep bearer token auth in `portfolio-manager`
- configure Better Auth trusted origins for `capacitor://localhost`, `ionic://localhost`, and local dev origins where appropriate
- keep `VITE_API_BASE` pointing to deployed `portfolio-manager`
- point auth client config to deployed `auth-server`

Recommendation:

- avoid making native clients rely on cross-site browser cookies for portfolio API access
- use Better Auth JWT retrieval and bearer forwarding instead

## 10. Tests to add or update

## Server tests

Add tests for the new Better Auth provider:

- valid JWT resolves user
- invalid signature returns null
- wrong issuer returns null
- wrong audience returns null
- missing `sub` returns null

Likely file:

- `tests/vitest/better-auth-provider.vitest.ts`

## Route tests

Update:

- `tests/vitest/auth-check.vitest.ts`
- `tests/vitest/session-routes.vitest.ts`

Expected outcomes:

- Better Auth mode reports provider as `better-auth`
- session `GET` works from verified bearer token
- local auth `POST` routes still behave as before when local mode is active

## Client store tests

Update `tests/vitest/auth-store.vitest.ts` to cover:

- Better Auth session bootstrap
- Better Auth JWT retrieval
- Better Auth sign-in flow
- Better Auth sign-out flow
- Better Auth forgot-password flow

## Suggested File Changes In `portfolio-manager`

Recommended change set:

```text
src/lib/server/auth/index.ts                update provider selection
src/lib/server/auth/better-auth.ts         add new JWT verification provider
src/routes/api/auth/check/+server.ts       add better-auth diagnostics
src/lib/auth.svelte.ts                     replace clerk-specific flow
src/lib/better-auth-client.ts              add Better Auth client wrapper
.env.example                               add auth-server env vars
README.md                                  update auth setup docs
tests/vitest/better-auth-provider.vitest.ts add provider tests
tests/vitest/auth-store.vitest.ts          update client auth tests
tests/vitest/auth-check.vitest.ts          update config probe tests
```

## Example Environment Setup

### `auth-server`

```bash
BETTER_AUTH_URL=http://localhost:3001
BETTER_AUTH_SECRET=dev-secret
DATABASE_URL=postgres://...
AUTH_TRUSTED_ORIGINS=http://localhost:5173,capacitor://localhost,ionic://localhost
JWT_AUDIENCE=http://localhost:3001
```

### `portfolio-manager`

```bash
AUTH_PROVIDER=better-auth
AUTH_SERVER_URL=http://localhost:3001
AUTH_JWKS_URL=http://localhost:3001/api/auth/jwks
AUTH_JWT_ISSUER=http://localhost:3001
AUTH_JWT_AUDIENCE=http://localhost:3001
VITE_AUTH_SERVER_URL=http://localhost:3001
```

## Integration Sequence

Follow this order:

1. Finish and deploy `auth-server` locally first.
2. Confirm manual sign-up, sign-in, session, and JWT retrieval.
3. Implement `portfolio-manager` Better Auth server provider.
4. Verify `/api/session` works with a real Better Auth bearer token.
5. Replace `portfolio-manager` browser auth store internals.
6. Run Vitest and manual browser tests.
7. Deploy both services to Vercel staging.
8. Validate production-like auth callbacks and JWT verification.
9. Perform user ID migration if required.
10. Cut over production env vars and remove Clerk configuration.

## Manual Verification Checklist

### Web

- sign up at auth server
- sign in at auth server
- return to `portfolio-manager`
- `GET /api/session` shows the authenticated user
- creating a private portfolio records Better Auth user ID
- sharing a private portfolio with another Better Auth user works

### Token verification

- `portfolio-manager` rejects tampered bearer tokens
- `portfolio-manager` rejects tokens with wrong issuer or audience
- `portfolio-manager` accepts valid bearer tokens signed by `auth-server`

### Native

- native app can retrieve a valid JWT through auth flow
- native requests to `portfolio-manager` include bearer token
- private portfolios load correctly under authenticated user

## Common Pitfalls

## Mismatch between auth session and portfolio API token

Symptom:

- user appears signed in to auth server but `portfolio-manager` stays anonymous

Cause:

- JWT token retrieval was skipped or not persisted in the auth store

Fix:

- always refresh both session and JWT token in the Better Auth client wrapper

## Wrong issuer or audience

Symptom:

- every authenticated API request returns anonymous or 401-like behavior

Fix:

- verify `AUTH_JWT_ISSUER` and `AUTH_JWT_AUDIENCE` match the auth server plugin config exactly

## Existing private access breaks after cutover

Symptom:

- users can sign in but old private portfolios no longer appear

Cause:

- access rows still reference Clerk user IDs

Fix:

- migrate IDs or recreate shares

## Final Recommendation

Keep the integration contract narrow:

- `auth-server` owns authentication
- `portfolio-manager` owns portfolio authorization
- JWT identity claims bridge the two systems

That gives you the best customization headroom without entangling the portfolio app with Better Auth internals.
