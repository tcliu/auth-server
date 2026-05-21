import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getMigrations: vi.fn(),
  createAuthConfig: vi.fn(),
  ensureAuthSchema: vi.fn(),
  runMigrations: vi.fn(),
  end: vi.fn(),
  info: vi.fn()
}));

vi.mock('../../node_modules/better-auth/dist/db/get-migration.mjs', () => ({
  getMigrations: mocks.getMigrations
}));

vi.mock('../../scripts/auth-config.mjs', () => ({
  createAuthConfig: mocks.createAuthConfig,
  ensureAuthSchema: mocks.ensureAuthSchema
}));

describe('migrate-auth-schema script', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubGlobal('console', {
      ...console,
      log: mocks.info
    });
  });

  it('ensures the auth schema and then runs Better Auth migrations', async () => {
    const config = {
      database: {
        end: mocks.end
      }
    };

    mocks.createAuthConfig.mockReturnValue(config);
    mocks.getMigrations.mockResolvedValue({
      runMigrations: mocks.runMigrations
    });

    await import('../../scripts/migrate-auth-schema.mjs');

    expect(mocks.createAuthConfig).toHaveBeenCalledOnce();
    expect(mocks.ensureAuthSchema).toHaveBeenCalledWith(config.database);
    expect(mocks.getMigrations).toHaveBeenCalledWith(config);
    expect(mocks.runMigrations).toHaveBeenCalledOnce();
    expect(mocks.end).toHaveBeenCalledOnce();
    expect(mocks.info).toHaveBeenCalledWith('Applied auth schema migrations');
  });
});
