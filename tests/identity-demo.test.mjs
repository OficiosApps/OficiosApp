import assert from "node:assert/strict";
import test from "node:test";
import {
  validDni,
  validateIdentitySubmission,
  reviewIdentity,
  identityReady,
} from "../src/lib/identity-demo.ts";

test("DNI, both sides, selfie and consent are all mandatory", () => {
  const photo = new Blob(["fixture"], { type: "image/png" });
  const valid = { dni: "12345678", front: photo, back: photo, selfie: photo, consent: true };
  assert.ok(validDni("1234567"));
  assert.ok(validDni("12345678"));
  for (const dni of ["", "123456", "123456789", "12.345.678", "1234567a"])
    assert.equal(validDni(dni), false);
  assert.doesNotThrow(() => validateIdentitySubmission(valid));
  for (const field of ["front", "back", "selfie"])
    assert.throws(() => validateIdentitySubmission({ ...valid, [field]: null }));
  assert.throws(() => validateIdentitySubmission({ ...valid, consent: false }));
});

test("uploading is not approval; only a pending review can be approved or rejected", () => {
  const pending = {
    subjectId: "test",
    name: "Persona ficticia",
    dni: "12345678",
    frontId: "front",
    backId: "back",
    selfieId: "selfie",
    status: "pending",
    reason: "",
    submittedAt: 1,
    reviewedAt: null,
  };
  assert.equal(identityReady(undefined), false);
  assert.equal(identityReady(pending), false);
  assert.throws(() => reviewIdentity(pending, false, ""));
  const rejected = reviewIdentity(pending, false, "El dorso no es legible");
  assert.equal(identityReady(rejected), false);
  const approved = reviewIdentity(pending, true, "");
  assert.equal(identityReady(approved), true);
  assert.throws(() => reviewIdentity(approved, true, ""));
});
