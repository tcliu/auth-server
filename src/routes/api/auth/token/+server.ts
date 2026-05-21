import { auth } from '$lib/server/auth';

export const GET = async ({ request }) => auth.handler(request);
