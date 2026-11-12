import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { once } from "node:events";
import { readFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { buenosAiresRegions, buenosAiresDistricts } from "../worker/buenos-aires-regions.mjs";
import { defaultMarketConfig } from "../worker/market-settings.mjs";
import { generateKeyPair, exportJWK, createLocalJWKSet, SignJWT } from "jose";
import { openStorage } from "../railway/storage.mjs";
import { createApplication, configuredOrigin } from "../railway/server.mjs";
import { createAuth, localReturn } from "../railway/auth.mjs";

const origin = "https://oficios.example";
const clientId = "test-client";
const pair = await generateKeyPair("RS256");
const jwk = await exportJWK(pair.publicKey);
jwk.kid = "test-key";
const googleKeys = createLocalJWKSet({ keys: [jwk] });
async function fixture(t) {
  const directory = await mkdtemp(join(tmpdir(), "oficios-railway-"));
  const storage = openStorage(directory);
  t.after(async () => {
    try {
      storage.close();
    } catch {}
    await rm(directory, { recursive: true, force: true });
  });
  return { storage, directory };
}
function authFor(storage, overrides = {}) {
  return createAuth({
    sqlite: storage.sqlite,
    origin,
    clientId,
    clientSecret: "test-secret-not-real",
    googleKeys,
    ...overrides,
  });
}
async function signedToken(nonce, overrides = {}) {
  return new SignJWT({
    nonce,
    email: "ceo@example.test",
    email_verified: true,
    name: "Persona",
    ...overrides,
  })
    .setProtectedHeader({ alg: "RS256", kid: jwk.kid })
    .setSubject("google-subject")
    .setIssuer("https://accounts.google.com")
    .setAudience(clientId)
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(pair.privateKey);
}
async function flow(auth) {
  const first = await auth.handle(new Request(origin + "/auth/google?return_to=%2Fceo"));
  assert.equal(first.status, 303);
  const target = new URL(first.headers.get("location"));
  const cookie = first.headers.getSetCookie()[0].split(";")[0];
  return {
    cookie,
    target,
    request: new Request(
      origin + "/auth/google/callback?code=example&state=" + target.searchParams.get("state"),
      { headers: { cookie } },
    ),
  };
}

test("Buenos Aires coverage migrates existing settings once, preserving history and later CEO pauses", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "oficios-ba-upgrade-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const old = new DatabaseSync(join(directory, "oficios.sqlite"));
  old.exec(
    "CREATE TABLE railway_migrations(name TEXT PRIMARY KEY, sha256 TEXT NOT NULL, applied_at INTEGER NOT NULL)",
  );
  for (const file of readdirSync(new URL("../drizzle/", import.meta.url))
    .filter((n) => n.endsWith(".sql") && n < "0005")
    .sort()) {
    const sql = readFileSync(new URL("../drizzle/" + file, import.meta.url), "utf8");
    old.exec(sql);
    old
      .prepare("INSERT INTO railway_migrations VALUES(?,?,?)")
      .run("drizzle/" + file, createHash("sha256").update(sql).digest("hex"), 1);
  }
  const config = defaultMarketConfig();
  config.plans[1].priceCents = 1550;
  config.referrals.enabled = true;
  config.referrals.rewardQuotes = 9;
  config.regions = config.regions.filter((r) =>
    ["mercedes-ba", "lujan-ba", "chivilcoy-ba", "caba-ar"].includes(r.id),
  );
  config.regions.find((r) => r.id === "lujan-ba").status = "pausada";
  config.regions.find((r) => r.id === "chivilcoy-ba").status = "preparacion";
  config.regions.find((r) => r.id === "mercedes-ba").center = { lat: -34.65, lng: -59.43 };
  config.regions.push({
    id: "custom-cordoba",
    name: "Córdoba",
    province: "Córdoba",
    status: "preparacion",
    center: { lat: -31.4, lng: -64.18 },
  });
  old
    .prepare("INSERT INTO market_settings VALUES('commercial',?,7,'old-token','ceo',1)")
    .run(JSON.stringify(config));
  old.prepare("INSERT INTO staff VALUES('existing-admin','admin','existing-super',1)").run();
  old.close();
  let storage = openStorage(directory);
  try {
    const row = storage.sqlite
      .prepare("SELECT * FROM market_settings WHERE setting_key='commercial'")
      .get();
    const migrated = JSON.parse(row.body);
    assert.equal(row.version, 8);
    assert.equal(migrated.regions.length, 137);
    assert.equal(migrated.regions.filter((r) => r.province === "Buenos Aires").length, 135);
    assert.equal(new Set(migrated.regions.map((r) => r.id)).size, 137);
    assert.deepEqual(migrated.plans, config.plans);
    assert.deepEqual(migrated.referrals, config.referrals);
    assert.deepEqual(
      migrated.regions.find((r) => r.id === "caba-ar"),
      config.regions.find((r) => r.id === "caba-ar"),
    );
    assert.deepEqual(
      migrated.regions.find((r) => r.id === "custom-cordoba"),
      config.regions.find((r) => r.id === "custom-cordoba"),
    );
    assert.deepEqual(migrated.regions.find((r) => r.id === "mercedes-ba").center, {
      lat: -34.65,
      lng: -59.43,
    });
    for (const region of buenosAiresRegions()) {
      const found = migrated.regions.find((r) => r.id === region.id);
      assert.equal(found?.status, "activa", region.id);
      assert.equal(found.name, region.name);
      if (!["mercedes-ba", "lujan-ba", "chivilcoy-ba"].includes(region.id))
        assert.deepEqual(found.center, region.center);
    }
    assert.equal(buenosAiresDistricts.length, 135);
    assert.equal(new Set(buenosAiresDistricts.map((r) => r[0])).size, 135);
    const audit = storage.sqlite
      .prepare("SELECT * FROM commercial_audit WHERE action='province-coverage'")
      .get();
    assert.deepEqual(JSON.parse(audit.before_json), config);
    assert.deepEqual(JSON.parse(audit.after_json), migrated);
    assert.equal(storage.sqlite.prepare("SELECT COUNT(*) n FROM staff").get().n, 1);
    migrated.regions.find((r) => r.id === "tigre-ba").status = "pausada";
    storage.sqlite
      .prepare("UPDATE market_settings SET body=?,version=9 WHERE setting_key='commercial'")
      .run(JSON.stringify(migrated));
  } finally {
    storage.close();
  }
  storage = openStorage(directory);
  try {
    const row = storage.sqlite
      .prepare("SELECT body,version FROM market_settings WHERE setting_key='commercial'")
      .get();
    assert.equal(row.version, 9);
    assert.equal(JSON.parse(row.body).regions.find((r) => r.id === "tigre-ba").status, "pausada");
    assert.equal(
      storage.sqlite
        .prepare("SELECT COUNT(*) n FROM commercial_audit WHERE action='province-coverage'")
        .get().n,
      1,
    );
  } finally {
    storage.close();
  }
});

