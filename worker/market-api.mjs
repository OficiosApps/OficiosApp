import {
  staffMailStatus,
  staffMailMessages,
  deliverStaffInvitation,
  checkStaffMail,
} from "./staff-mail.mjs";
import {
  MarketError,
  requireMarket,
  marketText,
  marketTrades,
  marketCities,
  marketProfile,
  marketProfilePhoto,
  marketProfileComplete,
  createMarketJob,
  mayReadJob,
  providerMatches,
  visibleMarketJob,
  changeMarketJob,
} from "./market-domain.mjs";
import {
  readMarketConfig,
  activeMarketCities,
  publicMarketConfig,
  marketEntitlements,
  referralStatement,
  rewardReferralStatements,
  handleCeo,
} from "./market-settings.mjs";
const marketJson = (value, status = 200) =>
  Response.json(value, {
    status,
    headers: { "cache-control": "no-store", "x-content-type-options": "nosniff" },
  });
const marketRow = (row) => (row ? { ...JSON.parse(row.body), version: row.version } : null);
const marketRows = async (statement) => (await statement.all()).results ?? [];
function identityFrom(request) {
  const id = request.headers.get("oai-authenticated-user-id");
  if (!id) return null;
  let name = request.headers.get("oai-authenticated-user-full-name") ?? "";
  try {
    if (
      request.headers.get("oai-authenticated-user-full-name-encoding") === "percent-encoded-utf-8"
    )
      name = decodeURIComponent(name);
  } catch {
    name = "";
  }
  return {
    id,
    email: (request.headers.get("oai-authenticated-user-email") ?? "").trim().toLowerCase(),
    name,
  };
}
async function marketBytes(request, limit) {
  requireMarket(
    Number(request.headers.get("content-length") ?? 0) <= limit,
    "El formulario es demasiado grande.",
    413,
  );
  const reader = request.body?.getReader();
  requireMarket(reader, "El formulario está vacío.");
  let total = 0;
  const chunks = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > limit) {
      await reader.cancel();
      throw new MarketError("El formulario es demasiado grande.", 413);
    }
    chunks.push(value);
  }
  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}
async function marketBody(request) {
  requireMarket(
    request.headers.get("content-type")?.startsWith("application/json"),
    "Se requiere JSON.",
    415,
  );
  const bytes = await marketBytes(request, 32000);
  try {
    const value = JSON.parse(new TextDecoder().decode(bytes));
    requireMarket(
      value && typeof value === "object" && !Array.isArray(value),
      "El formulario no es válido.",
    );
    return value;
  } catch {
    throw new MarketError("El formulario no es válido.");
  }
}

async function marketImage(request) {
  requireMarket(
    Number(request.headers.get("content-length") ?? 0) <= 5300000,
    "La imagen supera 5 MB.",
    413,
  );
  const uploadBytes = await marketBytes(request, 5300000);
  const form = await new Request(request.url, {
      method: "POST",
      headers: { "content-type": request.headers.get("content-type") ?? "" },
      body: uploadBytes,
    }).formData(),
    file = form.get("file"),
    scope = form.get("scope");
  requireMarket(
    file instanceof File && file.size > 0 && file.size <= 5 * 1024 * 1024,
    "Adjuntá una imagen de hasta 5 MB.",
  );
  requireMarket(
    ["image/jpeg", "image/png", "image/webp"].includes(file.type),
    "Usá JPG, PNG o WEBP.",
  );
  const bytes = new Uint8Array(await file.arrayBuffer());
  const valid =
    file.type === "image/jpeg"
      ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
      : file.type === "image/png"
        ? bytes.slice(0, 8).join(",") === "137,80,78,71,13,10,26,10"
        : String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
          String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  requireMarket(valid, "El contenido de la imagen no es válido.");
  return { file, scope, bytes };
}
async function clientSelfie(env, owner, id) {
  requireMarket(
    typeof id === "string" && id.length > 0,
    "Tomá tu selfie de verificación para continuar.",
  );
  const selfie = await env.DB.prepare(
    "SELECT * FROM client_selfie_uploads WHERE id = ? AND owner_id = ? AND claimed_at IS NULL AND created_at > ?",
  )
    .bind(id, owner, Date.now() - 86400000)
    .first();
  requireMarket(selfie, "La selfie no es válida para esta cuenta o venció. Volvé a tomarla.", 403);
  return selfie;
}
function claimClientSelfie(env, owner, selfie, now) {
  return [
    env.DB.prepare(
      "INSERT INTO uploads (id,owner_id,scope,object_key,mime,created_at) VALUES (?,?,?,?,?,?)",
    ).bind(selfie.id, owner, "client-selfie", selfie.object_key, selfie.mime, now),
    env.DB.prepare(
      "UPDATE client_selfie_uploads SET claimed_at = ? WHERE id = ? AND owner_id = ? AND claimed_at IS NULL",
    ).bind(now, selfie.id, owner),
  ];
}

