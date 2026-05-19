import { betterAuth } from 'better-auth';
import { username, jwt } from 'better-auth/plugins';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { getRequestEvent } from '$app/server';
import { getDbPool } from './db';
import { getAuthEnv } from './auth-env';
import { sendMail } from './mail';

const authEnv = getAuthEnv();
const isConfigured = !!(authEnv.baseURL && authEnv.secret && authEnv.databaseURL);

export const auth = isConfigured
  ? betterAuth({
      appName: authEnv.appName,
      baseURL: authEnv.baseURL,
      basePath: '/api/auth',
      secret: authEnv.secret,
      database: getDbPool(),
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
        username(),
        jwt({
          jwt: {
            issuer: authEnv.baseURL,
            audience: authEnv.jwtAudience,
            expirationTime: '15m',
            definePayload: ({ user }) => ({
              sub: user.id,
              email: user.email,
              name: user.name,
              preferred_username: typeof user.username === 'string' ? user.username : null
            })
          }
        }),
        sveltekitCookies(getRequestEvent)
      ],
      user: {
        additionalFields: {
          defaultApp: {
            type: 'string',
            required: false,
            defaultValue: 'portfolio-manager'
          }
        }
      },
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
