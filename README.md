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

Useful endpoints:

- `GET /api/health`
- `GET /api/ready`
- `GET /api/auth/jwks`
- `GET /auth/session`

Useful commands:

- `npm run check`
- `npm run build`
- `npm run auth:generate`
- `npm run auth:migrate`

## Goal

Build a reusable auth service that supports:

- Better Auth on Vercel
- email/password and username sign-in
- customizable user/session claims
- JWT + JWKS for downstream API authentication
- clean integration with `portfolio-manager` without coupling its storage layer to auth internals
