import assert from "node:assert/strict";
import test from "node:test";
import { evaluatePolicy } from "../src/policy.js";

test("scraping and website automation are prohibited", () => {
  assert.equal(evaluatePolicy("profile.scrape").status, "prohibited");
  assert.equal(evaluatePolicy("browser.automate").allowed, false);
  assert.equal(evaluatePolicy("messages.automate").allowed, false);
});

test("publishing requires the official API and exact confirmation", () => {
  assert.equal(evaluatePolicy("post.publish", { officialApi: true }).allowed, false);
  assert.equal(evaluatePolicy("post.publish", { officialApi: true, userConfirmed: true }).allowed, true);
});

test("restricted profile editing requires program approval", () => {
  const denied = evaluatePolicy("profile.edit", { officialApi: true, userConfirmed: true });
  const allowed = evaluatePolicy("profile.edit", {
    officialApi: true,
    approvedProgram: true,
    userConfirmed: true,
  });

  assert.equal(denied.status, "restricted-api");
  assert.equal(allowed.allowed, true);
});
