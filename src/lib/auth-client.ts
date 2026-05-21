import { createAuthClient } from 'better-auth/svelte';
import { usernameClient, jwtClient } from 'better-auth/client/plugins';
import { oauthProviderClient } from '@better-auth/oauth-provider/client';

const baseURL = import.meta.env.VITE_AUTH_SERVER_URL || '';

export const authClient = createAuthClient({
  baseURL,
  plugins: [usernameClient(), jwtClient(), oauthProviderClient()]
});