export async function marketViewer(request, env) {
  const identity = identityFrom(request);
  if (!identity) return { identity: null, account: null, staffRole: null };
  requireMarket(env.DB, "La base de datos no está disponible. Intentá más tarde.", 503);
  const account = await env.DB.prepare("SELECT * FROM accounts WHERE user_id = ?")
    .bind(identity.id)
    .first();
  let staffRole = null;
  if (
    env.OFICIOS_CEO_EMAIL &&
    identity.email &&
    identity.email === env.OFICIOS_CEO_EMAIL.trim().toLowerCase()
  )
    staffRole = "ceo";
  else
    staffRole =
      (await env.DB.prepare("SELECT role FROM staff WHERE user_id = ?").bind(identity.id).first())
        ?.role ?? null;
  return { identity, account, staffRole };
}
export function marketPageAllowed(path, viewer) {
  if (/^\/ceo(\/|$)/.test(path)) return viewer.staffRole === "ceo";
  if (/^\/planes-profesionales(\/|$)/.test(path)) return viewer.account?.kind === "profesional";
  if (/^\/(admin|superadmin|equipo)(\/|$)/.test(path))
    return (
      Boolean(viewer.staffRole) &&
      (!path.startsWith("/superadmin") || ["ceo", "superadmin"].includes(viewer.staffRole))
    );
  if (/^\/(panel-profesional|panel-empresa|metodos-de-pago|planes-profesionales)(\/|$)/.test(path))
    return Boolean(
      viewer.account &&
      viewer.account.kind !== "cliente" &&
      (path.startsWith("/panel-empresa") ? viewer.account.kind === "empresa" : true),
    );
  return true;
}
function ownAccount(viewer) {
  requireMarket(viewer.identity, "Iniciá sesión para continuar.", 401);
  requireMarket(viewer.account, "Completá tu cuenta para continuar.", 428);
  return viewer.account;
}
function publicAccount(row) {
  if (!row) return null;
  const profile = JSON.parse(row.profile_json ?? "{}");
  return {
    id: row.user_id,
    name: row.name,
    kind: row.kind,
    cityId: row.city_id,
    trade: row.trade,
    bio: row.bio,
    verification: row.verification,
    logoId: row.kind === "profesional" ? marketProfilePhoto(row) : (profile.logoId ?? null),
    profilePhotoId: marketProfilePhoto(row),
  };
}
async function ownedUploads(env, owner, ids, scope) {
  requireMarket(Array.isArray(ids), "Revisá los archivos.");
  for (const id of ids) {
    requireMarket(typeof id === "string" && id.trim(), "Completá todos los archivos obligatorios.");
    const file = await env.DB.prepare(
      "SELECT * FROM uploads WHERE id = ? AND owner_id = ? AND scope = ?",
    )
      .bind(id, owner, scope)
      .first();
    requireMarket(
      file,
      "Uno de los archivos no pertenece a tu cuenta o no corresponde a esta carga.",
      403,
    );
  }
}
async function readJob(env, id) {
  const job = marketRow(
    await env.DB.prepare("SELECT body,version FROM jobs WHERE id = ?").bind(id).first(),
  );
  requireMarket(job, "No encontramos esa solicitud.", 404);
  return job;
}
function canReview(viewer) {
  return ["ceo", "superadmin", "admin"].includes(viewer.staffRole);
}
export async function handleMarket(request, env) {
  try {
    const url = new URL(request.url),
      path = url.pathname.replace(/\/$/, "");
    const viewer = await marketViewer(request, env);
    if (request.method !== "GET" && request.method !== "HEAD")
      requireMarket(request.headers.get("origin") === url.origin, "Origen no permitido.", 403);
    if (path === "/api/market/session" && request.method === "GET")
      return marketJson({
        authenticated: Boolean(viewer.identity),
        identity: viewer.identity
          ? { name: viewer.identity.name, email: viewer.identity.email }
          : null,
        account: viewer.account
          ? {
              ...publicAccount(viewer.account),
              phone: viewer.account.phone,
              version: viewer.account.version,
              identity: JSON.parse(viewer.account.identity_json),
              profile: JSON.parse(viewer.account.profile_json),
            }
          : null,
        staffRole: viewer.staffRole,
      });
    requireMarket(env.DB, "La base de datos no está disponible. Intentá más tarde.", 503);
    if (path === "/api/market/config" && request.method === "GET")
      return marketJson(publicMarketConfig((await readMarketConfig(env)).config));
    if (path.startsWith("/api/market/ceo/"))
      return await handleCeo(request, env, viewer, marketBody);

    if (path === "/api/market/providers" && request.method === "GET") {
      const rows = await marketRows(
        env.DB.prepare(
          "SELECT * FROM accounts WHERE kind != 'cliente' AND verification = 'aprobado' ORDER BY created_at DESC LIMIT 100",
        ),
      );
      const { config } = await readMarketConfig(env);
      const activeCities = activeMarketCities(config);
      return marketJson({
        providers: rows
          .filter(
            (r) =>
              activeCities.includes(r.city_id) &&
              marketProfileComplete(r) &&
              (!url.searchParams.get("category") || r.trade === url.searchParams.get("category")) &&
              (!url.searchParams.get("city") || r.city_id === url.searchParams.get("city")),
          )
          .map((row) => ({
            ...publicAccount(row),
            cityName: config.regions.find((r) => r.id === row.city_id)?.name ?? row.city_id,
          })),
      });
    }
    const publicProfile = path.match(/^\/api\/market\/providers\/([^/]+)$/);
    if (publicProfile && request.method === "GET") {
      const row = await env.DB.prepare(
        "SELECT * FROM accounts WHERE user_id = ? AND kind != 'cliente' AND verification = 'aprobado'",
      )
        .bind(publicProfile[1])
        .first();
      requireMarket(row && marketProfileComplete(row), "El perfil no está disponible.", 404);
      const works = await marketRows(
        env.DB.prepare(
          "SELECT id,body FROM works WHERE owner_id = ? AND published = 1 ORDER BY created_at DESC LIMIT 50",
        ).bind(row.user_id),
      );
      const { config } = await readMarketConfig(env);
      return marketJson({
        provider: {
          ...publicAccount(row),
          cityName: config.regions.find((r) => r.id === row.city_id)?.name ?? row.city_id,
        },
        works: works.map((w) => ({ id: w.id, ...JSON.parse(w.body) })),
      });
    }
    const filePath = path.match(/^\/api\/market\/files\/([^/]+)$/);
    if (filePath && request.method === "GET") {
      const file = await env.DB.prepare("SELECT * FROM uploads WHERE id = ?")
        .bind(filePath[1])
        .first();
      requireMarket(file, "Archivo no encontrado.", 404);
      let allowed =
        viewer.identity?.id === file.owner_id ||
        (["identity", "logo", "client-selfie"].includes(file.scope) && canReview(viewer));
      if (!allowed && ["logo", "work"].includes(file.scope)) {
        const owner = await env.DB.prepare(
          "SELECT * FROM accounts WHERE user_id = ? AND verification = 'aprobado'",
        )
          .bind(file.owner_id)
          .first();
        if (owner && marketProfileComplete(owner)) {
          if (file.scope === "logo") allowed = true;
          else {
            const rows = await marketRows(
              env.DB.prepare("SELECT body FROM works WHERE owner_id = ? AND published = 1").bind(
                file.owner_id,
              ),
            );
            allowed = rows.some((r) => {
              const work = JSON.parse(r.body);
              return work.beforeId === file.id || work.afterId === file.id;
            });
          }
        }
      }
      if (!allowed && file.scope === "request" && viewer.account) {
        const rows = await marketRows(
          env.DB.prepare("SELECT body,version FROM jobs WHERE client_id = ?").bind(file.owner_id),
        );
        allowed = rows.some((r) => {
          const job = marketRow(r);
          return job.photoIds.includes(file.id) && mayReadJob(viewer.account, job);
        });
      }
      requireMarket(allowed, "No tenés acceso al archivo.", 403);
      requireMarket(env.BUCKET, "Los archivos no están disponibles.", 503);
      const object = await env.BUCKET.get(file.object_key);
      requireMarket(object, "Archivo no encontrado.", 404);
      return new Response(object.body, {
        headers: {
          "content-type": file.mime,
          "cache-control": "private, no-store",
          "x-content-type-options": "nosniff",
        },
      });
    }
    if (path === "/api/market/client-selfie" && request.method === "POST") {
      requireMarket(viewer.identity, "Iniciá sesión para tomar tu selfie.", 401);
      requireMarket(
        !viewer.account || viewer.account.kind === "cliente",
        "Esta carga es para clientes.",
        403,
      );
      requireMarket(env.BUCKET, "Los archivos no están disponibles.", 503);
      const count = await env.DB.prepare(
        "SELECT COUNT(*) AS n FROM client_selfie_uploads WHERE owner_id = ? AND created_at > ?",
      )
        .bind(viewer.identity.id, Date.now() - 86400000)
        .first();
      requireMarket(count.n < 10, "Llegaste al límite de selfies por día. Intentá mañana.", 429);
      const { file, bytes } = await marketImage(request);
      const id = crypto.randomUUID(),
        key = `client-selfies/${viewer.identity.id}/${id}`,
        now = Date.now();
      await env.BUCKET.put(key, bytes, { httpMetadata: { contentType: file.type } });
      try {
        await env.DB.prepare(
          "INSERT INTO client_selfie_uploads (id,owner_id,object_key,mime,created_at) VALUES (?,?,?,?,?)",
        )
          .bind(id, viewer.identity.id, key, file.type, now)
          .run();
      } catch (error) {
        await env.BUCKET.delete(key);
        throw error;
      }
      // Remove expired unsubmitted photos when this person next uploads.
      const expired = await marketRows(
        env.DB.prepare(
          "SELECT id,object_key FROM client_selfie_uploads WHERE owner_id = ? AND claimed_at IS NULL AND created_at <= ?",
        ).bind(viewer.identity.id, now - 86400000),
      );
      for (const old of expired) {
        await env.BUCKET.delete(old.object_key);
        await env.DB.prepare(
          "DELETE FROM client_selfie_uploads WHERE id = ? AND claimed_at IS NULL",
        )
          .bind(old.id)
          .run();
      }
      return marketJson({ id }, 201);
    }
    if (path === "/api/market/account" && request.method === "POST") {
      requireMarket(viewer.identity, "Iniciá sesión para crear tu cuenta.", 401);
      requireMarket(!viewer.account, "Ya tenés una cuenta.", 409);
      const input = await marketBody(request),
        { config } = await readMarketConfig(env);
      const data = marketProfile(input, activeMarketCities(config)),
        now = Date.now();
      const referral = await referralStatement(
        env,
        viewer.identity,
        data.kind,
        input.referralCode,
        config,
        now,
      );
      const selfie =
        data.kind === "cliente"
          ? await clientSelfie(env, viewer.identity.id, input.clientSelfieId)
          : null;
      if (selfie)
        requireMarket(
          input.clientSelfieConsent === true,
          "Autorizá la revisión privada de tu selfie.",
        );
      const createAccount = env.DB.prepare(
        "INSERT INTO accounts (user_id,email,name,kind,city_id,trade,phone,bio,created_at,updated_at,verification,identity_json) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
      ).bind(
        viewer.identity.id,
        viewer.identity.email,
        data.name,
        data.kind,
        data.cityId,
        data.trade,
        data.phone,
        data.bio,
        now,
        now,
        selfie ? "pendiente" : "sin-enviar",
        JSON.stringify(selfie ? { clientSelfieId: selfie.id, consentAt: now } : {}),
      );
      await env.DB.batch([
        createAccount,
        ...(selfie ? claimClientSelfie(env, viewer.identity.id, selfie, now) : []),
        ...(referral ? [referral] : []),
      ]);
      return marketJson({ ok: true }, 201);
    }
    if (path === "/api/market/invites/preview" && request.method === "GET") {
      requireMarket(viewer.identity, "Iniciá sesión con el correo invitado.", 401);
      const id = url.searchParams.get("id");
      requireMarket(
        typeof id === "string" && /^[a-f0-9-]{36}$/i.test(id),
        "El enlace de invitación no es válido.",
      );
      const invite = await env.DB.prepare("SELECT * FROM staff_invites WHERE id = ?")
        .bind(id)
        .first();
      requireMarket(invite, "La invitación no existe o ya no está disponible.", 404);
      const matchesEmail = invite.email === viewer.identity.email;
      const status = invite.used_by
        ? "accepted"
        : invite.expires_at <= Date.now()
          ? "expired"
          : "pending";
      const acceptedByYou = matchesEmail && invite.used_by === viewer.identity.id;
      const [local, domain] = invite.email.split("@");
      return marketJson({
        role: invite.role,
        maskedEmail: `${local.slice(0, 2)}***@${domain}`,
        email: matchesEmail ? invite.email : null,
        matchesEmail,
        status,
        acceptedByYou,
        canAccept: status === "pending" && matchesEmail && !viewer.staffRole,
        message: !matchesEmail
          ? "Este enlace fue enviado a otro correo. Elegí en Google la cuenta que recibió la invitación."
          : acceptedByYou
            ? "Ya aceptaste esta invitación. Podés entrar a tu panel."
            : status === "accepted"
              ? "Esta invitación ya fue utilizada."
              : status === "expired"
                ? "La invitación venció. Pedile a quien te invitó que cree una nueva."
                : viewer.staffRole === "ceo"
                  ? "Estás usando la cuenta CEO. Elegí la cuenta invitada para activar su acceso de superadministrador."
                  : viewer.staffRole
                    ? "Esta cuenta ya tiene un acceso de gestión. No se modifica su rol mediante este enlace."
                    : "Confirmá la invitación para activar tu acceso al equipo.",
      });
    }
    if (path === "/api/market/invites/accept" && request.method === "POST") {
      requireMarket(viewer.identity, "Iniciá sesión.", 401);
      const data = await marketBody(request),
        invite = await env.DB.prepare("SELECT * FROM staff_invites WHERE id = ?")
          .bind(data.id)
          .first();
      requireMarket(
        invite &&
          !invite.used_by &&
          invite.expires_at > Date.now() &&
          invite.email === viewer.identity.email,
        "La invitación no es válida para esta cuenta.",
        403,
      );
      requireMarket(
        !viewer.staffRole,
        "Esta cuenta ya tiene un rol de gestión. Ingresá con el correo invitado; el enlace no cambia tu rol actual.",
        409,
      );
      const now = Date.now();
      const changes = await env.DB.batch([
        env.DB.prepare(
          "INSERT INTO staff (user_id,role,invited_by,created_at) SELECT ?,role,invited_by,? FROM staff_invites WHERE id = ? AND used_by IS NULL AND expires_at > ?",
        ).bind(viewer.identity.id, now, invite.id, now),
        env.DB.prepare(
          "UPDATE staff_invites SET used_by = ? WHERE id = ? AND used_by IS NULL AND expires_at > ? AND EXISTS (SELECT 1 FROM staff WHERE user_id = ? AND role = staff_invites.role AND invited_by = staff_invites.invited_by)",
        ).bind(viewer.identity.id, invite.id, now, viewer.identity.id),
      ]);
      requireMarket(
        changes.every((change) => change.meta.changes === 1),
        "La invitación cambió o venció. Volvé a abrir el enlace.",
        409,
      );
      return marketJson({
        ok: true,
        role: invite.role,
        next: invite.role === "superadmin" ? "/superadmin" : "/admin",
      });
    }
    if (path.startsWith("/api/market/staff")) {
      requireMarket(canReview(viewer), "No tenés permisos de administración.", 403);
      if (path === "/api/market/staff/mail/check" && request.method === "POST") {
        requireMarket(
          viewer.staffRole === "ceo",
          "Sólo el CEO puede comprobar la configuración del correo.",
          403,
        );
        return marketJson(await checkStaffMail(env));
      }
      if (path === "/api/market/staff" && request.method === "GET") {
        const accounts = await marketRows(
          env.DB.prepare(
            "SELECT * FROM accounts WHERE verification IN ('pendiente','rechazado') ORDER BY updated_at DESC LIMIT 100",
          ),
        );
        const jobs = (
          await marketRows(
            env.DB.prepare("SELECT body,version FROM jobs ORDER BY created_at DESC LIMIT 1000"),
          )
        ).map(marketRow);
        const first = jobs.flatMap((j) =>
            j.quotes.length
              ? [Math.min(...j.quotes.map((q) => q.revisions[0].createdAt)) - j.createdAt]
              : [],
          ),
          hired = jobs.filter((j) => j.events.some((e) => e.state === "contratado")),
          counts = new Map();
        for (const j of hired.filter((j) => j.state !== "cancelado"))
          counts.set(j.clientId, (counts.get(j.clientId) ?? 0) + 1);
        return marketJson({
          reviews: accounts.map((a) => ({
            ...publicAccount(a),
            identity: JSON.parse(a.identity_json),
            version: a.version,
          })),
          metrics: {
            requests: jobs.length,
            responded: first.length,
            firstResponseMs: first.length ? first.reduce((a, b) => a + b, 0) / first.length : null,
            hired: hired.length,
            cancelled: jobs.filter((j) => j.state === "cancelado").length,
            returning: [...counts.values()].filter((n) => n > 1).length,
          },
          mail: viewer.staffRole === "admin" ? null : staffMailStatus(env),
          team:
            viewer.staffRole === "admin"
              ? []
              : await marketRows(
                  env.DB.prepare(
                    "SELECT s.user_id,s.role,s.created_at,(SELECT i.email FROM staff_invites i WHERE i.used_by = s.user_id ORDER BY i.created_at DESC LIMIT 1) AS email FROM staff s WHERE s.invited_by = ? AND s.role = ? ORDER BY s.created_at DESC LIMIT 100",
                  ).bind(viewer.identity.id, viewer.staffRole === "ceo" ? "superadmin" : "admin"),
                ),
          deliveryMessages: viewer.staffRole === "admin" ? null : staffMailMessages,
          invites:
            viewer.staffRole === "admin"
              ? []
              : await marketRows(
                  env.DB.prepare(
                    "SELECT id,email,role,expires_at,used_by,delivery_status,delivery_attempts,delivery_attempted_at,delivery_sent_at,delivery_error FROM staff_invites WHERE invited_by = ? ORDER BY created_at DESC LIMIT 50",
                  ).bind(viewer.identity.id),
                ),
        });
      }
      if (path === "/api/market/staff/invite" && request.method === "POST") {
        const data = await marketBody(request),
          role =
            viewer.staffRole === "ceo"
              ? "superadmin"
              : viewer.staffRole === "superadmin"
                ? "admin"
                : null;
        requireMarket(role, "No podés crear invitaciones.", 403);
        const email = marketText(data.email, 3, 200).toLowerCase();
        requireMarket(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), "Ingresá un correo válido.");
        requireMarket(email !== viewer.identity.email, "Invitá a otra persona.");
        requireMarket(
          email !== (env.OFICIOS_CEO_EMAIL || "").trim().toLowerCase(),
          "Esa cuenta ya tiene acceso CEO.",
        );
        const existingStaff = await env.DB.prepare(
          "SELECT s.role FROM staff s JOIN staff_invites i ON i.used_by = s.user_id WHERE i.email = ? LIMIT 1",
        )
          .bind(email)
          .first();
        requireMarket(!existingStaff, "Esa persona ya forma parte del equipo.", 409);
        const now = Date.now();
        const recent = await env.DB.prepare(
          "SELECT COUNT(*) AS total FROM staff_invites WHERE invited_by = ? AND created_at > ?",
        )
          .bind(viewer.identity.id, now - 3600000)
          .first();
        requireMarket(
          recent.total < 30,
          "Alcanzaste el límite de 30 invitaciones por hora. Intentá más tarde.",
          429,
        );
        let invite = await env.DB.prepare(
          "SELECT * FROM staff_invites WHERE invited_by = ? AND email = ? AND role = ? AND used_by IS NULL AND expires_at > ? ORDER BY created_at DESC LIMIT 1",
        )
          .bind(viewer.identity.id, email, role, now)
          .first();
        const created = !invite;
        if (!invite) {
          const id = crypto.randomUUID();
          await env.DB.prepare(
            "INSERT INTO staff_invites (id,email,role,invited_by,expires_at,created_at) VALUES (?,?,?,?,?,?)",
          )
            .bind(id, email, role, viewer.identity.id, now + 7 * 86400000, now)
            .run();
          invite = await env.DB.prepare("SELECT * FROM staff_invites WHERE id = ?")
            .bind(id)
            .first();
        }
        const delivery = await deliverStaffInvitation(env, invite, url.origin);
        return marketJson({ id: invite.id, role, delivery }, created ? 201 : 200);
      }
      if (path === "/api/market/staff/invite/resend" && request.method === "POST") {
        requireMarket(
          ["ceo", "superadmin"].includes(viewer.staffRole),
          "No podés reenviar invitaciones.",
          403,
        );
        const data = await marketBody(request);
        const invite = await env.DB.prepare(
          "SELECT * FROM staff_invites WHERE id = ? AND invited_by = ?",
        )
          .bind(data.id, viewer.identity.id)
          .first();
        const allowedRole = viewer.staffRole === "ceo" ? "superadmin" : "admin";
        requireMarket(
          invite && invite.role === allowedRole,
          "No tenés permiso sobre esta invitación.",
          403,
        );
        requireMarket(
          !invite.used_by && invite.expires_at > Date.now(),
          "La invitación ya se aceptó o venció.",
          409,
        );
        return marketJson({
          id: invite.id,
          role: invite.role,
          delivery: await deliverStaffInvitation(env, invite, url.origin),
        });
      }
      if (path === "/api/market/staff/review" && request.method === "POST") {
        const data = await marketBody(request);
        requireMarket(["aprobado", "rechazado"].includes(data.decision), "Indicá la decisión.");
        const account = await env.DB.prepare("SELECT * FROM accounts WHERE user_id = ?")
          .bind(data.userId)
          .first();
        requireMarket(
          account && account.verification === "pendiente",
          "Esta revisión ya cambió.",
          409,
        );
        requireMarket(
          account.user_id !== viewer.identity.id,
          "Otra persona autorizada debe revisar tu identidad.",
          403,
        );
        const details = JSON.parse(account.identity_json);
        if (data.decision === "aprobado" && account.kind === "cliente") {
          await ownedUploads(env, account.user_id, [details.clientSelfieId], "client-selfie");
        }
        if (data.decision === "aprobado" && account.kind !== "cliente") {
          requireMarket(
            /^\d{7,8}$/.test(details.dni ?? ""),
            "Falta un DNI válido para aprobar el alta.",
          );
          await ownedUploads(
            env,
            account.user_id,
            [details.frontId, details.backId, details.selfieId],
            "identity",
          );
          if (account.kind === "profesional") {
            const photoId = marketProfilePhoto(account);
            requireMarket(photoId, "La foto de perfil es obligatoria para aprobar al profesional.");
            await ownedUploads(env, account.user_id, [photoId], "logo");
          }
        }
        details.review = {
          by: viewer.identity.id,
          at: Date.now(),
          reason: marketText(data.reason ?? "", data.decision === "rechazado" ? 5 : 0, 500),
        };
        const review = env.DB.prepare(
          "UPDATE accounts SET verification = ?,identity_json = ?,version = version + 1,updated_at = ? WHERE user_id = ? AND version = ? AND verification = 'pendiente'",
        ).bind(data.decision, JSON.stringify(details), Date.now(), account.user_id, data.version);
        const results = await env.DB.batch([
          review,
          ...(data.decision === "aprobado" ? rewardReferralStatements(env, account.user_id) : []),
        ]);
        requireMarket(
          results[0].meta.changes === 1,
          "La revisión cambió. Actualizá la pantalla.",
          409,
        );
        return marketJson({ ok: true });
      }
      throw new MarketError("Acción no encontrada.", 404);
    }
    const account = ownAccount(viewer);
    if (path === "/api/market/client-verification" && request.method === "POST") {
      requireMarket(account.kind === "cliente", "Esta verificación es para clientes.", 403);
      const data = await marketBody(request);
      requireMarket(data.consent === true, "Autorizá la revisión privada de tu selfie.");
      requireMarket(
        data.version === account.version,
        "Tu cuenta cambió. Actualizá la pantalla.",
        409,
      );
      const selfie = await clientSelfie(env, account.user_id, data.selfieId),
        now = Date.now();
      const details = JSON.stringify({ clientSelfieId: selfie.id, consentAt: now });
      const results = await env.DB.batch([
        env.DB.prepare(
          "UPDATE accounts SET verification = 'pendiente',identity_json = ?,version = version + 1,updated_at = ? WHERE user_id = ? AND version = ?",
        ).bind(details, now, account.user_id, data.version),
        env.DB.prepare(
          "INSERT INTO uploads (id,owner_id,scope,object_key,mime,created_at) SELECT id,owner_id,'client-selfie',object_key,mime,? FROM client_selfie_uploads WHERE id = ? AND owner_id = ? AND claimed_at IS NULL AND EXISTS (SELECT 1 FROM accounts WHERE user_id = ? AND version = ? AND identity_json = ?) AND NOT EXISTS (SELECT 1 FROM uploads WHERE id = ?)",
        ).bind(
          now,
          selfie.id,
          account.user_id,
          account.user_id,
          data.version + 1,
          details,
          selfie.id,
        ),
        env.DB.prepare(
          "UPDATE client_selfie_uploads SET claimed_at = ? WHERE id = ? AND owner_id = ? AND claimed_at IS NULL AND EXISTS (SELECT 1 FROM uploads WHERE id = ? AND owner_id = ?)",
        ).bind(now, selfie.id, account.user_id, selfie.id, account.user_id),
      ]);
      requireMarket(results[0].meta.changes === 1, "Tu cuenta cambió. Actualizá la pantalla.", 409);
      return marketJson({ ok: true });
    }
    if (path === "/api/market/entitlements" && request.method === "GET")
      return marketJson(
        await marketEntitlements(env, account, (await readMarketConfig(env)).config),
      );
    if (path === "/api/market/referrals") {
      requireMarket(
        account.kind === "profesional",
        "El programa corresponde a cuentas de profesionales.",
        403,
      );
      const { config } = await readMarketConfig(env);
      if (request.method === "GET") {
        const code = await env.DB.prepare("SELECT code FROM referral_codes WHERE owner_id = ?")
          .bind(account.user_id)
          .first();
        const rows =
          (
            await env.DB.prepare(
              "SELECT r.id,r.created_at,r.qualified_at,r.rules_json,w.amount,w.expires_at FROM referrals r LEFT JOIN referral_rewards w ON w.referral_id = r.id WHERE r.referrer_id = ? ORDER BY r.created_at DESC LIMIT 100",
            )
              .bind(account.user_id)
              .all()
          ).results ?? [];
        const referredBy = await env.DB.prepare("SELECT id FROM referrals WHERE referred_id = ?")
          .bind(account.user_id)
          .first();
        const totals = await env.DB.prepare(
          "SELECT COUNT(*) registered,COUNT(qualified_at) qualified FROM referrals WHERE referrer_id = ?",
        )
          .bind(account.user_id)
          .first();
        return marketJson({
          totals,
          code: code?.code ?? null,
          entries: rows.map(({ rules_json, ...row }) => ({
            ...row,
            promisedQuotes: JSON.parse(rules_json).rewardQuotes,
          })),
          hasReferrer: Boolean(referredBy),
          policy: config.referrals,
          entitlements: await marketEntitlements(env, account, config),
        });
      }
      if (request.method === "POST") {
        const data = await marketBody(request);
        if (data.action === "create-code") {
          requireMarket(config.referrals.enabled, "El programa de referidos no está activo.");
          requireMarket(
            account.verification === "aprobado" && marketProfileComplete(account),
            "Completá la revisión del alta antes de invitar profesionales.",
            403,
          );
          await env.DB.prepare(
            "INSERT INTO referral_codes(owner_id,code,created_at) VALUES(?,?,?) ON CONFLICT(owner_id) DO NOTHING",
          )
            .bind(
              account.user_id,
              crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase(),
              Date.now(),
            )
            .run();
          return marketJson({ ok: true });
        }
        if (data.action === "bind") {
          requireMarket(
            account.verification !== "aprobado",
            "El código debe indicarse antes de aprobar el alta.",
          );
          const statement = await referralStatement(
            env,
            viewer.identity,
            account.kind,
            data.code,
            config,
          );
          requireMarket(statement, "Ingresá el código de referido.");
          await statement.run();
          return marketJson({ ok: true });
        }
      }
      throw new MarketError("Acción no encontrada.", 404);
    }
    if (path === "/api/market/account" && request.method === "PATCH") {
      const data = await marketBody(request);
      if (data.action === "enable-services") {
        const { config } = await readMarketConfig(env);
        requireMarket(
          account.kind === "cliente" &&
            ["profesional", "empresa"].includes(data.kind) &&
            marketTrades.includes(data.trade) &&
            activeMarketCities(config).includes(data.cityId),
          "Revisá el tipo de cuenta, oficio y ciudad.",
        );
        await env.DB.prepare(
          "UPDATE accounts SET kind = ?,trade = ?,city_id = ?,verification = 'sin-enviar',version = version + 1,updated_at = ? WHERE user_id = ? AND kind = 'cliente'",
        )
          .bind(data.kind, data.trade, data.cityId, Date.now(), account.user_id)
          .run();
        return marketJson({ ok: true });
      }
      const name = marketText(data.name, 2, 100),
        bio = marketText(data.bio ?? "", 0, 1500),
        phone = marketText(data.phone ?? "", 0, 40);
      const profile = JSON.parse(account.profile_json);
      if (data.paymentMethods !== undefined) {
        const limits = await marketEntitlements(env, account, (await readMarketConfig(env)).config);
        requireMarket(
          account.kind !== "cliente" &&
            Array.isArray(data.paymentMethods) &&
            (data.paymentMethods.length <= limits.maxPaymentMethods ||
              data.paymentMethods.length <= (profile.paymentMethods?.length ?? 0)),
          "Tu plan no permite agregar más métodos de cobro. Revisá el límite vigente.",
        );
        profile.paymentMethods = data.paymentMethods.map((method) => {
          requireMarket(
            ["transferencia", "billetera", "efectivo"].includes(method.kind),
            "Elegí un tipo de cobro válido.",
          );
          const value = marketText(method.value ?? "", method.kind === "efectivo" ? 0 : 3, 100);
          requireMarket(
            method.kind === "efectivo" || /^[A-Za-z0-9._-]+$/.test(value),
            "Usá un alias o CBU válido.",
          );
          return { kind: method.kind, label: marketText(method.label, 2, 60), value };
        });
      }
      let verification = account.verification;
      const identity = JSON.parse(account.identity_json);
      if (account.kind === "profesional") {
        const photoId = data.profilePhotoId ?? data.logoId ?? marketProfilePhoto(account);
        if (data.profilePhotoId !== undefined || data.logoId !== undefined)
          requireMarket(
            typeof photoId === "string" && photoId.trim(),
            "La foto de perfil del profesional es obligatoria.",
          );
        if (photoId) {
          await ownedUploads(env, account.user_id, [photoId], "logo");
          if (
            photoId !== marketProfilePhoto(account) &&
            ["aprobado", "pendiente"].includes(verification)
          ) {
            verification = "pendiente";
            identity.profilePhotoId = photoId;
            delete identity.review;
          }
          profile.profilePhotoId = photoId;
          profile.logoId = photoId;
        }
      } else if (data.logoId) {
        requireMarket(
          account.kind === "empresa",
          "La foto de prestador corresponde a una cuenta profesional.",
          403,
        );
        await ownedUploads(env, account.user_id, [data.logoId], "logo");
        profile.logoId = data.logoId;
      }
      const result = await env.DB.prepare(
        "UPDATE accounts SET name = ?,bio = ?,phone = ?,profile_json = ?,verification = ?,identity_json = ?,version = version + 1,updated_at = ? WHERE user_id = ? AND version = ?",
      )
        .bind(
          name,
          bio,
          phone,
          JSON.stringify(profile),
          verification,
          JSON.stringify(identity),
          Date.now(),
          account.user_id,
          data.version,
        )
        .run();
      requireMarket(result.meta.changes === 1, "El perfil cambió. Actualizá la pantalla.", 409);
      return marketJson({ ok: true });
    }
    if (path === "/api/market/upload" && request.method === "POST") {
      requireMarket(env.BUCKET, "Los archivos no están disponibles.", 503);
      const { file, scope, bytes } = await marketImage(request);
      requireMarket(
        ["identity", "request", "work", "logo"].includes(scope),
        "Elegí un tipo de archivo.",
      );
      requireMarket(
        scope === "request" || account.kind !== "cliente",
        "Este archivo no corresponde a tu cuenta.",
        403,
      );
      const count = await env.DB.prepare("SELECT COUNT(*) AS n FROM uploads WHERE owner_id = ?")
        .bind(account.user_id)
        .first();
      requireMarket(count.n < 200, "Llegaste al límite de archivos de tu cuenta.");
      const id = crypto.randomUUID(),
        key = `${account.user_id}/${id}`;
      await env.BUCKET.put(key, bytes, { httpMetadata: { contentType: file.type } });
      try {
        await env.DB.prepare(
          "INSERT INTO uploads (id,owner_id,scope,object_key,mime,created_at) VALUES (?,?,?,?,?,?)",
        )
          .bind(id, account.user_id, scope, key, file.type, Date.now())
          .run();
      } catch (error) {
        await env.BUCKET.delete(key);
        throw error;
      }
      return marketJson({ id }, 201);
    }
    if (path === "/api/market/identity" && request.method === "POST") {
      requireMarket(account.kind !== "cliente", "La verificación es para prestadores.", 403);
      requireMarket(
        (account.verification !== "aprobado" && account.verification !== "pendiente") ||
          (account.kind === "profesional" && !marketProfilePhoto(account)),
        "Tu identidad ya está enviada.",
        409,
      );
      const data = await marketBody(request);
      requireMarket(
        /^\d{7,8}$/.test(data.dni ?? "") && data.consent === true,
        "Completá el DNI y autorizá la revisión.",
      );
      requireMarket(
        new Set([data.frontId, data.backId, data.selfieId]).size === 3,
        "Cargá frente, dorso y una foto de tu cara.",
      );
      await ownedUploads(
        env,
        account.user_id,
        [data.frontId, data.backId, data.selfieId],
        "identity",
      );
      const profile = JSON.parse(account.profile_json);
      const photoId =
        account.kind === "profesional"
          ? (data.profilePhotoId ?? marketProfilePhoto(account))
          : null;
      if (account.kind === "profesional") {
        requireMarket(
          typeof photoId === "string" && photoId,
          "La foto de perfil es obligatoria para completar el alta profesional.",
        );
        await ownedUploads(env, account.user_id, [photoId], "logo");
        profile.profilePhotoId = photoId;
        profile.logoId = photoId;
      }
      const value = {
        profilePhotoId: photoId,
        dni: data.dni,
        frontId: data.frontId,
        backId: data.backId,
        selfieId: data.selfieId,
        consentAt: Date.now(),
      };
      const submitted = await env.DB.prepare(
        "UPDATE accounts SET verification = 'pendiente',identity_json = ?,profile_json = ?,version = version + 1,updated_at = ? WHERE user_id = ? AND version = ?",
      )
        .bind(
          JSON.stringify(value),
          JSON.stringify(profile),
          Date.now(),
          account.user_id,
          account.version,
        )
        .run();
      requireMarket(
        submitted.meta.changes === 1,
        "Tu perfil cambió. Actualizá y volvé a enviar el alta.",
        409,
      );
      return marketJson({ ok: true });
    }
    if (path === "/api/market/addresses") {
      if (request.method === "GET")
        return marketJson({
          addresses: (
            await marketRows(
              env.DB.prepare(
                "SELECT id,body FROM addresses WHERE owner_id = ? ORDER BY created_at DESC",
              ).bind(account.user_id),
            )
          ).map((r) => ({ id: r.id, ...JSON.parse(r.body) })),
        });
      const data = await marketBody(request);
      if (request.method === "POST") {
        const { config } = await readMarketConfig(env);
        requireMarket(
          activeMarketCities(config).includes(data.cityId) &&
            ["casa", "comercio", "otra"].includes(data.kind),
          "Revisá ciudad y tipo de propiedad.",
        );
        const value = {
          label: marketText(data.label, 2, 60),
          address: marketText(data.address, 6, 200),
          reference: marketText(data.reference ?? "", 0, 200),
          cityId: data.cityId,
          kind: data.kind,
        };
        const id = crypto.randomUUID();
        await env.DB.prepare("INSERT INTO addresses (id,owner_id,body,created_at) VALUES (?,?,?,?)")
          .bind(id, account.user_id, JSON.stringify(value), Date.now())
          .run();
        return marketJson({ id }, 201);
      }
      if (request.method === "DELETE") {
        await env.DB.prepare("DELETE FROM addresses WHERE id = ? AND owner_id = ?")
          .bind(data.id, account.user_id)
          .run();
        return marketJson({ ok: true });
      }
    }
    if (path === "/api/market/jobs") {
      if (request.method === "GET") {
        let rows;
        if (account.kind === "cliente" || url.searchParams.get("scope") === "client")
          rows = await marketRows(
            env.DB.prepare(
              "SELECT body,version FROM jobs WHERE client_id = ? ORDER BY created_at DESC LIMIT 200",
            ).bind(account.user_id),
          );
        else
          rows = await marketRows(
            env.DB.prepare(
              'SELECT body,version FROM jobs WHERE professional_id = ? OR (category = ? AND city_id = ?) OR json_extract(body, "$.assignment.userId") = ? ORDER BY created_at DESC LIMIT 200',
            ).bind(account.user_id, account.trade, account.city_id, account.user_id),
          );
        return marketJson({
          jobs: rows
            .map(marketRow)
            .filter(
              (j) =>
                mayReadJob(account, j) &&
                (url.searchParams.get("scope") !== "provider" || j.clientId !== account.user_id),
            )
            .map((j) => visibleMarketJob(j, account)),
        });
      }
      if (request.method === "POST") {
        const data = await marketBody(request);
        await ownedUploads(env, account.user_id, data.photoIds ?? [], "request");
        const { config } = await readMarketConfig(env);
        const job = createMarketJob(
          data,
          account,
          crypto.randomUUID(),
          Date.now(),
          activeMarketCities(config),
        );
        await env.DB.prepare(
          "INSERT INTO jobs (id,client_id,category,city_id,state,body,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)",
        )
          .bind(
            job.id,
            job.clientId,
            job.category,
            job.cityId,
            job.state,
            JSON.stringify(job),
            job.createdAt,
            job.updatedAt,
          )
          .run();
        return marketJson({ job }, 201);
      }
    }
    const jobPath = path.match(/^\/api\/market\/jobs\/([^/]+)$/);
    if (jobPath) {
      const previous = await readJob(env, jobPath[1]);
      if (request.method === "GET") {
        const visible = visibleMarketJob(previous, account);
        if (previous.clientId === account.user_id && previous.professionalId) {
          const provider = await env.DB.prepare(
            "SELECT profile_json FROM accounts WHERE user_id = ?",
          )
            .bind(previous.professionalId)
            .first();
          visible.paymentMethods = provider
            ? (JSON.parse(provider.profile_json).paymentMethods ?? [])
            : [];
        }
        return marketJson({ job: visible });
      }
      if (request.method === "POST") {
        const data = await marketBody(request);
        if (data.action === "assign") {
          const member = await env.DB.prepare(
            "SELECT * FROM company_members WHERE id = ? AND company_id = ? AND user_id IS NOT NULL",
          )
            .bind(data.memberId, account.user_id)
            .first();
          requireMarket(member, "El integrante debe aceptar su invitación.", 400);
          const memberAccount = await env.DB.prepare(
            "SELECT * FROM accounts WHERE user_id = ? AND verification = 'aprobado'",
          )
            .bind(member.user_id)
            .first();
          requireMarket(
            memberAccount &&
              marketProfileComplete(memberAccount) &&
              member.trade === previous.category,
            "El integrante debe tener identidad aprobada y el oficio correcto.",
          );
          const from = Date.parse(`${data.date}T${data.time}:00-03:00`);
          requireMarket(
            Number.isFinite(from) &&
              from > Date.now() &&
              Number.isInteger(data.minutes) &&
              data.minutes >= 15 &&
              data.minutes <= 480,
            "Elegí un turno futuro de 15 a 480 minutos.",
          );
          const jobs = (
            await marketRows(
              env.DB.prepare(
                "SELECT body,version FROM jobs WHERE professional_id = ? AND state NOT IN ('cancelado','finalizado')",
              ).bind(account.user_id),
            )
          ).map(marketRow);
          requireMarket(
            !jobs.some(
              (j) =>
                j.id !== previous.id &&
                j.assignment?.memberId === member.id &&
                from < j.assignment.at + j.assignment.minutes * 60000 &&
                from + data.minutes * 60000 > j.assignment.at,
            ),
            "El integrante ya tiene un turno en ese horario.",
          );
          data.assignment = {
            memberId: member.id,
            userId: member.user_id,
            name: member.name,
            date: data.date,
            time: data.time,
            minutes: data.minutes,
            at: from,
          };
        }
        const next = changeMarketJob(previous, account, data);
        let result;
        if (data.action === "assign")
          result = await env.DB.prepare(
            `UPDATE jobs SET body = ?,state = ?,professional_id = ?,version = ?,updated_at = ? WHERE id = ? AND version = ? AND NOT EXISTS (SELECT 1 FROM jobs AS other WHERE other.id != ? AND other.state NOT IN ('cancelado','finalizado') AND json_extract(other.body,'$.assignment.userId') = ? AND json_extract(other.body,'$.assignment.at') < ? AND json_extract(other.body,'$.assignment.at') + json_extract(other.body,'$.assignment.minutes') * 60000 > ?)`,
          )
            .bind(
              JSON.stringify(next),
              next.state,
              next.professionalId,
              next.version,
              next.updatedAt,
              next.id,
              previous.version,
              next.id,
              next.assignment.userId,
              next.assignment.at + next.assignment.minutes * 60000,
              next.assignment.at,
            )
            .run();
        else {
          const firstQuote =
            data.action === "quote" &&
            !previous.quotes.some((q) => q.professionalId === account.user_id);
          const limits = firstQuote
            ? await marketEntitlements(env, account, (await readMarketConfig(env)).config)
            : null;
          if (limits && limits.quoteLimit !== null) {
            requireMarket(
              limits.availableQuotes > 0,
              "Alcanzaste el límite mensual de propuestas de tu plan.",
              409,
            );
            result = await env.DB.prepare(
              `UPDATE jobs SET body = ?,state = ?,professional_id = ?,version = ?,updated_at = ? WHERE id = ? AND version = ? AND (SELECT COUNT(*) FROM jobs j,json_each(j.body,'$.quotes') q WHERE json_extract(q.value,'$.professionalId') = ? AND json_extract(q.value,'$.revisions[0].createdAt') >= ? AND json_extract(q.value,'$.revisions[0].createdAt') < ?) < ?`,
            )
              .bind(
                JSON.stringify(next),
                next.state,
                next.professionalId,
                next.version,
                next.updatedAt,
                next.id,
                previous.version,
                account.user_id,
                limits.monthStart,
                limits.monthEnd,
                limits.quoteLimit + limits.bonusQuotes,
              )
              .run();
          } else
            result = await env.DB.prepare(
              "UPDATE jobs SET body = ?,state = ?,professional_id = ?,version = ?,updated_at = ? WHERE id = ? AND version = ?",
            )
              .bind(
                JSON.stringify(next),
                next.state,
                next.professionalId,
                next.version,
                next.updatedAt,
                next.id,
                previous.version,
              )
              .run();
        }
        requireMarket(
          result.meta.changes === 1,
          "Otra persona actualizó este trabajo. Actualizá y volvé a intentar.",
          409,
        );
        return marketJson({ job: visibleMarketJob(next, account) });
      }
    }
    if (path === "/api/market/works") {
      requireMarket(account.kind !== "cliente", "El portafolio es para prestadores.", 403);
      if (request.method === "GET")
        return marketJson({
          works: (
            await marketRows(
              env.DB.prepare(
                "SELECT id,body,published FROM works WHERE owner_id = ? ORDER BY created_at DESC LIMIT 50",
              ).bind(account.user_id),
            )
          ).map((r) => ({ id: r.id, ...JSON.parse(r.body), published: Boolean(r.published) })),
        });
      if (request.method === "POST") {
        const data = await marketBody(request);
        requireMarket(
          /^\d{4}-\d{2}-\d{2}$/.test(data.date ?? "") &&
            Number.isFinite(Date.parse(data.date)) &&
            new Date(`${data.date}T12:00:00Z`).toISOString().slice(0, 10) === data.date &&
            Date.parse(data.date) <= Date.now(),
          "Indicá una fecha de trabajo válida.",
        );
        requireMarket(
          typeof data.clientWork === "boolean" && typeof data.clientConsent === "boolean",
          "Indicá si corresponde autorización del cliente.",
        );
        await ownedUploads(env, account.user_id, [data.beforeId, data.afterId], "work");
        const published = data.published === true;
        requireMarket(
          !published || !data.clientWork || data.clientConsent,
          "Necesitás autorización del cliente para publicar.",
        );
        const value = {
          title: marketText(data.title, 3, 100),
          description: marketText(data.description, 10, 1500),
          date: data.date,
          trade: account.trade,
          beforeId: data.beforeId,
          afterId: data.afterId,
          clientWork: data.clientWork,
          clientConsent: data.clientConsent,
          consentAt: data.clientConsent ? Date.now() : null,
        };
        const id = crypto.randomUUID();
        await env.DB.prepare(
          "INSERT INTO works (id,owner_id,published,body,created_at) VALUES (?,?,?,?,?)",
        )
          .bind(id, account.user_id, published ? 1 : 0, JSON.stringify(value), Date.now())
          .run();
        return marketJson({ id }, 201);
      }
    }
    const workPath = path.match(/^\/api\/market\/works\/([^/]+)$/);
    if (workPath && request.method === "PATCH") {
      const work = await env.DB.prepare("SELECT * FROM works WHERE id = ? AND owner_id = ?")
        .bind(workPath[1], account.user_id)
        .first();
      requireMarket(work, "Trabajo no encontrado.", 404);
      const data = await marketBody(request),
        body = JSON.parse(work.body);
      if (data.clientConsent === true) {
        body.clientConsent = true;
        body.consentAt = Date.now();
      }
      requireMarket(
        typeof data.published === "boolean" &&
          (!data.published || !body.clientWork || body.clientConsent),
        "Necesitás autorización del cliente para publicar.",
      );
      await env.DB.prepare("UPDATE works SET published = ?,body = ? WHERE id = ? AND owner_id = ?")
        .bind(data.published ? 1 : 0, JSON.stringify(body), work.id, account.user_id)
        .run();
      return marketJson({ ok: true });
    }
    if (path === "/api/market/company") {
      requireMarket(account.kind === "empresa", "Esta función es para empresas.", 403);
      if (request.method === "GET")
        return marketJson({
          members: await marketRows(
            env.DB.prepare(
              "SELECT id,email,name,trade,user_id FROM company_members WHERE company_id = ? ORDER BY created_at DESC",
            ).bind(account.user_id),
          ),
        });
      if (request.method === "POST") {
        const data = await marketBody(request),
          email = marketText(data.email, 3, 200).toLowerCase();
        requireMarket(
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && marketTrades.includes(data.trade),
          "Revisá el correo y el oficio.",
        );
        const id = crypto.randomUUID();
        await env.DB.prepare(
          "INSERT INTO company_members (id,company_id,email,name,trade,created_at) VALUES (?,?,?,?,?,?)",
        )
          .bind(id, account.user_id, email, marketText(data.name, 2, 100), data.trade, Date.now())
          .run();
        return marketJson({ id }, 201);
      }
    }
    if (path === "/api/market/company/accept" && request.method === "POST") {
      const data = await marketBody(request);
      requireMarket(
        account.kind === "profesional",
        "La invitación corresponde a una cuenta profesional.",
        403,
      );
      const member = await env.DB.prepare("SELECT * FROM company_members WHERE id = ?")
        .bind(data.id)
        .first();
      requireMarket(
        member && !member.user_id && member.email === viewer.identity.email,
        "La invitación no corresponde a tu cuenta.",
        403,
      );
      await env.DB.prepare(
        "UPDATE company_members SET user_id = ? WHERE id = ? AND user_id IS NULL",
      )
        .bind(account.user_id, member.id)
        .run();
      return marketJson({ ok: true });
    }
    throw new MarketError("Acción no encontrada.", 404);
  } catch (error) {
    if (error instanceof MarketError) return marketJson({ error: error.message }, error.status);
    console.error("market_api_error", error?.name ?? "Error");
    return marketJson({ error: "No pudimos completar la operación. Intentá nuevamente." }, 500);
  }
}
