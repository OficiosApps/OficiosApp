import "fake-indexeddb/auto";
import assert from "node:assert/strict";
import test from "node:test";
import {
  deleteIdentity,
  listIdentities,
  readAsset,
  saveLogo,
  saveRequestPhoto,
  removeRequestPhoto,
  setIdentityReview,
  submitIdentity,
  validateImage,
} from "../src/lib/demo-media.ts";

// Exercise IndexedDB transactions with an in-memory database. Browser decoding
// is mocked; these tests do not claim to validate a face or a real image decoder.
globalThis.window = new EventTarget();
globalThis.createImageBitmap = async (file) => {
  if (file.name === "broken.png") throw new Error("decode failed");
  return { width: 200, height: 200, close() {} };
};
const image = (name) => new File(["fictitious image fixture"], name, { type: "image/png" });

test("request photos persist locally and removal is scoped to request attachments", async () => {
  const id = await saveRequestPhoto(image("request.png"));
  assert.ok(id.startsWith("request-photo-"));
  assert.ok(await readAsset(id));
  await assert.rejects(removeRequestPhoto("not-a-request-photo"));
  await removeRequestPhoto(id);
  assert.equal(await readAsset(id), undefined);
});

test("image upload checks type, size and decoder failures", async () => {
  await assert.rejects(validateImage(new File(["svg"], "image.svg", { type: "image/svg+xml" })));
  await assert.rejects(validateImage(new File([], "empty.png", { type: "image/png" })));
  await assert.rejects(
    validateImage(
      new File([new Uint8Array(2 * 1024 * 1024 + 1)], "big.png", { type: "image/png" }),
      2,
    ),
  );
  await assert.rejects(validateImage(image("broken.png")));
});

test("two simultaneous reviews cannot both change the same pending submission", async () => {
  const subjectId = "test-concurrent";
  await submitIdentity({ subjectId, name: "Persona ficticia", dni: "12345678", front: image("front.png"), back: image("back.png"), selfie: image("selfie.png"), consent: true });
  const results = await Promise.allSettled([
    setIdentityReview(subjectId, true, ""),
    setIdentityReview(subjectId, false, "La selfie no es legible"),
  ]);
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(results.filter((result) => result.status === "rejected").length, 1);
  await deleteIdentity(subjectId);
});

test("logo blobs can be stored and loaded without storing data URLs in the profile", async () => {
  const file = image("logo.png");
  const key = await saveLogo(file);
  assert.ok(key.startsWith("logo-"));
  const stored = await readAsset(key);
  assert.equal(stored.type, "image/png");
  assert.equal(await stored.text(), await file.text());
});

test("documents persist, stay pending, can be rejected, replaced and manually approved, and delete clears photos", async () => {
  const input = {
    subjectId: "test-individual",
    name: "Persona ficticia",
    dni: "12345678",
    front: image("front.png"),
    back: image("back.png"),
    selfie: image("selfie.png"),
    consent: true,
  };
  await assert.rejects(submitIdentity({ ...input, selfie: null }));
  assert.equal((await listIdentities()).length, 0);
  await submitIdentity(input);
  const first = (await listIdentities())[0];
  assert.equal(first.status, "pending");
  assert.ok(await readAsset(first.frontId));
  assert.ok(await readAsset(first.backId));
  assert.ok(await readAsset(first.selfieId));
  await assert.rejects(setIdentityReview(input.subjectId, false, ""));
  await setIdentityReview(input.subjectId, false, "La imagen no es legible");
  assert.equal((await listIdentities())[0].status, "rejected");
  await submitIdentity(input);
  const second = (await listIdentities())[0];
  assert.equal(second.status, "pending");
  assert.notEqual(first.frontId, second.frontId);
  for (const key of [first.frontId, first.backId, first.selfieId])
    assert.equal(await readAsset(key), undefined);
  await setIdentityReview(input.subjectId, true, "");
  assert.equal((await listIdentities())[0].status, "approved");
  await assert.rejects(setIdentityReview(input.subjectId, true, ""));
  await deleteIdentity(input.subjectId);
  assert.equal((await listIdentities()).length, 0);
  for (const key of [second.frontId, second.backId, second.selfieId])
    assert.equal(await readAsset(key), undefined);
});
