import assert from "node:assert/strict";
import test from "node:test";
import { ProfileCraftError } from "../src/errors.js";
import { getLinkedInUserInfo, publishLinkedInPost } from "../src/linkedin.js";
import { preparePost } from "../src/posts.js";

const draft = { text: "A confirmed professional update.", authorPersonId: "member_123", visibility: "PUBLIC" as const };

test("live publishing is disabled by default", async () => {
  const preview = preparePost(draft);
  let called = false;
  const mockFetch: typeof fetch = async () => {
    called = true;
    return new Response(null, { status: 201 });
  };

  await assert.rejects(
    publishLinkedInPost({ ...draft, confirmationId: preview.confirmationId }, {}, mockFetch),
    (error: unknown) => error instanceof ProfileCraftError && error.code === "WRITES_DISABLED",
  );
  assert.equal(called, false);
});

test("a confirmed post uses the official Posts API shape", async () => {
  const preview = preparePost(draft);
  let request: { url: string; init?: RequestInit | undefined } | undefined;
  const mockFetch: typeof fetch = async (input, init) => {
    request = { url: String(input), init };
    return new Response(null, {
      status: 201,
      headers: { "x-restli-id": "urn:li:share:123" },
    });
  };

  const result = await publishLinkedInPost(
    { ...draft, confirmationId: preview.confirmationId },
    { accessToken: "test-only", personId: "member_123", version: "202608", writesEnabled: "1" },
    mockFetch,
  );

  assert.equal(result.published, true);
  assert.equal(result.postId, "urn:li:share:123");
  assert.equal(request?.url, "https://api.linkedin.com/rest/posts");
  assert.equal(request?.init?.method, "POST");
  const body = JSON.parse(String(request?.init?.body)) as { author: string; commentary: string };
  assert.equal(body.author, "urn:li:person:member_123");
  assert.equal(body.commentary, draft.text);
});

test("userinfo errors do not include access-token values", async () => {
  const mockFetch: typeof fetch = async () => new Response("denied", { status: 401 });
  const token = "sensitive-test-token";
  await assert.rejects(
    getLinkedInUserInfo({ accessToken: token }, mockFetch),
    (error: unknown) => error instanceof Error && !error.message.includes(token),
  );
});

test("userinfo responses are allowlisted", async () => {
  const mockFetch: typeof fetch = async () =>
    new Response(
      JSON.stringify({
        sub: "member_123",
        name: "Example Member",
        email: "member@example.com",
        access_token: "must-not-escape",
        nested: { untrusted: true },
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );

  const result = await getLinkedInUserInfo({ accessToken: "test-only" }, mockFetch);
  assert.deepEqual(result, {
    sub: "member_123",
    name: "Example Member",
    email: "member@example.com",
  });
});

test("userinfo responses are byte limited", async () => {
  const mockFetch: typeof fetch = async () =>
    new Response(JSON.stringify({ sub: "member_123", unknown: "x".repeat(70_000) }), { status: 200 });

  await assert.rejects(
    getLinkedInUserInfo({ accessToken: "test-only" }, mockFetch),
    (error: unknown) => error instanceof ProfileCraftError && error.code === "LINKEDIN_RESPONSE_INVALID",
  );
});

test("publishing requires an explicitly bound member identity", async () => {
  const preview = preparePost(draft);
  let called = false;
  const mockFetch: typeof fetch = async () => {
    called = true;
    return new Response(null, { status: 201 });
  };

  await assert.rejects(
    publishLinkedInPost(
      { ...draft, confirmationId: preview.confirmationId },
      { accessToken: "test-only", version: "202608", writesEnabled: "1" },
      mockFetch,
    ),
    (error: unknown) => error instanceof ProfileCraftError && error.code === "AUTHOR_BINDING_REQUIRED",
  );
  assert.equal(called, false);
});

test("configured member identity prevents author switching", async () => {
  const preview = preparePost(draft);
  let called = false;
  const mockFetch: typeof fetch = async () => {
    called = true;
    return new Response(null, { status: 201 });
  };

  await assert.rejects(
    publishLinkedInPost(
      { ...draft, confirmationId: preview.confirmationId },
      { accessToken: "test-only", personId: "different_member", version: "202608", writesEnabled: "1" },
      mockFetch,
    ),
    (error: unknown) => error instanceof ProfileCraftError && error.code === "AUTHOR_MISMATCH",
  );
  assert.equal(called, false);
});
