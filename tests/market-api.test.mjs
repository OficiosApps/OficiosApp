import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import { handleMarket, marketPageAllowed, marketViewer } from "../worker/market-api.mjs";
import { defaultMarketConfig } from "../worker/market-settings.mjs";
function setup({ legacyRegions = true } = {}) {
  const db = new DatabaseSync(":memory:");
  for (const file of readdirSync(new URL("../drizzle/", import.meta.url))
    .filter((file) => file.endsWith(".sql"))
    .sort())
    db.exec(readFileSync(new URL("../drizzle/" + file, import.meta.url), "utf8"));
  // Older coverage remains an explicit fixture for city-opening/closing regressions.
  if (legacyRegions) {
    const config = defaultMarketConfig();
    config.regions = config.regions.filter((r) =>
      ["mercedes-ba", "lujan-ba", "chivilcoy-ba", "caba-ar"].includes(r.id),
    );
    for (const r of config.regions) if (r.id !== "mercedes-ba") r.status = "preparacion";
    db.prepare("INSERT INTO market_settings VALUES('commercial',?,0,'fixture','fixture',1)").run(
      JSON.stringify(config),
    );
  }
  const stored = new Map();
  function prepare(sql, values = []) {
    return {
      bind(...params) {
        return prepare(sql, params);
      },
      async first() {
        return db.prepare(sql).get(...values) ?? null;
      },
      async all() {
        return { results: db.prepare(sql).all(...values) };
      },
      runSync() {
        return { meta: { changes: Number(db.prepare(sql).run(...values).changes) } };
      },
      async run() {
        return this.runSync();
      },
    };
  }
  const env = {
    OFICIOS_CEO_EMAIL: "ceo@example.test",
    DB: {
      prepare,
      async batch(statements) {
        db.exec("BEGIN");
        try {
          const results = [];
          for (const statement of statements) results.push(statement.runSync());
          db.exec("COMMIT");
          return results;
        } catch (error) {
          db.exec("ROLLBACK");
          throw error;
        }
      },
    },
    BUCKET: {
      async put(key, bytes) {
        stored.set(key, bytes);
      },
      async get(key) {
        return stored.has(key) ? { body: stored.get(key) } : null;
      },
      async delete(key) {
        stored.delete(key);
      },
    },
  };
  return { db, env };
}
const origin = "https://oficios.example";
function req(path, user, body, method = body ? "POST" : "GET") {
  return new Request(origin + "/api/market" + path, {
    method,
    headers: {
      ...(user
        ? {
            "oai-authenticated-user-id": user,
            "oai-authenticated-user-email": user + "@example.test",
          }
        : {}),
      ...(body ? { "content-type": "application/json", origin } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}
const profile = (kind = "cliente") => ({
  name: "Persona de prueba",
  kind,
  cityId: "mercedes-ba",
  trade: "plomeria",
  consent: true,
});
async function stageSelfie(env, id) {
  const form = new FormData();
  form.set(
    "file",
    new File([new Uint8Array([255, 216, 255, 224, 0, 16])], "selfie.jpg", { type: "image/jpeg" }),
  );
  const response = await handleMarket(
    new Request(origin + "/api/market/client-selfie", {
      method: "POST",
      headers: { origin, ...(id ? { "oai-authenticated-user-id": id } : {}) },
      body: form,
    }),
    env,
  );
  const result = await response.json();
  return { status: response.status, ...result };
}
async function clientRegistration(env, id) {
  const selfie = await stageSelfie(env, id);
  assert.equal(selfie.status, 201);
  return { ...profile(), clientSelfieId: selfie.id, clientSelfieConsent: true };
}
async function register(env, id, kind = "cliente") {
  const data = kind === "cliente" ? await clientRegistration(env, id) : profile(kind);
  const response = await handleMarket(req("/account", id, data), env);
  assert.equal(response.status, 201, await response.text());
}
async function attachProfilePhoto(db, env, user) {
  const id = `${user}-profile-photo`;
  db.prepare(
    "INSERT INTO uploads(id,owner_id,scope,object_key,mime,created_at) VALUES(?,?,?,?,?,?)",
  ).run(id, user, "logo", id, "image/png", 1);
  await env.BUCKET.put(id, new Uint8Array([1, 2, 3]));
  db.prepare("UPDATE accounts SET profile_json = ? WHERE user_id = ?").run(
    JSON.stringify({ profilePhotoId: id }),
    user,
  );
  return id;
}
const details = {
  category: "plomeria",
  cityId: "mercedes-ba",
  service: "Reparar una pérdida",
  type: "urgente",
  description: "",
  address: "Domicilio privado 123",
  contact: "2324555555",
  when: "A coordinar",
  photoIds: [],
};
const quote = {
  labor: 100,
  materials: 50,
  visit: 10,
  days: 2,
  warrantyMonths: 6,
  notes: "Incluye materiales",
};
async function call(env, path, user, body, method) {
  const response = await handleMarket(req(path, user, body, method), env);
  return { status: response.status, data: await response.json() };
}
test("registration persists per platform identity without creating admin roles or reusing browser examples", async () => {
  const { db, env } = setup();
  assert.equal((await call(env, "/account", null, profile())).status, 401);
  await register(env, "client");
  await register(env, "professional", "profesional");
  const one = (await call(env, "/session", "client")).data;
  assert.equal(one.account.kind, "cliente");
  assert.equal(one.staffRole, null);
  assert.equal(
    (await call(env, "/session", "professional")).data.account.verification,
    "sin-enviar",
  );
  assert.equal((await call(env, "/account", "client", profile("profesional"))).status, 409);
  assert.equal(db.prepare("SELECT COUNT(*) n FROM staff").get().n, 0);
  assert.equal((await call(env, "/jobs", "client")).data.jobs.length, 0);
  assert.equal((await call(env, "/account", "bad", { ...profile(), kind: "ceo" })).status, 400);
  assert.equal((await call(env, "/staff", "client")).status, 403);
});
test("professional entry uses real session permissions and same-origin writes", async () => {
  const { env } = setup();
  await register(env, "professional", "profesional");
  const viewer = await marketViewer(req("/session", "professional"), env);
  assert.equal(marketPageAllowed("/panel-profesional", viewer), true);
  assert.equal(marketPageAllowed("/admin", viewer), false);
  assert.equal(marketPageAllowed("/panel-empresa", viewer), false);
  const forged = new Request(origin + "/api/market/account", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "https://evil.example",
      "oai-authenticated-user-id": "victim",
    },
    body: JSON.stringify(profile()),
  });
  assert.equal((await handleMarket(forged, env)).status, 403);
});
test("quotes, ownership, private addresses, accepted-price revisions and stale updates are enforced in SQL", async () => {
  const { db, env } = setup();
  await register(env, "client");
  await register(env, "other");
  await register(env, "pro", "profesional");
  let job = (await call(env, "/jobs", "client", details)).data.job;
  assert.equal((await call(env, "/jobs/" + job.id, "other")).status, 403);
  assert.equal(
    (await call(env, "/jobs/" + job.id, "pro", { action: "quote", version: job.version, quote }))
      .status,
    403,
  );
  await attachProfilePhoto(db, env, "pro");
  db.prepare("UPDATE accounts SET verification = 'aprobado' WHERE user_id = 'pro'").run();
  assert.equal((await call(env, "/jobs/" + job.id, "pro")).data.job.address, "");
  job = (
    await call(env, "/jobs/" + job.id, "pro", { action: "quote", version: job.version, quote })
  ).data.job;
  let proposal = job.quotes[0];
  job = (
    await call(env, "/jobs/" + job.id, "client", {
      action: "decide-quote",
      version: job.version,
      quoteId: proposal.id,
      revision: 1,
      accept: true,
    })
  ).data.job;
  assert.equal(job.state, "contratado");
  assert.equal((await call(env, "/jobs/" + job.id, "pro")).data.job.address, details.address);
  const oldVersion = job.version;
  job = (
    await call(env, "/jobs/" + job.id, "pro", {
      action: "quote",
      version: job.version,
      quote: { ...quote, labor: 200 },
    })
  ).data.job;
  assert.equal(job.quotes[0].acceptedVersion, 1);
  assert.equal(job.quotes[0].revisions[0].labor, 10000);
  assert.equal(
    (
      await call(env, "/jobs/" + job.id, "client", {
        action: "decide-quote",
        version: oldVersion,
        quoteId: proposal.id,
        revision: 2,
        accept: true,
      })
    ).status,
    409,
  );
  job = (
    await call(env, "/jobs/" + job.id, "client", {
      action: "decide-quote",
      version: job.version,
      quoteId: proposal.id,
      revision: 2,
      accept: false,
    })
  ).data.job;
  assert.equal(job.quotes[0].acceptedVersion, 1);
  job = (
    await call(env, "/jobs/" + job.id, "client", {
      action: "visit",
      version: job.version,
      date: "2099-01-01",
      time: "10:00",
    })
  ).data.job;
  assert.equal(
    (await call(env, "/jobs/" + job.id, "client", { action: "start", version: job.version }))
      .status,
    403,
  );
  job = (await call(env, "/jobs/" + job.id, "pro", { action: "start", version: job.version })).data
    .job;
  job = (await call(env, "/jobs/" + job.id, "client", { action: "finish", version: job.version }))
    .data.job;
  assert.equal(job.state, "finalizado");
  job = (
    await call(env, "/jobs/" + job.id, "client", {
      action: "message",
      version: job.version,
      professionalId: "pro",
      text: "Necesito otro trabajo",
    })
  ).data.job;
  assert.equal(job.messages.length, 1);
  assert.equal(
    (
      await call(env, "/jobs/" + job.id, "other", {
        action: "message",
        version: job.version,
        professionalId: "pro",
        text: "Intento ajeno",
      })
    ).status,
    403,
  );
});
test("only CEO invites superadmins, superadmins invite admins, and invitations are email-bound and single-use", async () => {
  const { env } = setup();
  const invite = await call(env, "/staff/invite", "ceo", {
    email: "super@example.test",
    role: "ceo",
  });
  assert.equal(invite.status, 201);
  assert.equal(invite.data.role, "superadmin");
  assert.equal(
    (await call(env, "/invites/accept", "stranger", { id: invite.data.id })).status,
    403,
  );
  assert.equal((await call(env, "/invites/accept", "super", { id: invite.data.id })).status, 200);
  assert.equal((await call(env, "/invites/accept", "super", { id: invite.data.id })).status, 403);
  const adminInvite = await call(env, "/staff/invite", "super", {
    email: "admin@example.test",
    role: "superadmin",
  });
  assert.equal(adminInvite.data.role, "admin");
  await call(env, "/invites/accept", "admin", { id: adminInvite.data.id });
  assert.equal(
    (await call(env, "/staff/invite", "admin", { email: "another@example.test" })).status,
    403,
  );
  assert.equal((await call(env, "/session", "super")).data.staffRole, "superadmin");
});
test("identity files are private, upload ownership is checked, and the applicant cannot approve themself", async () => {
  const { db, env } = setup();
  await register(env, "pro", "profesional");
  await register(env, "other", "profesional");
  await attachProfilePhoto(db, env, "pro");
  for (const id of ["front", "back", "selfie"]) {
    db.prepare(
      "INSERT INTO uploads(id,owner_id,scope,object_key,mime,created_at) VALUES(?,?,?,?,?,?)",
    ).run(id, "pro", "identity", id, "image/png", 1);
    await env.BUCKET.put(id, new Uint8Array([1, 2, 3]));
  }
  assert.equal((await handleMarket(req("/files/front", "other"), env)).status, 403);
  assert.equal((await handleMarket(req("/files/front", "pro"), env)).status, 200);
  assert.equal(
    (
      await call(env, "/identity", "other", {
        dni: "12345678",
        frontId: "front",
        backId: "back",
        selfieId: "selfie",
        consent: true,
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await call(env, "/identity", "pro", {
        dni: "12345678",
        frontId: "front",
        backId: "back",
        selfieId: "selfie",
        consent: true,
      })
    ).status,
    200,
  );
  let user = (await call(env, "/session", "pro")).data.account;
  assert.equal(user.verification, "pendiente");
  assert.equal(
    (
      await call(env, "/staff/review", "other", {
        userId: "pro",
        decision: "aprobado",
        version: user.version,
      })
    ).status,
    403,
  );
  env.OFICIOS_CEO_EMAIL = "pro@example.test";
  assert.equal(
    (
      await call(env, "/staff/review", "pro", {
        userId: "pro",
        decision: "aprobado",
        version: user.version,
      })
    ).status,
    403,
  );
  env.OFICIOS_CEO_EMAIL = "ceo@example.test";
  assert.equal(
    (
      await call(env, "/staff/review", "ceo", {
        userId: "pro",
        decision: "aprobado",
        version: user.version,
      })
    ).status,
    200,
  );
  assert.equal((await call(env, "/session", "pro")).data.account.verification, "aprobado");
  assert.equal((await handleMarket(req("/files/front", null), env)).status, 403);
  assert.equal((await call(env, "/providers", null)).data.providers.length, 1);
});
test("saved addresses belong to the account and are not visible or deletable by another person", async () => {
  const { env } = setup();
  await register(env, "one");
  await register(env, "two");
  const added = await call(env, "/addresses", "one", {
    label: "Casa",
    kind: "casa",
    cityId: "mercedes-ba",
    address: "Calle privada 123",
    reference: "",
  });
  assert.equal((await call(env, "/addresses", "two")).data.addresses.length, 0);
  await call(env, "/addresses", "two", { id: added.data.id }, "DELETE");
  assert.equal((await call(env, "/addresses", "one")).data.addresses.length, 1);
});

test("a client can enable a professional profile while retaining their own requests and without gaining internal roles", async () => {
  const { env } = setup();
  await register(env, "newpro");
  const created = (await call(env, "/jobs", "newpro", details)).data.job;
  assert.equal(
    (
      await call(
        env,
        "/account",
        "newpro",
        {
          action: "enable-services",
          kind: "profesional",
          trade: "plomeria",
          cityId: "mercedes-ba",
        },
        "PATCH",
      )
    ).status,
    200,
  );
  const session = (await call(env, "/session", "newpro")).data;
  assert.equal(session.account.kind, "profesional");
  assert.equal(session.account.verification, "sin-enviar");
  assert.equal(session.staffRole, null);
  assert.equal((await call(env, "/jobs?scope=client", "newpro")).data.jobs[0].id, created.id);
  assert.equal((await call(env, "/staff", "newpro")).status, 403);
});

test("file upload checks actual bytes and keeps identity photos private", async () => {
  const { env } = setup();
  await register(env, "pro", "profesional");
  await register(env, "other", "profesional");
  const form = new FormData();
  form.set("scope", "identity");
  form.set(
    "file",
    new File([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0])], "test.png", {
      type: "image/png",
    }),
  );
  const uploaded = await handleMarket(
    new Request(origin + "/api/market/upload", {
      method: "POST",
      headers: {
        origin,
        "oai-authenticated-user-id": "pro",
        "oai-authenticated-user-email": "pro@example.test",
      },
      body: form,
    }),
    env,
  );
  assert.equal(uploaded.status, 201);
  const { id } = await uploaded.json();
  assert.equal((await handleMarket(req("/files/" + id, "pro"), env)).status, 200);
  assert.equal((await handleMarket(req("/files/" + id, "other"), env)).status, 403);
  const bad = new FormData();
  bad.set("scope", "identity");
  bad.set("file", new File(["<html>bad</html>"], "bad.png", { type: "image/png" }));
  assert.equal(
    (
      await handleMarket(
        new Request(origin + "/api/market/upload", {
          method: "POST",
          headers: { origin, "oai-authenticated-user-id": "pro" },
          body: bad,
        }),
        env,
      )
    ).status,
    400,
  );
});

test("work publication needs declared permission and withdrawal closes access to the images", async () => {
  const { db, env } = setup();
  await register(env, "pro", "profesional");
  await attachProfilePhoto(db, env, "pro");
  db.prepare("UPDATE accounts SET verification='aprobado' WHERE user_id='pro'").run();
  for (const id of ["before", "after"]) {
    db.prepare(
      "INSERT INTO uploads(id,owner_id,scope,object_key,mime,created_at) VALUES(?,?,?,?,?,?)",
    ).run(id, "pro", "work", id, "image/png", 1);
    await env.BUCKET.put(id, new Uint8Array([1, 2, 3]));
  }
  const work = {
    title: "Trabajo realizado",
    description: "Descripción del trabajo realizado.",
    date: "2026-01-01",
    beforeId: "before",
    afterId: "after",
    clientWork: true,
    clientConsent: false,
    published: true,
  };
  assert.equal((await call(env, "/works", "pro", work)).status, 400);
  const saved = await call(env, "/works", "pro", { ...work, clientConsent: true });
  assert.equal(saved.status, 201);
  assert.equal((await handleMarket(req("/files/before", null), env)).status, 200);
  assert.equal(
    (await call(env, "/works/" + saved.data.id, "pro", { published: false }, "PATCH")).status,
    200,
  );
  assert.equal((await handleMarket(req("/files/before", null), env)).status, 403);
});

test("company team assignment checks membership, identity and overlapping turns across concurrent jobs", async () => {
  const { db, env } = setup();
  await register(env, "client");
  await register(env, "company", "empresa");
  await register(env, "member", "profesional");
  await attachProfilePhoto(db, env, "member");
  db.prepare(
    "UPDATE accounts SET verification='aprobado' WHERE user_id IN ('company','member')",
  ).run();
  const invited = await call(env, "/company", "company", {
    name: "Integrante",
    email: "member@example.test",
    trade: "plomeria",
  });
  assert.equal((await call(env, "/company/accept", "member", { id: invited.data.id })).status, 200);
  const jobs = [];
  for (let i = 0; i < 2; i++) {
    let job = (await call(env, "/jobs", "client", details)).data.job;
    job = (
      await call(env, "/jobs/" + job.id, "company", {
        action: "quote",
        version: job.version,
        quote,
      })
    ).data.job;
    job = (
      await call(env, "/jobs/" + job.id, "client", {
        action: "decide-quote",
        version: job.version,
        quoteId: job.quotes[0].id,
        revision: 1,
        accept: true,
      })
    ).data.job;
    jobs.push(job);
  }
  const slot = {
    action: "assign",
    memberId: invited.data.id,
    date: "2099-01-01",
    time: "10:00",
    minutes: 60,
  };
  const results = await Promise.all(
    jobs.map((job) => call(env, "/jobs/" + job.id, "company", { ...slot, version: job.version })),
  );
  assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
  const assigned = results.find((r) => r.status === 200).data.job;
  assert.equal(
    (await call(env, "/jobs/" + assigned.id, "member")).data.job.address,
    details.address,
  );
  assert.equal(
    (
      await call(env, "/jobs/" + assigned.id, "member", {
        action: "quote",
        version: assigned.version,
        quote,
      })
    ).status,
    403,
  );
});

test("professional onboarding requires an owned public profile photo in addition to private DNI and selfie", async () => {
  const { db, env } = setup();
  await register(env, "pro", "profesional");
  await register(env, "other", "profesional");
  await register(env, "client");
  const payload = {
    dni: "12345678",
    frontId: "front",
    backId: "back",
    selfieId: "selfie",
    consent: true,
  };
  for (const id of ["front", "back", "selfie"]) {
    db.prepare(
      "INSERT INTO uploads(id,owner_id,scope,object_key,mime,created_at) VALUES(?,?,?,?,?,?)",
    ).run(id, "pro", "identity", id, "image/png", 1);
    await env.BUCKET.put(id, new Uint8Array([1, 2, 3]));
  }
  assert.equal((await call(env, "/session", "pro")).data.account.kind, "profesional");
  assert.equal((await call(env, "/identity", "pro", payload)).status, 400);
  assert.equal((await call(env, "/session", "pro")).data.account.verification, "sin-enviar");
  const otherPhoto = await attachProfilePhoto(db, env, "other");
  assert.equal(
    (await call(env, "/identity", "pro", { ...payload, profilePhotoId: otherPhoto })).status,
    403,
  );
  assert.equal(
    (await call(env, "/identity", "pro", { ...payload, profilePhotoId: "front" })).status,
    403,
  );
  const photo = await attachProfilePhoto(db, env, "pro");
  assert.equal(
    (await call(env, "/identity", "pro", { ...payload, profilePhotoId: photo, dni: "" })).status,
    400,
  );
  assert.equal(
    (await call(env, "/identity", "pro", { ...payload, profilePhotoId: photo, backId: undefined }))
      .status,
    400,
  );
  assert.equal(
    (await call(env, "/identity", "pro", { ...payload, profilePhotoId: photo })).status,
    200,
  );
  assert.equal((await handleMarket(req("/files/" + photo, "ceo"), env)).status, 200);
  assert.equal((await handleMarket(req("/files/" + photo, null), env)).status, 403);
  const account = (await call(env, "/session", "pro")).data.account;
  db.prepare("UPDATE accounts SET profile_json='{}' WHERE user_id='pro'").run();
  assert.equal(
    (
      await call(env, "/staff/review", "ceo", {
        userId: "pro",
        decision: "aprobado",
        version: account.version,
      })
    ).status,
    400,
  );
  db.prepare("UPDATE accounts SET profile_json=? WHERE user_id=?").run(
    JSON.stringify({ profilePhotoId: photo }),
    "pro",
  );
  assert.equal(
    (
      await call(env, "/staff/review", "ceo", {
        userId: "pro",
        decision: "aprobado",
        version: account.version,
      })
    ).status,
    200,
  );
  assert.equal((await handleMarket(req("/files/" + photo, null), env)).status, 200);
  assert.equal((await handleMarket(req("/files/front", null), env)).status, 403);
  const publicProfile = (await call(env, "/providers/pro", null)).data.provider;
  assert.equal(publicProfile.profilePhotoId, photo);
  assert.equal(publicProfile.identity, undefined);
  assert.equal(
    (await call(env, "/identity", "client", { ...payload, profilePhotoId: photo })).status,
    403,
  );
});

test("approved professionals missing a profile photo cannot publish themselves or quote and can complete the missing requirement", async () => {
  const { db, env } = setup();
  await register(env, "pro", "profesional");
  await register(env, "client");
  const job = (await call(env, "/jobs", "client", details)).data.job;
  db.prepare("UPDATE accounts SET verification='aprobado' WHERE user_id='pro'").run();
  assert.equal((await call(env, "/providers", null)).data.providers.length, 0);
  assert.equal((await call(env, "/providers/pro", null)).status, 404);
  assert.equal(
    (await call(env, "/jobs/" + job.id, "pro", { action: "quote", quote, version: job.version }))
      .status,
    403,
  );
  for (const id of ["front", "back", "selfie"])
    db.prepare(
      "INSERT INTO uploads(id,owner_id,scope,object_key,mime,created_at) VALUES(?,?,?,?,?,?)",
    ).run(id, "pro", "identity", id, "image/png", 1);
  // Uploading a new photo does not make it part of the profile before submitting.
  db.prepare(
    "INSERT INTO uploads(id,owner_id,scope,object_key,mime,created_at) VALUES(?,?,?,?,?,?)",
  ).run("photo", "pro", "logo", "photo", "image/png", 1);
  assert.equal(
    (
      await call(env, "/identity", "pro", {
        dni: "12345678",
        frontId: "front",
        backId: "back",
        selfieId: "selfie",
        profilePhotoId: "photo",
        consent: true,
      })
    ).status,
    200,
  );
  assert.equal((await call(env, "/session", "pro")).data.account.verification, "pendiente");
});

test("changing an approved professional profile photo requires review again and a photo cannot be cleared", async () => {
  const { db, env } = setup();
  await register(env, "pro", "profesional");
  const photo = await attachProfilePhoto(db, env, "pro");
  db.prepare("UPDATE accounts SET verification='aprobado' WHERE user_id='pro'").run();
  const account = (await call(env, "/session", "pro")).data.account;
  assert.equal(
    (
      await call(
        env,
        "/account",
        "pro",
        { name: account.name, bio: "", phone: "", profilePhotoId: "", version: account.version },
        "PATCH",
      )
    ).status,
    400,
  );
  assert.equal((await call(env, "/session", "pro")).data.account.profilePhotoId, photo);
  db.prepare(
    "INSERT INTO uploads(id,owner_id,scope,object_key,mime,created_at) VALUES(?,?,?,?,?,?)",
  ).run("new-photo", "pro", "logo", "new-photo", "image/png", 1);
  assert.equal(
    (
      await call(
        env,
        "/account",
        "pro",
        {
          name: account.name,
          bio: "",
          phone: "",
          profilePhotoId: "new-photo",
          version: account.version,
        },
        "PATCH",
      )
    ).status,
    200,
  );
  const after = (await call(env, "/session", "pro")).data.account;
  assert.equal(after.verification, "pendiente");
  assert.equal(after.profilePhotoId, "new-photo");
  assert.equal((await call(env, "/providers", null)).data.providers.length, 0);
});

test("commercial settings are CEO-only, versioned, audited and published without enabling billing", async () => {
  const { db, env } = setup();
  await register(env, "client");
  await register(env, "pro", "profesional");
  for (const user of ["client", "pro", null])
    assert.equal((await call(env, "/ceo/config", user)).status, 403);
  db.prepare("INSERT INTO staff(user_id,role,invited_by,created_at) VALUES(?,?,?,?)").run(
    "super",
    "superadmin",
    "ceo",
    1,
  );
  assert.equal((await call(env, "/ceo/config", "super")).status, 403);
  const initial = (await call(env, "/ceo/config", "ceo")).data;
  assert.equal(initial.version, 0);
  assert.equal(initial.config.regions.find((r) => r.id === "caba-ar").status, "preparacion");
  const draft = structuredClone(initial.config);
  draft.plans[1].priceCents = 1550;
  draft.plans[1].benefits = ["Beneficio editable por CEO"];
  const results = await Promise.all([
    call(env, "/ceo/config", "ceo", { version: 0, config: draft }, "PUT"),
    call(env, "/ceo/config", "ceo", { version: 0, config: draft }, "PUT"),
  ]);
  assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
  assert.equal(db.prepare("SELECT COUNT(*) n FROM commercial_audit").get().n, 1);
  const published = (await call(env, "/config", null)).data;
  assert.equal(published.plans[1].priceCents, 1550);
  assert.deepEqual(published.plans[1].benefits, ["Beneficio editable por CEO"]);
  assert.equal(published.billingEnabled, false);
  assert.equal(
    published.regions.some((r) => r.id === "caba-ar"),
    false,
  );
  const current = (await call(env, "/ceo/config", "ceo")).data;
  draft.plans[0].priceCents = 100;
  assert.equal(
    (await call(env, "/ceo/config", "ceo", { version: current.version, config: draft }, "PUT"))
      .status,
    400,
  );
});

test("all Buenos Aires districts support registration, orders and CEO switches without opening CABA", async () => {
  const { env } = setup({ legacyRegions: false });
  const published = (await call(env, "/config", null)).data;
  assert.equal(published.regions.length, 135);
  assert.ok(published.regions.every((r) => r.province === "Buenos Aires" && r.status === "activa"));
  const representatives = [
    "la-plata-ba",
    "la-matanza-ba",
    "tigre-ba",
    "bahia-blanca-ba",
    "general-pueyrredon-ba",
    "patagones-ba",
    "jose-c-paz-ba",
    "leandro-n-alem-ba",
  ];
  for (const id of representatives) {
    assert.ok(
      published.regions.some((r) => r.id === id),
      id,
    );
    assert.equal(
      (await call(env, "/account", id, { ...profile("profesional"), cityId: id })).status,
      201,
      id,
    );
  }
  await register(env, "client");
  for (const cityId of representatives)
    assert.equal((await call(env, "/jobs", "client", { ...details, cityId })).status, 201, cityId);
  assert.equal((await call(env, "/jobs", "client", { ...details, cityId: "caba-ar" })).status, 400);
  const saved = (await call(env, "/ceo/config", "ceo")).data;
  // The complete 136-region configuration must remain editable through the real JSON body limit.
  saved.config.plans[1].priceCents = 1250;
  saved.config.plans[1].benefits = Array.from({ length: 12 }, (_, i) =>
    `${i}. Beneficio profesional detallado `.padEnd(160, "x"),
  );
  for (const region of saved.config.regions) region.name = region.name.padEnd(100, " ");
  assert.ok(
    Buffer.byteLength(JSON.stringify({ config: saved.config, version: saved.version })) > 32000,
  );
  const updated = await call(
    env,
    "/ceo/config",
    "ceo",
    { config: saved.config, version: saved.version },
    "PUT",
  );
  assert.equal(updated.status, 200);
  const closed = await call(
    env,
    "/ceo/regions/tigre-ba/status",
    "ceo",
    { version: updated.data.version, active: false },
    "PATCH",
  );
  assert.equal(closed.status, 200);
  assert.equal(
    (await call(env, "/jobs", "client", { ...details, cityId: "tigre-ba" })).status,
    400,
  );
  assert.equal(
    (await call(env, "/jobs", "client", { ...details, cityId: "la-plata-ba" })).status,
    201,
  );
});

test("city switches are CEO-only, preserve other settings and audit successful changes once", async () => {
  const { db, env } = setup();
  for (const [user, role] of [
    ["super", "superadmin"],
    ["admin", "admin"],
  ])
    db.prepare("INSERT INTO staff(user_id,role,invited_by,created_at) VALUES(?,?,?,?)").run(
      user,
      role,
      "ceo",
      1,
    );
  const path = "/ceo/regions/lujan-ba/status";
  for (const user of [null, "client", "super", "admin"])
    assert.equal((await call(env, path, user, { version: 0, active: true }, "PATCH")).status, 403);
  for (const active of ["true", 1, null])
    assert.equal((await call(env, path, "ceo", { version: 0, active }, "PATCH")).status, 400);
  assert.equal(
    (await call(env, "/ceo/regions/missing/status", "ceo", { version: 0, active: true }, "PATCH"))
      .status,
    404,
  );
  const initial = (await call(env, "/ceo/config", "ceo")).data;
  const config = structuredClone(initial.config);
  config.plans[1].priceCents = 1550;
  config.referrals.rewardQuotes = 7;
  const custom = await call(env, "/ceo/config", "ceo", { version: initial.version, config }, "PUT");
  assert.equal(custom.status, 200);
  const results = await Promise.all([
    call(env, path, "ceo", { version: custom.data.version, active: true }, "PATCH"),
    call(env, path, "ceo", { version: custom.data.version, active: true }, "PATCH"),
  ]);
  assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
  const saved = (await call(env, "/ceo/config", "ceo")).data;
  const expected = structuredClone(config);
  expected.regions.find((r) => r.id === "lujan-ba").status = "activa";
  assert.deepEqual(saved.config, expected);
  assert.ok((await call(env, "/config", null)).data.regions.some((r) => r.id === "lujan-ba"));
  const entries = db.prepare("SELECT * FROM commercial_audit WHERE action='region-status'").all();
  assert.equal(entries.length, 1);
  assert.equal(entries[0].actor_id, "ceo");
  assert.equal(entries[0].entity_id, "lujan-ba");
  assert.equal(JSON.parse(entries[0].before_json).status, "preparacion");
  assert.equal(JSON.parse(entries[0].after_json).status, "activa");
  assert.equal(
    (await call(env, path, "ceo", { version: custom.data.version, active: false }, "PATCH")).status,
    409,
  );
  assert.equal(db.prepare("SELECT COUNT(*) n FROM commercial_audit").get().n, 2);
});

test("city switches allow closing the last city and reopening it without losing existing jobs", async () => {
  const { env } = setup();
  await register(env, "existing-client");
  const created = await call(env, "/jobs", "existing-client", details);
  assert.equal(created.status, 201);
  let saved = (await call(env, "/ceo/config", "ceo")).data;
  const path = "/ceo/regions/mercedes-ba/status";
  const closed = await call(env, path, "ceo", { version: saved.version, active: false }, "PATCH");
  assert.equal(closed.status, 200);
  assert.equal(closed.data.config.regions.find((r) => r.id === "mercedes-ba").status, "pausada");
  assert.deepEqual((await call(env, "/config", null)).data.regions, []);
  assert.equal((await call(env, "/jobs", "existing-client", details)).status, 400);
  assert.equal(
    (await call(env, "/account", "new-client", await clientRegistration(env, "new-client"))).status,
    400,
  );
  assert.equal((await call(env, "/account", "new-pro", profile("profesional"))).status, 400);
  assert.equal((await call(env, "/jobs/" + created.data.job.id, "existing-client")).status, 200);
  saved = (await call(env, "/ceo/config", "ceo")).data;
  assert.equal(
    (await call(env, path, "ceo", { version: saved.version, active: true }, "PATCH")).status,
    200,
  );
  assert.equal((await call(env, "/jobs", "existing-client", details)).status, 201);
  assert.equal((await call(env, "/account", "new-pro", profile("profesional"))).status, 201);
});

test("zone activation opens registration and orders, while pausing preserves existing work", async () => {
  const { env } = setup();
  assert.equal(
    (
      await call(env, "/account", "capital-user", {
        ...(await clientRegistration(env, "capital-user")),
        cityId: "caba-ar",
      })
    ).status,
    400,
  );
  let saved = (await call(env, "/ceo/config", "ceo")).data;
  const config = saved.config;
  config.regions.find((r) => r.id === "caba-ar").status = "activa";
  assert.equal(
    (await call(env, "/ceo/config", "ceo", { version: saved.version, config }, "PUT")).status,
    200,
  );
  assert.equal(
    (
      await call(env, "/account", "capital-user", {
        ...(await clientRegistration(env, "capital-user")),
        cityId: "caba-ar",
      })
    ).status,
    201,
  );
  const created = await call(env, "/jobs", "capital-user", { ...details, cityId: "caba-ar" });
  assert.equal(created.status, 201);
  saved = (await call(env, "/ceo/config", "ceo")).data;
  saved.config.regions.find((r) => r.id === "caba-ar").status = "pausada";
  await call(env, "/ceo/config", "ceo", { version: saved.version, config: saved.config }, "PUT");
  assert.equal(
    (await call(env, "/jobs", "capital-user", { ...details, cityId: "caba-ar" })).status,
    400,
  );
  assert.equal(
    (await call(env, "/account", "new-capital-user", { ...profile(), cityId: "caba-ar" })).status,
    400,
  );
  assert.equal((await call(env, "/jobs/" + created.data.job.id, "capital-user")).status, 200);
  assert.equal(
    (await call(env, "/config", null)).data.regions.some((r) => r.id === "caba-ar"),
    false,
  );
});

test("new proposal quotas and referral bonuses are atomic and revisions do not consume another slot", async () => {
  const { db, env } = setup();
  await register(env, "client");
  await register(env, "pro", "profesional");
  await attachProfilePhoto(db, env, "pro");
  db.prepare("UPDATE accounts SET verification='aprobado' WHERE user_id='pro'").run();
  const settings = (await call(env, "/ceo/config", "ceo")).data;
  settings.config.plans[0].quoteLimit = 1;
  settings.config.plans[0].maxPaymentMethods = 1;
  await call(
    env,
    "/ceo/config",
    "ceo",
    { version: settings.version, config: settings.config },
    "PUT",
  );
  const jobs = [];
  for (let i = 0; i < 2; i++) jobs.push((await call(env, "/jobs", "client", details)).data.job);
  const results = await Promise.all(
    jobs.map((job) =>
      call(env, "/jobs/" + job.id, "pro", { action: "quote", version: job.version, quote }),
    ),
  );
  assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
  const accepted = results.find((r) => r.status === 200).data.job;
  const latest = (await call(env, "/jobs/" + accepted.id, "client")).data.job;
  const rejected = (
    await call(env, "/jobs/" + latest.id, "client", {
      action: "decide-quote",
      version: latest.version,
      quoteId: latest.quotes[0].id,
      revision: 1,
      accept: false,
    })
  ).data.job;
  assert.equal(
    (
      await call(env, "/jobs/" + rejected.id, "pro", {
        action: "quote",
        version: rejected.version,
        quote,
      })
    ).status,
    200,
  );
  const entitlements = (await call(env, "/entitlements", "pro")).data;
  assert.equal(entitlements.usedQuotes, 1);
  assert.equal(entitlements.availableQuotes, 0);
  assert.equal(entitlements.maxPaymentMethods, 1);
  const account = (await call(env, "/session", "pro")).data.account;
  assert.equal(
    (
      await call(
        env,
        "/account",
        "pro",
        {
          name: account.name,
          bio: "",
          phone: "",
          version: account.version,
          paymentMethods: [
            { kind: "efectivo", label: "Efectivo", value: "" },
            { kind: "transferencia", label: "Banco", value: "alias.cuenta" },
          ],
        },
        "PATCH",
      )
    ).status,
    400,
  );
});

test("referral credits require approved identity, keep promised rules and are awarded only once", async () => {
  const { db, env } = setup();
  await register(env, "referrer", "profesional");
  await attachProfilePhoto(db, env, "referrer");
  db.prepare("UPDATE accounts SET verification='aprobado' WHERE user_id='referrer'").run();
  let settings = (await call(env, "/ceo/config", "ceo")).data;
  settings.config.referrals.enabled = true;
  settings.config.referrals.rewardQuotes = 2;
  settings.config.referrals.maxRewardsPerReferrer = 1;
  settings.config.plans[0].quoteLimit = 1;
  await call(
    env,
    "/ceo/config",
    "ceo",
    { version: settings.version, config: settings.config },
    "PUT",
  );
  assert.equal((await call(env, "/referrals", "referrer", { action: "create-code" })).status, 200);
  const code = (await call(env, "/referrals", "referrer")).data.code;
  assert.equal((await call(env, "/referrals", "referrer", { action: "bind", code })).status, 400);
  assert.equal(
    (await call(env, "/account", "friend", { ...profile("profesional"), referralCode: code }))
      .status,
    201,
  );
  assert.equal((await call(env, "/entitlements", "referrer")).data.bonusQuotes, 0);
  await attachProfilePhoto(db, env, "friend");
  for (const id of ["friend-front", "friend-back", "friend-selfie"]) {
    db.prepare(
      "INSERT INTO uploads(id,owner_id,scope,object_key,mime,created_at) VALUES(?,?,?,?,?,?)",
    ).run(id, "friend", "identity", id, "image/png", 1);
  }
  assert.equal(
    (
      await call(env, "/identity", "friend", {
        dni: "12345678",
        frontId: "friend-front",
        backId: "friend-back",
        selfieId: "friend-selfie",
        consent: true,
      })
    ).status,
    200,
  );
  settings = (await call(env, "/ceo/config", "ceo")).data;
  settings.config.referrals.rewardQuotes = 50;
  settings.config.referrals.enabled = false;
  await call(
    env,
    "/ceo/config",
    "ceo",
    { version: settings.version, config: settings.config },
    "PUT",
  );
  const friend = (await call(env, "/session", "friend")).data.account;
  assert.equal(
    (
      await call(env, "/staff/review", "ceo", {
        userId: "friend",
        decision: "aprobado",
        version: friend.version,
      })
    ).status,
    200,
  );
  const balance = (await call(env, "/entitlements", "referrer")).data;
  assert.equal(balance.bonusQuotes, 2);
  assert.equal(balance.availableQuotes, 3);
  assert.equal(
    (
      await call(env, "/staff/review", "ceo", {
        userId: "friend",
        decision: "aprobado",
        version: friend.version,
      })
    ).status,
    409,
  );
  assert.equal(db.prepare("SELECT COUNT(*) n FROM referral_rewards").get().n, 1);
  const refs = (await call(env, "/referrals", "referrer")).data;
  assert.equal(refs.entries[0].amount, 2);
  assert.ok(refs.entries[0].qualified_at);
  assert.equal(
    (await call(env, "/account", "late-friend", { ...profile("profesional"), referralCode: code }))
      .status,
    400,
  );
});

test("the CEO order map protects exact locations and manual pin changes do not alter address or job state", async () => {
  const { db, env } = setup();
  await register(env, "client");
  await register(env, "pro", "profesional");
  await attachProfilePhoto(db, env, "pro");
  db.prepare("UPDATE accounts SET verification='aprobado' WHERE user_id='pro'").run();
  const job = (
    await call(env, "/jobs", "client", {
      ...details,
      location: { lat: -34.65, lng: -59.43, source: "forged" },
    })
  ).data.job;
  assert.equal(job.location.source, "cliente");
  assert.equal((await call(env, "/jobs/" + job.id, "pro")).data.job.location, null);
  assert.equal((await call(env, "/ceo/orders", "client")).status, 403);
  const listed = (await call(env, "/ceo/orders", "ceo")).data;
  assert.equal(listed.orders[0].address, details.address);
  assert.equal(listed.orders[0].location.lat, -34.65);
  const changed = await call(
    env,
    "/ceo/orders/" + job.id + "/location",
    "ceo",
    { version: job.version, location: { lat: -34.66, lng: -59.44 } },
    "PATCH",
  );
  assert.equal(changed.status, 200);
  const after = (await call(env, "/jobs/" + job.id, "client")).data.job;
  assert.equal(after.address, details.address);
  assert.equal(after.state, "solicitado");
  assert.equal(after.location.lat, -34.66);
  assert.equal(after.version, job.version + 1);
  assert.equal(
    (
      await call(
        env,
        "/ceo/orders/" + job.id + "/location",
        "ceo",
        { version: job.version, location: { lat: -34.7, lng: -59.5 } },
        "PATCH",
      )
    ).status,
    409,
  );
  assert.equal(
    db.prepare("SELECT COUNT(*) n FROM commercial_audit WHERE action='order-location'").get().n,
    1,
  );
  assert.equal(
    (await call(env, "/jobs", "client", { ...details, location: { lat: 999, lng: 0 } })).status,
    400,
  );
  const without = (await call(env, "/jobs", "client", details)).data.job;
  assert.equal(without.location, null);
});

test("monthly referral limits use the Argentina calendar and CEO routes never follow a URL role switch", async () => {
  const { marketMonth } = await import("../worker/market-settings.mjs");
  assert.equal(marketMonth(Date.parse("2026-12-01T02:59:59Z")).key, "2026-11");
  assert.equal(
    marketMonth(Date.parse("2026-12-01T02:59:59Z")).end,
    Date.parse("2026-12-01T03:00:00Z"),
  );
  assert.equal(marketMonth(Date.parse("2026-12-01T03:00:00Z")).key, "2026-12");
  assert.equal(marketPageAllowed("/ceo", { staffRole: "admin", account: null }), false);
  assert.equal(marketPageAllowed("/ceo", { staffRole: "superadmin", account: null }), false);
  assert.equal(marketPageAllowed("/ceo", { staffRole: "ceo", account: null }), true);
  assert.equal(
    marketPageAllowed("/planes-profesionales", { staffRole: null, account: { kind: "empresa" } }),
    false,
  );
});

test("client registration requires an owned fresh private selfie and explicit consent, without DNI", async () => {
  const { db, env } = setup();
  assert.equal((await stageSelfie(env, null)).status, 401);
  assert.equal((await call(env, "/account", "new", profile())).status, 400);
  assert.equal(db.prepare("SELECT COUNT(*) n FROM accounts").get().n, 0);
  const data = await clientRegistration(env, "new");
  assert.equal((await call(env, "/account", "other", data)).status, 403);
  assert.equal(
    (await call(env, "/account", "new", { ...data, clientSelfieConsent: false })).status,
    400,
  );
  assert.equal((await call(env, "/files/" + data.clientSelfieId, "new")).status, 404);
  assert.equal((await call(env, "/account", "new", data)).status, 201);
  const account = (await call(env, "/session", "new")).data.account;
  assert.equal(account.verification, "pendiente");
  assert.equal(account.identity.clientSelfieId, data.clientSelfieId);
  assert.equal(account.identity.dni, undefined);
  assert.equal(account.profilePhotoId, null);
  assert.equal(
    db.prepare("SELECT scope FROM uploads WHERE id = ?").get(data.clientSelfieId).scope,
    "client-selfie",
  );
  const old = await clientRegistration(env, "late");
  db.prepare("UPDATE client_selfie_uploads SET created_at = 0 WHERE id = ?").run(
    old.clientSelfieId,
  );
  assert.equal((await call(env, "/account", "late", old)).status, 403);
  await register(env, "professional", "profesional");
  assert.equal((await stageSelfie(env, "professional")).status, 403);
});

test("client selfies stay private even after manual approval and never require DNI review", async () => {
  const { env } = setup();
  await register(env, "client");
  await register(env, "pro", "profesional");
  const account = (await call(env, "/session", "client")).data.account;
  const path = "/files/" + account.identity.clientSelfieId;
  for (const user of [null, "stranger", "pro"])
    assert.equal((await handleMarket(req(path, user), env)).status, 403);
  for (const user of ["client", "ceo"]) {
    const response = await handleMarket(req(path, user), env);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
  }
  assert.equal(
    (await call(env, "/staff", "ceo")).data.reviews[0].identity.clientSelfieId,
    account.identity.clientSelfieId,
  );
  const decision = { userId: "client", version: account.version, decision: "aprobado" };
  assert.equal((await call(env, "/staff/review", "client", decision)).status, 403);
  assert.equal((await call(env, "/staff/review", "ceo", decision)).status, 200);
  assert.equal((await call(env, "/session", "client")).data.account.verification, "aprobado");
  assert.equal((await handleMarket(req(path, "pro"), env)).status, 403);
  assert.deepEqual((await call(env, "/providers", null)).data.providers, []);
});

test("replacing a client selfie resets manual review and stale submissions cannot consume uploads", async () => {
  const { db, env } = setup();
  await register(env, "client");
  let account = (await call(env, "/session", "client")).data.account;
  await call(env, "/staff/review", "ceo", {
    userId: "client",
    version: account.version,
    decision: "rechazado",
    reason: "Volvé a tomarla con luz",
  });
  account = (await call(env, "/session", "client")).data.account;
  const first = await stageSelfie(env, "client"),
    second = await stageSelfie(env, "client");
  const results = await Promise.all(
    [first, second].map((selfie) =>
      call(env, "/client-verification", "client", {
        selfieId: selfie.id,
        consent: true,
        version: account.version,
      }),
    ),
  );
  assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
  const fresh = (await call(env, "/session", "client")).data.account;
  assert.equal(fresh.verification, "pendiente");
  assert.equal(fresh.identity.review, undefined);
  assert.equal(
    db.prepare("SELECT COUNT(*) n FROM uploads WHERE scope = 'client-selfie'").get().n,
    2,
  );
  const used = fresh.identity.clientSelfieId;
  assert.equal(
    (
      await call(env, "/client-verification", "client", {
        selfieId: used,
        consent: true,
        version: fresh.version,
      })
    ).status,
    403,
  );
  const unclaimed = db
    .prepare("SELECT COUNT(*) n FROM client_selfie_uploads WHERE claimed_at IS NULL")
    .get().n;
  assert.equal(unclaimed, 1);
});

test("team mail saves unsent invitations honestly and can send them after provider configuration", async () => {
  const { env, db } = setup();
  const created = await call(env, "/staff/invite", "ceo", { email: "super@example.test" });
  assert.equal(created.status, 201);
  assert.equal(created.data.delivery.status, "pending");
  assert.match(created.data.delivery.message, /no está activado/);
  assert.equal(
    db.prepare("SELECT delivery_attempts FROM staff_invites WHERE id = ?").get(created.data.id)
      .delivery_attempts,
    0,
  );
  const duplicate = await call(env, "/staff/invite", "ceo", { email: "super@example.test" });
  assert.equal(duplicate.data.id, created.data.id);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM staff_invites").get().n, 1);
  const requests = [];
  env.MAIL_FROM = "pqroficiosapp@gmail.com";
  env.BREVO_API_KEY = "test-secret-not-for-browser";
  env.MAIL_FETCH = async (url, options) => {
    requests.push({ url, options });
    return Response.json({ messageId: "<accepted@provider.test>" }, { status: 201 });
  };
  const sent = await call(env, "/staff/invite/resend", "ceo", { id: created.data.id });
  assert.equal(sent.data.delivery.status, "sent");
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, "https://api.brevo.com/v3/smtp/email");
  assert.equal(requests[0].options.headers["api-key"], env.BREVO_API_KEY);
  const email = JSON.parse(requests[0].options.body);
  assert.deepEqual(email.to, [{ email: "super@example.test" }]);
  assert.equal(email.sender.email, env.MAIL_FROM);
  assert.equal(email.replyTo.email, env.MAIL_FROM);
  assert.match(email.textContent, new RegExp(origin + "/gestion\\?invitacion=" + created.data.id));
  assert.match(email.subject, /superadministrador/);
  assert.ok(!email.textContent.includes(env.BREVO_API_KEY));
  const row = db.prepare("SELECT * FROM staff_invites WHERE id = ?").get(created.data.id);
  assert.equal(row.delivery_status, "sent");
  assert.equal(row.delivery_provider_id, "<accepted@provider.test>");
  assert.ok(row.delivery_sent_at);
  const dashboard = await call(env, "/staff", "ceo");
  assert.equal(dashboard.data.mail.configured, true);
  assert.ok(!JSON.stringify(dashboard.data).includes(env.BREVO_API_KEY));
  assert.equal(dashboard.data.invites[0].delivery_status, "sent");
  await call(env, "/invites/accept", "super", { id: created.data.id });
  assert.equal((await call(env, "/session", "super")).data.account, null);
  assert.equal((await call(env, "/staff", "ceo")).data.team[0].email, "super@example.test");
  assert.equal(
    (await call(env, "/staff/invite/resend", "ceo", { id: created.data.id })).status,
    409,
  );
  assert.equal(
    (await call(env, "/staff/invite/resend", "super", { id: created.data.id })).status,
    403,
  );
});

test("SMTP credentials cannot be mistaken for a configured transactional API", async () => {
  const { env, db } = setup();
  env.MAIL_FROM = "team@example.test";
  env.BREVO_API_KEY = "xsmtpsib-local-test-only";
  env.MAIL_FETCH = async () => assert.fail("SMTP keys must never be sent to the API");
  const result = await call(env, "/staff/invite", "ceo", { email: "super@example.test" });
  assert.equal(result.data.delivery.status, "pending");
  assert.match(result.data.delivery.message, /clave cargada es SMTP/);
  const dashboard = (await call(env, "/staff", "ceo")).data;
  assert.equal(dashboard.mail.configured, false);
  assert.equal(dashboard.mail.issue, "smtp_key");
  assert.equal(
    db.prepare("SELECT delivery_error FROM staff_invites").get().delivery_error,
    "smtp_key",
  );
});

test("team mail classifies provider rejection and uncertain delivery without leaking provider data", async () => {
  for (const [status, expected, code] of [
    [401, "failed", "credentials"],
    [403, "failed", "credentials"],
    [400, "failed", "sender"],
    [429, "failed", "limit"],
    [503, "uncertain", "uncertain"],
    [0, "uncertain", "uncertain"],
  ]) {
    const { env, db } = setup();
    env.BREVO_API_KEY = "private-mail-api-key";
    env.MAIL_FROM = "team@example.test";
    env.MAIL_FETCH = async () => {
      if (!status) throw new Error("timeout with private data");
      return new Response("private provider data", { status });
    };
    const result = await call(env, "/staff/invite", "ceo", { email: "super@example.test" });
    assert.equal(result.status, 201);
    assert.equal(result.data.delivery.status, expected);
    assert.ok(!JSON.stringify(result.data).includes("private"));
    assert.equal(db.prepare("SELECT delivery_error FROM staff_invites").get().delivery_error, code);
    // Immediate retries do not produce more external calls.
    const retry = await call(env, "/staff/invite/resend", "ceo", { id: result.data.id });
    assert.match(retry.data.delivery.message, /menos de un minuto/);
    assert.equal(
      db.prepare("SELECT delivery_attempts FROM staff_invites").get().delivery_attempts,
      1,
    );
  }
});

test("team mail leases concurrent sends, checks hierarchy and ownership, and rejects expired invitations", async () => {
  const { env, db } = setup();
  const invite = await call(env, "/staff/invite", "ceo", { email: "super@example.test" });
  env.BREVO_API_KEY = "test-only";
  env.MAIL_FROM = "team@example.test";
  let release;
  let calls = 0;
  env.MAIL_FETCH = async () => {
    calls++;
    await new Promise((resolve) => {
      release = resolve;
    });
    return Response.json({ messageId: "accepted" }, { status: 201 });
  };
  const first = call(env, "/staff/invite/resend", "ceo", { id: invite.data.id });
  while (!release) await new Promise((resolve) => setImmediate(resolve));
  const second = await call(env, "/staff/invite/resend", "ceo", { id: invite.data.id });
  assert.equal(second.data.delivery.status, "sending");
  assert.equal(calls, 1);
  release();
  assert.equal((await first).data.delivery.status, "sent");
  assert.equal(
    (await call(env, "/staff/invite/resend", "client", { id: invite.data.id })).status,
    403,
  );
  assert.equal(
    (await call(env, "/staff/invite", "ceo", { email: "ceo@example.test" })).status,
    400,
  );
  db.prepare("UPDATE staff_invites SET expires_at = 0 WHERE id = ?").run(invite.data.id);
  assert.equal(
    (await call(env, "/staff/invite/resend", "ceo", { id: invite.data.id })).status,
    409,
  );
  assert.equal(calls, 1);
});

test("CEO mail connection check validates the sender and transactional service without sending mail", async () => {
  const { env } = setup();
  env.MAIL_FROM = "team@example.test";
  env.BREVO_API_KEY = "test-private-api-key";
  const urls = [];
  env.MAIL_FETCH = async (url, options) => {
    urls.push(url);
    assert.equal(options.headers["api-key"], env.BREVO_API_KEY);
    assert.equal(options.body, undefined);
    return Response.json(
      url.endsWith("/senders")
        ? { senders: [{ email: env.MAIL_FROM, active: true }] }
        : { relay: { enabled: true } },
    );
  };
  assert.equal((await call(env, "/staff/mail/check", null, {})).status, 403);
  const invite = await call(env, "/staff/invite", "ceo", { email: "super@example.test" });
  await call(env, "/invites/accept", "super", { id: invite.data.id });
  assert.equal((await call(env, "/staff/mail/check", "super", {})).status, 403);
  urls.length = 0;
  const checked = await call(env, "/staff/mail/check", "ceo", {});
  assert.equal(checked.status, 200);
  assert.equal(checked.data.ready, true);
  assert.deepEqual(urls, ["https://api.brevo.com/v3/senders", "https://api.brevo.com/v3/account"]);
  assert.ok(!JSON.stringify(checked.data).includes(env.BREVO_API_KEY));
  await call(env, "/staff/mail/check", "ceo", {});
  assert.equal(urls.length, 2, "Checks have a short cache");
});

test("mail connection check reports the rejected server IP but never provider bodies or secrets", async () => {
  const { env, db } = setup();
  env.MAIL_FROM = "team@example.test";
  env.BREVO_API_KEY = "test-private-api-key";
  env.MAIL_FETCH = async () =>
    Response.json(
      {
        code: "unauthorized",
        message:
          "We have detected you are using an unrecognised IP address 203.0.113.42. Sensitive details: " +
          env.BREVO_API_KEY,
      },
      { status: 401 },
    );
  const checked = await call(env, "/staff/mail/check", "ceo", {});
  assert.equal(checked.data.ready, false);
  assert.equal(checked.data.code, "ip_restricted");
  assert.equal(checked.data.ip, "203.0.113.42");
  assert.ok(!JSON.stringify(checked.data).includes(env.BREVO_API_KEY));
  const invitation = await call(env, "/staff/invite", "ceo", { email: "super@example.test" });
  assert.equal(invitation.data.delivery.status, "failed");
  assert.equal(
    db.prepare("SELECT delivery_error FROM staff_invites WHERE id = ?").get(invitation.data.id)
      .delivery_error,
    "ip_restricted",
  );
});

test("mail connection check distinguishes an unverified sender and a disabled transactional service", async () => {
  for (const [active, enabled, expected] of [
    [false, true, "sender_unverified"],
    [true, false, "transactional_disabled"],
  ]) {
    const { env } = setup();
    env.MAIL_FROM = "team@example.test";
    env.BREVO_API_KEY = "test-only";
    env.MAIL_FETCH = async (url) =>
      Response.json(
        url.endsWith("/senders")
          ? { senders: [{ email: env.MAIL_FROM, active }] }
          : { relay: { enabled } },
      );
    const response = await call(env, "/staff/mail/check", "ceo", {});
    assert.equal(response.data.ready, false);
    assert.equal(response.data.code, expected);
  }
});

test("an invitation takes the invited identity through acceptance and immediately into the creator's team", async () => {
  const { env, db } = setup();
  const invite = await call(env, "/staff/invite", "ceo", { email: "super@example.test" });
  assert.equal((await call(env, "/invites/preview?id=" + invite.data.id, null)).status, 401);
  const wrong = await call(env, "/invites/preview?id=" + invite.data.id, "ceo");
  assert.equal(wrong.status, 200);
  assert.equal(wrong.data.matchesEmail, false);
  assert.equal(wrong.data.canAccept, false);
  assert.equal(wrong.data.email, null);
  assert.ok(!JSON.stringify(wrong.data).includes("super@example.test"));
  assert.equal((await call(env, "/invites/accept", "ceo", { id: invite.data.id })).status, 403);
  assert.equal(db.prepare("SELECT COUNT(*) n FROM staff").get().n, 0);
  assert.equal((await call(env, "/staff", "ceo")).data.team.length, 0);
  const preview = await call(env, "/invites/preview?id=" + invite.data.id, "super");
  assert.equal(preview.data.canAccept, true);
  assert.equal(preview.data.role, "superadmin");
  const accepted = await call(env, "/invites/accept", "super", { id: invite.data.id, role: "ceo" });
  assert.equal(accepted.status, 200);
  assert.equal(accepted.data.role, "superadmin");
  assert.equal(accepted.data.next, "/superadmin");
  const team = (await call(env, "/staff", "ceo")).data.team;
  assert.equal(team.length, 1);
  assert.equal(team[0].email, "super@example.test");
  assert.equal(team[0].role, "superadmin");
  assert.equal((await call(env, "/ceo/config", "super")).status, 403);
  const repeated = (await call(env, "/invites/preview?id=" + invite.data.id, "super")).data;
  assert.equal(repeated.status, "accepted");
  assert.equal(repeated.acceptedByYou, true);
  assert.equal(repeated.canAccept, false);
  assert.equal((await call(env, "/invites/accept", "super", { id: invite.data.id })).status, 403);
  assert.equal((await call(env, "/staff", "ceo")).data.team.length, 1);
  assert.equal(db.prepare("SELECT COUNT(*) n FROM accounts").get().n, 0);
  const adminInvite = await call(env, "/staff/invite", "super", { email: "admin@example.test" });
  const adminAccepted = await call(env, "/invites/accept", "admin", { id: adminInvite.data.id });
  assert.equal(adminAccepted.data.role, "admin");
  assert.equal(adminAccepted.data.next, "/admin");
  assert.deepEqual(
    (await call(env, "/staff", "ceo")).data.team.map((x) => x.role),
    ["superadmin"],
  );
  assert.deepEqual(
    (await call(env, "/staff", "super")).data.team.map((x) => x.role),
    ["admin"],
  );
});

test("expired invites and legacy invitations to CEO never consume a new membership", async () => {
  const { env, db } = setup();
  const invite = await call(env, "/staff/invite", "ceo", { email: "super@example.test" });
  db.prepare("UPDATE staff_invites SET expires_at = 0 WHERE id = ?").run(invite.data.id);
  assert.equal(
    (await call(env, "/invites/preview?id=" + invite.data.id, "super")).data.status,
    "expired",
  );
  assert.equal((await call(env, "/invites/accept", "super", { id: invite.data.id })).status, 403);
  const legacyId = crypto.randomUUID();
  db.prepare(
    "INSERT INTO staff_invites(id,email,role,invited_by,expires_at,created_at) VALUES(?,?,?,?,?,?)",
  ).run(legacyId, "ceo@example.test", "superadmin", "old-ceo", Date.now() + 3600000, Date.now());
  const preview = await call(env, "/invites/preview?id=" + legacyId, "ceo");
  assert.equal(preview.data.canAccept, false);
  assert.equal((await call(env, "/invites/accept", "ceo", { id: legacyId })).status, 409);
  assert.equal(db.prepare("SELECT COUNT(*) n FROM staff").get().n, 0);
  assert.equal(
    db.prepare("SELECT used_by FROM staff_invites WHERE id = ?").get(legacyId).used_by,
    null,
  );
});

test("two acceptance requests cannot consume an invitation without its unique staff membership", async () => {
  const { env, db } = setup();
  const invite = await call(env, "/staff/invite", "ceo", { email: "super@example.test" });
  const results = await Promise.all([
    call(env, "/invites/accept", "super", { id: invite.data.id }),
    call(env, "/invites/accept", "super", { id: invite.data.id }),
  ]);
  assert.equal(results.filter((r) => r.status === 200).length, 1);
  assert.ok(results.every((r) => [200, 403, 409].includes(r.status)));
  assert.equal(db.prepare("SELECT COUNT(*) n FROM staff").get().n, 1);
  assert.equal(
    db.prepare("SELECT used_by FROM staff_invites WHERE id = ?").get(invite.data.id).used_by,
    "super",
  );
  assert.equal((await call(env, "/staff", "ceo")).data.team[0].email, "super@example.test");
});

async function operationsTeam(env) {
  const supervisor = await call(env, "/staff/invite", "ceo", { email: "super@example.test" });
  assert.equal(
    (await call(env, "/invites/accept", "super", { id: supervisor.data.id })).status,
    200,
  );
  for (const user of ["admin", "admin2"]) {
    const invite = await call(env, "/staff/invite", "super", { email: user + "@example.test" });
    assert.equal((await call(env, "/invites/accept", user, { id: invite.data.id })).status, 200);
  }
}
const ops = "/staff/operations";
const caseInput = {
  title: "Reclamo para atención",
  description: "El cliente solicita seguimiento del servicio contratado.",
  category: "reclamo",
  priority: "media",
  cityId: "mercedes-ba",
};

test("operations uses real directory, job cohort, accepted prices and regional liquidity without exposing identity documents", async () => {
  const { db, env } = setup();
  await operationsTeam(env);
  await register(env, "client");
  await register(env, "pro", "profesional");
  await attachProfilePhoto(db, env, "pro");
  db.prepare("UPDATE accounts SET verification='aprobado' WHERE user_id='pro'").run();
  let job = (await call(env, "/jobs", "client", details)).data.job;
  job = (
    await call(env, "/jobs/" + job.id, "pro", { action: "quote", version: job.version, quote })
  ).data.job;
  job = (
    await call(env, "/jobs/" + job.id, "client", {
      action: "decide-quote",
      version: job.version,
      quoteId: job.quotes[0].id,
      revision: 1,
      accept: true,
    })
  ).data.job;
  job = (
    await call(env, "/jobs/" + job.id, "pro", {
      action: "quote",
      version: job.version,
      quote: { ...quote, labor: 900 },
    })
  ).data.job;
  const summary = await call(env, ops + "/summary", "admin");
  assert.equal(summary.status, 200, JSON.stringify(summary.data));
  assert.equal(summary.data.totals.requests, 1);
  assert.equal(summary.data.totals.hired, 1);
  assert.equal(summary.data.acceptedValue, 16000, "Pending revision never changes accepted totals");
  assert.equal(summary.data.accounts.clients, 1);
  assert.equal(summary.data.returning, 0);
  assert.equal(summary.data.cases.open, 0);
  for (const user of [null, "client", "pro"])
    assert.equal((await call(env, ops + "/summary", user)).status, 403);
  const directory = await call(env, ops + "/accounts?kind=providers", "admin");
  assert.equal(directory.status, 200);
  assert.equal(directory.data.items.length, 1);
  assert.equal(directory.data.items[0].id, "pro");
  assert.ok(!JSON.stringify(directory.data).includes("identity_json"));
  assert.ok(!JSON.stringify(directory.data).includes("clientSelfieId"));
  const jobs = await call(env, ops + "/jobs?q=" + encodeURIComponent("Reparar"), "admin");
  assert.equal(jobs.data.items.length, 1);
  assert.equal(jobs.data.items[0].acceptedValue, 16000);
  const detail = await call(env, ops + "/jobs/" + job.id, "admin");
  assert.equal(detail.data.job.address, details.address);
  assert.equal(
    detail.data.job.messages,
    undefined,
    "Private chat is not exported into the operations desk",
  );
  const zones = await call(env, ops + "/regions", "super");
  const mercedes = zones.data.regions.find((r) => r.id === "mercedes-ba");
  assert.equal(mercedes.clients, 1);
  assert.equal(mercedes.providers, 1);
  assert.equal(mercedes.requests, 1);
  assert.equal((await call(env, "/ceo/config", "super")).status, 403);
});

test("case queue enforces responsibility, escalation, audited resolution and stale update protection", async () => {
  const { db, env } = setup();
  await operationsTeam(env);
  const created = await call(env, ops + "/cases", "super", caseInput);
  assert.equal(created.status, 201, JSON.stringify(created.data));
  const id = created.data.id;
  let current = (await call(env, ops + "/cases/" + id, "admin")).data.case;
  assert.equal(current.assignee_id, null);
  assert.equal(
    (
      await call(env, ops + "/cases/" + id, "admin", {
        action: "resolve",
        version: current.version,
        resolution: "Se resolvió el reclamo con el cliente.",
      })
    ).status,
    403,
  );
  assert.equal(
    (await call(env, ops + "/cases/" + id, "admin", { action: "claim", version: current.version }))
      .status,
    200,
  );
  current = (await call(env, ops + "/cases/" + id, "admin")).data.case;
  assert.equal(current.assignee_id, "admin");
  assert.equal((await call(env, ops + "/cases/" + id, "admin2")).status, 403);
  assert.equal(
    (
      await call(env, ops + "/cases/" + id, "admin", {
        action: "note",
        version: current.version,
        note: "Se confirmó la recepción del reclamo.",
      })
    ).status,
    200,
  );
  const notesBefore = db.prepare("SELECT COUNT(*) n FROM operations_notes").get().n;
  const auditBefore = db.prepare("SELECT COUNT(*) n FROM operations_audit").get().n;
  assert.equal(
    (
      await call(env, ops + "/cases/" + id, "admin", {
        action: "note",
        version: current.version,
        note: "Intento con una versión anterior.",
      })
    ).status,
    409,
  );
  assert.equal(db.prepare("SELECT COUNT(*) n FROM operations_notes").get().n, notesBefore);
  assert.equal(db.prepare("SELECT COUNT(*) n FROM operations_audit").get().n, auditBefore);
  current = (await call(env, ops + "/cases/" + id, "admin")).data.case;
  assert.equal(
    (
      await call(env, ops + "/cases/" + id, "admin", {
        action: "escalate",
        version: current.version,
        note: "Se requiere intervención del supervisor.",
      })
    ).status,
    200,
  );
  current = (await call(env, ops + "/cases/" + id, "admin")).data.case;
  assert.equal(current.status, "escalado");
  assert.equal(
    (
      await call(env, ops + "/cases/" + id, "admin", {
        action: "resolve",
        version: current.version,
        resolution: "Cierre sin supervisión no permitido.",
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await call(env, ops + "/cases/" + id, "super", {
        action: "assign",
        version: current.version,
        assigneeId: "admin2",
        note: "Se reasigna por disponibilidad del equipo.",
      })
    ).status,
    200,
  );
  current = (await call(env, ops + "/cases/" + id, "admin2")).data.case;
  assert.equal(
    (
      await call(env, ops + "/cases/" + id, "admin2", {
        action: "resolve",
        version: current.version,
        resolution: "Se acordó y registró la solución con la persona.",
      })
    ).status,
    200,
  );
  current = (await call(env, ops + "/cases/" + id, "admin2")).data.case;
  assert.equal(current.status, "resuelto");
  assert.ok(current.resolved_at);
  assert.equal(
    (
      await call(env, ops + "/cases/" + id, "admin2", {
        action: "reopen",
        version: current.version,
        note: "El cliente informó que el problema persiste.",
      })
    ).status,
    200,
  );
  assert.equal((await call(env, ops + "/cases?mine=1", "admin")).data.items.length, 0);
  assert.equal((await call(env, ops + "/cases?mine=1", "admin2")).data.items.length, 1);
  const audit = await call(env, ops + "/audit", "super");
  assert.equal(audit.status, 200);
  assert.ok(audit.data.items.some((a) => a.action === "case-resolve" && a.actor_id === "admin2"));
  assert.equal((await call(env, ops + "/audit", "admin")).status, 403);
  assert.equal((await call(env, ops + "/system", "admin")).status, 403);
  assert.equal((await call(env, ops + "/settings", "admin")).status, 403);
});

test("profile moderation persists, blocks public exposure and new proposals, and leaves existing contracts usable", async () => {
  const { db, env } = setup();
  await operationsTeam(env);
  await register(env, "client");
  await register(env, "pro", "profesional");
  const photo = await attachProfilePhoto(db, env, "pro");
  db.prepare("UPDATE accounts SET verification='aprobado' WHERE user_id='pro'").run();
  let job = (await call(env, "/jobs", "client", details)).data.job;
  job = (
    await call(env, "/jobs/" + job.id, "pro", { action: "quote", version: job.version, quote })
  ).data.job;
  job = (
    await call(env, "/jobs/" + job.id, "client", {
      action: "decide-quote",
      version: job.version,
      quoteId: job.quotes[0].id,
      revision: 1,
      accept: true,
    })
  ).data.job;
  const control = {
    userId: "pro",
    version: 0,
    hidden: true,
    reason: "Perfil reportado pendiente de revisión operativa.",
  };
  assert.equal((await call(env, ops + "/profile-control", "admin", control)).status, 403);
  assert.equal((await call(env, ops + "/profile-control", "super", control)).status, 200);
  assert.equal((await call(env, "/providers", null)).data.providers.length, 0);
  assert.equal((await call(env, "/providers/pro", null)).status, 404);
  assert.equal((await handleMarket(req("/files/" + photo, null), env)).status, 403);
  assert.equal((await call(env, "/jobs/" + job.id, "pro")).status, 200);
  assert.equal(
    (await call(env, "/session", "pro")).data.account.operationalHold.reason,
    control.reason,
  );
  const next = (await call(env, "/jobs", "client", details)).data.job;
  assert.equal(
    (await call(env, "/jobs/" + next.id, "pro", { action: "quote", version: next.version, quote }))
      .status,
    403,
  );
  assert.equal(
    (await call(env, ops + "/profile-control", "super", { ...control, hidden: false })).status,
    409,
  );
  assert.equal(
    (
      await call(env, ops + "/profile-control", "super", {
        ...control,
        version: 1,
        hidden: false,
        reason: "La revisión fue completada satisfactoriamente.",
      })
    ).status,
    200,
  );
  assert.equal((await call(env, "/providers/pro", null)).status, 200);
  assert.equal(
    (await call(env, "/jobs/" + next.id, "pro", { action: "quote", version: next.version, quote }))
      .status,
    200,
  );
});

test("team access suspension respects hierarchy, open cases and reactivation without changing customer identities", async () => {
  const { db, env } = setup();
  await operationsTeam(env);
  const created = await call(env, ops + "/cases", "admin", caseInput);
  let c = (await call(env, ops + "/cases/" + created.data.id, "super")).data.case;
  const pause = {
    userId: "admin",
    version: 0,
    paused: true,
    reason: "Pausa temporal del acceso por reasignación de funciones.",
  };
  assert.equal((await call(env, ops + "/team-access", "admin", pause)).status, 403);
  assert.equal((await call(env, ops + "/team-access", "super", pause)).status, 409);
  assert.equal(
    (
      await call(env, ops + "/cases/" + c.id, "super", {
        action: "assign",
        version: c.version,
        assigneeId: "admin2",
        note: "Reasignación previa a pausar el acceso.",
      })
    ).status,
    200,
  );
  assert.equal((await call(env, ops + "/team-access", "super", pause)).status, 200);
  assert.equal((await call(env, "/session", "admin")).data.staffRole, null);
  assert.equal((await call(env, "/session", "admin")).data.staffAccessPaused, true);
  const acceptedInvite = db.prepare("SELECT id FROM staff_invites WHERE used_by='admin'").get();
  assert.match(
    (await call(env, "/invites/preview?id=" + acceptedInvite.id, "admin")).data.message,
    /acceso de gestión está pausado/,
  );
  assert.equal((await call(env, ops + "/summary", "admin")).status, 403);
  assert.equal(
    (await call(env, "/staff", "super")).data.team.find((t) => t.user_id === "admin").access_paused,
    1,
  );
  assert.equal(
    (await call(env, ops + "/team-access", "super", { ...pause, paused: false, version: 1 }))
      .status,
    200,
  );
  assert.equal((await call(env, "/session", "admin")).data.staffRole, "admin");
  assert.equal(
    (await call(env, ops + "/team-access", "super", { ...pause, paused: false, version: 1 }))
      .status,
    409,
  );
  const pending = await call(env, "/staff/invite", "super", { email: "later@example.test" });
  assert.equal(
    (
      await call(env, ops + "/team-access", "super", {
        userId: "super",
        version: 0,
        paused: true,
        reason: "No puede pausarse a sí mismo.",
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await call(env, ops + "/team-access", "ceo", {
        userId: "super",
        version: 0,
        paused: true,
        reason: "Pausa de acceso de supervisión.",
      })
    ).status,
    200,
  );
  assert.equal(
    (await call(env, "/invites/preview?id=" + pending.data.id, "later")).data.canAccept,
    false,
  );
  assert.equal((await call(env, "/invites/accept", "later", { id: pending.data.id })).status, 403);
  assert.equal(db.prepare("SELECT role FROM staff WHERE user_id='super'").get().role, "superadmin");
});

test("operating deadlines change alerts and new cases only, while system and audit report real stored records", async () => {
  const { db, env } = setup();
  await operationsTeam(env);
  const old = await call(env, ops + "/cases", "super", caseInput);
  const oldDue = (await call(env, ops + "/cases/" + old.data.id, "super")).data.case.due_at;
  const initial = (await call(env, ops + "/settings", "super")).data;
  const settings = {
    version: initial.version,
    config: { responseHours: 1, resolutionHours: 12, unansweredHours: 2 },
  };
  assert.equal((await call(env, ops + "/settings", "admin", settings, "PUT")).status, 403);
  assert.equal((await call(env, ops + "/settings", "super", settings, "PUT")).status, 200);
  assert.equal((await call(env, ops + "/settings", "super", settings, "PUT")).status, 409);
  const recent = await call(env, ops + "/cases", "super", caseInput);
  const newCase = (await call(env, ops + "/cases/" + recent.data.id, "super")).data.case;
  assert.ok(Math.abs(newCase.due_at - newCase.created_at - 12 * 3600000) < 100);
  assert.equal((await call(env, ops + "/cases/" + old.data.id, "super")).data.case.due_at, oldDue);
  db.prepare("UPDATE operations_cases SET created_at=? WHERE id=?").run(
    Date.now() - 2 * 3600000,
    old.data.id,
  );
  const summary = (await call(env, ops + "/summary", "super")).data;
  assert.equal(summary.cases.waiting, 1);
  const system = await call(env, ops + "/system", "super");
  assert.equal(system.status, 200);
  assert.equal(system.data.counts.cases, 2);
  assert.equal(system.data.database, true);
  assert.equal(system.data.mail.configured, false);
  assert.ok(!JSON.stringify(system.data).includes("API_KEY"));
});

test("concurrent case claims and access pauses never create double ownership or work assigned to paused staff", async () => {
  const { db, env } = setup();
  await operationsTeam(env);
  const created = await call(env, ops + "/cases", "super", caseInput),
    id = created.data.id;
  const claimed = await Promise.all(
    ["admin", "admin2"].map((user) =>
      call(env, ops + "/cases/" + id, user, { action: "claim", version: 1 }),
    ),
  );
  assert.equal(claimed.filter((r) => r.status === 200).length, 1);
  assert.ok(claimed.every((r) => [200, 403, 409].includes(r.status)));
  assert.equal(db.prepare("SELECT COUNT(*) n FROM operations_notes WHERE case_id=?").get(id).n, 1);
  const fresh = (await call(env, ops + "/cases", "super", caseInput)).data.id;
  const active = db
    .prepare("SELECT assignee_id FROM operations_cases WHERE id=?")
    .get(id).assignee_id;
  const target = active === "admin" ? "admin2" : "admin";
  const results = await Promise.all([
    call(env, ops + "/team-access", "super", {
      userId: target,
      version: 0,
      paused: true,
      reason: "Pausa de acceso concurrente a asignación.",
    }),
    call(env, ops + "/cases/" + fresh, "super", {
      action: "assign",
      version: 1,
      assigneeId: target,
      note: "Asignación concurrente a revisión de acceso.",
    }),
  ]);
  assert.equal(results.filter((r) => r.status === 200).length, 1);
  assert.ok(results.every((r) => [200, 403, 409].includes(r.status)));
  const paused = db
    .prepare("SELECT paused FROM staff_access_controls WHERE user_id=?")
    .get(target)?.paused;
  if (paused)
    assert.equal(
      db
        .prepare(
          "SELECT COUNT(*) n FROM operations_cases WHERE assignee_id=? AND status!='resuelto'",
        )
        .get(target).n,
      0,
    );
  else
    assert.equal(
      db.prepare("SELECT assignee_id FROM operations_cases WHERE id=?").get(fresh).assignee_id,
      target,
    );
});

test("directory public links support Google identity IDs and operational case filters exclude resolved work", async () => {
  const { db, env } = setup();
  await operationsTeam(env);
  await register(env, "google:pro", "profesional");
  await attachProfilePhoto(db, env, "google:pro");
  db.prepare("UPDATE accounts SET verification='aprobado' WHERE user_id='google:pro'").run();
  assert.equal(
    (await call(env, "/providers/" + encodeURIComponent("google:pro"), null)).status,
    200,
  );
  const c = (await call(env, ops + "/cases", "super", caseInput)).data.id;
  db.prepare("UPDATE operations_cases SET due_at=? WHERE id=?").run(Date.now() - 3600000, c);
  assert.equal((await call(env, ops + "/cases?status=vencidos", "super")).data.total, 1);
  assert.equal(
    (
      await call(env, ops + "/cases/" + c, "super", {
        action: "resolve",
        version: 1,
        resolution: "Se registró la resolución del caso para el cliente.",
      })
    ).status,
    200,
  );
  assert.equal((await call(env, ops + "/cases?status=abiertos", "super")).data.total, 0);
  assert.equal((await call(env, ops + "/cases?status=vencidos", "super")).data.total, 0);
  assert.equal(
    db.prepare("SELECT assignee_id FROM operations_cases WHERE id=?").get(c).assignee_id,
    "super",
  );
});

test("identity review audit records the winning mutation only when requests share the same actor and clock tick", async () => {
  const { db, env } = setup();
  await operationsTeam(env);
  await register(env, "client");
  const row = db.prepare("SELECT version FROM accounts WHERE user_id='client'").get();
  const realNow = Date.now,
    instant = realNow();
  let results;
  try {
    Date.now = () => instant;
    results = await Promise.all([
      call(env, "/staff/review", "super", {
        userId: "client",
        version: row.version,
        decision: "aprobado",
      }),
      call(env, "/staff/review", "super", {
        userId: "client",
        version: row.version,
        decision: "aprobado",
      }),
    ]);
  } finally {
    Date.now = realNow;
  }
  assert.equal(results.filter((r) => r.status === 200).length, 1);
  assert.ok(results.every((r) => [200, 409].includes(r.status)));
  const audit = db
    .prepare(
      "SELECT * FROM operations_audit WHERE entity_id='client' AND action='identity-approved'",
    )
    .all();
  assert.equal(audit.length, 1);
  assert.equal(audit[0].actor_id, "super");
});
