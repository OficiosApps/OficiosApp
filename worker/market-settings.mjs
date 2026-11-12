import {
  MarketError,
  requireMarket,
  marketText,
  marketProfileComplete,
  marketProfilePhoto,
  marketPoint,
} from "./market-domain.mjs";
export function defaultMarketConfig() {
  return {
    plans: [
      {
        id: "inicial",
        name: "Inicial",
        priceCents: 0,
        published: true,
        quoteLimit: 5,
        maxPaymentMethods: 1,
        benefits: [
          "Perfil y portafolio de trabajos",
          "Presupuestos detallados y mensajes",
          "Seguimiento de tus trabajos",
        ],
      },
      {
        id: "profesional",
        name: "Profesional",
        priceCents: 1000,
        published: true,
        quoteLimit: 30,
        maxPaymentMethods: 3,
        benefits: [
          "Todos los beneficios del plan Inicial",
          "Herramientas para organizar tus servicios",
          "Propuestas y condiciones detalladas",
        ],
      },
      {
        id: "premium",
        name: "Premium",
        priceCents: 2000,
        published: true,
        quoteLimit: null,
        maxPaymentMethods: 6,
        benefits: [
          "Todos los beneficios del plan Profesional",
          "Propuestas sin límite del plan",
          "Portafolio y organización de tus trabajos",
        ],
      },
    ],
    referrals: {
      enabled: false,
      rewardQuotes: 5,
      maxRewardsPerReferrer: 12,
      description:
        "Recibí presupuestos extra por recomendar profesionales que completen su alta y sean aprobados.",
    },
    regions: [
      {
        id: "mercedes-ba",
        name: "Mercedes",
        province: "Buenos Aires",
        status: "activa",
        center: { lat: -34.65, lng: -59.43 },
      },
      {
        id: "lujan-ba",
        name: "Luján",
        province: "Buenos Aires",
        status: "preparacion",
        center: { lat: -34.57, lng: -59.1 },
      },
      {
        id: "chivilcoy-ba",
        name: "Chivilcoy",
        province: "Buenos Aires",
        status: "preparacion",
        center: { lat: -34.9, lng: -60.02 },
      },
      {
        id: "caba-ar",
        name: "Capital Federal (CABA)",
        province: "Ciudad Autónoma de Buenos Aires",
        status: "preparacion",
        center: { lat: -34.6037, lng: -58.3816 },
      },
    ],
  };
}
export async function readMarketConfig(env) {
  const row = await env.DB.prepare(
    "SELECT * FROM market_settings WHERE setting_key = 'commercial'",
  ).first();
  return row
    ? { config: JSON.parse(row.body), version: row.version, updatedAt: row.updated_at }
    : { config: defaultMarketConfig(), version: 0, updatedAt: null };
}
export function activeMarketCities(config) {
  return config.regions.filter((r) => r.status === "activa").map((r) => r.id);
}
export function publicMarketConfig(config) {
  return {
    plans: config.plans.filter((p) => p.published),
    regions: config.regions.filter((r) => r.status === "activa"),
    referrals: config.referrals,
    billingEnabled: false,
  };
}
export function validateMarketConfig(input, previous) {
  requireMarket(
    input && Array.isArray(input.plans) && input.plans.length === 3,
    "Conservá los tres planes de la plataforma.",
  );
  const plans = ["inicial", "profesional", "premium"].map((id) => {
    const p = input.plans.find((p) => p.id === id);
    requireMarket(p, "Falta uno de los planes.");
    requireMarket(
      Number.isInteger(p.priceCents) && p.priceCents >= 0 && p.priceCents <= 10000000,
      "El precio debe ser un importe válido en USD.",
    );
    requireMarket(
      typeof p.published === "boolean" && (id !== "inicial" || p.published),
      "El plan Inicial debe permanecer disponible.",
    );
    requireMarket(
      id !== "inicial" || p.priceCents === 0,
      "El plan Inicial se mantiene gratuito. Podés modificar los precios de los planes pagos.",
    );
    requireMarket(
      p.quoteLimit === null ||
        (Number.isInteger(p.quoteLimit) && p.quoteLimit >= 1 && p.quoteLimit <= 10000),
      "El límite mensual debe ser de 1 a 10.000 o sin límite.",
    );
    requireMarket(
      Number.isInteger(p.maxPaymentMethods) &&
        p.maxPaymentMethods >= 1 &&
        p.maxPaymentMethods <= 10,
      "Indicá entre 1 y 10 métodos de cobro.",
    );
    const benefits = Array.isArray(p.benefits)
      ? p.benefits.filter((text) => typeof text === "string" && text.trim())
      : [];
    requireMarket(
      benefits.length >= 1 && benefits.length <= 12,
      "Incluí entre uno y doce beneficios por plan.",
    );
    return {
      id,
      name: marketText(p.name, 2, 60),
      priceCents: p.priceCents,
      published: p.published,
      quoteLimit: p.quoteLimit,
      maxPaymentMethods: p.maxPaymentMethods,
      benefits: benefits.map((text) => marketText(text, 2, 160)),
    };
  });
  const r = input.referrals;
  requireMarket(
    r &&
      typeof r.enabled === "boolean" &&
      Number.isInteger(r.rewardQuotes) &&
      r.rewardQuotes >= 1 &&
      r.rewardQuotes <= 500 &&
      Number.isInteger(r.maxRewardsPerReferrer) &&
      r.maxRewardsPerReferrer >= 1 &&
      r.maxRewardsPerReferrer <= 1000,
    "Revisá la recompensa y el máximo de referidos.",
  );
  requireMarket(
    Array.isArray(input.regions) && input.regions.length >= 1 && input.regions.length <= 100,
    "Podés gestionar hasta cien zonas.",
  );
  const ids = new Set();
  const regions = input.regions.map((region) => {
    requireMarket(
      typeof region.id === "string" &&
        /^[a-z0-9][a-z0-9-]{1,79}$/.test(region.id) &&
        !ids.has(region.id),
      "Cada zona debe tener un identificador único.",
    );
    ids.add(region.id);
    requireMarket(
      ["preparacion", "activa", "pausada"].includes(region.status),
      "Elegí el estado de cada zona.",
    );
    return {
      id: region.id,
      name: marketText(region.name, 2, 100),
      province: marketText(region.province, 2, 100),
      status: region.status,
      center: marketPoint(region.center),
    };
  });
  for (const old of previous.regions)
    requireMarket(
      ids.has(old.id),
      "No elimines zonas con historial: dejalas pausadas o en preparación.",
    );
  return {
    plans,
    referrals: {
      enabled: r.enabled,
      rewardQuotes: r.rewardQuotes,
      maxRewardsPerReferrer: r.maxRewardsPerReferrer,
      description: marketText(r.description, 5, 500),
    },
    regions,
  };
}
export function marketMonth(now = Date.now()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Buenos_Aires",
      year: "numeric",
      month: "2-digit",
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  return {
    key: `${parts.year}-${parts.month}`,
    start: Date.parse(`${parts.year}-${parts.month}-01T00:00:00-03:00`),
    end: Date.UTC(Number(parts.year), Number(parts.month), 1, 3),
  };
}
export async function marketEntitlements(env, account, config, now = Date.now()) {
  const plan =
    account.kind === "profesional"
      ? config.plans.find((p) => p.id === "inicial")
      : { id: null, name: "Empresa", quoteLimit: null, maxPaymentMethods: 6 };
  const month = marketMonth(now);
  const used = await env.DB.prepare(
    `SELECT COUNT(*) AS n FROM jobs j, json_each(j.body,'$.quotes') q WHERE json_extract(q.value,'$.professionalId') = ? AND json_extract(q.value,'$.revisions[0].createdAt') >= ? AND json_extract(q.value,'$.revisions[0].createdAt') < ?`,
  )
    .bind(account.user_id, month.start, month.end)
    .first();
  const bonus = await env.DB.prepare(
    "SELECT COALESCE(SUM(amount),0) AS n FROM referral_rewards WHERE owner_id = ? AND expires_at > ? AND month_key = ?",
  )
    .bind(account.user_id, now, month.key)
    .first();
  return {
    planId: plan.id,
    planName: plan.name,
    quoteLimit: plan.quoteLimit,
    usedQuotes: used.n,
    bonusQuotes: bonus.n,
    availableQuotes:
      plan.quoteLimit === null ? null : Math.max(0, plan.quoteLimit + bonus.n - used.n),
    maxPaymentMethods: plan.maxPaymentMethods,
    month: month.key,
    monthStart: month.start,
    monthEnd: month.end,
  };
}
export async function referralStatement(env, identity, kind, code, config, now = Date.now()) {
  if (!code) return null;
  requireMarket(kind === "profesional", "El referido corresponde al alta de un profesional.");
  requireMarket(config.referrals.enabled, "El programa de referidos no está activo.");
  const normalized = marketText(code, 6, 40).toUpperCase();
  const owner = await env.DB.prepare(
    "SELECT a.*,c.code FROM referral_codes c JOIN accounts a ON a.user_id = c.owner_id WHERE c.code = ?",
  )
    .bind(normalized)
    .first();
  requireMarket(
    owner &&
      owner.kind === "profesional" &&
      owner.verification === "aprobado" &&
      marketProfileComplete(owner),
    "El código de referido no está disponible.",
  );
  requireMarket(
    owner.user_id !== identity.id && owner.email !== identity.email,
    "No podés referirte a vos mismo.",
  );
  requireMarket(
    !(await env.DB.prepare("SELECT id FROM referrals WHERE referred_id = ?")
      .bind(identity.id)
      .first()),
    "Esta cuenta ya tiene un referente.",
    409,
  );
  const count = await env.DB.prepare("SELECT COUNT(*) n FROM referral_rewards WHERE owner_id = ?")
    .bind(owner.user_id)
    .first();
  requireMarket(
    count.n < config.referrals.maxRewardsPerReferrer,
    "Ese referente ya alcanzó el máximo de recompensas.",
  );
  return env.DB.prepare(
    "INSERT INTO referrals(id,referrer_id,referred_id,rules_json,created_at) VALUES(?,?,?,?,?)",
  ).bind(
    crypto.randomUUID(),
    owner.user_id,
    identity.id,
    JSON.stringify({ ...config.referrals }),
    now,
  );
}
export function rewardReferralStatements(env, referredId, now = Date.now()) {
  const month = marketMonth(now);
  return [
    env.DB.prepare(
      `INSERT OR IGNORE INTO referral_rewards(referral_id,owner_id,amount,month_key,expires_at,created_at) SELECT r.id,r.referrer_id,json_extract(r.rules_json,'$.rewardQuotes'),?,?,? FROM referrals r JOIN accounts a ON a.user_id = r.referred_id WHERE r.referred_id = ? AND a.verification = 'aprobado' AND (SELECT COUNT(*) FROM referral_rewards existing WHERE existing.owner_id = r.referrer_id) < json_extract(r.rules_json,'$.maxRewardsPerReferrer')`,
    ).bind(month.key, month.end, now, referredId),
    env.DB.prepare(
      "UPDATE referrals SET qualified_at = COALESCE(qualified_at,?) WHERE referred_id = ? AND EXISTS(SELECT 1 FROM accounts WHERE user_id = ? AND verification = 'aprobado')",
    ).bind(now, referredId, referredId),
  ];
}
const settingsJson = (body, status = 200) =>
  Response.json(body, {
    status,
    headers: { "cache-control": "no-store", "x-content-type-options": "nosniff" },
  });
