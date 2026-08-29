import { z } from "zod";
import { ProfileCraftError } from "./errors.js";
import { assertPostConfirmation, type PostDraft, type PostPreview } from "./posts.js";

export interface LinkedInEnvironment {
  accessToken?: string | undefined;
  personId?: string | undefined;
  version?: string | undefined;
  writesEnabled?: string | undefined;
}

export interface PublishRequest extends PostDraft {
  confirmationId: string;
}

export interface PublishResult {
  published: true;
  postId: string | null;
  requestId: string | null;
  preview: PostPreview;
}

export const LinkedInUserInfoSchema = z
  .object({
    sub: z.string().trim().min(1).max(500),
    name: z.string().trim().max(500).optional(),
    given_name: z.string().trim().max(250).optional(),
    family_name: z.string().trim().max(250).optional(),
    picture: z.url().max(2_048).optional(),
    email: z.string().trim().max(320).optional(),
    email_verified: z.boolean().optional(),
  })
  .strip();

export type LinkedInUserInfo = z.infer<typeof LinkedInUserInfoSchema>;

const apiVersionSchema = z.string().regex(/^\d{6}$/u, "LinkedIn API version must use YYYYMM format.");
const MAX_LINKEDIN_RESPONSE_BYTES = 64 * 1024;

export function environmentFromProcess(environment: NodeJS.ProcessEnv = process.env): LinkedInEnvironment {
  return {
    accessToken: environment.PROFILECRAFT_LINKEDIN_ACCESS_TOKEN,
    personId: environment.PROFILECRAFT_LINKEDIN_PERSON_ID,
    version: environment.PROFILECRAFT_LINKEDIN_VERSION,
    writesEnabled: environment.PROFILECRAFT_ENABLE_WRITES,
  };
}

function requireAccessToken(environment: LinkedInEnvironment): string {
  if (!environment.accessToken) {
    throw new ProfileCraftError(
      "AUTH_REQUIRED",
      "No LinkedIn access token is available. Set PROFILECRAFT_LINKEDIN_ACCESS_TOKEN in a secure process environment.",
    );
  }
  return environment.accessToken;
}

export function assertLiveWritesEnabled(environment: LinkedInEnvironment): void {
  if (environment.writesEnabled !== "1") {
    throw new ProfileCraftError(
      "WRITES_DISABLED",
      "Live writes are disabled. Set PROFILECRAFT_ENABLE_WRITES=1 only after reviewing the exact post preview.",
    );
  }
}

function safeRequestId(response: Response): string | null {
  return response.headers.get("x-li-fabric") ?? response.headers.get("x-restli-id") ?? null;
}

async function readLimitedJson(response: Response): Promise<unknown> {
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_LINKEDIN_RESPONSE_BYTES) {
    throw new ProfileCraftError("LINKEDIN_RESPONSE_INVALID", "LinkedIn returned an oversized response.");
  }

  if (!response.body) {
    throw new ProfileCraftError("LINKEDIN_RESPONSE_INVALID", "LinkedIn returned an empty response.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let bytesRead = 0;
  let text = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytesRead += value.byteLength;
      if (bytesRead > MAX_LINKEDIN_RESPONSE_BYTES) {
        await reader.cancel();
        throw new ProfileCraftError("LINKEDIN_RESPONSE_INVALID", "LinkedIn returned an oversized response.");
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    return JSON.parse(text) as unknown;
  } catch (error: unknown) {
    if (error instanceof ProfileCraftError) throw error;
    throw new ProfileCraftError("LINKEDIN_RESPONSE_INVALID", "LinkedIn returned invalid JSON.");
  } finally {
    reader.releaseLock();
  }
}

export async function getLinkedInUserInfo(
  environment: LinkedInEnvironment,
  fetchImplementation: typeof fetch = fetch,
): Promise<LinkedInUserInfo> {
  const accessToken = requireAccessToken(environment);
  const response = await fetchImplementation("https://api.linkedin.com/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new ProfileCraftError(
      "LINKEDIN_API_ERROR",
      `LinkedIn userinfo request failed with HTTP ${response.status}. Request ID: ${safeRequestId(response) ?? "unavailable"}.`,
    );
  }

  const parsed = LinkedInUserInfoSchema.safeParse(await readLimitedJson(response));
  if (!parsed.success) {
    throw new ProfileCraftError("LINKEDIN_RESPONSE_INVALID", "LinkedIn returned an invalid userinfo response.");
  }
  return parsed.data;
}

export async function publishLinkedInPost(
  request: PublishRequest,
  environment: LinkedInEnvironment,
  fetchImplementation: typeof fetch = fetch,
): Promise<PublishResult> {
  assertLiveWritesEnabled(environment);

  const preview = assertPostConfirmation(
    {
      text: request.text,
      authorPersonId: request.authorPersonId,
      visibility: request.visibility,
    },
    request.confirmationId,
  );
  if (!environment.personId) {
    throw new ProfileCraftError(
      "AUTHOR_BINDING_REQUIRED",
      "Live publishing requires PROFILECRAFT_LINKEDIN_PERSON_ID to bind writes to one authenticated member.",
    );
  }
  if (request.authorPersonId !== environment.personId) {
    throw new ProfileCraftError(
      "AUTHOR_MISMATCH",
      "The requested author does not match PROFILECRAFT_LINKEDIN_PERSON_ID.",
    );
  }

  const accessToken = requireAccessToken(environment);
  const version = apiVersionSchema.parse(environment.version);

  const response = await fetchImplementation("https://api.linkedin.com/rest/posts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "LinkedIn-Version": version,
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify({
      author: preview.author,
      commentary: preview.text,
      visibility: preview.visibility,
      distribution: {
        feedDistribution: "MAIN_FEED",
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      lifecycleState: "PUBLISHED",
      isReshareDisabledByAuthor: false,
    }),
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    throw new ProfileCraftError(
      "LINKEDIN_API_ERROR",
      `LinkedIn post creation failed with HTTP ${response.status}. Request ID: ${safeRequestId(response) ?? "unavailable"}.`,
    );
  }

  return {
    published: true,
    postId: response.headers.get("x-restli-id"),
    requestId: safeRequestId(response),
    preview,
  };
}
