/**
 * URLs of the public site (homepage app). Keep in step with backend/apps/cms/seo.py, which renders the
 * same paths for link-preview / search bots and lists them in the sitemap.
 */
export type View = 'home' | 'catalog' | 'course-detail' | 'articles' | 'article-detail' | 'about';

export interface Route {
  view: View;
  slug?: string;
}

export function parseRoute(pathname: string): Route | null {
  const parts = pathname.replace(/\/+$/, '').split('/').filter(Boolean).map(decodeURIComponent);
  if (parts.length === 0) return { view: 'home' };
  if (parts[0] === 'khoa-hoc') return parts[1] ? { view: 'course-detail', slug: parts[1] } : { view: 'catalog' };
  if (parts[0] === 'tin-tuc') return parts[1] ? { view: 'article-detail', slug: parts[1] } : { view: 'articles' };
  if (parts[0] === 've-chung-toi' && parts.length === 1) return { view: 'about' };
  return null;
}

export function routePath(view: View, slug?: string): string {
  switch (view) {
    case 'catalog':
      return '/khoa-hoc';
    case 'course-detail':
      return slug ? `/khoa-hoc/${encodeURIComponent(slug)}` : '/khoa-hoc';
    case 'articles':
      return '/tin-tuc';
    case 'article-detail':
      return slug ? `/tin-tuc/${encodeURIComponent(slug)}` : '/tin-tuc';
    case 'about':
      return '/ve-chung-toi';
    default:
      return '/';
  }
}
