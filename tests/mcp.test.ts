import assert from "node:assert/strict";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { ElicitRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { createProfileCraftServer } from "../src/mcp-server.js";
import { preparePost } from "../src/posts.js";

test("MCP server advertises bounded tools and blocks write-by-default", async (context) => {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = createProfileCraftServer({ environment: {} });
  const client = new Client({ name: "profilecraft-test", version: "1.0.0" });
  context.after(async () => {
    await client.close();
    await server.close();
  });

  await server.connect(serverTransport);
  await client.connect(clientTransport);

  const tools = await client.listTools();
  const names = tools.tools.map((tool) => tool.name);
  assert.deepEqual(names.sort(), [
    "profilecraft_audit_profile",
    "profilecraft_capabilities",
    "profilecraft_check_policy",
    "profilecraft_linkedin_me",
    "profilecraft_prepare_post",
    "profilecraft_publish_post",
  ]);

  const previewResult = await client.callTool({
    name: "profilecraft_prepare_post",
    arguments: { text: "A test update.", authorPersonId: "member_123", visibility: "PUBLIC" },
  });
  assert.equal(previewResult.isError, undefined);

  const publishResult = await client.callTool({
    name: "profilecraft_publish_post",
    arguments: {
      text: "A test update.",
      authorPersonId: "member_123",
      visibility: "PUBLIC",
      confirmationId: "pcp_000000000000000000000000",
    },
  });
  assert.equal(publishResult.isError, true);
  assert.match(JSON.stringify(publishResult.content), /WRITES_DISABLED/u);
});

test("MCP publishing fails closed when the client cannot elicit user confirmation", async (context) => {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  let fetchCalls = 0;
  const server = createProfileCraftServer({
    environment: { accessToken: "test-only", personId: "member_123", version: "202608", writesEnabled: "1" },
    fetchImplementation: async () => {
      fetchCalls += 1;
      return new Response(null, { status: 201 });
    },
  });
  const client = new Client({ name: "profilecraft-test", version: "1.0.0" });
  context.after(async () => {
    await client.close();
    await server.close();
  });
  await server.connect(serverTransport);
  await client.connect(clientTransport);

  const draft = { text: "A test update.", authorPersonId: "member_123", visibility: "PUBLIC" as const };
  const result = await client.callTool({
    name: "profilecraft_publish_post",
    arguments: { ...draft, confirmationId: preparePost(draft).confirmationId },
  });

  assert.equal(result.isError, true);
  assert.match(JSON.stringify(result.content), /INTERACTIVE_CONFIRMATION_REQUIRED/u);
  assert.equal(fetchCalls, 0);
});

test("MCP publishing performs no request when the user declines", async (context) => {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  let fetchCalls = 0;
  const server = createProfileCraftServer({
    environment: { accessToken: "test-only", personId: "member_123", version: "202608", writesEnabled: "1" },
    fetchImplementation: async () => {
      fetchCalls += 1;
      return new Response(null, { status: 201 });
    },
  });
  const client = new Client(
    { name: "profilecraft-test", version: "1.0.0" },
    { capabilities: { elicitation: { form: {} } } },
  );
  client.setRequestHandler(ElicitRequestSchema, () => ({ action: "decline" }));
  context.after(async () => {
    await client.close();
    await server.close();
  });
  await server.connect(serverTransport);
  await client.connect(clientTransport);

  const draft = { text: "A test update.", authorPersonId: "member_123", visibility: "PUBLIC" as const };
  const result = await client.callTool({
    name: "profilecraft_publish_post",
    arguments: { ...draft, confirmationId: preparePost(draft).confirmationId },
  });

  assert.equal(result.isError, true);
  assert.match(JSON.stringify(result.content), /PUBLISHING_DECLINED/u);
  assert.equal(fetchCalls, 0);
});

test("MCP publishing elicits fresh approval for every invocation", async (context) => {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  let prompts = 0;
  let fetchCalls = 0;
  const server = createProfileCraftServer({
    environment: { accessToken: "test-only", personId: "member_123", version: "202608", writesEnabled: "1" },
    fetchImplementation: async () => {
      fetchCalls += 1;
      return new Response(null, { status: 201, headers: { "x-restli-id": `post-${fetchCalls}` } });
    },
  });
  const client = new Client(
    { name: "profilecraft-test", version: "1.0.0" },
    { capabilities: { elicitation: { form: {} } } },
  );
  client.setRequestHandler(ElicitRequestSchema, (request) => {
    prompts += 1;
    assert.match(request.params.message, /A test update\./u);
    assert.match(request.params.message, /urn:li:person:member_123/u);
    return { action: "accept", content: { confirm: true } };
  });
  context.after(async () => {
    await client.close();
    await server.close();
  });
  await server.connect(serverTransport);
  await client.connect(clientTransport);

  const draft = { text: "A test update.", authorPersonId: "member_123", visibility: "PUBLIC" as const };
  const confirmationId = preparePost(draft).confirmationId;
  const first = await client.callTool({
    name: "profilecraft_publish_post",
    arguments: { ...draft, confirmationId },
  });
  const second = await client.callTool({
    name: "profilecraft_publish_post",
    arguments: { ...draft, confirmationId },
  });

  assert.equal(first.isError, undefined);
  assert.equal(second.isError, undefined);
  assert.equal(prompts, 2);
  assert.equal(fetchCalls, 2);
});
