import { createAuthClient } from 'better-auth/svelte';
import { usernameClient, jwtClient } from 'better-auth/client/plugins';

const baseURL = import.meta.env.VITE_AUTH_SERVER_URL || '';

export const authClient = createAuthClient({
  baseURL,
  plugins: [usernameClient(), jwtClient()]
});
