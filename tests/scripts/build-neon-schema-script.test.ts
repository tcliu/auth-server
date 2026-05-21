import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  readFile: vi.fn(),
  createAuthConfig: vi.fn(),
  query: vi.fn(),
  end: vi.fn(),
  info: vi.fn()
}));

vi.mock('node:fs/promises', () => ({
  readFile: mocks.readFile
}));

vi.mock('../../scripts/auth-config.mjs', () => ({
  createAuthConfig: mocks.createAuthConfig
}));

describe('build-neon-schema script', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubGlobal('console', {
      ...console,
      log: mocks.info
    });
  });

  it('reads schema.sql and applies it to the configured database', async () => {
    const config = {
      database: {
        query: mocks.query,
        end: mocks.end
      }
    };

    mocks.createAuthConfig.mockReturnValue(config);
    mocks.readFile.mockResolvedValue('create schema if not exists auth;');

    await import('../../scripts/build-neon-schema.mjs');

    expect(mocks.createAuthConfig).toHaveBeenCalledOnce();
    expect(mocks.readFile).toHaveBeenCalledWith(expect.any(URL), 'utf8');
    expect(mocks.query).toHaveBeenCalledWith('create schema if not exists auth;');
    expect(mocks.end).toHaveBeenCalledOnce();
    expect(mocks.info).toHaveBeenCalledWith('Applied sql/schema.sql to Neon DB');
  });
});
