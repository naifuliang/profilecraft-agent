import type { AuditFinding, AuditOptions, ProfileAudit, ProfileDocument } from "./profile.js";
import { AuditOptionsSchema, ProfileDocumentSchema } from "./profile.js";

const quantifiedOutcome = /(?:\$|£|€)?\b\d+(?:[.,]\d+)?(?:%|[kKmMbB])?\b/u;
const firstPerson = /\b(?:I|I'm|I've|my|me)\b/iu;
const callToAction = /\b(?:contact|connect|message|reach out|let's talk|let us talk)\b/iu;

interface FindingInput extends Omit<AuditFinding, "status" | "severity"> {
  passed: boolean;
  severity?: AuditFinding["severity"];
}

function finding(input: FindingInput): AuditFinding {
  return {
    code: input.code,
    section: input.section,
    status: input.passed ? "pass" : "improve",
    severity: input.passed ? "info" : (input.severity ?? "warning"),
    message: input.message,
    recommendation: input.recommendation,
    pointsEarned: input.passed ? input.pointsAvailable : input.pointsEarned,
    pointsAvailable: input.pointsAvailable,
  };
}

function containsNeedle(text: string, needle: string): boolean {
  return text.toLocaleLowerCase().includes(needle.toLocaleLowerCase());
}

function gradeFor(score: number): ProfileAudit["grade"] {
  if (score >= 85) return "excellent";
  if (score >= 70) return "strong";
  if (score >= 45) return "developing";
  return "incomplete";
}

export function auditProfile(rawProfile: unknown, rawOptions: AuditOptions = {}): ProfileAudit {
  const profile = ProfileDocumentSchema.parse(rawProfile);
  const options = AuditOptionsSchema.parse(rawOptions);
  const findings: AuditFinding[] = [];
  const headline = profile.headline ?? "";
  const about = profile.about ?? "";
  const experienceDescriptions = profile.experience.map((item) => item.description ?? "");
  const requestedKeywords = [options.targetRole, ...options.keywords].filter(
    (value): value is string => Boolean(value),
  );

  findings.push(
    finding({
      code: "identity.full-name",
      section: "identity",
      passed: Boolean(profile.fullName),
      message: profile.fullName ? "A full name is present." : "The profile has no full name.",
      recommendation: "Add the professional name used across your résumé and public work.",
      pointsEarned: 0,
      pointsAvailable: 5,
      severity: "error",
    }),
  );

  findings.push(
    finding({
      code: "headline.present",
      section: "headline",
      passed: headline.length > 0,
      message: headline ? "A headline is present." : "The profile has no headline.",
      recommendation: "Write a concise headline that states your role, audience, and value.",
      pointsEarned: 0,
      pointsAvailable: 5,
      severity: "error",
    }),
    finding({
      code: "headline.length",
      section: "headline",
      passed: headline.length >= 40 && headline.length <= 220,
      message: `The headline contains ${headline.length} characters.`,
      recommendation: "Aim for 40–220 characters so the headline is specific without becoming dense.",
      pointsEarned: headline.length > 0 ? 2 : 0,
      pointsAvailable: 5,
    }),
    finding({
      code: "headline.positioning",
      section: "headline",
      passed: /[|•—-]|\b(?:help|build|lead|grow|drive|design|create|scale)\b/iu.test(headline),
      message: "The headline was checked for role and value positioning.",
      recommendation: "Combine your role or specialty with the outcome you create and who benefits.",
      pointsEarned: headline.length > 0 ? 2 : 0,
      pointsAvailable: 5,
    }),
    finding({
      code: "headline.keywords",
      section: "headline",
      passed:
        requestedKeywords.length === 0
          ? headline.split(/\s+/u).filter(Boolean).length >= 6
          : requestedKeywords.some((keyword) => containsNeedle(headline, keyword)),
      message:
        requestedKeywords.length === 0
          ? "The headline was checked for useful specificity."
          : "The headline was checked against the requested role and keywords.",
      recommendation:
        requestedKeywords.length === 0
          ? "Add concrete specialties that a recruiter or client would search for."
          : `Naturally include at least one target term: ${requestedKeywords.join(", ")}.`,
      pointsEarned: headline.length > 0 ? 2 : 0,
      pointsAvailable: 5,
    }),
  );

  findings.push(
    finding({
      code: "about.present",
      section: "about",
      passed: about.length > 0,
      message: about ? "An About section is present." : "The profile has no About section.",
      recommendation: "Add a first-person summary that establishes focus, evidence, and next steps.",
      pointsEarned: 0,
      pointsAvailable: 5,
      severity: "error",
    }),
    finding({
      code: "about.depth",
      section: "about",
      passed: about.length >= 200 && about.length <= 2_600,
      message: `The About section contains ${about.length} characters.`,
      recommendation: "Use roughly 200–2,600 characters with short paragraphs and concrete evidence.",
      pointsEarned: about.length > 0 ? 4 : 0,
      pointsAvailable: 10,
    }),
    finding({
      code: "about.voice",
      section: "about",
      passed: firstPerson.test(about),
      message: "The About section was checked for a direct first-person voice.",
      recommendation: "Use a natural first-person voice instead of résumé fragments or third-person biography.",
      pointsEarned: 0,
      pointsAvailable: 3,
    }),
    finding({
      code: "about.evidence",
      section: "about",
      passed: quantifiedOutcome.test(about),
      message: "The About section was checked for quantified evidence.",
      recommendation: "Add at least one credible metric, scale indicator, or measurable result.",
      pointsEarned: 0,
      pointsAvailable: 4,
    }),
    finding({
      code: "about.call-to-action",
      section: "about",
      passed: callToAction.test(about),
      message: "The About section was checked for a clear next step.",
      recommendation: "End with a low-pressure invitation that matches your goal.",
      pointsEarned: 0,
      pointsAvailable: 3,
    }),
  );

  const describedRoles = experienceDescriptions.filter((description) => description.trim().length >= 80).length;
  const quantifiedRoles = experienceDescriptions.filter((description) => quantifiedOutcome.test(description)).length;
  const datedRoles = profile.experience.filter((item) => item.startDate).length;
  findings.push(
    finding({
      code: "experience.present",
      section: "experience",
      passed: profile.experience.length > 0,
      message: `${profile.experience.length} experience entr${profile.experience.length === 1 ? "y" : "ies"} found.`,
      recommendation: "Add the roles that best support your current positioning.",
      pointsEarned: 0,
      pointsAvailable: 5,
      severity: "error",
    }),
    finding({
      code: "experience.descriptions",
      section: "experience",
      passed: profile.experience.length > 0 && describedRoles === profile.experience.length,
      message: `${describedRoles} of ${profile.experience.length} experience entries have substantive descriptions.`,
      recommendation: "Describe scope, decisions, and outcomes for each relevant role; avoid task-only lists.",
      pointsEarned:
        profile.experience.length === 0 ? 0 : Math.round((describedRoles / profile.experience.length) * 10),
      pointsAvailable: 10,
    }),
    finding({
      code: "experience.evidence",
      section: "experience",
      passed: profile.experience.length > 0 && quantifiedRoles === profile.experience.length,
      message: `${quantifiedRoles} of ${profile.experience.length} experience entries contain quantified evidence.`,
      recommendation: "Add truthful metrics such as growth, scale, time saved, quality, revenue, or reach.",
      pointsEarned:
        profile.experience.length === 0 ? 0 : Math.round((quantifiedRoles / profile.experience.length) * 10),
      pointsAvailable: 10,
    }),
    finding({
      code: "experience.dates",
      section: "experience",
      passed: profile.experience.length > 0 && datedRoles === profile.experience.length,
      message: `${datedRoles} of ${profile.experience.length} experience entries include a start date.`,
      recommendation: "Add consistent dates so readers can understand your career progression.",
      pointsEarned:
        profile.experience.length === 0 ? 0 : Math.round((datedRoles / profile.experience.length) * 5),
      pointsAvailable: 5,
    }),
  );

  const searchableText = [headline, about, ...profile.skills].join(" ");
  const matchedKeywords = requestedKeywords.filter((keyword) => containsNeedle(searchableText, keyword));
  findings.push(
    finding({
      code: "skills.depth",
      section: "skills",
      passed: profile.skills.length >= 10,
      message: `${profile.skills.length} skill${profile.skills.length === 1 ? "" : "s"} found.`,
      recommendation: "Prioritize at least 10 focused skills that support the target role; remove weak or unrelated terms.",
      pointsEarned: Math.min(5, Math.floor(profile.skills.length / 2)),
      pointsAvailable: 5,
    }),
    finding({
      code: "skills.alignment",
      section: "skills",
      passed:
        requestedKeywords.length === 0 ? profile.skills.length >= 5 : matchedKeywords.length === requestedKeywords.length,
      message:
        requestedKeywords.length === 0
          ? "Skills were checked for a useful baseline."
          : `${matchedKeywords.length} of ${requestedKeywords.length} requested terms appear in the profile.`,
      recommendation:
        requestedKeywords.length === 0
          ? "Choose a coherent skill set aligned with the opportunities you want."
          : `Address missing terms only when they truthfully reflect your work: ${requestedKeywords
              .filter((keyword) => !matchedKeywords.includes(keyword))
              .join(", ") || "none"}.`,
      pointsEarned:
        requestedKeywords.length === 0
          ? Math.min(5, profile.skills.length)
          : Math.round((matchedKeywords.length / requestedKeywords.length) * 5),
      pointsAvailable: 5,
    }),
  );

  findings.push(
    finding({
      code: "featured.present",
      section: "featured",
      passed: profile.featured.length > 0,
      message: `${profile.featured.length} featured item${profile.featured.length === 1 ? "" : "s"} found.`,
      recommendation: "Feature one to three strong proof points, such as a case study, article, demo, or portfolio item.",
      pointsEarned: 0,
      pointsAvailable: 5,
    }),
    finding({
      code: "education.present",
      section: "education",
      passed: profile.education.length > 0,
      message: `${profile.education.length} education entr${profile.education.length === 1 ? "y" : "ies"} found.`,
      recommendation: "Add relevant education or training when it strengthens credibility for the target audience.",
      pointsEarned: 0,
      pointsAvailable: 5,
      severity: "info",
    }),
  );

  const score = findings.reduce((total, item) => total + item.pointsEarned, 0);
  const grade = gradeFor(score);
  const improvements = findings.filter((item) => item.status === "improve").length;

  return {
    schemaVersion: "1.0",
    score,
    grade,
    summary: `Profile score: ${score}/100 (${grade}). ${improvements} improvement${improvements === 1 ? "" : "s"} identified.`,
    findings,
  };
}
