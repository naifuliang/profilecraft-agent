import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { auditProfile } from "./audit.js";
import { getCapabilities, VERSION } from "./capabilities.js";
import { ProfileCraftError, toSafeError } from "./errors.js";
import {
  assertLiveWritesEnabled,
  environmentFromProcess,
  getLinkedInUserInfo,
  publishLinkedInPost,
  type LinkedInEnvironment,
} from "./linkedin.js";
import { evaluatePolicy, PolicyActionSchema } from "./policy.js";
import { assertPostConfirmation, PostDraftSchema, preparePost, type PostPreview } from "./posts.js";
import { AuditOptionsSchema, ProfileDocumentSchema } from "./profile.js";

export interface McpDependencies {
  environment?: LinkedInEnvironment;
  fetchImplementation?: typeof fetch;
}

function asObject(value: unknown): Record<string, unknown> {
  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}

function success(value: unknown) {
  const structuredContent = asObject(value);
  return {
    content: [{ type: "text" as const, text: JSON.stringify(structuredContent, null, 2) }],
    structuredContent,
  };
}

function failure(error: unknown) {
  const safe = toSafeError(error);
  return {
    isError: true,
    content: [{ type: "text" as const, text: JSON.stringify({ error: safe }, null, 2) }],
  };
}

async function elicitPostConfirmation(server: McpServer, preview: PostPreview): Promise<void> {
  let response;
  try {
    response = await server.server.elicitInput({
      mode: "form",
      message: [
        "Confirm this exact LinkedIn post. This will create a public external post immediately.",
        `Author: ${preview.author}`,
        `Visibility: ${preview.visibility}`,
        `Confirmation ID: ${preview.confirmationId}`,
        "",
        preview.text,
      ].join("\n"),
      requestedSchema: {
        type: "object",
        properties: {
          confirm: {
            type: "boolean",
            title: "Publish this exact post",
            description: "Select only after reviewing the author, visibility, and complete text above.",
            default: false,
          },
        },
        required: ["confirm"],
      },
    });
  } catch (error: unknown) {
    throw new ProfileCraftError(
      "INTERACTIVE_CONFIRMATION_REQUIRED",
      "The MCP client did not provide trusted interactive confirmation.",
      { cause: error },
    );
  }

  if (response.action !== "accept" || response.content?.confirm !== true) {
    throw new ProfileCraftError("PUBLISHING_DECLINED", "The user declined or cancelled publishing.");
  }
}

export function createProfileCraftServer(dependencies: McpDependencies = {}): McpServer {
  const environment = dependencies.environment ?? environmentFromProcess();
  const fetchImplementation = dependencies.fetchImplementation ?? fetch;
  const server = new McpServer({ name: "profilecraft-agent", version: VERSION });

  server.registerTool(
    "profilecraft_capabilities",
    {
      title: "ProfileCraft capabilities",
      description: "Report supported and prohibited operations without exposing credential values.",
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    () => success(getCapabilities(environment)),
  );

  server.registerTool(
    "profilecraft_check_policy",
    {
      title: "Check a requested operation",
      description: "Classify an intended LinkedIn-related operation before taking action.",
      inputSchema: z
        .object({
          action: PolicyActionSchema,
          officialApi: z.boolean().optional(),
          approvedProgram: z.boolean().optional(),
          userConfirmed: z.boolean().optional(),
        })
        .strict(),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    (input) =>
      success(
        evaluatePolicy(input.action, {
          officialApi: input.officialApi,
          approvedProgram: input.approvedProgram,
          userConfirmed: input.userConfirmed,
        }),
      ),
  );

  server.registerTool(
    "profilecraft_audit_profile",
    {
      title: "Audit a professional profile",
      description: "Score user-provided profile data and return specific, deterministic improvement findings.",
      inputSchema: z
        .object({
          profile: ProfileDocumentSchema,
          options: AuditOptionsSchema.optional(),
        })
        .strict(),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    (input) => success(auditProfile(input.profile, input.options ?? {})),
  );

  server.registerTool(
    "profilecraft_prepare_post",
    {
      title: "Prepare a LinkedIn post",
      description: "Validate and preview a post without publishing it, returning a content-bound confirmation ID.",
      inputSchema: PostDraftSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    (input) => success(preparePost(input)),
  );

  server.registerTool(
    "profilecraft_publish_post",
    {
      title: "Publish a confirmed LinkedIn post",
      description:
        "Publish through LinkedIn's official API. Requires an exact preview confirmation ID and PROFILECRAFT_ENABLE_WRITES=1.",
      inputSchema: PostDraftSchema.extend({ confirmationId: z.string().regex(/^pcp_[a-f0-9]{24}$/u) }),
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true },
    },
    async (input) => {
      try {
        assertLiveWritesEnabled(environment);
        const preview = assertPostConfirmation(
          {
            text: input.text,
            authorPersonId: input.authorPersonId,
            visibility: input.visibility,
          },
          input.confirmationId,
        );
        await elicitPostConfirmation(server, preview);
        return success(await publishLinkedInPost(input, environment, fetchImplementation));
      } catch (error: unknown) {
        return failure(error);
      }
    },
  );

  server.registerTool(
    "profilecraft_linkedin_me",
    {
      title: "Read authenticated LinkedIn identity",
      description: "Read OIDC userinfo for the authenticated member through LinkedIn's official endpoint.",
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async () => {
      try {
        return success(await getLinkedInUserInfo(environment, fetchImplementation));
      } catch (error: unknown) {
        return failure(error);
      }
    },
  );

  return server;
}
