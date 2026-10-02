// Export the bundled demo content to backend/fixtures/seed_content.json so the Django API can serve
// the same catalogue. Content only: demo CRM leads/users are deliberately NOT exported.
//   node scripts/export-seed.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(root, '../backend/fixtures/seed_content.json');

const server = await createServer({ root, logLevel: 'error', server: { middlewareMode: true, hmr: false } });
try {
  const load = (p) => server.ssrLoadModule(p);
  const coursera = await load('/src/data/courseraData.ts');
  const legacy = await load('/src/data/coursesData.ts');
  const cohorts = await load('/src/utils/cohortRouting.ts');
  const campaigns = await load('/src/utils/talentCampaigns.ts');
  const emails = await load('/src/utils/resendEmail.ts');

  const seed = {
    partners: coursera.DEFAULT_PARTNERS,
    instructors: legacy.REAL_INSTRUCTORS,
    courses: coursera.COURSES,
    cohorts: cohorts.INITIAL_COHORTS,
    campaigns: campaigns.INITIAL_CAMPAIGNS,
    coupons: legacy.INITIAL_COUPONS,
    banners: coursera.HERO_BANNERS,
    articles: coursera.INITIAL_ARTICLES,
    siteSeo: coursera.INITIAL_SEO_SETTINGS,
    homepageSections: legacy.DEFAULT_CMS_SECTIONS,
    emailTemplates: emails.INITIAL_EMAIL_TEMPLATES,
  };
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify(seed, null, 1) + '\n');
  console.log(`Wrote ${out}`);
  for (const [k, v] of Object.entries(seed)) console.log(`  ${k}: ${Array.isArray(v) ? v.length : 'object'}`);
} finally {
  await server.close();
}