export async function handleCeo(request, env, viewer, bodyReader) {
  requireMarket(viewer.staffRole === "ceo", "Esta gestión está reservada al CEO.", 403);
  const url = new URL(request.url),
    path = url.pathname.replace(/\/$/, "");
  const stored = await readMarketConfig(env);
  if (path === "/api/market/ceo/config" && request.method === "GET") {
    const audit =
      (
        await env.DB.prepare(
          "SELECT id,actor_id,action,entity_id,created_at FROM commercial_audit ORDER BY created_at DESC LIMIT 30",
        ).all()
      ).results ?? [];
    const rewards = await env.DB.prepare(
      "SELECT COUNT(*) n,COALESCE(SUM(amount),0) total FROM referral_rewards",
    ).first();
    const referrals = await env.DB.prepare(
      "SELECT COUNT(*) n,COUNT(qualified_at) qualified FROM referrals",
    ).first();
    return settingsJson({
      ...stored,
      audit,
      referralMetrics: {
        registered: referrals.n,
        qualified: referrals.qualified,
        rewards: rewards.n,
        bonusQuotes: rewards.total,
      },
    });
  }
  const regionPath = path.match(/^\/api\/market\/ceo\/regions\/([^/]+)\/status$/);
  if (
    (path === "/api/market/ceo/config" && request.method === "PUT") ||
    (regionPath && request.method === "PATCH")
  ) {
    const input = await bodyReader(request);
    requireMarket(
      input.version === stored.version,
      "La configuración cambió. Actualizá antes de guardar.",
      409,
    );
    let candidate = input.config,
      action = "commercial-settings",
      entityId = "commercial",
      before = stored.config;
    if (regionPath) {
      requireMarket(
        typeof input.active === "boolean",
        "Indicá si la ciudad está de alta o de baja.",
      );
      const region = stored.config.regions.find((r) => r.id === regionPath[1]);
      requireMarket(region, "La ciudad no existe.", 404);
      action = "region-status";
      entityId = region.id;
      before = region;
      candidate = {
        ...stored.config,
        regions: stored.config.regions.map((r) =>
          r.id === region.id ? { ...r, status: input.active ? "activa" : "pausada" } : r,
        ),
      };
    }
    const config = validateMarketConfig(candidate, stored.config),
      now = Date.now(),
      token = crypto.randomUUID();
    const results = await env.DB.batch([
      env.DB.prepare(
        "INSERT INTO market_settings(setting_key,body,version,update_token,updated_by,updated_at) VALUES('commercial',?,?,?,?,?) ON CONFLICT(setting_key) DO UPDATE SET body = excluded.body,version = excluded.version,update_token = excluded.update_token,updated_by = excluded.updated_by,updated_at = excluded.updated_at WHERE market_settings.version = ?",
      ).bind(
        JSON.stringify(config),
        stored.version + 1,
        token,
        viewer.identity.id,
        now,
        stored.version,
      ),
      env.DB.prepare(
        "INSERT INTO commercial_audit(id,actor_id,action,entity_id,before_json,after_json,created_at) SELECT ?,?,?,?,?,?,? FROM market_settings WHERE setting_key = 'commercial' AND update_token = ?",
      ).bind(
        token,
        viewer.identity.id,
        action,
        entityId,
        JSON.stringify(before),
        JSON.stringify(regionPath ? config.regions.find((r) => r.id === entityId) : config),
        now,
        token,
      ),
    ]);
    requireMarket(
      results[0].meta.changes === 1,
      "Otra persona actualizó la configuración. Volvé a cargarla.",
      409,
    );
    return settingsJson({ config, version: stored.version + 1, updatedAt: now });
  }
  if (path === "/api/market/ceo/orders" && request.method === "GET") {
    const rows =
      (
        await env.DB.prepare(
          "SELECT body,version FROM jobs ORDER BY created_at DESC LIMIT 500",
        ).all()
      ).results ?? [];
    const count = await env.DB.prepare("SELECT COUNT(*) n FROM jobs").first();
    const orders = rows.map((r) => {
      const j = JSON.parse(r.body);
      return {
        id: j.id,
        version: r.version,
        service: j.service,
        category: j.category,
        cityId: j.cityId,
        state: j.state,
        address: j.address,
        clientName: j.clientName,
        when: j.when,
        location: j.location ?? null,
        createdAt: j.createdAt,
      };
    });
    return settingsJson({ orders, total: count.n, limit: 500 });
  }
  const pointPath = path.match(/^\/api\/market\/ceo\/orders\/([^/]+)\/location$/);
  if (pointPath && request.method === "PATCH") {
    const input = await bodyReader(request),
      row = await env.DB.prepare("SELECT body,version FROM jobs WHERE id = ?")
        .bind(pointPath[1])
        .first();
    requireMarket(row, "Pedido no encontrado.", 404);
    requireMarket(
      row.version === input.version,
      "El pedido cambió. Actualizá y volvé a intentar.",
      409,
    );
    const job = JSON.parse(row.body),
      old = job.location ?? null,
      now = Date.now(),
      token = crypto.randomUUID();
    job.location = { ...marketPoint(input.location), source: "ceo", editId: token };
    job.version = row.version + 1;
    job.updatedAt = now;
    const results = await env.DB.batch([
      env.DB.prepare(
        "UPDATE jobs SET body = ?,version = ?,updated_at = ? WHERE id = ? AND version = ?",
      ).bind(JSON.stringify(job), job.version, now, job.id, row.version),
      env.DB.prepare(
        "INSERT INTO commercial_audit(id,actor_id,action,entity_id,before_json,after_json,created_at) SELECT ?,?,'order-location',?,?,?,? FROM jobs WHERE id = ? AND json_extract(body,'$.location.editId') = ?",
      ).bind(
        token,
        viewer.identity.id,
        job.id,
        JSON.stringify(old),
        JSON.stringify(job.location),
        now,
        job.id,
        token,
      ),
    ]);
    requireMarket(results[0].meta.changes === 1, "Otra persona actualizó este pedido.", 409);
    return settingsJson({ ok: true });
  }
  throw new MarketError("Acción no encontrada.", 404);
}
