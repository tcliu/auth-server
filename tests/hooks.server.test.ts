import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  svelteKitHandler: vi.fn()
}));

vi.mock('$app/environment', () => ({
  building: false
}));

vi.mock('$lib/server/auth', () => ({
  auth: {
    api: {
      getSession: mocks.getSession
    }
  }
}));

vi.mock('better-auth/svelte-kit', () => ({
  svelteKitHandler: mocks.svelteKitHandler
}));

import { handle } from '../src/hooks.server';

describe('server handle hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads the auth session into locals before delegating', async () => {
    const request = new Request('https://auth.example.com/auth/session', {
      headers: {
        cookie: 'session=abc123'
      }
    });
    const event = {
      request,
      locals: {}
    };
    const resolve = vi.fn();
    const response = new Response('ok');

    mocks.getSession.mockResolvedValue({
      session: { id: 'session-1' },
      user: { id: 'user-1', email: 'user@example.com' }
    });
    mocks.svelteKitHandler.mockResolvedValue(response);

    const result = await handle({ event, resolve } as never);

    expect(mocks.getSession).toHaveBeenCalledWith({
      headers: request.headers
    });
    expect(event.locals).toEqual({
      session: { id: 'session-1' },
      user: { id: 'user-1', email: 'user@example.com' }
    });
    expect(mocks.svelteKitHandler).toHaveBeenCalledWith({
      event,
      resolve,
      auth: expect.any(Object),
      building: false
    });
    expect(result).toBe(response);
  });

  it('falls back to null locals when session lookup fails', async () => {
    const event = {
      request: new Request('https://auth.example.com/auth/session'),
      locals: {}
    };
    const resolve = vi.fn();
    const response = new Response('ok');

    mocks.getSession.mockRejectedValue(new Error('session lookup failed'));
    mocks.svelteKitHandler.mockResolvedValue(response);

    const result = await handle({ event, resolve } as never);

    expect(event.locals).toEqual({
      session: null,
      user: null
    });
    expect(mocks.svelteKitHandler).toHaveBeenCalledOnce();
    expect(result).toBe(response);
  });
});
