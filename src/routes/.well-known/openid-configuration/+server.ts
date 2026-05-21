import { json } from '@sveltejs/kit';
import { oauthProviderOpenIdConfigMetadata } from '@better-auth/oauth-provider';
import { auth, isAuthConfigured } from '$lib/server/auth';

type OpenIdConfigAuth = Parameters<typeof oauthProviderOpenIdConfigMetadata>[0];

export const GET = isAuthConfigured()
  ? oauthProviderOpenIdConfigMetadata(auth as OpenIdConfigAuth)
  : async () => {
      return json(
        {
          ok: false,
          error: 'Auth server is not fully configured yet'
        },
        { status: 503 }
      );
    };
