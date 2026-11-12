import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { createRemoteJWKSet, jwtVerify } from "jose";

const keys = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));
const hash = (value) => createHash("sha256").update(value).digest("hex");
const random = () => randomBytes(32).toString("base64url");
const equal = (a, b) => {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const first = Buffer.from(a),
    second = Buffer.from(b);
  return first.length === second.length && timingSafeEqual(first, second);
};
export function localReturn(value, origin) {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    /[\\\x00-\x20]/.test(value)
  )
    return "/cuenta";
  try {
    const parsed = new URL(value, origin);
    return parsed.origin === origin ? parsed.pathname + parsed.search : "/cuenta";
  } catch {
    return "/cuenta";
  }
}
function cookies(request) {
  return Object.fromEntries(
    (request.headers.get("cookie") ?? "")
      .split(";")
      .map((v) => {
        const i = v.indexOf("=");
        return i < 0 ? [] : [v.slice(0, i).trim(), v.slice(i + 1).trim()];
      })
      .filter((v) => v.length === 2),
  );
}
function message(text, status = 400, cookie) {
  const headers = {
    "content-type": "text/plain; charset=utf-8",
    "cache-control": "no-store",
    "referrer-policy": "no-referrer",
    ...(cookie ? { "set-cookie": cookie } : {}),
  };
  return new Response(text, { status, headers });
}
export function createAuth({
  sqlite,
  origin,
  clientId,
  clientSecret,
  fetcher = fetch,
  googleKeys = keys,
}) {
  const secure = origin.startsWith("https://");
  const sessionName = secure ? "__Host-oficios_session" : "oficios_session";
  const flowName = secure ? "__Host-oficios_oauth" : "oficios_oauth";
  const cookie = (name, value, age) =>
    `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${age}${secure ? "; Secure" : ""}`;
  const callback = origin + "/auth/google/callback";
  const cleanup = () => {
    sqlite.prepare("DELETE FROM railway_oauth_flows WHERE expires_at <= ?").run(Date.now());
    sqlite.prepare("DELETE FROM railway_sessions WHERE expires_at <= ?").run(Date.now());
  };
  function identity(request) {
    const token = cookies(request)[sessionName];
    if (!token || !/^[\w-]{43}$/.test(token)) return null;
    const row = sqlite
      .prepare("SELECT user_json FROM railway_sessions WHERE token_hash = ? AND expires_at > ?")
      .get(hash(token), Date.now());
    return row ? JSON.parse(row.user_json) : null;
  }
  const redirect = (to, setCookie) =>
    new Response(null, {
      status: 303,
      headers: {
        location: to,
        "set-cookie": setCookie,
        "cache-control": "no-store",
        "referrer-policy": "no-referrer",
      },
    });
  async function handle(request) {
    const url = new URL(request.url);
    if (url.pathname === "/auth/logout") {
      if (request.method !== "POST")
        return message("Para cerrar sesión usá el botón dentro de Mi cuenta.", 405);
      if (request.headers.get("origin") !== origin) return message("Origen no permitido.", 403);
      const token = cookies(request)[sessionName];
      if (token)
        sqlite.prepare("DELETE FROM railway_sessions WHERE token_hash = ?").run(hash(token));
      const response = redirect(
        localReturn(url.searchParams.get("return_to") || "/", origin),
        cookie(sessionName, "", 0),
      );
      response.headers.append(
        "set-cookie",
        cookie(secure ? "__Host-oficios_ceo_view" : "oficios_ceo_view", "", 0),
      );
      return response;
    }
    if (!["/auth/google", "/auth/google/callback"].includes(url.pathname))
      return message("Ruta no encontrada.", 404);
    if (request.method !== "GET") return message("Método no permitido.", 405);
    if (!clientId || !clientSecret)
      return message(
        "Falta configurar GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET en Railway. Seguí el README_RAILWAY.md del paquete.",
        503,
      );
    cleanup();
    if (url.pathname === "/auth/google") {
      const old = cookies(request)[flowName];
      if (old)
        sqlite.prepare("DELETE FROM railway_oauth_flows WHERE state_hash = ?").run(hash(old));
      const state = random(),
        nonce = random(),
        verifier = random();
      sqlite
        .prepare("INSERT INTO railway_oauth_flows VALUES(?,?,?,?,?)")
        .run(
          hash(state),
          verifier,
          nonce,
          localReturn(url.searchParams.get("return_to"), origin),
          Date.now() + 10 * 60000,
        );
      const target = new URL("https://accounts.google.com/o/oauth2/v2/auth");
      target.search = new URLSearchParams({
        client_id: clientId,
        redirect_uri: callback,
        response_type: "code",
        scope: "openid email profile",
        state,
        nonce,
        code_challenge: createHash("sha256").update(verifier).digest("base64url"),
        code_challenge_method: "S256",
        prompt: "select_account",
      }).toString();
      return redirect(target.href, cookie(flowName, state, 600));
    }
    const state = url.searchParams.get("state"),
      flowCookie = cookies(request)[flowName];
    if (!equal(state, flowCookie))
      return message(
        "La sesión de ingreso venció o no coincide. Volvé a iniciar sesión.",
        403,
        cookie(flowName, "", 0),
      );
    // Consume the login flow before any network request. It cannot be replayed.
    const flow = sqlite
      .prepare(
        "DELETE FROM railway_oauth_flows WHERE state_hash = ? AND expires_at > ? RETURNING *",
      )
      .get(hash(state), Date.now());
    if (!flow || !url.searchParams.get("code") || url.searchParams.has("error"))
      return message(
        "El ingreso no se completó. Volvé a Mi cuenta e intentá nuevamente.",
        400,
        cookie(flowName, "", 0),
      );
    try {
      const response = await fetcher("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code: url.searchParams.get("code"),
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: callback,
          grant_type: "authorization_code",
          code_verifier: flow.verifier,
        }),
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) throw new Error("Google token exchange failed");
      const tokens = await response.json();
      const { payload } = await jwtVerify(tokens.id_token, googleKeys, {
        issuer: ["https://accounts.google.com", "accounts.google.com"],
        audience: clientId,
        algorithms: ["RS256"],
        clockTolerance: 10,
        requiredClaims: ["sub", "iat", "exp", "nonce", "email", "email_verified"],
        maxTokenAge: "2h",
      });
      if (
        !equal(payload.nonce, flow.nonce) ||
        payload.email_verified !== true ||
        (payload.azp !== undefined && payload.azp !== clientId) ||
        typeof payload.sub !== "string" ||
        !payload.sub ||
        payload.sub.length > 255 ||
        typeof payload.email !== "string" ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)
      )
        throw new Error("Unverified identity");
      const user = {
        id: "google:" + payload.sub,
        email: payload.email.trim().toLowerCase(),
        name: typeof payload.name === "string" ? payload.name.slice(0, 100) : "",
      };
      // A fresh opaque token prevents session fixation. Only its hash is stored.
      const token = random();
      const old = cookies(request)[sessionName];
      if (old) sqlite.prepare("DELETE FROM railway_sessions WHERE token_hash = ?").run(hash(old));
      sqlite
        .prepare("INSERT INTO railway_sessions VALUES(?,?,?)")
        .run(hash(token), JSON.stringify(user), Date.now() + 14 * 86400000);
      const headers = new Headers({
        location: flow.return_to,
        "cache-control": "no-store",
        "referrer-policy": "no-referrer",
      });
      headers.append("set-cookie", cookie(flowName, "", 0));
      headers.append("set-cookie", cookie(sessionName, token, 14 * 86400));
      return new Response(null, { status: 303, headers });
    } catch {
      return message(
        "No pudimos verificar tu cuenta de Google. Volvé a iniciar sesión. Si el problema continúa, revisá la configuración OAuth del servidor.",
        401,
        cookie(flowName, "", 0),
      );
    }
  }
  return { handle, identity };
}
