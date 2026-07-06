import { useEffect } from 'react';

/**
 * SEO utility module — structured data and per-page meta management.
 * Works with the static index.html baseline; overrides title/meta per route.
 */

// ---------------------------------------------------------------------------
// usePageMeta — set <title> and <meta name="description"> per route
// ---------------------------------------------------------------------------
interface PageMeta {
  title: string;
  description?: string;
}

const TITLE_SUFFIX = ' | SPECS Portal';

export function usePageMeta({ title, description }: PageMeta): void {
  useEffect(() => {
    // Title
    const fullTitle = title ? `${title}${TITLE_SUFFIX}` : 'SPECS Portal';
    document.title = fullTitle;

    // Meta description
    const metaDescription = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (metaDescription && description) {
      metaDescription.setAttribute('content', description);
    } else if (description) {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = description;
      document.head.appendChild(meta);
    }

    // OG title
    const ogTitle = document.querySelector<HTMLMetaElement>('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', title || 'SPECS Portal');

    // OG description
    const ogDesc = document.querySelector<HTMLMetaElement>('meta[property="og:description"]');
    if (ogDesc && description) ogDesc.setAttribute('content', description);

    // Twitter title
    const twTitle = document.querySelector<HTMLMetaElement>('meta[name="twitter:title"]');
    if (twTitle) twTitle.setAttribute('content', title || 'SPECS Portal');

    // Twitter description
    const twDesc = document.querySelector<HTMLMetaElement>('meta[name="twitter:description"]');
    if (twDesc && description) twDesc.setAttribute('content', description);

    // Canonical URL — update to match current path
    const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (canonical) {
      canonical.setAttribute('href', `${window.location.origin}${window.location.pathname}`);
    }
  }, [title, description]);
}

// ---------------------------------------------------------------------------
// Structured Data (JSON-LD) — Organization + WebSite schema
// ---------------------------------------------------------------------------
export const SPECS_ORGANIZATION_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': 'https://specs-portal.org/#organization',
  name: 'Society of Programmers and Enthusiasts in Computer Science',
  alternateName: 'SPECS',
  url: 'https://specs-portal.org',
  logo: 'https://specs-portal.org/logo.webp',
  description:
    'Official student organization for Computer Science students at Partido State University College of Engineering and Computational Sciences.',
  email: 'parsu.specs@gmail.com',
  telephone: '+63 912 345 6780',
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Partido State University, Goa Campus',
    addressLocality: 'Goa',
    addressRegion: 'Camarines Sur',
    addressCountry: 'PH',
  },
  parentOrganization: {
    '@type': 'CollegeOrUniversity',
    name: 'Partido State University',
    url: 'https://parsu.edu.ph',
  },
  sameAs: [
    'https://www.facebook.com/parsu.specs',
    'https://github.com/james719-code/SPECS-Organization-Management-System',
  ],
};

export const SPECS_WEBSITE_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': 'https://specs-portal.org/#website',
  url: 'https://specs-portal.org',
  name: 'SPECS Portal',
  description:
    'Official organization management portal for SPECS — manage member profiles, track attendance, settle dues, explore events, and showcase student portfolios.',
  publisher: {
    '@id': 'https://specs-portal.org/#organization',
  },
  inLanguage: 'en-PH',
};

export function SPECS_STRUCTURED_DATA(): string {
  return JSON.stringify([SPECS_ORGANIZATION_SCHEMA, SPECS_WEBSITE_SCHEMA], null, 2);
}
