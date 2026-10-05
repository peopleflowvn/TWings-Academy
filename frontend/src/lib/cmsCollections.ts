/**
 * API mappings for the CMS lists persisted through useServerCollection (UI shape <-> DRF camelCase).
 * Fields only the UI knows about are dropped on the way out and given defaults on the way in.
 */
import { AdmissionCampaign, Article, CourseCohort, HeroBannerItem, Instructor } from '../types';
import { CollectionOptions, isoToViDate, viDateToIso } from './serverCollection';

/* eslint-disable @typescript-eslint/no-explicit-any */

export const COHORTS: CollectionOptions<CourseCohort> = {
  endpoint: '/staff/cohorts/',
  fromServer: (d: any) => ({
    id: d.id,
    courseId: d.course,
    courseTitle: d.courseTitle || '',
    name: d.name,
    startDate: isoToViDate(d.startDate),
    registrationDeadline: isoToViDate(d.registrationDeadline),
    capacity: d.capacity,
    status: d.status,
    nextCohortId: d.nextCohort || undefined,
    nextCohortName: d.nextCohortName || undefined,
    autoRolloverWaitlist: d.autoRolloverWaitlist,
    leadInstructorId: d.leadInstructor || undefined,
    leadInstructorName: d.leadInstructorName || undefined,
    location: d.location || '',
    notes: d.notes || ''
  }),
  toServer: (c) => ({
    course: c.courseId,
    name: c.name,
    startDate: viDateToIso(c.startDate),
    registrationDeadline: viDateToIso(c.registrationDeadline),
    capacity: c.capacity,
    status: c.status,
    nextCohort: c.nextCohortId || null,
    autoRolloverWaitlist: c.autoRolloverWaitlist ?? true,
    leadInstructor: c.leadInstructorId || null,
    location: c.location || '',
    notes: c.notes || ''
  })
};

export const CAMPAIGNS: CollectionOptions<AdmissionCampaign> = {
  endpoint: '/staff/campaigns/',
  fromServer: (d: any) => ({
    id: d.id,
    code: d.code,
    name: d.name,
    timeRange: d.timeRange || '',
    startDate: isoToViDate(d.startDate),
    deadline: isoToViDate(d.deadline),
    status: d.status,
    targetHeadcount: d.targetHeadcount,
    totalEnrolled: d.totalEnrolled || 0,
    positions: (d.positions || []).map((p: any) => ({
      id: p.id,
      courseId: p.courseId,
      positionTitle: p.positionTitle,
      shortName: p.shortName,
      department: p.department || '',
      targetQuota: p.targetQuota,
      enrolledCount: p.enrolledCount || 0,
      leadInstructorName: p.leadInstructorName || '',
      salaryRange: p.salaryRange || '',
      badgeBg: p.badgeBg || '',
      iconName: p.iconName || ''
    })),
    leadRecruiter: d.leadRecruiter || '',
    scholarshipBudget: d.scholarshipBudget || 0,
    location: d.location || '',
    description: d.description || ''
  }),
  toServer: (c) => ({
    code: c.code,
    name: c.name,
    timeRange: c.timeRange || '',
    startDate: viDateToIso(c.startDate),
    deadline: viDateToIso(c.deadline),
    status: c.status,
    targetHeadcount: c.targetHeadcount || 0,
    leadRecruiter: c.leadRecruiter || '',
    scholarshipBudget: c.scholarshipBudget || 0,
    location: c.location || '',
    description: c.description || '',
    positions: (c.positions || []).map((p) => ({
      id: p.id,
      courseId: p.courseId,
      positionTitle: p.positionTitle,
      shortName: p.shortName,
      department: p.department || '',
      targetQuota: p.targetQuota || 0,
      leadInstructorName: p.leadInstructorName || '',
      salaryRange: p.salaryRange || '',
      badgeBg: p.badgeBg || '',
      iconName: p.iconName || ''
    }))
  })
};

// ---------------------------------------------------------------- content
function toIsoDateTime(value?: string | null): string | null {
  if (!value) return null;
  const date = viDateToIso(value);
  if (date && !/T/.test(value)) return `${date}T00:00:00+07:00`;
  return /^\d{4}-\d{2}-\d{2}T/.test(value) ? value : null;
}

