import { requireMarket } from "./market-domain.mjs";

const ceoViewRoles = ["superadmin", "admin", "profesional", "cliente"];
export const ceoViewCookieName = (url) =>
  new URL(url).protocol === "https:" ? "__Host-oficios_ceo_view" : "oficios_ceo_view";
function ceoViewCookie(request, value, maxAge) {
  return `${ceoViewCookieName(request.url)}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${new URL(request.url).protocol === "https:" ? "; Secure" : ""}`;
}
// A cookie never grants CEO access: the real, verified identity must already be CEO.
export async function applyCeoView(request, env, viewer) {
  if (viewer.staffRole !== "ceo") return viewer;
  const raw = (request.headers.get("cookie") ?? "")
    .split(";")
    .map((v) => v.trim())
    .find((v) => v.startsWith(ceoViewCookieName(request.url) + "="));
  if (!raw) return viewer;
  let selection;
  try {
    selection = JSON.parse(decodeURIComponent(raw.slice(raw.indexOf("=") + 1)));
  } catch {
    return viewer;
  }
  if (!selection || !ceoViewRoles.includes(selection.role)) return viewer;
  const role = selection.role;
  let account = null;
  if (["profesional", "cliente"].includes(role)) {
    if (typeof selection.accountId === "string")
      account = await env.DB.prepare("SELECT * FROM accounts WHERE user_id=? AND kind=?")
        .bind(selection.accountId, role)
        .first();
    // An empty preview is ephemeral. It never inserts an account, job or verification.
    account ??= {
      user_id: `ceo-view-empty:${role}`,
      email: viewer.identity.email,
      name:
        role === "profesional"
          ? "Vista profesional sin cuenta seleccionada"
          : "Vista cliente sin cuenta seleccionada",
      kind: role,
      city_id: "",
      trade: "",
      phone: "",
      bio: "",
      verification: "sin-enviar",
      identity_json: "{}",
      profile_json: "{}",
      version: 0,
    };
  }
  const selected = account && account.user_id !== `ceo-view-empty:${role}`;
  return {
    ...viewer,
    ceoIdentity: viewer.identity,
    identity: selected
      ? { id: account.user_id, email: account.email, name: account.name }
      : viewer.identity,
    account,
    staffRole: ["superadmin", "admin"].includes(role) ? role : null,
    ceoPreview: {
      role,
      accountId: selected ? account.user_id : null,
      accountName: selected ? account.name : null,
      ownerEmail: viewer.identity.email,
      empty: !selected && ["profesional", "cliente"].includes(role),
    },
  };
}

export async function handleCeoView(request, env, viewer, readBody) {
  const url = new URL(request.url),
    path = url.pathname.replace(/\/$/, "");
  if (
    !["/api/market/ceo/views", "/api/market/ceo/view", "/api/market/ceo/view/exit"].includes(path)
  )
    return null;
  requireMarket(
    viewer.staffRole === "ceo" || viewer.ceoPreview,
    "Este acceso está reservado al CEO.",
    403,
  );
  const headers = { "cache-control": "no-store", "x-content-type-options": "nosniff" };
  if (path === "/api/market/ceo/views" && request.method === "GET") {
    const kind = url.searchParams.get("role");
    requireMarket(["profesional", "cliente"].includes(kind), "Elegí el tipo de cuenta.");
    const search = (url.searchParams.get("search") ?? "").trim().slice(0, 100);
    const rows =
      (
        await env.DB.prepare(
          "SELECT user_id AS id,name,email,city_id AS cityId FROM accounts WHERE kind=? AND (instr(lower(name),lower(?))>0 OR instr(lower(email),lower(?))>0) ORDER BY name,user_id LIMIT 100",
        )
          .bind(kind, search, search)
          .all()
      ).results ?? [];
    return Response.json({ accounts: rows, limit: 100 }, { headers });
  }
  if (path === "/api/market/ceo/view/exit" && request.method === "POST")
    return new Response(null, {
      status: 303,
      headers: { ...headers, location: "/ceo", "set-cookie": ceoViewCookie(request, "", 0) },
    });
  if (path === "/api/market/ceo/view" && request.method === "POST") {
    const input = await readBody(request);
    requireMarket(ceoViewRoles.includes(input.role), "Elegí un panel válido.");
    const accountId = input.accountId ?? null;
    requireMarket(
      accountId === null || (typeof accountId === "string" && accountId.length <= 200),
      "Elegí una cuenta válida.",
    );
    if (accountId !== null) {
      requireMarket(
        ["profesional", "cliente"].includes(input.role),
        "Este panel no requiere una cuenta de cliente o profesional.",
      );
      requireMarket(
        await env.DB.prepare("SELECT user_id FROM accounts WHERE user_id=? AND kind=?")
          .bind(accountId, input.role)
          .first(),
        "La cuenta no corresponde al panel elegido.",
        404,
      );
    }
    const next = {
      superadmin: "/superadmin",
      admin: "/admin",
      profesional: "/panel-profesional",
      cliente: "/mis-solicitudes",
    }[input.role];
    return Response.json(
      { next },
      {
        headers: {
          ...headers,
          "set-cookie": ceoViewCookie(
            request,
            encodeURIComponent(JSON.stringify({ role: input.role, accountId })),
            8 * 3600,
          ),
        },
      },
    );
  }
  return Response.json({ error: "Método no permitido." }, { status: 405, headers });
}
