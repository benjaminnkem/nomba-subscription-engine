export default () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  appName: process.env.APP_NAME ?? 'Nomba Subscription Engine',
  database: {
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    username: process.env.DB_USERNAME ?? 'postgres',
    password: process.env.DB_PASSWORD ?? 'postgres',
    name: process.env.DB_NAME ?? 'nomba_subscriptions',
    logging: process.env.DB_LOGGING ?? false,
  },
  redis: {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
    password: process.env.REDIS_PASSWORD ?? '',
  },
  jwt: {
    accessSecret:
      process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret-change-in-production',
    refreshSecret:
      process.env.JWT_REFRESH_SECRET ??
      'dev-refresh-secret-change-in-production',
    accessExpiry: process.env.JWT_ACCESS_EXPIRY ?? '15m',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY ?? '7d',
  },
  encryption: {
    key: process.env.ENCRYPTION_KEY ?? 'dev-encryption-key-32-bytes-long!',
  },
  nomba: {
    apiUrl: process.env.NOMBA_API_URL ?? 'https://api.nomba.com',
    accountId: process.env.NOMBA_ACCOUNT_ID ?? '',
    clientId: process.env.NOMBA_CLIENT_ID ?? '',
    clientSecret: process.env.NOMBA_CLIENT_SECRET ?? '',
    webhookSecret: process.env.NOMBA_WEBHOOK_SECRET ?? '',
  },
  cors: {
    origins: (process.env.CORS_ORIGINS ?? 'http://localhost:3000').split(','),
  },
});