export const ARTICLES: CollectionOptions<Article> = {
  endpoint: '/staff/articles/',
  debounceMs: 1200,
  fromServer: (d: any) => ({
    id: d.id,
    slug: d.slug,
    title: d.title,
    excerpt: d.excerpt || '',
    content: d.content || '',
    featuredImage: d.featuredImage || '',
    category: d.category || '',
    author: d.author || '',
    publishedAt: d.publishedAt ? isoToViDate(d.publishedAt) : '',
    status: d.status,
    tags: d.tags || [],
    viewsCount: d.viewsCount || 0,
    metaTitle: d.metaTitle || '',
    metaDescription: d.metaDescription || '',
    focusKeyword: d.focusKeyword || '',
    canonicalUrl: d.canonicalUrl || '',
    seoScore: d.seoScore || 0,
    seoChecks: d.seoChecks || {}
  }),
  toServer: (a) => ({
    slug: a.slug,
    title: a.title,
    excerpt: a.excerpt || '',
    content: a.content || '',
    featuredImage: a.featuredImage || '',
    category: a.category || '',
    author: a.author || '',
    status: a.status,
    publishedAt: toIsoDateTime(a.publishedAt),
    tags: a.tags || [],
    metaTitle: a.metaTitle || '',
    metaDescription: a.metaDescription || '',
    focusKeyword: a.focusKeyword || '',
    canonicalUrl: /^https?:\/\//.test(a.canonicalUrl || '') ? a.canonicalUrl : '',
    seoScore: Math.round(a.seoScore || 0),
    seoChecks: a.seoChecks || {}
  })
};

export const INSTRUCTORS: CollectionOptions<Instructor> = {
  endpoint: '/staff/instructors/',
  fromServer: (d: any) => ({
    id: d.id,
    name: d.name,
    title: d.title,
    organization: d.organization || '',
    avatar: d.avatar || '',
    bio: d.bio || '',
    credential: d.credential || '',
    rating: d.rating !== null && d.rating !== undefined ? Number(d.rating) : undefined,
    studentsCount: d.studentsCount || 0,
    email: d.email || '',
    phone: d.phone || '',
    yearsOfExperience: d.yearsOfExperience ?? undefined,
    status: d.status,
    bankPosition: d.bankPosition || '',
    linkedinUrl: d.linkedinUrl || ''
  }),
  toServer: (i) => ({
    name: i.name,
    title: i.title,
    organization: i.organization || '',
    avatar: i.avatar || '',
    bio: i.bio || '',
    credential: i.credential || '',
    rating: i.rating ?? null,
    studentsCount: i.studentsCount || 0,
    email: i.email || '',
    phone: i.phone || '',
    yearsOfExperience: i.yearsOfExperience ?? null,
    status: i.status || 'active',
    bankPosition: i.bankPosition || '',
    linkedinUrl: /^https?:\/\//.test(i.linkedinUrl || '') ? i.linkedinUrl : ''
  })
};

export const BANNERS: CollectionOptions<HeroBannerItem> = {
  endpoint: '/staff/banners/',
  debounceMs: 1200,
  fromServer: (d: any) => ({
    id: d.id,
    title: d.title,
    subtitle: d.subtitle || '',
    bgGradient: d.bgGradient || '',
    buttonText: d.buttonText || '',
    buttonAction: d.buttonAction || 'browse_catalog',
    buttonStyle: d.buttonStyle || 'primary',
    partnerBadges: d.partnerBadges || [],
    imageUrl: d.imageUrl || '',
    floatingBadges: d.floatingBadges || [],
    displayType: d.displayType || 'card',
    fullBannerImageUrl: d.fullBannerImageUrl || '',
    linkUrl: d.linkUrl || '',
    targetBlank: !!d.targetBlank
  }),
  toServer: (b) => ({
    title: b.title,
    subtitle: b.subtitle || '',
    bgGradient: b.bgGradient || '',
    buttonText: b.buttonText || '',
    buttonAction: b.buttonAction || '',
    buttonStyle: b.buttonStyle || 'primary',
    partnerBadges: b.partnerBadges || [],
    imageUrl: b.imageUrl || '',
    floatingBadges: b.floatingBadges || [],
    displayType: b.displayType || 'card',
    fullBannerImageUrl: b.fullBannerImageUrl || '',
    linkUrl: b.linkUrl || '',
    targetBlank: !!b.targetBlank,
    isActive: true
  })
};
