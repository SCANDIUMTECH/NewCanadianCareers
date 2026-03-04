import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://newcanadian.careers'

  const publicAllow = [
    '/',
    '/jobs',
    '/jobs/*',
    '/companies',
    '/companies/*',
  ]

  const dashboardDisallow = [
    '/admin',
    '/company',
    '/candidate',
    '/agency',
    '/api',
  ]

  const aiBots = [
    'GPTBot',
    'ChatGPT-User',
    'ClaudeBot',
    'Claude-Web',
    'PerplexityBot',
    'bingbot',
    'Google-Extended',
  ]

  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          ...publicAllow,
          '/about',
          '/contact',
        ],
        disallow: [
          ...dashboardDisallow,
          '/admin/*',
          '/company/*',
          '/candidate/*',
          '/agency/*',
          '/api/*',
          '/login',
          '/signup',
          '/settings',
          '/dashboard',
          '/_next',
          '/private',
        ],
      },
      ...aiBots.map((userAgent) => ({
        userAgent,
        allow: publicAllow,
        disallow: dashboardDisallow,
      })),
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
