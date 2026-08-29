import { z } from "zod";

const optionalText = z.string().trim().max(10_000).optional();

export const ExperienceSchema = z
  .object({
    title: z.string().trim().min(1).max(300),
    company: z.string().trim().min(1).max(300),
    location: optionalText,
    startDate: optionalText,
    endDate: optionalText,
    description: optionalText,
  })
  .strict();

export const EducationSchema = z
  .object({
    school: z.string().trim().min(1).max(300),
    degree: optionalText,
    field: optionalText,
    startDate: optionalText,
    endDate: optionalText,
    description: optionalText,
  })
  .strict();

export const FeaturedItemSchema = z
  .object({
    title: z.string().trim().min(1).max(300),
    url: z.url().optional(),
    description: optionalText,
  })
  .strict();

export const ProfileDocumentSchema = z
  .object({
    fullName: optionalText,
    headline: optionalText,
    about: optionalText,
    location: optionalText,
    industry: optionalText,
    experience: z.array(ExperienceSchema).max(100).default([]),
    education: z.array(EducationSchema).max(100).default([]),
    skills: z.array(z.string().trim().min(1).max(200)).max(200).default([]),
    featured: z.array(FeaturedItemSchema).max(100).default([]),
  })
  .strict();

export type ProfileDocument = z.infer<typeof ProfileDocumentSchema>;

export const AuditOptionsSchema = z
  .object({
    targetRole: z.string().trim().min(1).max(300).optional(),
    keywords: z.array(z.string().trim().min(1).max(100)).max(50).default([]),
  })
  .strict();

export type AuditOptions = z.input<typeof AuditOptionsSchema>;

export type FindingStatus = "pass" | "improve";
export type FindingSeverity = "info" | "warning" | "error";

export interface AuditFinding {
  code: string;
  section: "identity" | "headline" | "about" | "experience" | "skills" | "featured" | "education";
  status: FindingStatus;
  severity: FindingSeverity;
  message: string;
  recommendation: string;
  pointsEarned: number;
  pointsAvailable: number;
}

export interface ProfileAudit {
  schemaVersion: "1.0";
  score: number;
  grade: "excellent" | "strong" | "developing" | "incomplete";
  summary: string;
  findings: AuditFinding[];
}
