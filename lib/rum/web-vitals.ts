import { reportVital } from './reporter'

export function initWebVitals(): void {
  if (typeof window === 'undefined') return

  import('web-vitals').then(({ onLCP, onCLS, onINP }) => {
    const handle = (metric: { value: number; rating: string; navigationType: string; id: string }, name: string) => {
      reportVital({
        name,
        value: metric.value,
        rating: metric.rating,
        navigationType: metric.navigationType,
        id: metric.id,
      })
    }

    onLCP((m) => handle(m, 'LCP'))
    onCLS((m) => handle(m, 'CLS'))
    onINP((m) => handle(m, 'INP'))
  }).catch(() => {})
}
