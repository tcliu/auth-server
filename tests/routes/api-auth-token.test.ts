import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  handler: vi.fn()
}));

vi.mock('$lib/server/auth', () => ({
  auth: {
    handler: mocks.handler
  }
}));

import { GET } from '../../src/routes/api/auth/token/+server';

describe('GET /api/auth/token', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('forwards the request to the auth handler', async () => {
    const request = new Request('https://auth.example.com/api/auth/token');
    const response = new Response(JSON.stringify({ access_token: 'token' }), {
      status: 200,
      headers: {
        'content-type': 'application/json'
      }
    });
    mocks.handler.mockResolvedValue(response);

    const result = await GET({ request } as never);

    expect(mocks.handler).toHaveBeenCalledWith(request);
    expect(result).toBe(response);
  });
});
