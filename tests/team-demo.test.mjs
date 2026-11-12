import assert from "node:assert/strict";
import test from "node:test";
import {
  activateInvitation,
  allowedInviteRole,
  createInvitation,
  initialInvitations,
  invitationStatus,
  isTeamInvitation,
} from "../src/lib/team-demo.ts";

const now = Date.UTC(2026, 10, 11, 15);
const input = {
  name: "Persona de prueba",
  email: "nueva@ejemplo.com",
  cityId: "mercedes-ba",
  invitedBy: "Dirección",
};

test("CEO invites superadmins; superadmins invite admins; admins cannot invite", () => {
  assert.equal(allowedInviteRole("ceo"), "superadmin");
  assert.equal(allowedInviteRole("superadmin"), "admin");
  assert.equal(allowedInviteRole("admin"), null);
  assert.throws(() => createInvitation("admin", input, [], "id", now));
  assert.equal(createInvitation("ceo", input, [], "id", now).role, "superadmin");
  assert.equal(createInvitation("ceo", input, [], "id", now).cityId, "todas");
  const admin = createInvitation("superadmin", input, [], "id", now);
  assert.equal(admin.role, "admin");
  assert.equal(admin.cityId, "mercedes-ba");
  assert.throws(() => createInvitation("superadmin", { ...input, cityId: "" }, [], "id", now));
});

test("duplicate emails are normalized, including active accounts", () => {
  const initial = initialInvitations(now);
  const duplicate = { ...input, email: " CAMILA@EJEMPLO.COM " };
  assert.throws(() => createInvitation("ceo", duplicate, initial, "id", now), /ya tiene/);
  const active = activateInvitation(initial[0], "Camila Torres", now);
  assert.throws(() => createInvitation("ceo", duplicate, [active], "id", now), /ya tiene/);
  const replacement = createInvitation(
    "ceo",
    duplicate,
    [{ ...initial[0], status: "revoked" }],
    "id",
    now,
  );
  assert.equal(replacement.email, "camila@ejemplo.com");
});

test("activation preserves role, city, and email; cannot replay", () => {
  for (const invitation of initialInvitations(now)) {
    const active = activateInvitation(invitation, " Nombre nuevo ", now);
    assert.equal(active.name, "Nombre nuevo");
    assert.equal(active.role, invitation.role);
    assert.equal(active.cityId, invitation.cityId);
    assert.equal(active.email, invitation.email);
    assert.equal(active.status, "active");
    assert.throws(() => activateInvitation(active, "Nombre nuevo", now));
  }
});

test("expired, revoked and incorrectly assigned invitations cannot activate", () => {
  const invitation = initialInvitations(now)[0];
  assert.equal(invitationStatus(invitation, invitation.expiresAt), "expired");
  assert.throws(() => activateInvitation(invitation, "Nombre nuevo", invitation.expiresAt));
  assert.throws(() =>
    activateInvitation({ ...invitation, status: "revoked" }, "Nombre nuevo", now),
  );
  assert.throws(() => activateInvitation({ ...invitation, role: "admin" }, "Nombre nuevo", now));
  assert.throws(() => activateInvitation(invitation, " ", now));
});

test("stored demo state only accepts the permitted role hierarchy", () => {
  const invitation = initialInvitations(now)[0];
  assert.ok(initialInvitations(now).every(isTeamInvitation));
  for (const value of [
    {},
    null,
    { ...invitation, role: "ceo" },
    { ...invitation, role: "admin" },
    { ...invitation, expiresAt: NaN },
  ]) {
    assert.equal(isTeamInvitation(value), false);
  }
  assert.ok(initialInvitations(now).every((item) => !Object.hasOwn(item, "password")));
});
