import { json } from '@sveltejs/kit';
import { oauthProviderAuthServerMetadata } from '@better-auth/oauth-provider';
import { auth, isAuthConfigured } from '$lib/server/auth';

type OAuthServerConfigAuth = Parameters<typeof oauthProviderAuthServerMetadata>[0];

export const GET = isAuthConfigured()
  ? oauthProviderAuthServerMetadata(auth as OAuthServerConfigAuth)
  : async () => {
      return json(
        {
          ok: false,
          error: 'Auth server is not fully configured yet'
        },
        { status: 503 }
      );
    };
