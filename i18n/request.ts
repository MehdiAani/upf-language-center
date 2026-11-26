import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';

const SUPPORTED_LOCALES = ['en', 'fr'] as const;
type Locale = (typeof SUPPORTED_LOCALES)[number];

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get('NEXT_LOCALE')?.value;
  const locale: Locale =
    cookieLocale === 'fr' || cookieLocale === 'en' ? cookieLocale : 'en';

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});