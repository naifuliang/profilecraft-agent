import assert from "node:assert/strict";
import test from "node:test";
import { auditProfile } from "../src/audit.js";
import { strongProfile } from "./fixture.js";

test("a strong, evidence-based profile earns an excellent grade", () => {
  const result = auditProfile(strongProfile, {
    targetRole: "Product Engineering Leader",
    keywords: ["AI platforms", "Engineering leadership"],
  });

  assert.equal(result.score, 100);
  assert.equal(result.grade, "excellent");
  assert.equal(result.findings.every((finding) => finding.status === "pass"), true);
});

test("an empty profile produces deterministic, actionable findings", () => {
  const result = auditProfile({});

  assert.equal(result.score, 0);
  assert.equal(result.grade, "incomplete");
  assert.equal(result.findings.some((finding) => finding.code === "headline.present"), true);
  assert.equal(result.findings.some((finding) => finding.severity === "error"), true);
});
