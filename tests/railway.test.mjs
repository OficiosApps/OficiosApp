import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { once } from "node:events";
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

test("Railway seed is idempotent, persists files/configuration and does not fabricate accounts", async (t) => {
  const { directory, storage } = await fixture(t);
  const { sqlite, DB, BUCKET } = storage;
  assert.equal(sqlite.prepare("SELECT COUNT(*) n FROM railway_migrations").get().n, 4);
  assert.equal(sqlite.prepare("SELECT COUNT(*) n FROM accounts").get().n, 0);
  assert.equal(sqlite.prepare("SELECT COUNT(*) n FROM staff").get().n, 0);
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
