'use client'

import { NextIntlClientProvider } from 'next-intl'

interface IntlProviderWrapperProps {
  locale: string
  messages: Record<string, unknown>
  children: React.ReactNode
}

export default function IntlProviderWrapper({
  locale,
  messages,
  children,
}: IntlProviderWrapperProps) {
  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  )
}
