import { BreadcrumbItem } from '@/lib/seo-types'

interface BreadcrumbSchemaProps {
  items: BreadcrumbItem[]
}

export function BreadcrumbJsonLd({ items }: BreadcrumbSchemaProps) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://orion.jobs'

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url.startsWith('http') ? item.url : `${baseUrl}${item.url}`,
    })),
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, '\\u003c') }}
    />
  )
}

// For generating breadcrumb items from a path
export function generateBreadcrumbItems(
  path: string,
  customLabels?: Record<string, string>
): BreadcrumbItem[] {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://orion.jobs'
  const segments = path.split('/').filter(Boolean)

  const defaultLabels: Record<string, string> = {
    jobs: 'Jobs',
    companies: 'Companies',
    category: 'Category',
    location: 'Location',
    ...customLabels,
  }

  const items: BreadcrumbItem[] = [
    { name: 'Home', url: baseUrl },
  ]

  let currentPath = ''
  segments.forEach((segment) => {
    currentPath += `/${segment}`
    const label = defaultLabels[segment] || segment
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
    items.push({ name: label, url: `${baseUrl}${currentPath}` })
  })

  return items
}
