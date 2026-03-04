import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import localFont from 'next/font/local'
import { Analytics } from '@vercel/analytics/next'
import { AuthProvider } from '@/lib/auth/context'
import { GDPRProvider } from '@/components/gdpr/GDPRProvider'
import { CookieBanner } from '@/components/gdpr/CookieBanner'
import { PrivacySettingsModal } from '@/components/gdpr/PrivacySettingsModal'
import { PrivacySettingsTrigger } from '@/components/gdpr/PrivacySettingsTrigger'
import { Toaster } from 'sonner'
import { RUMProvider } from '@/components/rum-provider'
import './globals.css'

const inter = localFont({
  src: '../assets/fonts/Inter/Inter-VariableFont_opsz,wght.ttf',
  weight: "100 900",
  variable: "--font-face-primary",
  display: "swap",
});

const interItalic = localFont({
  src: '../assets/fonts/Inter/Inter-Italic-VariableFont_opsz,wght.ttf',
  weight: "100 900",
  style: "italic",
  variable: "--font-face-primary-italic",
  display: "swap",
  preload: false,
});

const manrope = localFont({
  src: '../assets/fonts/Manrope/Manrope-VariableFont_wght.ttf',
  weight: "200 800",
  variable: "--font-face-secondary",
  display: "swap",
});

const jetbrainsMono = localFont({
  src: '../assets/fonts/JetBrains_Mono/JetBrainsMono-VariableFont_wght.ttf',
  weight: "100 800",
  variable: "--font-face-mono",
  display: "swap",
});

const jetbrainsMonoItalic = localFont({
  src: '../assets/fonts/JetBrains_Mono/JetBrainsMono-Italic-VariableFont_wght.ttf',
  weight: "100 800",
  style: "italic",
  variable: "--font-face-mono-italic",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: 'New Canadian Careers - Your Gateway to Canadian Employment',
  description: 'New Canadian Careers helps newcomers to Canada find meaningful employment — connecting candidates, companies, and agencies.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'https://newcanadian.careers'),
  openGraph: {
    title: 'New Canadian Careers - Your Gateway to Canadian Employment',
    description: 'New Canadian Careers helps newcomers to Canada find meaningful employment — connecting candidates, companies, and agencies.',
    siteName: 'New Canadian Careers',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'New Canadian Careers - Your Gateway to Canadian Employment',
    description: 'New Canadian Careers helps newcomers to Canada find meaningful employment — connecting candidates, companies, and agencies.',
    images: ['/og-image.png'],
  },
  icons: {
    icon: [
      {
        url: '/favicon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/favicon.svg',
  },
}

export const viewport: Viewport = {
  themeColor: '#F2F2F2',
}

const fontVariables = [
  inter.variable,
  interItalic.variable,
  manrope.variable,
  jetbrainsMono.variable,
  jetbrainsMonoItalic.variable,
].join(' ')

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode
}>) {
  return (
    <html lang="en" className={fontVariables}>
      <body className="font-sans antialiased">
        <AuthProvider>
          <GDPRProvider>
            {children}
            <CookieBanner />
            <PrivacySettingsModal />
            <PrivacySettingsTrigger />
          </GDPRProvider>
        </AuthProvider>
        <Toaster richColors position="top-right" />
        <RUMProvider />
        <Analytics />
      </body>
    </html>
  )
}