test("Railway seed is idempotent, persists files/configuration and does not fabricate accounts", async (t) => {
  const { directory, storage } = await fixture(t);
  const { sqlite, DB, BUCKET } = storage;
  assert.equal(sqlite.prepare("SELECT COUNT(*) n FROM railway_migrations").get().n, 7);
  assert.equal(sqlite.prepare("SELECT COUNT(*) n FROM accounts").get().n, 0);
  assert.equal(sqlite.prepare("SELECT COUNT(*) n FROM staff").get().n, 0);
  assert.equal(sqlite.prepare("SELECT COUNT(*) n FROM operations_cases").get().n, 0);
  sqlite
    .prepare("UPDATE operations_settings SET body=?,version=2 WHERE id='service'")
    .run(JSON.stringify({ responseHours: 12, resolutionHours: 24, unansweredHours: 8 }));
  const operationId = crypto.randomUUID(),
    timestamp = Date.now();
  sqlite
    .prepare(
      "INSERT INTO operations_cases(id,title,description,category,priority,status,created_by,due_at,created_at,updated_at,update_token) VALUES(?,?,?,?,?,?,?,?,?,?,?)",
    )
    .run(
      operationId,
      "Seguimiento persistido",
      "Caso registrado para verificar persistencia.",
      "seguimiento",
      "media",
      "nuevo",
      "fixture",
      timestamp + 3600000,
      timestamp,
      timestamp,
      crypto.randomUUID(),
    );
  sqlite
    .prepare("UPDATE market_settings SET body = ? WHERE setting_key = 'commercial'")
    .run('{"kept":true}');
  await BUCKET.put("owner/photo", new Uint8Array([1, 2, 3]));
  await assert.rejects(BUCKET.get("../oficios.sqlite"));
  await assert.rejects(BUCKET.put("/tmp/outside", new Uint8Array([1])));
  await assert.rejects(
    DB.batch([
      DB.prepare("INSERT INTO staff VALUES('id','admin','ceo',1)"),
      DB.prepare("INSERT INTO staff VALUES('id','admin','ceo',1)"),
    ]),
  );
  assert.equal(sqlite.prepare("SELECT COUNT(*) n FROM staff").get().n, 0);
  storage.close();
  const reopened = openStorage(directory);
  try {
    assert.equal(
      reopened.sqlite.prepare("SELECT title FROM operations_cases WHERE id=?").get(operationId)
        .title,
      "Seguimiento persistido",
    );
    assert.equal(
      JSON.parse(
        reopened.sqlite.prepare("SELECT body FROM operations_settings WHERE id='service'").get()
          .body,
      ).resolutionHours,
      24,
    );
    assert.equal(
      reopened.sqlite
        .prepare("SELECT body FROM market_settings WHERE setting_key = 'commercial'")
        .get().body,
      '{"kept":true}',
    );
    assert.deepEqual([...(await reopened.BUCKET.get("owner/photo")).body], [1, 2, 3]);
  } finally {
    reopened.close();
  }
});

