import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  auth: { id: 'auth-instance' },
  oauthProviderOpenIdConfigMetadata: vi.fn(),
  isAuthConfigured: vi.fn(() => false)
}));

vi.mock('$lib/server/auth', () => ({
  auth: mocks.auth,
  isAuthConfigured: mocks.isAuthConfigured
}));

vi.mock('@better-auth/oauth-provider', () => ({
  oauthProviderOpenIdConfigMetadata: mocks.oauthProviderOpenIdConfigMetadata
}));

import { GET } from '../../src/routes/.well-known/openid-configuration/+server';

describe('GET /.well-known/openid-configuration when auth is not configured', () => {
  it('returns 503 without binding metadata handlers', async () => {
    const response = await GET({} as never);

    expect(mocks.oauthProviderOpenIdConfigMetadata).not.toHaveBeenCalled();
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: 'Auth server is not fully configured yet'
    });
  });
});
