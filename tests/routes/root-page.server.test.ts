import { describe, expect, it } from 'vitest';
import { load } from '../../src/routes/+page.server';

describe('root page load', () => {
  it('redirects signed-in users to the session page', async () => {
    await expect(
      load({
        locals: {
          user: { id: 'user-1' }
        }
      } as never)
    ).rejects.toMatchObject({
      status: 303,
      location: '/auth/session'
    });
  });

  it('redirects anonymous users to sign-in', async () => {
    await expect(
      load({
        locals: {
          user: null
        }
      } as never)
    ).rejects.toMatchObject({
      status: 303,
      location: '/auth/sign-in'
    });
  });
});
