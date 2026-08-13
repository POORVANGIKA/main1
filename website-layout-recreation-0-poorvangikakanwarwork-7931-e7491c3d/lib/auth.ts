import { betterAuth } from 'better-auth'
import { pool } from '@/lib/db'

const isPlaceholderDatabaseUrl =
  !process.env.DATABASE_URL ||
  process.env.DATABASE_URL.includes('://user:password@host') ||
  process.env.DATABASE_URL.includes('host:5432')

const database = isPlaceholderDatabaseUrl ? undefined : pool

if (isPlaceholderDatabaseUrl) {
  console.warn('Using Better Auth memory adapter because DATABASE_URL is not configured.')
}

export const auth = betterAuth({
  database,
  baseURL:
    process.env.BETTER_AUTH_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : process.env.V0_RUNTIME_URL),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
  },
  trustedOrigins: [
    'http://localhost:3000',
    'http://localhost:3001',
    ...(process.env.V0_RUNTIME_URL ? [process.env.V0_RUNTIME_URL] : []),
    ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []),
    ...(process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? [`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`]
      : []),
  ],
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  ...(process.env.NODE_ENV === 'development'
    ? {
        advanced: {
          // For local dev over HTTP, do not require secure cookies.
          // Production can still use secure cookies when HTTPS is enabled.
          defaultCookieAttributes: {
            sameSite: 'none' as const,
            secure: false,
          },
        },
      }
    : {}),
})
