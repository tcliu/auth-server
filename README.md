# Auth Server

Standalone Better Auth service intended to back `../portfolio-manager` and other apps.

## Docs

- `docs/execution-plan.md`: concrete implementation and rollout plan
- `docs/portfolio-manager-integration.md`: step-by-step integration guide for `../portfolio-manager`

## Getting Started

```bash
npm install
cp .env.example .env
npm run auth:migrate
npm run dev
```

`sql/schema.sql` is committed and can be regenerated with `npm run auth:generate`.

## Neon CLI

Install Neon CLI:

```bash
npm install -g neonctl
```

Verify the install:

```bash
neon --version
```

Authenticate with Neon:

```bash
neon auth
```

If you are working against a Neon project created through Vercel-managed Neon, use a Neon API key instead of `neon auth`:

```bash
export NEON_API_KEY=<your_neon_api_key>
```

Useful Neon CLI examples:

```bash
neon orgs list
neon projects list
neon branches list --project-id <project_id>
```

Useful endpoints:

- `GET /api/health`
- `GET /api/ready`
- `GET /api/auth/jwks`
- `GET /.well-known/oauth-authorization-server`
- `GET /.well-known/openid-configuration`
- `GET /auth/session`

Useful commands:

- `npm run check`
- `npm run build`
- `npm run env:sync:vercel`
- `npm run auth:generate`
- `npm run auth:migrate`
- `npm run auth:build:neon`

`npm run env:sync:vercel` merges `.env` defaults with `.env.vercel` overrides, syncs the resulting set to Vercel production env vars, and removes production env vars that are no longer present in those files.

Set `APP_BASE_URL` in `.env` and override it in `.env.vercel` when a Vercel deployment should manage a different production alias. `bash scripts/deploy.sh vercel` reads that URL, ensures the matching project domain exists, and removes the previously managed alias when the configured hostname changes.

`npm run auth:build:neon` applies the committed `sql/schema.sql` directly to the configured Neon/Postgres database.

Typical schema workflow:

```bash
npm run auth:generate
npm run auth:build:neon
```

## Email Setup

Password reset email delivery uses SMTP. The repo defaults are compatible with Zoho Mail using `codeplayground@zohomail.com` as the sender.

Required env vars:

- `MAIL_FROM`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`

For Zoho Mail the expected values are typically:

- `MAIL_FROM=codeplayground@zohomail.com`
- `SMTP_HOST=smtp.zoho.com`
- `SMTP_PORT=465`
- `SMTP_SECURE=true`
- `SMTP_USER=codeplayground@zohomail.com`
- `SMTP_PASS=<zoho app password or smtp password>`

## Goal

Build a reusable auth service that supports:

- Better Auth on Vercel
- email/password and username sign-in
- customizable user/session claims
- OAuth 2.1 / OIDC provider flows for downstream apps
- JWT + JWKS for downstream API authentication
- clean integration with `portfolio-manager` without coupling its storage layer to auth internals
