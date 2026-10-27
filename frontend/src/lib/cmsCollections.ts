/**
 * API mappings for the CMS lists persisted through useServerCollection (UI shape <-> DRF camelCase).
 * Fields only the UI knows about are dropped on the way out and given defaults on the way in.
 */
import { Article, CourseCohort, EmailSendLog, EmailTemplate, HeroBannerItem, Instructor } from '../types';
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
  debounceMs: 800,
  query: 'ordering=sort_order',
  fromServer: (d: any) => ({
    id: d.id,
    title: d.title,
    subtitle: d.subtitle || '',
    bgGradient: d.bgGradient || d.bg_gradient || '',
    cardTemplate: d.cardTemplate || d.card_template || 'modern_split',
    sortOrder: typeof d.sortOrder === 'number' ? d.sortOrder : (typeof d.sort_order === 'number' ? d.sort_order : 0),
    buttonText: d.buttonText || d.button_text || '',
    buttonAction: d.buttonAction || d.button_action || 'browse_catalog',
    buttonStyle: d.buttonStyle || d.button_style || 'primary',
    partnerBadges: d.partnerBadges || d.partner_badges || [],
    imageUrl: d.imageUrl || d.image_url || '',
    floatingBadges: d.floatingBadges || d.floating_badges || [],
    displayType: d.displayType || d.display_type || 'card',
    fullBannerImageUrl: d.fullBannerImageUrl || d.full_banner_image_url || '',
    linkUrl: d.linkUrl || d.link_url || '',
    targetBlank: !!(d.targetBlank ?? d.target_blank),
    showOverlayText: !!(d.showOverlayText ?? d.show_overlay_text),
    showOverlayButton: !!(d.showOverlayButton ?? d.show_overlay_button)
  }),
  toServer: (b) => ({
    title: b.title,
    subtitle: b.subtitle || '',
    bgGradient: b.bgGradient || '',
    bg_gradient: b.bgGradient || '',
    cardTemplate: b.cardTemplate || 'modern_split',
    card_template: b.cardTemplate || 'modern_split',
    sortOrder: typeof b.sortOrder === 'number' ? b.sortOrder : 0,
    sort_order: typeof b.sortOrder === 'number' ? b.sortOrder : 0,
    buttonText: b.buttonText || '',
    button_text: b.buttonText || '',
    buttonAction: b.buttonAction || '',
    button_action: b.buttonAction || '',
    buttonStyle: b.buttonStyle || 'primary',
    button_style: b.buttonStyle || 'primary',
    partnerBadges: b.partnerBadges || [],
    partner_badges: b.partnerBadges || [],
    imageUrl: b.imageUrl || '',
    image_url: b.imageUrl || '',
    floatingBadges: b.floatingBadges || [],
    floating_badges: b.floatingBadges || [],
    displayType: b.displayType || 'card',
    display_type: b.displayType || 'card',
    fullBannerImageUrl: b.fullBannerImageUrl || '',
    full_banner_image_url: b.fullBannerImageUrl || '',
    linkUrl: b.linkUrl || '',
    link_url: b.linkUrl || '',
    targetBlank: !!b.targetBlank,
    target_blank: !!b.targetBlank,
    showOverlayText: !!b.showOverlayText,
    show_overlay_text: !!b.showOverlayText,
    showOverlayButton: !!b.showOverlayButton,
    show_overlay_button: !!b.showOverlayButton,
    isActive: true,
    is_active: true
  })
};

// ---------------------------------------------------------------- e-mail
export const EMAIL_TEMPLATES: CollectionOptions<EmailTemplate> = {
  endpoint: '/staff/email-templates/',
  debounceMs: 1200,
  fromServer: (d: any) => ({
    id: d.id,
    code: d.code,
    name: d.name,
    category: d.category,
    subject: d.subject,
    body: d.body,
    variables: d.variables || [],
    description: d.description || '',
    updatedAt: d.updatedAt ? new Date(d.updatedAt).toLocaleString('vi-VN') : ''
  }),
  toServer: (t) => ({
    code: t.code,
    name: t.name,
    category: t.category,
    subject: t.subject,
    body: t.body,
    variables: t.variables || [],
    description: t.description || ''
  })
};

const viTime = (iso?: string | null) => (iso ? new Date(iso).toLocaleString('vi-VN') : undefined);

/** EmailLog rows (read-only history, updated by Resend webhooks on the server). */
export const emailLogFromServer = (d: any): EmailSendLog => ({
  id: d.id,
  templateId: d.templateCode || d.template || 'custom',
  templateName: d.templateName || d.templateCode || 'Email tùy chỉnh',
  recipientEmail: d.recipientEmail,
  recipientName: d.recipientName || '',
  subject: d.subject,
  sentAt: viTime(d.sentAt) || viTime(d.createdAt) || '',
  deliveredAt: viTime(d.deliveredAt),
  openedAt: viTime(d.openedAt),
  openCount: d.openCount || 0,
  clickedAt: viTime(d.clickedAt),
  clickCount: d.clickCount || 0,
  lastClickedUrl: d.lastClickedUrl || undefined,
  bouncedAt: viTime(d.bouncedAt),
  bounceReason: d.bounceReason || undefined,
  status: d.status,
  resendMessageId: d.resendMessageId || undefined,
  errorMessage: d.errorMessage || undefined,
  renderedHtml: d.renderedHtml || undefined,
  webhookEvents: (d.webhookEvents || []).map((e: any) => ({
    type: e.type,
    timestamp: viTime(e.receivedAt || e.timestamp) || '',
    details: e.details || ''
  }))
});
