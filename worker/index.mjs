import { handleChat } from "./chat-handler.mjs";
import { handleMarket, marketViewer, marketPageAllowed } from "./market-api.mjs";
import { isInternalPath } from "../src/lib/customer-access.js";

const files = /*__STATIC_ASSETS__*/ {};
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/market/") && url.pathname !== "/api/market/status")
      return handleMarket(request, env);
    if (url.pathname === "/api/market/status")
      return Response.json(
        { database: Boolean(env?.DB), files: Boolean(env?.BUCKET) },
        { headers: { "cache-control": "no-store" } },
      );
    if (url.pathname === "/api/chat" || url.pathname === "/api/chat/status")
      return handleChat(request, env);
    if (!["GET", "HEAD"].includes(request.method))
      return new Response("Método no permitido", { status: 405 });
    let pathname;
    try {
      pathname = decodeURIComponent(url.pathname);
    } catch {
      return new Response("Ruta inválida", { status: 400 });
    }
    let restricted = isInternalPath(pathname);
    if (restricted) {
      try {
        const normalized = pathname
          .replace(/\/index\.html$/, "")
          .replace(/\.html$/, "")
          .replace(/\/$/, "");
        restricted = !marketPageAllowed(normalized, await marketViewer(request, env));
      } catch {
        restricted = true;
      }
    }
    if (restricted)
      return new Response(
        request.method === "HEAD"
          ? null
          : `<!doctype html><html lang="es-AR"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Acceso restringido | Oficios</title><body style="margin:0;background:#fbfaf5;color:#16332d;font-family:system-ui;display:grid;place-items:center;min-height:100vh"><main style="max-width:32rem;padding:2rem;text-align:center"><h1>Acceso restringido</h1><p>Ingresá con una cuenta que tenga permiso para este espacio.</p><a href="${/^\/(ceo|admin|superadmin|equipo)(\/|$)/.test(pathname) ? "/gestion" : "/cuenta"}" style="display:inline-block;margin-top:1rem;color:#005f48">Ingresar a mi espacio</a></main></body></html>`,
        {
          status: 403,
          headers: {
            "content-type": "text/html; charset=utf-8",
            "cache-control": "no-store",
            "x-content-type-options": "nosniff",
          },
        },
      );
    const asset = files[pathname] ?? files[`${pathname.replace(/\/$/, "")}/index.html`];
    if (restricted && !asset)
      return new Response("Acceso restringido", {
        status: 403,
        headers: { "cache-control": "no-store", "content-type": "text/plain; charset=utf-8" },
      });
    if (!asset)
      return new Response("Página no encontrada", {
        status: 404,
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    const headers = {
      "content-type": asset.type,
      "cache-control": restricted
        ? "no-store"
        : pathname.startsWith("/assets/")
          ? "public, max-age=31536000, immutable"
          : "no-cache",
      "x-content-type-options": "nosniff",
      "referrer-policy":
        pathname === "/gestion" ? "no-referrer" : "strict-origin-when-cross-origin",
    };
    if (pathname === "/sw.js") headers["service-worker-allowed"] = "/";
    const bytes =
      request.method === "HEAD"
        ? null
        : Uint8Array.from(atob(asset.base64), (char) => char.charCodeAt(0));
    return new Response(bytes, { headers, status: restricted ? 403 : 200 });
  },
};
