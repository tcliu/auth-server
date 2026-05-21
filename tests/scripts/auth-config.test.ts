import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  envFiles: new Map<string, string>(),
  poolInstances: [] as Array<{ options: Record<string, unknown>; query: ReturnType<typeof vi.fn>; end: ReturnType<typeof vi.fn> }>,
  Pool: vi.fn(function MockPool(
    this: { options: Record<string, unknown>; query: ReturnType<typeof vi.fn>; end: ReturnType<typeof vi.fn> },
    options: Record<string, unknown>
  ) {
    const instance = {
      options,
      query: vi.fn(),
      end: vi.fn()
    };
    mocks.poolInstances.push(instance);
    Object.assign(this, instance);
  }),
  username: vi.fn((options: Record<string, unknown>) => ({ name: 'username', options })),
  jwt: vi.fn((options: Record<string, unknown>) => ({ name: 'jwt', options })),
  oauthProvider: vi.fn((options: Record<string, unknown>) => ({ name: 'oauthProvider', options }))
}));

vi.mock('node:fs', () => ({
  existsSync: vi.fn((filePath: string) => mocks.envFiles.has(filePath)),
  readFileSync: vi.fn((filePath: string) => {
    const content = mocks.envFiles.get(filePath);

    if (content === undefined) {
      throw new Error(`Unexpected read: ${filePath}`);
    }

    return content;
  })
}));

vi.mock('pg', () => ({
  Pool: mocks.Pool
}));

vi.mock('better-auth/plugins', () => ({
  username: mocks.username,
  jwt: mocks.jwt
}));

vi.mock('@better-auth/oauth-provider', () => ({
  oauthProvider: mocks.oauthProvider
}));

describe('auth-config script helpers', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.envFiles.clear();
    mocks.poolInstances.length = 0;
  });

  it('creates auth config from merged env with trusted OAuth client settings', async () => {
    mocks.envFiles.set('.env', 'AUTH_APP_NAME=Env App\nOAUTH_PM_CLIENT_ID=env-client\n');
    mocks.envFiles.set('.env.local', 'OAUTH_PM_REDIRECT_URIS=myapp://callback\n');

    const { createAuthConfig } = await import('../../scripts/auth-config.mjs');
    const config = createAuthConfig({
      DATABASE_URL: 'postgres://db',
      APP_BASE_URL: 'https://auth.example.com',
      BETTER_AUTH_SECRET: 'secret',
      OAUTH_PM_CLIENT_SECRET: '',
      OAUTH_PM_POST_LOGOUT_REDIRECT_URIS: 'myapp://logout',
      OAUTH_ALLOW_DYNAMIC_CLIENT_REGISTRATION: 'true'
    });

    expect(mocks.Pool).toHaveBeenCalledWith({
      connectionString: 'postgres://db',
      max: 1
    });
    expect(config.appName).toBe('Env App');
    expect(config.baseURL).toBe('https://auth.example.com');
    expect(config.secret).toBe('secret');
    expect(config.basePath).toBe('/api/auth');
    expect(config.database).toMatchObject({
      options: {
        connectionString: 'postgres://db',
        max: 1
      }
    });
    expect(mocks.username).toHaveBeenCalledOnce();
    expect(mocks.jwt).toHaveBeenCalledOnce();
    expect(mocks.oauthProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        allowDynamicClientRegistration: true,
        validAudiences: ['https://codepg-portfolio-manager.vercel.app'],
        trustedClients: [
          expect.objectContaining({
            clientId: 'env-client',
            type: 'native',
            redirectUris: ['myapp://callback'],
            postLogoutRedirectUris: ['myapp://logout'],
            tokenEndpointAuthMethod: 'none'
          })
        ]
      })
    );
  });

  it('requires DATABASE_URL before creating the auth config', async () => {
    const { createAuthConfig } = await import('../../scripts/auth-config.mjs');

    expect(() => createAuthConfig({ APP_BASE_URL: 'https://auth.example.com' })).toThrow(
      'Missing DATABASE_URL for auth schema generation/migration'
    );
    expect(mocks.Pool).not.toHaveBeenCalled();
  });

  it('ensures the auth schema exists before migrations run', async () => {
    const { ensureAuthSchema } = await import('../../scripts/auth-config.mjs');
    const query = vi.fn();

    await ensureAuthSchema({ query } as never);

    expect(query).toHaveBeenNthCalledWith(1, 'create schema if not exists auth');
    expect(query).toHaveBeenNthCalledWith(2, 'set search_path to auth');
  });
});
