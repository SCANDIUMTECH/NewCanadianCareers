import { OrganizationSchema } from '@/lib/seo-types'

interface OrganizationSchemaProps {
  company: {
    name: string
    description?: string
    website?: string
    logo?: string
    foundingDate?: string
    employeeCount?: {
      min?: number
      max?: number
    }
    location?: {
      city: string
      state?: string
      country: string
      streetAddress?: string
      postalCode?: string
    }
    email?: string
    phone?: string
    socialLinks?: string[]
    industry?: string
  }
}

export function OrganizationJsonLd({ company }: OrganizationSchemaProps) {
  const schema: OrganizationSchema & { '@context': string; '@type': string } = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: company.name,
    ...(company.website && { url: company.website }),
    ...(company.logo && { logo: company.logo }),
    ...(company.description && { description: company.description }),
    ...(company.foundingDate && { foundingDate: company.foundingDate }),
    ...(company.employeeCount && {
      numberOfEmployees: {
        '@type': 'QuantitativeValue',
        ...(company.employeeCount.min && { minValue: company.employeeCount.min }),
        ...(company.employeeCount.max && { maxValue: company.employeeCount.max }),
      },
    }),
    ...(company.location && {
      address: {
        '@type': 'PostalAddress',
        addressLocality: company.location.city,
        ...(company.location.state && { addressRegion: company.location.state }),
        addressCountry: company.location.country,
        ...(company.location.streetAddress && { streetAddress: company.location.streetAddress }),
        ...(company.location.postalCode && { postalCode: company.location.postalCode }),
      },
    }),
    ...((company.email || company.phone) && {
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'customer service',
        ...(company.email && { email: company.email }),
        ...(company.phone && { telephone: company.phone }),
      },
    }),
    ...(company.socialLinks && company.socialLinks.length > 0 && { sameAs: company.socialLinks }),
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, '\\u003c') }}
    />
  )
}

// For previewing schema in admin panel
export function generateOrganizationSchema(company: OrganizationSchemaProps['company']): string {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: company.name,
    ...(company.website && { url: company.website }),
    ...(company.logo && { logo: company.logo }),
    ...(company.description && { description: company.description }),
    ...(company.foundingDate && { foundingDate: company.foundingDate }),
    ...(company.employeeCount && {
      numberOfEmployees: {
        '@type': 'QuantitativeValue',
        ...(company.employeeCount.min && { minValue: company.employeeCount.min }),
        ...(company.employeeCount.max && { maxValue: company.employeeCount.max }),
      },
    }),
    ...(company.location && {
      address: {
        '@type': 'PostalAddress',
        addressLocality: company.location.city,
        ...(company.location.state && { addressRegion: company.location.state }),
        addressCountry: company.location.country,
      },
    }),
    ...(company.socialLinks && company.socialLinks.length > 0 && { sameAs: company.socialLinks }),
  }

  return JSON.stringify(schema, null, 2)
}
