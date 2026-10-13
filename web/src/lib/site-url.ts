const LOCAL_SITE_URL = 'http://localhost:3000';
const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

if (!configuredSiteUrl && process.env.NODE_ENV === 'production') {
  throw new Error('NEXT_PUBLIC_SITE_URL must be configured for production builds.');
}

const parsedSiteUrl = new URL(configuredSiteUrl || LOCAL_SITE_URL);

if (parsedSiteUrl.protocol !== 'http:' && parsedSiteUrl.protocol !== 'https:') {
  throw new Error('NEXT_PUBLIC_SITE_URL must use http or https.');
}

export const SITE_URL = parsedSiteUrl.origin;
