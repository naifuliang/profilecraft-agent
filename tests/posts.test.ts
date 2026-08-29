import assert from "node:assert/strict";
import test from "node:test";
import { ProfileCraftError } from "../src/errors.js";
import { assertPostConfirmation, preparePost } from "../src/posts.js";

const draft = { text: "A useful professional update.", authorPersonId: "member_123", visibility: "PUBLIC" as const };

test("post previews are deterministic and content-bound", () => {
  const first = preparePost(draft);
  const second = preparePost({ ...draft, text: "  A useful professional update.  " });

  assert.equal(first.confirmationId, second.confirmationId);
  assert.match(first.confirmationId, /^pcp_[a-f0-9]{24}$/u);
  assert.equal(first.author, "urn:li:person:member_123");
});

test("confirmation fails when final content changes", () => {
  const preview = preparePost(draft);
  assert.throws(
    () => assertPostConfirmation({ ...draft, text: "Changed content." }, preview.confirmationId),
    (error: unknown) => error instanceof ProfileCraftError && error.code === "CONFIRMATION_MISMATCH",
  );
});
