import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, request }) => {
  return {
    session: locals.session,
    user: locals.user,
    cookies: request.headers.get('cookie') || ''
  };
};