test("Google login verifies signature, audience, nonce and verified email, rotates and revokes sessions", async (t) => {
  const { storage } = await fixture(t);
  let nonce;
  const auth = authFor(storage, {
    fetcher: async (_url, options) => {
      const fields = new URLSearchParams(options.body);
      assert.equal(fields.get("redirect_uri"), origin + "/auth/google/callback");
      assert.ok(fields.get("code_verifier").length >= 43);
      return Response.json({ id_token: await signedToken(nonce) });
    },
  });
  const one = await flow(auth);
  nonce = one.target.searchParams.get("nonce");
  assert.equal(one.target.searchParams.get("code_challenge_method"), "S256");
  const wrongState = new Request(origin + "/auth/google/callback?code=x&state=wrong", {
    headers: { cookie: one.cookie },
  });
  assert.equal((await auth.handle(wrongState)).status, 403);
  const unicodeState = new Request(
    origin + "/auth/google/callback?code=x&state=" + encodeURIComponent("é".repeat(43)),
    { headers: { cookie: one.cookie } },
  );
  assert.equal((await auth.handle(unicodeState)).status, 403);

  const result = await auth.handle(one.request);
  assert.equal(result.status, 303);
  assert.equal(result.headers.get("location"), "/ceo");
  const session = result.headers
    .getSetCookie()
    .find((c) => c.startsWith("__Host-oficios_session="));
  assert.match(session, /HttpOnly/);
  assert.match(session, /Secure/);
  assert.match(session, /SameSite=Lax/);
  const request = new Request(origin + "/", { headers: { cookie: session.split(";")[0] } });
  assert.equal(auth.identity(request).email, "ceo@example.test");
  assert.equal(auth.identity(new Request(origin)), null);
  assert.equal((await auth.handle(one.request)).status, 400);
  const persisted = authFor(storage);
  assert.equal(persisted.identity(request).id, "google:google-subject");
  assert.equal(
    (
      await auth.handle(
        new Request(origin + "/auth/logout", {
          method: "POST",
          headers: { cookie: session.split(";")[0], origin: "https://evil.example" },
        }),
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await auth.handle(
        new Request(origin + "/auth/logout", {
          method: "POST",
          headers: { cookie: session.split(";")[0], origin },
        }),
      )
    ).status,
    303,
  );
  assert.equal(auth.identity(request), null);
});

test("invalid and replayed provider assertions never establish a session", async (t) => {
  const { storage } = await fixture(t);
  for (const failure of ["email", "nonce", "audience", "signature", "expiry"]) {
    let nonce;
    const auth = authFor(storage, {
      fetcher: async () => {
        let token = await signedToken(
          failure === "nonce" ? "wrong-nonce" : nonce,
          failure === "email"
            ? { email_verified: false }
            : failure === "audience"
              ? { aud: "another-client" }
              : failure === "expiry"
                ? { exp: 1 }
                : {},
        );
        // signedToken sets aud and exp after payload; explicitly sign those invalid claims.
        if (failure === "audience" || failure === "expiry")
          token = await new SignJWT({ nonce, email: "ceo@example.test", email_verified: true })
            .setSubject("subject")
            .setIssuer("https://accounts.google.com")
            .setAudience(failure === "audience" ? "wrong-client" : clientId)
            .setExpirationTime(failure === "expiry" ? 1 : "5m")
            .setProtectedHeader({ alg: "RS256", kid: jwk.kid })
            .sign(pair.privateKey);
        if (failure === "signature") token = token.slice(0, -10) + "tamperedxx";
        return Response.json({ id_token: token });
      },
    });
    const login = await flow(auth);
    nonce = login.target.searchParams.get("nonce");
    assert.equal((await auth.handle(login.request)).status, 401, failure);
  }
  assert.equal(storage.sqlite.prepare("SELECT COUNT(*) n FROM railway_sessions").get().n, 0);
  assert.equal(localReturn("//evil.example", origin), "/cuenta");
  assert.equal(localReturn("/\\evil.example", origin), "/cuenta");
  assert.equal(
    localReturn("/soy-profesional?referido=abc", origin),
    "/soy-profesional?referido=abc",
  );
});

test("Railway HTTP serves installable PWA and real APIs while rejecting forged CEO headers and private file access", async (t) => {
  const { storage } = await fixture(t);
  let loginNonce;
  const application = createApplication({
    storage,
    environment: {
      APP_URL: origin,
      OFICIOS_CEO_EMAIL: "ceo@example.test",
      GOOGLE_CLIENT_ID: clientId,
      GOOGLE_CLIENT_SECRET: "test-secret-not-real",
    },
    googleKeys,
    oauthFetch: async () => Response.json({ id_token: await signedToken(loginNonce) }),
  });
  application.server.listen(0, "127.0.0.1");
  await once(application.server, "listening");
  t.after(
    () =>
      new Promise((done) => {
        application.server.close(done);
        application.server.closeAllConnections();
      }),
  );
  const base = "http://127.0.0.1:" + application.server.address().port;
  const call = (path, init) => fetch(base + path, { redirect: "manual", ...init });
  assert.equal((await call("/healthz")).status, 200);
  assert.equal((await call("/")).status, 200);
  const managementEntry = await call("/gestion?invitacion=00000000-0000-4000-8000-000000000001");
  assert.equal(managementEntry.status, 200);
  assert.equal(managementEntry.headers.get("referrer-policy"), "strict-origin");
  const manifest = await (await call("/manifest.webmanifest")).json();
  assert.equal(manifest.display, "standalone");
  for (const icon of manifest.icons) assert.equal((await call(icon.src)).status, 200);
  assert.equal((await call("/sw.js")).headers.get("service-worker-allowed"), "/");
  const forged = {
    "oai-authenticated-user-id": "attacker",
    "oai-authenticated-user-email": "ceo@example.test",
  };
  assert.equal(
    (await (await call("/api/market/session", { headers: forged })).json()).authenticated,
    false,
  );
  assert.equal((await call("/api/market/ceo/config", { headers: forged })).status, 403);
  assert.equal((await call("/ceo", { headers: forged })).status, 403);
  assert.equal((await call("/data/oficios.sqlite")).status, 404);
  const start = await call("/auth/google?return_to=%2Fceo");
  assert.equal(start.headers.get("referrer-policy"), "no-referrer");
  const target = new URL(start.headers.get("location"));
  loginNonce = target.searchParams.get("nonce");
  const authCookie = start.headers.getSetCookie()[0].split(";")[0];
  const callback = await call(
    "/auth/google/callback?code=example&state=" + target.searchParams.get("state"),
    { headers: { cookie: authCookie } },
  );
  assert.equal(callback.status, 303);
  const cookie = callback.headers
    .getSetCookie()
    .find((c) => c.startsWith("__Host-oficios_session="))
    .split(";")[0];
  assert.equal(
    (await (await call("/api/market/session", { headers: { cookie } })).json()).staffRole,
    "ceo",
  );
  assert.equal((await call("/ceo", { headers: { cookie } })).status, 200);
  const form = new FormData();
  form.set(
    "file",
    new File([new Uint8Array([255, 216, 255, 1])], "selfie.jpg", { type: "image/jpeg" }),
  );
  const upload = await call("/api/market/client-selfie", {
    method: "POST",
    headers: { cookie, origin },
    body: form,
  });
  assert.equal(upload.status, 201);
  const fileId = (await upload.json()).id;
  const account = await call("/api/market/account", {
    method: "POST",
    headers: { cookie, origin, "content-type": "application/json" },
    body: JSON.stringify({
      kind: "cliente",
      name: "Persona",
      cityId: "mercedes-ba",
      consent: true,
      clientSelfieId: fileId,
      clientSelfieConsent: true,
    }),
  });
  assert.equal(account.status, 201, await account.text());
  assert.equal((await call("/api/market/files/" + fileId)).status, 403);
  assert.equal((await call("/api/market/files/" + fileId, { headers: { cookie } })).status, 200);
  assert.equal(
    (
      await call("/api/chat", {
        method: "POST",
        headers: { cookie, origin, "content-type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: "Hola" }] }),
      })
    ).status,
    503,
  );
});

test("Railway requires persistent volume and a safe canonical origin", () => {
  assert.throws(
    () => createApplication({ environment: { RAILWAY_ENVIRONMENT_ID: "production" } }),
    /volumen/,
  );
  assert.throws(() => configuredOrigin({ APP_URL: "http://example.com" }));
  assert.throws(() => configuredOrigin({ APP_URL: "https://user:password@example.com" }));
  assert.equal(
    configuredOrigin({ RAILWAY_PUBLIC_DOMAIN: "oficios.up.railway.app" }),
    "https://oficios.up.railway.app",
  );
});

test("switching Google accounts revokes the wrong session and preserves the staff invitation", async (t) => {
  const { storage } = await fixture(t);
  let nonce;
  const auth = authFor(storage, {
    fetcher: async () => Response.json({ id_token: await signedToken(nonce) }),
  });
  const login = await flow(auth);
  nonce = login.target.searchParams.get("nonce");
  const callback = await auth.handle(login.request);
  const cookie = callback.headers
    .getSetCookie()
    .find((x) => x.startsWith("__Host-oficios_session="))
    .split(";")[0];
  const identityRequest = new Request(origin + "/", { headers: { cookie } });
  assert.equal(auth.identity(identityRequest).email, "ceo@example.test");
  const invitation = "/gestion?invitacion=" + crypto.randomUUID();
  const choose = "/auth/google?return_to=" + encodeURIComponent(invitation);
  const logout = await auth.handle(
    new Request(origin + "/auth/logout?return_to=" + encodeURIComponent(choose), {
      method: "POST",
      headers: { origin, cookie },
    }),
  );
  assert.equal(logout.status, 303);
  assert.equal(logout.headers.get("location"), choose);
  assert.match(logout.headers.getSetCookie()[0], /Max-Age=0/);
  assert.equal(auth.identity(identityRequest), null);
  const fresh = await auth.handle(new Request(origin + logout.headers.get("location")));
  assert.equal(fresh.status, 303);
  const google = new URL(fresh.headers.get("location"));
  assert.equal(google.searchParams.get("prompt"), "select_account");
  assert.notEqual(google.searchParams.get("state"), login.target.searchParams.get("state"));
  assert.equal(
    storage.sqlite.prepare("SELECT return_to FROM railway_oauth_flows").get().return_to,
    invitation,
  );
  const unsafe = await auth.handle(
    new Request(origin + "/auth/logout?return_to=https%3A%2F%2Fevil.example", {
      method: "POST",
      headers: { origin },
    }),
  );
  assert.equal(unsafe.headers.get("location"), "/cuenta");
});
