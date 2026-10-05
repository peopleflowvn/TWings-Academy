/**
 * API mappings for the CMS lists persisted through useServerCollection (UI shape <-> DRF camelCase).
 * Fields only the UI knows about are dropped on the way out and given defaults on the way in.
 */
import { AdmissionCampaign, CourseCohort } from '../types';
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
