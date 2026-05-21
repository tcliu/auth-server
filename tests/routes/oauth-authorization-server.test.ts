import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const auth = { id: 'auth-instance' };
  const get = vi.fn();
  const oauthProviderAuthServerMetadata = vi.fn(() => get);
  const isAuthConfigured = vi.fn(() => true);

  return {
    auth,
    get,
    oauthProviderAuthServerMetadata,
    isAuthConfigured
  };
});

vi.mock('$lib/server/auth', () => ({
  auth: mocks.auth,
  isAuthConfigured: mocks.isAuthConfigured
}));

vi.mock('@better-auth/oauth-provider', () => ({
  oauthProviderAuthServerMetadata: mocks.oauthProviderAuthServerMetadata
}));

import { GET } from '../../src/routes/.well-known/oauth-authorization-server/+server';

describe('GET /.well-known/oauth-authorization-server', () => {
  it('binds the OAuth authorization server metadata handler to the auth instance', () => {
    expect(mocks.oauthProviderAuthServerMetadata).toHaveBeenCalledWith(mocks.auth);
    expect(GET).toBe(mocks.get);
  });
});
