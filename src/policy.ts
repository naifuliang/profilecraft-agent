import { z } from "zod";

export const PolicyActionSchema = z.enum([
  "profile.analyze",
  "profile.draft",
  "profile.edit",
  "post.draft",
  "post.publish",
  "organization.manage",
  "profile.scrape",
  "browser.automate",
  "engagement.automate",
  "connections.automate",
  "messages.automate",
  "credentials.capture",
]);

export type PolicyAction = z.infer<typeof PolicyActionSchema>;
export type PolicyDecisionStatus = "allowed" | "approval-required" | "restricted-api" | "prohibited";

export interface PolicyContext {
  officialApi?: boolean | undefined;
  approvedProgram?: boolean | undefined;
  authenticatedUserOwnData?: boolean | undefined;
  userConfirmed?: boolean | undefined;
}

export interface PolicyDecision {
  action: PolicyAction;
  status: PolicyDecisionStatus;
  allowed: boolean;
  reason: string;
  requirements: string[];
}

const prohibitedReasons: Partial<Record<PolicyAction, string>> = {
  "profile.scrape": "Automated scraping or copying of LinkedIn pages is outside this project's policy boundary.",
  "browser.automate": "Automating LinkedIn's website or modifying its interface is outside this project's policy boundary.",
  "engagement.automate": "Automated reactions, comments, or inauthentic engagement are not supported.",
  "connections.automate": "Automated connection requests or contact downloads are not supported.",
  "messages.automate": "Automated LinkedIn messages or InMail are not supported.",
  "credentials.capture": "The project never collects passwords, cookies, session tokens, or client secrets through agents.",
};

export function evaluatePolicy(actionInput: PolicyAction, context: PolicyContext = {}): PolicyDecision {
  const action = PolicyActionSchema.parse(actionInput);
  const prohibitedReason = prohibitedReasons[action];
  if (prohibitedReason) {
    return { action, status: "prohibited", allowed: false, reason: prohibitedReason, requirements: [] };
  }

  if (action === "profile.analyze" || action === "profile.draft" || action === "post.draft") {
    return {
      action,
      status: "allowed",
      allowed: true,
      reason: "This action operates on content supplied by the user and does not mutate LinkedIn.",
      requirements: ["Use only user-provided data or data returned by an authorized official API."],
    };
  }

  if (action === "post.publish") {
    const requirements = [
      "Use LinkedIn's official API with the w_member_social permission.",
      "Show the final post and visibility before publishing.",
      "Receive explicit confirmation for this exact preview.",
      "Enable live writes in the process environment.",
    ];
    const allowed = Boolean(context.officialApi && context.userConfirmed);
    return {
      action,
      status: allowed ? "allowed" : "approval-required",
      allowed,
      reason: allowed
        ? "Official API use and exact-content confirmation were provided."
        : "Publishing is permitted only through the official API after exact-content confirmation.",
      requirements,
    };
  }

  if (action === "profile.edit" || action === "organization.manage") {
    const requirements = [
      "Use an official LinkedIn endpoint.",
      "Verify that the application has the required LinkedIn partner-program approval and OAuth scopes.",
      "Show an exact diff and receive explicit confirmation before the write.",
    ];
    const allowed = Boolean(context.officialApi && context.approvedProgram && context.userConfirmed);
    return {
      action,
      status: allowed ? "allowed" : "restricted-api",
      allowed,
      reason: allowed
        ? "The restricted official API, application approval, and user confirmation were supplied."
        : "This capability depends on restricted LinkedIn API approval and is not available through browser automation.",
      requirements,
    };
  }

  return {
    action,
    status: "prohibited",
    allowed: false,
    reason: "The requested action is not supported.",
    requirements: [],
  };
}
