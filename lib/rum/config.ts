export const RUM_CONFIG = {
  enabled: process.env.NEXT_PUBLIC_RUM_ENABLED !== 'false',
  endpoint: process.env.NEXT_PUBLIC_RUM_ENDPOINT || '/rum/v1/web-vitals/',
  hmacKey: typeof window === 'undefined' ? (process.env.RUM_HMAC_KEY || '') : '',
  sampleRate: parseInt(process.env.NEXT_PUBLIC_RUM_SAMPLE_RATE || '100', 10),
  release: process.env.NEXT_PUBLIC_GIT_SHA || 'dev',
  batchSize: 10,
  flushInterval: 5000,
} as const
