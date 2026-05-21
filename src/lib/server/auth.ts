import { betterAuth } from 'better-auth';
import { username, jwt } from 'better-auth/plugins';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { oauthProvider } from '@better-auth/oauth-provider';
import { getRequestEvent } from '$app/server';
import { getDbPool } from './db';
import { getAuthEnv } from './auth-env';
import { sendMail } from './mail';

function toSnakeCase(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1_$2')
    .toLowerCase();
}

function createFieldMap(fields: string[]) {
  return Object.fromEntries(fields.map((field) => [field, toSnakeCase(field)]));
}

const coreFieldMaps = {
  user: createFieldMap(['name', 'email', 'emailVerified', 'image', 'createdAt', 'updatedAt', 'displayUsername']),
  session: createFieldMap(['expiresAt', 'token', 'createdAt', 'updatedAt', 'ipAddress', 'userAgent', 'userId']),
  account: createFieldMap([
    'accountId',
    'providerId',
    'userId',
    'accessToken',
    'refreshToken',
    'idToken',
    'accessTokenExpiresAt',
    'refreshTokenExpiresAt',
    'scope',
    'password',
    'createdAt',
    'updatedAt'
  ]),
  verification: createFieldMap(['identifier', 'value', 'expiresAt', 'createdAt', 'updatedAt'])
};

const oauthSchema = {
  oauthClient: {
    modelName: 'oauth_client',
    fields: createFieldMap([
      'clientId',
      'clientSecret',
      'disabled',
      'skipConsent',
      'enableEndSession',
      'subjectType',
      'scopes',
      'userId',
      'createdAt',
      'updatedAt',
      'name',
      'uri',
      'icon',
      'contacts',
      'tos',
      'policy',
      'softwareId',
      'softwareVersion',
      'softwareStatement',
      'redirectUris',
      'postLogoutRedirectUris',
      'tokenEndpointAuthMethod',
      'grantTypes',
      'responseTypes',
      'public',
      'type',
      'requirePKCE',
      'referenceId',
      'metadata'
    ])
  },
  oauthRefreshToken: {
    modelName: 'oauth_refresh_token',
    fields: createFieldMap(['token', 'clientId', 'sessionId', 'userId', 'referenceId', 'expiresAt', 'createdAt', 'revoked', 'authTime', 'scopes'])
  },
  oauthAccessToken: {
    modelName: 'oauth_access_token',
    fields: createFieldMap(['token', 'clientId', 'sessionId', 'userId', 'referenceId', 'refreshId', 'expiresAt', 'createdAt', 'scopes'])
  },
  oauthConsent: {
    modelName: 'oauth_consent',
    fields: createFieldMap(['clientId', 'userId', 'referenceId', 'scopes', 'createdAt', 'updatedAt'])
  }
};

const authEnv = getAuthEnv();
const isConfigured = !!(authEnv.baseURL && authEnv.secret && authEnv.databaseURL);

export const auth = isConfigured
  ? betterAuth({
      appName: authEnv.appName,
      baseURL: authEnv.baseURL,
      basePath: '/api/auth',
      secret: authEnv.secret,
      database: getDbPool(),
      user: {
        fields: coreFieldMaps.user
      },
      session: {
        fields: coreFieldMaps.session
      },
      account: {
        fields: coreFieldMaps.account
      },
      verification: {
        fields: coreFieldMaps.verification
      },
      trustedOrigins: authEnv.trustedOrigins,
      emailAndPassword: {
        enabled: true,
        requireEmailVerification: false,
        sendResetPassword: async ({ user, url }) => {
          await sendMail({
            to: user.email,
            subject: 'Reset your password',
            text: `Reset your password using this link: ${url}`
          });
        }
      },
      socialProviders: authEnv.githubClientId && authEnv.githubClientSecret
        ? {
            github: {
              clientId: authEnv.githubClientId,
              clientSecret: authEnv.githubClientSecret
            }
          }
        : {},
      plugins: [
        username({
          schema: {
            user: {
              fields: {
                username: 'username',
                displayUsername: 'display_username'
              }
            }
          }
        }),
        jwt({
          disableSettingJwtHeader: true,
          schema: {
            jwks: {
              modelName: 'jwks',
              fields: createFieldMap(['publicKey', 'privateKey', 'createdAt', 'expiresAt'])
            }
          },
          jwt: {
            issuer: authEnv.baseURL,
            audience: authEnv.oauthAudience,
            expirationTime: '15m',
            definePayload: ({ user }) => ({
              sub: user.id,
              email: user.email,
              name: user.name,
              preferred_username: typeof user.username === 'string' ? user.username : null
            })
          }
        }),
        oauthProvider({
          schema: oauthSchema,
          loginPage: '/auth/sign-in',
          consentPage: '/auth/consent',
          allowDynamicClientRegistration: authEnv.oauthAllowDynamicClientRegistration,
          validAudiences: [authEnv.oauthAudience],
          scopes: ['openid', 'profile', 'email', 'offline_access', 'read:portfolio', 'write:portfolio'],
          trustedClients: authEnv.oauthRedirectUris.length > 0
            ? [
                {
                  clientId: authEnv.oauthClientId,
                  clientSecret: authEnv.oauthClientSecret || undefined,
                  name: 'Portfolio Manager',
                  type: authEnv.oauthClientSecret ? 'web' : 'native',
                  redirectUris: authEnv.oauthRedirectUris,
                  postLogoutRedirectUris: authEnv.oauthPostLogoutRedirectUris,
                  tokenEndpointAuthMethod: authEnv.oauthClientSecret ? 'client_secret_post' : 'none',
                  grantTypes: ['authorization_code', 'refresh_token'],
                  responseTypes: ['code'],
                  skipConsent: true,
                  metadata: JSON.stringify({ application: 'portfolio-manager' })
                }
              ]
            : [],
          customAccessTokenClaims: ({ user, scopes }) => ({
            email: user?.email ?? null,
            name: user?.name ?? null,
            preferred_username: user && typeof user.username === 'string' ? user.username : null,
            scope: scopes.join(' ')
          }),
          customUserInfoClaims: ({ user }) => ({
            preferred_username: typeof user.username === 'string' ? user.username : null
          })
        }),
        sveltekitCookies(getRequestEvent)
      ],
      advanced: {
        database: {
          generateId: 'uuid'
        }
      }
    })
  : betterAuth({
      appName: authEnv.appName,
      baseURL: authEnv.baseURL || 'http://localhost:3001',
      basePath: '/api/auth',
      secret: authEnv.secret || 'development-fallback-secret-12345678901234567890',
      plugins: [sveltekitCookies(getRequestEvent)]
    });

export function isAuthConfigured() {
  return isConfigured;
}
