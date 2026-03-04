interface ArticleSchemaProps {
  article: {
    title: string
    description: string
    content: string
    slug: string
    coverImage?: string
    publishedAt: string
    updatedAt?: string
    authorName?: string
    category?: string
    tags?: string[]
    readingTime: number
  }
}

export function ArticleJsonLd({ article }: ArticleSchemaProps) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://newcanadian.careers'

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.description,
    ...(article.coverImage && {
      image: article.coverImage,
    }),
    datePublished: article.publishedAt,
    ...(article.updatedAt && { dateModified: article.updatedAt }),
    author: {
      '@type': 'Person',
      name: article.authorName || 'New Canadian Careers Team',
    },
    publisher: {
      '@type': 'Organization',
      name: 'New Canadian Careers',
      url: baseUrl,
    },
    url: `${baseUrl}/news/${article.slug}`,
    ...(article.tags && article.tags.length > 0 && { keywords: article.tags.join(', ') }),
    ...(article.category && { articleSection: article.category }),
    timeRequired: `PT${article.readingTime}M`,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${baseUrl}/news/${article.slug}`,
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, '\\u003c') }}
    />
  )
}

export function BreadcrumbJsonLd({ items }: { items: { name: string; url: string }[] }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, '\\u003c') }}
    />
  )
}
