import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  auth: { id: 'auth-instance' },
  oauthProviderAuthServerMetadata: vi.fn(),
  isAuthConfigured: vi.fn(() => false)
}));

vi.mock('$lib/server/auth', () => ({
  auth: mocks.auth,
  isAuthConfigured: mocks.isAuthConfigured
}));

vi.mock('@better-auth/oauth-provider', () => ({
  oauthProviderAuthServerMetadata: mocks.oauthProviderAuthServerMetadata
}));

import { GET } from '../../src/routes/.well-known/oauth-authorization-server/+server';

describe('GET /.well-known/oauth-authorization-server when auth is not configured', () => {
  it('returns 503 without binding metadata handlers', async () => {
    const response = await GET({} as never);

    expect(mocks.oauthProviderAuthServerMetadata).not.toHaveBeenCalled();
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: 'Auth server is not fully configured yet'
    });
  });
});
