import { describe, expect, it } from 'vitest';
import { load } from '../../src/routes/auth/session/+page.server';

describe('auth session page load', () => {
  it('returns the current session, user, and request cookies', async () => {
    const session = { id: 'session-1' };
    const user = { id: 'user-1', email: 'user@example.com' };

    await expect(
      load({
        locals: {
          session,
          user
        },
        request: new Request('https://auth.example.com/auth/session', {
          headers: {
            cookie: 'session=abc123'
          }
        })
      } as never)
    ).resolves.toEqual({
      session,
      user,
      cookies: 'session=abc123'
    });
  });
});
