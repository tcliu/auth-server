import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getAuthEnvStatus: vi.fn(),
  getDbPool: vi.fn(),
  isAuthConfigured: vi.fn()
}));

vi.mock('$lib/server/auth-env', () => ({
  getAuthEnvStatus: mocks.getAuthEnvStatus
}));

vi.mock('$lib/server/db', () => ({
  getDbPool: mocks.getDbPool
}));

vi.mock('$lib/server/auth', () => ({
  isAuthConfigured: mocks.isAuthConfigured
}));

import { GET } from '../../src/routes/api/ready/+server';

describe('GET /api/ready', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAuthEnvStatus.mockReturnValue({
      baseURLConfigured: true,
      secretConfigured: true,
      databaseConfigured: true,
      jwtAudienceConfigured: true,
      mailConfigured: false,
      trustedOriginsConfigured: true
    });
  });

  it('returns 503 when auth is not configured', async () => {
    mocks.isAuthConfigured.mockReturnValue(false);

    const response = await GET();

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      env: {
        baseURLConfigured: true,
        secretConfigured: true,
        databaseConfigured: true,
        jwtAudienceConfigured: true,
        mailConfigured: false,
        trustedOriginsConfigured: true
      },
      databaseReachable: false,
      error: 'Auth server is not fully configured yet'
    });
    expect(mocks.getDbPool).not.toHaveBeenCalled();
  });

  it('returns 200 when auth is configured and the database is reachable', async () => {
    const query = vi.fn().mockResolvedValue([{ ok: 1 }]);
    mocks.isAuthConfigured.mockReturnValue(true);
    mocks.getDbPool.mockReturnValue({ query });

    const response = await GET();

    expect(response.status).toBe(200);
    expect(query).toHaveBeenCalledWith('select 1 as ok');
    await expect(response.json()).resolves.toEqual({
      ok: true,
      env: {
        baseURLConfigured: true,
        secretConfigured: true,
        databaseConfigured: true,
        jwtAudienceConfigured: true,
        mailConfigured: false,
        trustedOriginsConfigured: true
      },
      databaseReachable: true
    });
  });

  it('returns 503 when the database check fails', async () => {
    const query = vi.fn().mockRejectedValue(new Error('database unavailable'));
    mocks.isAuthConfigured.mockReturnValue(true);
    mocks.getDbPool.mockReturnValue({ query });

    const response = await GET();

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      env: {
        baseURLConfigured: true,
        secretConfigured: true,
        databaseConfigured: true,
        jwtAudienceConfigured: true,
        mailConfigured: false,
        trustedOriginsConfigured: true
      },
      databaseReachable: false,
      error: 'database unavailable'
    });
  });
});
