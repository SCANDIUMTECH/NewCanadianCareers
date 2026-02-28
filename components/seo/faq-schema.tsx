/**
 * FAQPage JSON-LD Schema Component.
 *
 * Renders structured FAQ data for AI search engines (ChatGPT, Perplexity,
 * Google AI Overviews) and Google rich results. Helps pages appear in
 * featured snippets and AI-generated answers.
 */

interface FAQItem {
  question: string
  answer: string
}

interface FAQPageJsonLdProps {
  items: FAQItem[]
}

export function FAQPageJsonLd({ items }: FAQPageJsonLdProps) {
  if (!items || items.length === 0) return null

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, '\\u003c') }}
    />
  )
}

/**
 * Generate FAQ items from job data.
 *
 * Creates common questions that candidates ask, using actual job data.
 * This helps AI search engines extract structured Q&A from job pages.
 */
export function generateJobFAQItems(job: {
  title: string
  company: { name: string }
  location: { city: string; state?: string; country: string; remote?: string }
  salary?: { min: number; max: number; currency: string; period: string } | null
  type: string
  experience?: string
  requirements?: string[]
  skills?: string[]
}): FAQItem[] {
  const items: FAQItem[] = []

  // Location question
  if (job.location.remote === 'remote') {
    items.push({
      question: `Is the ${job.title} position at ${job.company.name} remote?`,
      answer: `Yes, this ${job.title} position at ${job.company.name} is a fully remote role. You can work from anywhere in ${job.location.country}.`,
    })
  } else {
    const loc = [job.location.city, job.location.state].filter(Boolean).join(', ')
    const locType = job.location.remote === 'hybrid' ? 'hybrid' : 'on-site'
    items.push({
      question: `Where is the ${job.title} job at ${job.company.name} located?`,
      answer: `This ${job.title} position is an ${locType} role based in ${loc}, ${job.location.country}.`,
    })
  }

  // Salary question
  if (job.salary && job.salary.min > 0 && job.salary.max > 0) {
    const periodMap: Record<string, string> = {
      year: 'per year',
      month: 'per month',
      week: 'per week',
      hour: 'per hour',
    }
    const period = periodMap[job.salary.period] || 'per year'
    const fmt = (n: number) =>
      n >= 1000 ? `${Math.round(n / 1000)}K` : String(n)

    items.push({
      question: `What is the salary range for the ${job.title} position at ${job.company.name}?`,
      answer: `The salary range for this ${job.title} position is ${job.salary.currency} ${fmt(job.salary.min)} to ${fmt(job.salary.max)} ${period}.`,
    })
  }

  // Requirements question
  if (job.requirements && job.requirements.length > 0) {
    const topReqs = job.requirements.slice(0, 5).join('; ')
    items.push({
      question: `What are the requirements for the ${job.title} role at ${job.company.name}?`,
      answer: `Key requirements include: ${topReqs}.`,
    })
  }

  // Employment type question
  if (job.type) {
    const typeMap: Record<string, string> = {
      full_time: 'full-time',
      part_time: 'part-time',
      contract: 'contract',
      temporary: 'temporary',
      internship: 'internship',
      freelance: 'freelance',
    }
    const typeLabel = typeMap[job.type] || job.type
    items.push({
      question: `Is the ${job.title} position at ${job.company.name} full-time?`,
      answer: `This ${job.title} position at ${job.company.name} is a ${typeLabel} role.`,
    })
  }

  return items
}
