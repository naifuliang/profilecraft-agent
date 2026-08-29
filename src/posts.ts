import { createHash } from "node:crypto";
import { z } from "zod";
import { ProfileCraftError } from "./errors.js";

export const PostDraftSchema = z
  .object({
    text: z.string().trim().min(1).max(3_000),
    authorPersonId: z.string().trim().regex(/^[A-Za-z0-9_-]{1,200}$/u, "Invalid LinkedIn member ID."),
    visibility: z.enum(["PUBLIC", "CONNECTIONS"]).default("PUBLIC"),
  })
  .strict();

export type PostDraft = z.input<typeof PostDraftSchema>;
export type PreparedPostInput = z.output<typeof PostDraftSchema>;

export interface PostPreview {
  schemaVersion: "1.0";
  confirmationId: string;
  author: string;
  visibility: PreparedPostInput["visibility"];
  text: string;
  characterCount: number;
  warnings: string[];
}

function normalizePostText(text: string): string {
  return text.replace(/\r\n?/gu, "\n").replace(/[ \t]+$/gmu, "").trim();
}

export function preparePost(rawInput: PostDraft): PostPreview {
  const parsed = PostDraftSchema.parse({ ...rawInput, text: normalizePostText(rawInput.text) });
  const canonical = JSON.stringify({
    authorPersonId: parsed.authorPersonId,
    text: parsed.text,
    visibility: parsed.visibility,
  });
  const digest = createHash("sha256").update(canonical).digest("hex").slice(0, 24);
  const warnings: string[] = [];
  const links = parsed.text.match(/https?:\/\/\S+/gu) ?? [];
  if (parsed.text.length > 2_700) warnings.push("The post is close to the conservative 3,000-character limit.");
  if (links.length > 3) {
    warnings.push("The post contains more than three links; review it for readability and intent.");
  }

  return {
    schemaVersion: "1.0",
    confirmationId: `pcp_${digest}`,
    author: `urn:li:person:${parsed.authorPersonId}`,
    visibility: parsed.visibility,
    text: parsed.text,
    characterCount: parsed.text.length,
    warnings,
  };
}

export function assertPostConfirmation(rawInput: PostDraft, confirmationId: string): PostPreview {
  const preview = preparePost(rawInput);
  if (confirmationId !== preview.confirmationId) {
    throw new ProfileCraftError(
      "CONFIRMATION_MISMATCH",
      "The confirmation ID does not match the final author, visibility, and post text. Prepare and review it again.",
    );
  }
  return preview;
}
