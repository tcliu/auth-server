import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  env: {} as Record<string, string | undefined>,
  poolInstances: [] as Array<{ options: Record<string, unknown> }>,
  Pool: vi.fn(function MockPool(this: { options: Record<string, unknown> }, options: Record<string, unknown>) {
    const instance = { options };
    mocks.poolInstances.push(instance);
    Object.assign(this, instance);
  })
}));

vi.mock('$env/dynamic/private', () => ({
  env: mocks.env
}));

vi.mock('pg', () => ({
  Pool: mocks.Pool
}));

describe('getDbPool', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.poolInstances.length = 0;

    for (const key of Object.keys(mockedEnv())) {
      delete mockedEnv()[key];
    }
  });

  it('creates the pool with the auth schema search path and caches it', async () => {
    Object.assign(mockedEnv(), {
      BETTER_AUTH_URL: 'https://auth.example.com',
      BETTER_AUTH_SECRET: 'secret',
      DATABASE_URL: 'postgres://db'
    });

    const { getDbPool } = await import('../../src/lib/server/db');

    const firstPool = getDbPool();
    const secondPool = getDbPool();

    expect(mocks.Pool).toHaveBeenCalledTimes(1);
    expect(mocks.Pool).toHaveBeenCalledWith({
      connectionString: 'postgres://db',
      options: '-c search_path=auth',
      max: 10
    });
    expect(firstPool).toBe(secondPool);
  });

  it('throws when required auth environment is missing', async () => {
    Object.assign(mockedEnv(), {
      BETTER_AUTH_URL: 'https://auth.example.com'
    });

    const { getDbPool } = await import('../../src/lib/server/db');

    expect(() => getDbPool()).toThrow(
      'Missing required auth env: BETTER_AUTH_SECRET, DATABASE_URL'
    );
    expect(mocks.Pool).not.toHaveBeenCalled();
  });
});

function mockedEnv() {
  return mocks.env;
}
