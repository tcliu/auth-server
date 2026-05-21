import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const auth = { id: 'auth-instance' };
  const get = vi.fn();
  const oauthProviderOpenIdConfigMetadata = vi.fn(() => get);
  const isAuthConfigured = vi.fn(() => true);

  return {
    auth,
    get,
    oauthProviderOpenIdConfigMetadata,
    isAuthConfigured
  };
});

vi.mock('$lib/server/auth', () => ({
  auth: mocks.auth,
  isAuthConfigured: mocks.isAuthConfigured
}));

vi.mock('@better-auth/oauth-provider', () => ({
  oauthProviderOpenIdConfigMetadata: mocks.oauthProviderOpenIdConfigMetadata
}));

import { GET } from '../../src/routes/.well-known/openid-configuration/+server';

describe('GET /.well-known/openid-configuration', () => {
  it('binds the OpenID metadata handler to the auth instance', () => {
    expect(mocks.oauthProviderOpenIdConfigMetadata).toHaveBeenCalledWith(mocks.auth);
    expect(GET).toBe(mocks.get);
  });
});
