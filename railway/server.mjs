import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { openStorage } from "./storage.mjs";
import { createAuth } from "./auth.mjs";
import worker from "../dist/server/index.js";

export function configuredOrigin(environment) {
  const candidate =
    environment.APP_URL ||
    (environment.RAILWAY_PUBLIC_DOMAIN ? `https://${environment.RAILWAY_PUBLIC_DOMAIN}` : "");
  if (!candidate) return null;
  const url = new URL(candidate);
  if (
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    (url.protocol !== "https:" &&
      !(url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)))
  )
    throw new Error(
      "APP_URL debe ser un origen HTTPS sin ruta. HTTP sólo se admite para pruebas locales.",
    );
  return url.origin;
}
export function createApplication({
  environment = process.env,
  storage: suppliedStorage,
  googleKeys,
  oauthFetch,
  mailFetch,
} = {}) {
  if (environment.RAILWAY_ENVIRONMENT_ID && !environment.RAILWAY_VOLUME_MOUNT_PATH)
    throw new Error("Agregá un volumen de Railway con punto de montaje /data antes de iniciar.");
  const storage =
    suppliedStorage ??
    openStorage(environment.DATA_DIR || environment.RAILWAY_VOLUME_MOUNT_PATH || "./data");
  const origin = configuredOrigin(environment);
  const auth = origin
    ? createAuth({
        sqlite: storage.sqlite,
        origin,
        clientId: environment.GOOGLE_CLIENT_ID,
        clientSecret: environment.GOOGLE_CLIENT_SECRET,
        ...(googleKeys ? { googleKeys } : {}),
        ...(oauthFetch ? { fetcher: oauthFetch } : {}),
      })
    : null;
  const env = {
    DB: storage.DB,
    BUCKET: storage.BUCKET,
    OFICIOS_CEO_EMAIL: environment.OFICIOS_CEO_EMAIL || "",
    BREVO_API_KEY: environment.BREVO_API_KEY || "",
    MAIL_FROM: environment.MAIL_FROM || "",
    ...(mailFetch ? { MAIL_FETCH: mailFetch } : {}),
    OPENAI_API_KEY: environment.OPENAI_API_KEY || "",
    OPENAI_MODEL: environment.OPENAI_MODEL || "gpt-4.1-mini",
  };
  const loginRate = new Map();
  const server = createServer({ maxHeaderSize: 16384 }, async (incoming, outgoing) => {
    const controller = new AbortController();
    incoming.on("aborted", () => controller.abort());
    outgoing.on("close", () => {
      if (!outgoing.writableEnded) controller.abort();
    });
    try {
      if (incoming.url === "/healthz" && ["GET", "HEAD"].includes(incoming.method)) {
        storage.sqlite.prepare("SELECT 1").get();
        outgoing.writeHead(200, {
          "content-type": "application/json",
          "cache-control": "no-store",
        });
        outgoing.end(incoming.method === "HEAD" ? undefined : JSON.stringify({ ok: true }));
        return;
      }
      if (!origin) {
        outgoing.writeHead(503, {
          "content-type": "text/plain; charset=utf-8",
          "cache-control": "no-store",
        });
        outgoing.end(
          "Generá el dominio público en Railway y configurá APP_URL con su URL HTTPS. Después volvé a desplegar.",
        );
        return;
      }
      const url = new URL(incoming.url, origin);
      if (url.origin !== origin || incoming.url.startsWith("//")) {
        outgoing.writeHead(400);
        outgoing.end("Ruta inválida.");
        return;
      }
      const headers = new Headers();
      for (const [name, value] of Object.entries(incoming.headers)) {
        // Railway receives untrusted Internet headers. Never trust platform identity assertions.
        if (
          name.startsWith("oai-") ||
          [
            "host",
            "connection",
            "content-length",
            "cf-connecting-ip",
            "x-forwarded-host",
            "x-forwarded-proto",
          ].includes(name) ||
          value === undefined
        )
          continue;
        headers.set(name, Array.isArray(value) ? value.join(", ") : value);
      }
      const method = incoming.method || "GET";
      let body;
      if (!["GET", "HEAD"].includes(method)) {
        const chunks = [];
        let size = 0;
        for await (const chunk of incoming) {
          size += chunk.length;
          if (size > 6 * 1024 * 1024) {
            outgoing.writeHead(413);
            outgoing.end("El formulario es demasiado grande.");
            return;
          }
          chunks.push(chunk);
        }
        body = Buffer.concat(chunks);
      }
      let request = new Request(url, {
        method,
        headers,
        ...(body ? { body } : {}),
        signal: controller.signal,
      });
      let response;
      if (url.pathname.startsWith("/auth/")) {
        if (url.pathname === "/auth/google") {
          const now = Date.now();
          for (const [ip, entry] of loginRate) if (entry.until < now) loginRate.delete(ip);
          const ip = incoming.socket.remoteAddress || "unknown";
          const entry = loginRate.get(ip) || { count: 0, until: now + 60000 };
          // All logins may share Railway's reverse proxy address; this is a coarse flood limit.
          entry.count++;
          loginRate.set(ip, entry);
          if (entry.count > 300)
            response = Response.json(
              { error: "Demasiados intentos de ingreso. Esperá un minuto." },
              { status: 429, headers: { "retry-after": "60" } },
            );
        }
        response ??= await auth.handle(request);
      } else {
        const user = auth.identity(request);
        if (user) {
          headers.set("oai-authenticated-user-id", user.id);
          headers.set("oai-authenticated-user-email", user.email);
          headers.set("oai-authenticated-user-full-name", encodeURIComponent(user.name));
          headers.set("oai-authenticated-user-full-name-encoding", "percent-encoded-utf-8");
        }
        request = new Request(url, {
          method,
          headers,
          ...(body ? { body } : {}),
          signal: controller.signal,
        });
        response = await worker.fetch(request, env);
      }
      outgoing.statusCode = response.status;
      for (const [name, value] of response.headers)
        if (name !== "set-cookie") outgoing.setHeader(name, value);
      const setCookies = response.headers.getSetCookie();
      if (setCookies.length) outgoing.setHeader("set-cookie", setCookies);
      outgoing.setHeader("x-content-type-options", "nosniff");
      if (!outgoing.hasHeader("referrer-policy"))
        outgoing.setHeader("referrer-policy", "strict-origin-when-cross-origin");
      if (origin.startsWith("https://"))
        outgoing.setHeader("strict-transport-security", "max-age=31536000");
      if (method === "HEAD" || !response.body) {
        outgoing.end();
        return;
      }
      const reader = response.body.getReader();
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          if (controller.signal.aborted) {
            await reader.cancel();
            break;
          }
          if (!outgoing.write(Buffer.from(value)))
            await new Promise((done) => {
              outgoing.once("drain", done);
              outgoing.once("close", done);
            });
        }
      } finally {
        reader.releaseLock();
      }
      outgoing.end();
    } catch (error) {
      if (controller.signal.aborted) {
        outgoing.destroy();
        return;
      }
      console.error("Error de solicitud:", error?.code || error?.name || "UnknownError");
      if (!outgoing.headersSent) {
        outgoing.writeHead(500, {
          "content-type": "application/json",
          "cache-control": "no-store",
        });
        outgoing.end(
          JSON.stringify({ error: "No pudimos completar la solicitud. Intentá nuevamente." }),
        );
      } else outgoing.destroy();
    }
  });
  server.requestTimeout = 60000;
  server.headersTimeout = 15000;
  return { server, storage, auth };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const app = createApplication();
  const port = Number(process.env.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("PORT inválido.");
  app.server.listen(port, "0.0.0.0", () => console.log(`Oficios listo en el puerto ${port}.`));
  const stop = () => {
    app.server.close(() => {
      app.storage.close();
      process.exit(0);
    });
    app.server.closeIdleConnections();
    setTimeout(() => process.exit(1), 25000).unref();
  };
  process.once("SIGTERM", stop);
  process.once("SIGINT", stop);
}
