import { describe, expect, it } from 'vitest';
import { GET } from '../../src/routes/api/health/+server';

describe('GET /api/health', () => {
  it('returns a healthy service payload', async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      service: 'auth-server'
    });
  });
});
