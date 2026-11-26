import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { getLocale, getMessages } from 'next-intl/server'
import IntlProviderWrapper from '@/app/intl-provider'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'UPF Language Center',
  description: 'Language Center Management Platform',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const locale = (await getLocale()) || 'en'
  const messages = await getMessages()

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <IntlProviderWrapper locale={locale} messages={messages}>
          {children}
        </IntlProviderWrapper>
      </body>
    </html>
  )
}