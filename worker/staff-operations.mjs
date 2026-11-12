import { MarketError, requireMarket, marketText } from "./market-domain.mjs";
import { readMarketConfig } from "./market-settings.mjs";
import { staffMailStatus } from "./staff-mail.mjs";

const opsJson = (data, status = 200) =>
  Response.json(data, {
    status,
    headers: { "cache-control": "no-store", "x-content-type-options": "nosniff" },
  });
const opsRows = async (statement) => (await statement.all()).results || [];
const opsPriorities = ["baja", "media", "alta", "critica"];
const opsCaseStates = ["nuevo", "en_curso", "escalado", "resuelto"];
const opsCategories = [
  "reclamo",
  "contratacion",
  "verificacion",
  "perfil",
  "pago",
  "tecnico",
  "seguimiento",
];
const opsSupervisor = (viewer) => ["ceo", "superadmin"].includes(viewer.staffRole);
const opsActor = (viewer) => viewer.identity.name || viewer.identity.email;
function opsVersion(value) {
  requireMarket(
    Number.isInteger(value) && value >= 0,
    "Actualizá los datos antes de guardar.",
    409,
  );
  return value;
}
function opsPage(url) {
  const value = Number(url.searchParams.get("page") || 1);
  return Number.isInteger(value) && value > 0 && value <= 100000 ? value : 1;
}
function opsQuery(url) {
  return (url.searchParams.get("q") || "").trim().slice(0, 100);
}
function opsCity(url) {
  return (url.searchParams.get("city") || "").slice(0, 80);
}
export async function profileIsHidden(env, id) {
  return Boolean(
    (
      await env.DB.prepare("SELECT hidden FROM operations_profile_controls WHERE user_id = ?")
        .bind(id)
        .first()
    )?.hidden,
  );
}
export function operationsAuditStatement(env, viewer, action, type, id, summary, guard = null) {
  const values = [
    crypto.randomUUID(),
    viewer.identity.id,
    opsActor(viewer),
    viewer.staffRole,
    action,
    type,
    id,
    summary,
    Date.now(),
  ];
  return env.DB.prepare(
    `INSERT INTO operations_audit(id,actor_id,actor_name,actor_role,action,entity_type,entity_id,summary,created_at) SELECT ?,?,?,?,?,?,?,?,?${guard ? " WHERE " + guard.sql : ""}`,
  ).bind(...values, ...(guard?.values || []));
}
async function opsSettings(env) {
  const row = await env.DB.prepare(
    "SELECT * FROM operations_settings WHERE id = 'service'",
  ).first();
  return { config: JSON.parse(row.body), version: row.version };
}
async function opsAssignees(env, viewer) {
  const list = await opsRows(
    env.DB.prepare(
      `SELECT s.user_id AS id,COALESCE((SELECT i.email FROM staff_invites i WHERE i.used_by=s.user_id ORDER BY i.created_at DESC LIMIT 1),s.user_id) AS name FROM staff s LEFT JOIN staff_access_controls c ON c.user_id=s.user_id WHERE s.role='admin' AND COALESCE(c.paused,0)=0${viewer.staffRole === "superadmin" ? " AND s.invited_by = ?" : ""} ORDER BY name`,
    ).bind(...(viewer.staffRole === "superadmin" ? [viewer.identity.id] : [])),
  );
  return [
    { id: viewer.identity.id, name: opsActor(viewer) + " (yo)" },
    ...list.filter((x) => x.id !== viewer.identity.id),
  ];
}
async function opsCanAssign(env, viewer, id) {
  if (id === viewer.identity.id) return true;
  if (!opsSupervisor(viewer)) return false;
  return (await opsAssignees(env, viewer)).some((x) => x.id === id);
}
function opsCaseVisible(viewer, row) {
  return opsSupervisor(viewer) || !row.assignee_id || row.assignee_id === viewer.identity.id;
}
function opsAcceptedValue(job) {
  const quote = (job.quotes || []).find((q) => q.id === job.acceptedQuoteId);
  const revision = quote?.revisions?.find((r) => r.version === quote.acceptedVersion);
  return revision ? revision.labor + revision.materials + revision.visit : 0;
}
function opsJob(row) {
  const job = JSON.parse(row.body);
  return {
    id: row.id,
    version: row.version,
    service: job.service,
    category: row.category,
    cityId: row.city_id,
    state: row.state,
    clientId: row.client_id,
    clientName: row.client_name || job.clientName,
    professionalId: row.professional_id,
    professionalName: row.professional_name || job.professionalName,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    quoteCount: job.quotes?.length || 0,
    acceptedValue: opsAcceptedValue(job),
    when: job.when,
    visit: job.visit || null,
  };
}
async function opsSummary(env, viewer, url) {
  const days = [7, 30, 90].includes(Number(url.searchParams.get("days")))
    ? Number(url.searchParams.get("days"))
    : 30;
  const since = Date.now() - days * 86400000,
    city = opsCity(url),
    filter = city ? " AND city_id = ?" : "",
    params = city ? [since, city] : [since];
  const totals = await env.DB.prepare(
    `SELECT COUNT(*) requests,COALESCE(SUM(json_array_length(body,'$.quotes')>0),0) responded,COALESCE(SUM(EXISTS(SELECT 1 FROM json_each(body,'$.events') e WHERE json_extract(e.value,'$.state')='contratado')),0) hired,COALESCE(SUM(state='finalizado'),0) completed,COALESCE(SUM(state='cancelado'),0) cancelled FROM jobs WHERE created_at >= ?${filter}`,
  )
    .bind(...params)
    .first();
  const money = await env.DB.prepare(
    `SELECT COALESCE(SUM(json_extract(r.value,'$.labor')+json_extract(r.value,'$.materials')+json_extract(r.value,'$.visit')),0) amount FROM jobs j,json_each(j.body,'$.quotes') q,json_each(q.value,'$.revisions') r WHERE j.created_at>=? AND j.state!='cancelado' AND json_extract(q.value,'$.id')=json_extract(j.body,'$.acceptedQuoteId') AND json_extract(r.value,'$.version')=json_extract(q.value,'$.acceptedVersion')${city ? " AND j.city_id=?" : ""}`,
  )
    .bind(...params)
    .first();
  const accounts = await env.DB.prepare(
    `SELECT COUNT(*) total,COALESCE(SUM(kind='cliente'),0) clients,COALESCE(SUM(kind='profesional'),0) professionals,COALESCE(SUM(kind='empresa'),0) companies,COALESCE(SUM(verification='pendiente'),0) pending FROM accounts${city ? " WHERE city_id=?" : ""}`,
  )
    .bind(...(city ? [city] : []))
    .first();
  const settings = await opsSettings(env);
  const alerts = await env.DB.prepare(
    `SELECT COUNT(*) n FROM jobs WHERE state='solicitado' AND json_array_length(body,'$.quotes')=0 AND created_at < ?${filter}`,
  )
    .bind(Date.now() - settings.config.unansweredHours * 3600000, ...(city ? [city] : []))
    .first();
  const scope = opsSupervisor(viewer) ? "" : " AND (assignee_id=? OR assignee_id IS NULL)";
  const cases = await env.DB.prepare(
    `SELECT COUNT(*) total,COALESCE(SUM(status!='resuelto'),0) open,COALESCE(SUM(status!='resuelto' AND due_at<?),0) overdue,COALESCE(SUM(status='escalado'),0) escalated,COALESCE(SUM(status='nuevo' AND created_at<?),0) waiting FROM operations_cases WHERE 1=1${city ? " AND city_id=?" : ""}${scope}`,
  )
    .bind(
      Date.now(),
      Date.now() - settings.config.responseHours * 3600000,
      ...(city ? [city] : []),
      ...(opsSupervisor(viewer) ? [] : [viewer.identity.id]),
    )
    .first();
  const response = await env.DB.prepare(
    `SELECT AVG((SELECT MIN(json_extract(q.value,'$.revisions[0].createdAt')) FROM json_each(j.body,'$.quotes') q)-j.created_at) ms FROM jobs j WHERE j.created_at>=? AND json_array_length(j.body,'$.quotes')>0${city ? " AND j.city_id=?" : ""}`,
  )
    .bind(...params)
    .first();
  const returning = await env.DB.prepare(
    `SELECT COUNT(*) n FROM (SELECT client_id FROM jobs j WHERE state!='cancelado' AND EXISTS(SELECT 1 FROM json_each(j.body,'$.events') e WHERE json_extract(e.value,'$.state')='contratado')${city ? " AND city_id=?" : ""} GROUP BY client_id HAVING COUNT(*)>1 AND MAX(created_at)>=?)`,
  )
    .bind(...(city ? [city] : []), since)
    .first();
  const { config } = await readMarketConfig(env);
  return {
    days,
    city,
    totals,
    acceptedValue: money.amount,
    accounts,
    cases,
    unanswered: alerts.n,
    responseMs: response.ms,
    returning: returning.n,
    regions: config.regions,
    settings: settings.config,
    generatedAt: Date.now(),
  };
}

export async function handleStaffOperations(request, env, viewer, readBody) {
  requireMarket(
    ["ceo", "superadmin", "admin"].includes(viewer.staffRole),
    "No tenés acceso a la operación.",
    403,
  );
  const url = new URL(request.url),
    path = url.pathname.replace(/\/$/, "").replace("/api/market/staff/operations", "");
  if (path === "/summary" && request.method === "GET")
    return opsJson(await opsSummary(env, viewer, url));
  if (path === "/accounts" && request.method === "GET") {
    const q = opsQuery(url),
      city = opsCity(url),
      kind = url.searchParams.get("kind") || "",
      verification = url.searchParams.get("verification") || "",
      page = opsPage(url);
    const conditions = ["1=1"],
      values = [];
    if (q) {
      conditions.push("(a.name LIKE ? OR a.email LIKE ? OR a.phone LIKE ?)");
      values.push(...Array(3).fill("%" + q + "%"));
    }
    if (city) {
      conditions.push("a.city_id=?");
      values.push(city);
    }
    if (["cliente", "profesional", "empresa"].includes(kind)) {
      conditions.push("a.kind=?");
      values.push(kind);
    } else if (kind === "providers") conditions.push("a.kind!='cliente'");
    if (["pendiente", "aprobado", "rechazado", "sin-enviar"].includes(verification)) {
      conditions.push("a.verification=?");
      values.push(verification);
    }
    const where = conditions.join(" AND "),
      count = await env.DB.prepare("SELECT COUNT(*) total FROM accounts a WHERE " + where)
        .bind(...values)
        .first();
    const rows = await opsRows(
      env.DB.prepare(
        `SELECT a.user_id id,a.email,a.name,a.kind,a.city_id cityId,a.trade,a.phone,a.verification,a.created_at createdAt,COALESCE(c.hidden,0) hidden,COALESCE(c.version,0) controlVersion,c.reason moderationReason,(SELECT COUNT(*) FROM jobs j WHERE j.professional_id=a.user_id AND j.state='finalizado') completedJobs,(SELECT COUNT(*) FROM jobs j WHERE j.client_id=a.user_id) requests FROM accounts a LEFT JOIN operations_profile_controls c ON c.user_id=a.user_id WHERE ${where} ORDER BY a.updated_at DESC,a.user_id LIMIT 30 OFFSET ?`,
      ).bind(...values, (page - 1) * 30),
    );
    return opsJson({ items: rows, total: count.total, page, pageSize: 30 });
  }
  if (path === "/jobs" && request.method === "GET") {
    const q = opsQuery(url),
      city = opsCity(url),
      state = url.searchParams.get("state"),
      page = opsPage(url),
      conditions = ["1=1"],
      values = [];
    if (q) {
      conditions.push("(j.id LIKE ? OR json_extract(j.body,'$.service') LIKE ? OR a.name LIKE ?)");
      values.push(...Array(3).fill("%" + q + "%"));
    }
    if (city) {
      conditions.push("j.city_id=?");
      values.push(city);
    }
    if (
      [
        "solicitado",
        "presupuestado",
        "contratado",
        "visita_confirmada",
        "en_curso",
        "finalizado",
        "cancelado",
      ].includes(state)
    ) {
      conditions.push("j.state=?");
      values.push(state);
    }
    if (url.searchParams.get("attention") === "1") {
      const { config } = await opsSettings(env);
      conditions.push(
        "j.state='solicitado' AND json_array_length(j.body,'$.quotes')=0 AND j.created_at<?",
      );
      values.push(Date.now() - config.unansweredHours * 3600000);
    }
    const where = conditions.join(" AND "),
      from =
        " FROM jobs j JOIN accounts a ON a.user_id=j.client_id LEFT JOIN accounts p ON p.user_id=j.professional_id";
    const count = await env.DB.prepare("SELECT COUNT(*) total" + from + " WHERE " + where)
      .bind(...values)
      .first();
    const rows = await opsRows(
      env.DB.prepare(
        "SELECT j.*,a.name client_name,p.name professional_name" +
          from +
          " WHERE " +
          where +
          " ORDER BY j.updated_at DESC,j.id LIMIT 30 OFFSET ?",
      ).bind(...values, (page - 1) * 30),
    );
    return opsJson({ items: rows.map(opsJob), total: count.total, page, pageSize: 30 });
  }
  const jobPath = path.match(/^\/jobs\/([^/]+)$/);
  if (jobPath && request.method === "GET") {
    const row = await env.DB.prepare(
      "SELECT j.*,a.name client_name,p.name professional_name FROM jobs j JOIN accounts a ON a.user_id=j.client_id LEFT JOIN accounts p ON p.user_id=j.professional_id WHERE j.id=?",
    )
      .bind(decodeURIComponent(jobPath[1]))
      .first();
    requireMarket(row, "Solicitud no encontrada.", 404);
    const body = JSON.parse(row.body);
    return opsJson({
      job: {
        ...opsJob(row),
        description: body.description,
        address: body.address,
        contact: body.contact,
        events: body.events,
        visit: body.visit,
        cancellationReason: body.cancellationReason,
      },
    });
  }
  if (path === "/regions" && request.method === "GET") {
    const { config } = await readMarketConfig(env);
    const accounts = await opsRows(
      env.DB.prepare(
        "SELECT city_id,COALESCE(SUM(kind='cliente'),0) clients,COALESCE(SUM(kind!='cliente' AND verification='aprobado'),0) providers,COALESCE(SUM(verification='pendiente'),0) pending FROM accounts GROUP BY city_id",
      ),
    );
    const jobs = await opsRows(
      env.DB.prepare(
        "SELECT city_id,COUNT(*) requests,COALESCE(SUM(state='finalizado'),0) completed,COALESCE(SUM(state='solicitado' AND json_array_length(body,'$.quotes')=0),0) unanswered FROM jobs GROUP BY city_id",
      ),
    );
    return opsJson({
      regions: config.regions.map((r) => ({
        ...r,
        ...accounts.find((a) => a.city_id === r.id),
        ...jobs.find((j) => j.city_id === r.id),
      })),
      plans: config.plans.map((p) => ({
        id: p.id,
        name: p.name,
        priceCents: p.priceCents,
        published: p.published,
      })),
    });
  }
  if (path === "/cases" && request.method === "GET") {
    const q = opsQuery(url),
      city = opsCity(url),
      state = url.searchParams.get("status"),
      priority = url.searchParams.get("priority"),
      page = opsPage(url),
      conditions = ["1=1"],
      values = [];
    if (!opsSupervisor(viewer)) {
      conditions.push("(c.assignee_id=? OR c.assignee_id IS NULL)");
      values.push(viewer.identity.id);
    }
    if (q) {
      conditions.push("(c.title LIKE ? OR c.id LIKE ? OR a.name LIKE ?)");
      values.push(...Array(3).fill("%" + q + "%"));
    }
    if (city) {
      conditions.push("c.city_id=?");
      values.push(city);
    }
    if (opsCaseStates.includes(state)) {
      conditions.push("c.status=?");
      values.push(state);
    }
    if (state === "abiertos" || state === "vencidos") conditions.push("c.status!='resuelto'");
    if (state === "vencidos") {
      conditions.push("c.due_at<?");
      values.push(Date.now());
    }
    if (opsPriorities.includes(priority)) {
      conditions.push("c.priority=?");
      values.push(priority);
    }
    if (url.searchParams.get("mine") === "1") {
      conditions.push("c.assignee_id=?");
      values.push(viewer.identity.id);
    }
    const where = conditions.join(" AND "),
      from = " FROM operations_cases c LEFT JOIN accounts a ON a.user_id=c.account_id";
    const count = await env.DB.prepare("SELECT COUNT(*) total" + from + " WHERE " + where)
      .bind(...values)
      .first();
    const rows = await opsRows(
      env.DB.prepare(
        "SELECT c.*,a.name account_name,(SELECT i.email FROM staff_invites i WHERE i.used_by=c.assignee_id ORDER BY i.created_at DESC LIMIT 1) assignee_name" +
          from +
          ` WHERE ${where} ORDER BY (c.status='resuelto'),CASE c.priority WHEN 'critica' THEN 0 WHEN 'alta' THEN 1 WHEN 'media' THEN 2 ELSE 3 END,c.due_at,c.id LIMIT 30 OFFSET ?`,
      ).bind(...values, (page - 1) * 30),
    );
    return opsJson({
      items: rows,
      total: count.total,
      page,
      pageSize: 30,
      viewerId: viewer.identity.id,
      assignees: opsSupervisor(viewer)
        ? await opsAssignees(env, viewer)
        : [{ id: viewer.identity.id, name: opsActor(viewer) }],
      categories: opsCategories,
    });
  }
  if (path === "/cases" && request.method === "POST") {
    const data = await readBody(request);
    requireMarket(JSON.stringify(data).length < 12000, "El caso es demasiado largo.");
    const title = marketText(data.title, 5, 120),
      description = marketText(data.description, 10, 2500),
      category = data.category || "seguimiento",
      priority = data.priority || "media";
    requireMarket(
      opsCategories.includes(category) && opsPriorities.includes(priority),
      "Elegí tipo y prioridad válidos.",
    );
    let city = typeof data.cityId === "string" ? data.cityId.slice(0, 80) : "",
      accountId = data.accountId || null,
      jobId = data.jobId || null;
    if (jobId) {
      const job = await env.DB.prepare("SELECT * FROM jobs WHERE id=?")
        .bind(marketText(jobId, 1, 100))
        .first();
      requireMarket(job, "La solicitud no existe.", 404);
      city = job.city_id;
      const body = JSON.parse(job.body);
      if (accountId)
        requireMarket(
          [
            job.client_id,
            job.professional_id,
            ...body.quotes.map((q) => q.professionalId),
          ].includes(accountId),
          "La persona no participa en esa solicitud.",
        );
      else accountId = job.client_id;
    }
    if (accountId) {
      const a = await env.DB.prepare("SELECT city_id FROM accounts WHERE user_id=?")
        .bind(marketText(accountId, 1, 350))
        .first();
      requireMarket(a, "La cuenta no existe.", 404);
      if (!city) city = a.city_id;
    }
    const { config } = await readMarketConfig(env);
    requireMarket(
      config.regions.some((r) => r.id === city),
      "Elegí una zona existente.",
    );
    const assignee = opsSupervisor(viewer) ? data.assigneeId || null : viewer.identity.id;
    if (assignee)
      requireMarket(
        await opsCanAssign(env, viewer, assignee),
        "No podés asignar ese responsable.",
        403,
      );
    const settings = await opsSettings(env),
      now = Date.now(),
      id = crypto.randomUUID(),
      status =
        !opsSupervisor(viewer) && priority === "critica"
          ? "escalado"
          : assignee
            ? "en_curso"
            : "nuevo";
    const created = await env.DB.batch([
      env.DB.prepare(
        "INSERT INTO operations_cases(id,title,description,category,priority,status,city_id,account_id,job_id,assignee_id,created_by,due_at,created_at,updated_at,update_token) SELECT ?,?,?,?,?,?,?,?,?,?,?,?,?,?,? WHERE NOT EXISTS(SELECT 1 FROM staff_access_controls WHERE user_id=? AND paused=1)",
      ).bind(
        id,
        title,
        description,
        category,
        priority,
        status,
        city,
        accountId,
        jobId,
        assignee,
        viewer.identity.id,
        now + settings.config.resolutionHours * 3600000,
        now,
        now,
        crypto.randomUUID(),
        assignee,
      ),
      operationsAuditStatement(env, viewer, "case-created", "case", id, title, {
        sql: "EXISTS(SELECT 1 FROM operations_cases WHERE id=?)",
        values: [id],
      }),
    ]);
    requireMarket(
      created[0].meta.changes === 1,
      "El responsable ya no está activo. Actualizá los datos.",
      409,
    );
    return opsJson({ id }, 201);
  }
  const casePath = path.match(/^\/cases\/([^/]+)$/);
  if (casePath) {
    const id = decodeURIComponent(casePath[1]),
      row = await env.DB.prepare(
        "SELECT c.*,a.name account_name,(SELECT i.email FROM staff_invites i WHERE i.used_by=c.assignee_id ORDER BY i.created_at DESC LIMIT 1) assignee_name FROM operations_cases c LEFT JOIN accounts a ON a.user_id=c.account_id WHERE c.id=?",
      )
        .bind(id)
        .first();
    requireMarket(row && opsCaseVisible(viewer, row), "No tenés acceso a ese caso.", 403);
    if (request.method === "GET")
      return opsJson({
        case: row,
        viewerId: viewer.identity.id,
        notes: await opsRows(
          env.DB.prepare(
            "SELECT * FROM (SELECT id,author_name,body,created_at FROM operations_notes WHERE case_id=? ORDER BY created_at DESC,id DESC LIMIT 200) ORDER BY created_at,id",
          ).bind(id),
        ),
        assignees: opsSupervisor(viewer) ? await opsAssignees(env, viewer) : [],
      });
    if (request.method === "POST") {
      const data = await readBody(request);
      requireMarket(JSON.stringify(data).length < 9000, "El cambio es demasiado largo.");
      opsVersion(data.version);
      requireMarket(
        data.version === row.version,
        "El caso cambió. Actualizá antes de continuar.",
        409,
      );
      const supervisor = opsSupervisor(viewer),
        action = data.action,
        now = Date.now(),
        token = crypto.randomUUID();
      let status = row.status,
        assignee = row.assignee_id,
        priority = row.priority,
        due = row.due_at,
        resolution = row.resolution,
        resolved = row.resolved_at;
      let note = marketText(data.note || "", 0, 2500);
      if (action === "claim") {
        requireMarket(row.status !== "resuelto", "Reabrí el caso antes de tomarlo.", 409);
        requireMarket(
          supervisor || !row.assignee_id || row.assignee_id === viewer.identity.id,
          "El caso ya tiene responsable.",
          409,
        );
        assignee = viewer.identity.id;
        status = row.status === "escalado" ? "escalado" : "en_curso";
        note = note || "Caso tomado para su atención.";
      } else {
        requireMarket(
          supervisor || row.assignee_id === viewer.identity.id,
          "Tomá el caso antes de modificarlo.",
          403,
        );
        if (action === "note")
          requireMarket(note.length >= 3, "Escribí una nota de al menos 3 caracteres.");
        else if (action === "assign") {
          requireMarket(supervisor, "Sólo la supervisión asigna responsables.", 403);
          requireMarket(row.status !== "resuelto", "Reabrí el caso antes de reasignarlo.", 409);
          requireMarket(
            await opsCanAssign(env, viewer, data.assigneeId),
            "El responsable no está activo en tu equipo.",
            403,
          );
          requireMarket(note.length >= 5, "Explicá el motivo de la asignación.");
          assignee = data.assigneeId;
          status = "en_curso";
        } else if (action === "escalate") {
          requireMarket(row.status !== "resuelto", "El caso ya está resuelto.", 409);
          requireMarket(note.length >= 5, "Indicá el motivo del escalamiento.");
          status = "escalado";
        } else if (action === "resolve") {
          requireMarket(row.status !== "resuelto", "El caso ya está resuelto.", 409);
          requireMarket(
            supervisor || (row.status !== "escalado" && row.priority !== "critica"),
            "La supervisión debe resolver un caso crítico o escalado.",
            403,
          );
          if (!assignee) assignee = viewer.identity.id;
          resolution = marketText(data.resolution, 10, 2500);
          note = resolution;
          status = "resuelto";
          resolved = now;
        } else if (action === "reopen") {
          requireMarket(row.status === "resuelto", "Sólo se reabren casos resueltos.", 409);
          requireMarket(note.length >= 5, "Explicá por qué se reabre el caso.");
          status = "en_curso";
          if (supervisor) assignee = viewer.identity.id;
          resolved = null;
          resolution = "";
          due = now + (await opsSettings(env)).config.resolutionHours * 3600000;
        } else if (action === "priority") {
          requireMarket(supervisor, "Sólo la supervisión cambia la prioridad.", 403);
          requireMarket(
            opsPriorities.includes(data.priority) && note.length >= 5,
            "Elegí prioridad y explicá el cambio.",
          );
          priority = data.priority;
        } else throw new MarketError("Acción de caso no válida.", 400);
      }
      const guard = {
        sql: "EXISTS(SELECT 1 FROM operations_cases WHERE id=? AND update_token=?)",
        values: [id, token],
      };
      const changes = await env.DB.batch([
        env.DB.prepare(
          "UPDATE operations_cases SET status=?,assignee_id=?,priority=?,due_at=?,resolution=?,resolved_at=?,updated_at=?,version=version+1,update_token=? WHERE id=? AND version=? AND (?=0 OR NOT EXISTS(SELECT 1 FROM staff_access_controls WHERE user_id=? AND paused=1))",
        ).bind(
          status,
          assignee,
          priority,
          due,
          resolution,
          resolved,
          now,
          token,
          id,
          data.version,
          ["claim", "assign", "reopen"].includes(action) ? 1 : 0,
          assignee,
        ),
        env.DB.prepare(
          "INSERT INTO operations_notes(id,case_id,author_id,author_name,body,created_at) SELECT ?,?,?,?,?,? WHERE " +
            guard.sql,
        ).bind(
          crypto.randomUUID(),
          id,
          viewer.identity.id,
          opsActor(viewer),
          note,
          now,
          ...guard.values,
        ),
        operationsAuditStatement(env, viewer, "case-" + action, "case", id, row.title, guard),
      ]);
      requireMarket(
        changes[0].meta.changes === 1,
        "El caso cambió. Actualizá antes de continuar.",
        409,
      );
      return opsJson({ ok: true });
    }
  }
  if (path === "/settings") {
    requireMarket(opsSupervisor(viewer), "No tenés acceso a las reglas de supervisión.", 403);
    if (request.method === "GET") return opsJson(await opsSettings(env));
    if (request.method === "PUT") {
      const data = await readBody(request),
        config = data.config;
      opsVersion(data.version);
      requireMarket(
        config &&
          ["responseHours", "resolutionHours", "unansweredHours"].every(
            (k) => Number.isInteger(config[k]) && config[k] >= 1 && config[k] <= 1440,
          ),
        "Los plazos deben estar entre 1 y 1440 horas.",
      );
      const body = JSON.stringify({
          responseHours: config.responseHours,
          resolutionHours: config.resolutionHours,
          unansweredHours: config.unansweredHours,
        }),
        token = crypto.randomUUID();
      const changes = await env.DB.batch([
        env.DB.prepare(
          "UPDATE operations_settings SET body=?,version=version+1,update_token=?,updated_at=? WHERE id='service' AND version=?",
        ).bind(body, token, Date.now(), data.version),
        operationsAuditStatement(
          env,
          viewer,
          "service-settings",
          "settings",
          "service",
          "Plazos de atención y alertas",
          {
            sql: "EXISTS(SELECT 1 FROM operations_settings WHERE id='service' AND update_token=?)",
            values: [token],
          },
        ),
      ]);
      requireMarket(
        changes[0].meta.changes === 1,
        "Las reglas cambiaron. Actualizá la pantalla.",
        409,
      );
      return opsJson({ ok: true });
    }
  }
  if (path === "/profile-control" && request.method === "POST") {
    requireMarket(
      opsSupervisor(viewer),
      "Sólo la supervisión modera la publicación de perfiles.",
      403,
    );
    const data = await readBody(request);
    opsVersion(data.version);
    const reason = marketText(data.reason, 5, 1000);
    requireMarket(typeof data.hidden === "boolean", "Indicá el estado del perfil.");
    const account = await env.DB.prepare(
      "SELECT user_id,name FROM accounts WHERE user_id=? AND kind!='cliente'",
    )
      .bind(data.userId)
      .first();
    requireMarket(account, "No se encontró el profesional o empresa.", 404);
    const token = crypto.randomUUID();
    const changes = await env.DB.batch([
      env.DB.prepare(
        "INSERT INTO operations_profile_controls(user_id,hidden,reason,version,update_token,updated_by,updated_at) SELECT ?,?,?,1,?,?,? WHERE ?=0 OR EXISTS(SELECT 1 FROM operations_profile_controls WHERE user_id=? AND version=?) ON CONFLICT(user_id) DO UPDATE SET hidden=excluded.hidden,reason=excluded.reason,version=operations_profile_controls.version+1,update_token=excluded.update_token,updated_by=excluded.updated_by,updated_at=excluded.updated_at WHERE operations_profile_controls.version=?",
      ).bind(
        account.user_id,
        data.hidden ? 1 : 0,
        reason,
        token,
        viewer.identity.id,
        Date.now(),
        data.version,
        account.user_id,
        data.version,
        data.version,
      ),
      operationsAuditStatement(
        env,
        viewer,
        data.hidden ? "profile-hidden" : "profile-restored",
        "account",
        account.user_id,
        account.name,
        {
          sql: "EXISTS(SELECT 1 FROM operations_profile_controls WHERE user_id=? AND update_token=?)",
          values: [account.user_id, token],
        },
      ),
    ]);
    requireMarket(changes[0].meta.changes === 1, "El perfil cambió. Actualizá la pantalla.", 409);
    return opsJson({ ok: true });
  }
  if (path === "/team-access" && request.method === "POST") {
    requireMarket(opsSupervisor(viewer), "No podés modificar accesos del equipo.", 403);
    const data = await readBody(request);
    opsVersion(data.version);
    requireMarket(typeof data.paused === "boolean", "Indicá el estado del acceso.");
    const reason = marketText(data.reason, 5, 1000),
      staff = await env.DB.prepare("SELECT * FROM staff WHERE user_id=?").bind(data.userId).first();
    requireMarket(
      staff &&
        staff.user_id !== viewer.identity.id &&
        (viewer.staffRole === "ceo" ||
          (staff.role === "admin" && staff.invited_by === viewer.identity.id)),
      "Sólo podés gestionar administradores de tu equipo.",
      403,
    );
    if (data.paused)
      requireMarket(
        !(await env.DB.prepare(
          "SELECT id FROM operations_cases WHERE assignee_id=? AND status!='resuelto' LIMIT 1",
        )
          .bind(staff.user_id)
          .first()),
        "Reasigná sus casos abiertos antes de pausar el acceso.",
        409,
      );
    const token = crypto.randomUUID();
    const changes = await env.DB.batch([
      env.DB.prepare(
        "INSERT INTO staff_access_controls(user_id,paused,reason,version,update_token,updated_by,updated_at) SELECT ?,?,?,1,?,?,? WHERE (?=0 OR EXISTS(SELECT 1 FROM staff_access_controls WHERE user_id=? AND version=?)) AND (?=0 OR NOT EXISTS(SELECT 1 FROM operations_cases WHERE assignee_id=? AND status!='resuelto')) ON CONFLICT(user_id) DO UPDATE SET paused=excluded.paused,reason=excluded.reason,version=staff_access_controls.version+1,update_token=excluded.update_token,updated_by=excluded.updated_by,updated_at=excluded.updated_at WHERE staff_access_controls.version=?",
      ).bind(
        staff.user_id,
        data.paused ? 1 : 0,
        reason,
        token,
        viewer.identity.id,
        Date.now(),
        data.version,
        staff.user_id,
        data.version,
        data.paused ? 1 : 0,
        staff.user_id,
        data.version,
      ),
      operationsAuditStatement(
        env,
        viewer,
        data.paused ? "staff-paused" : "staff-restored",
        "staff",
        staff.user_id,
        reason,
        {
          sql: "EXISTS(SELECT 1 FROM staff_access_controls WHERE user_id=? AND update_token=?)",
          values: [staff.user_id, token],
        },
      ),
    ]);
    requireMarket(changes[0].meta.changes === 1, "El acceso cambió. Actualizá la pantalla.", 409);
    return opsJson({ ok: true });
  }
  if (path === "/audit" && request.method === "GET") {
    requireMarket(opsSupervisor(viewer), "El historial global corresponde a supervisión.", 403);
    const q = opsQuery(url),
      page = opsPage(url),
      values = q ? ["%" + q + "%", "%" + q + "%"] : [],
      where = q ? " WHERE summary LIKE ? OR actor_name LIKE ?" : "";
    const count = await env.DB.prepare("SELECT COUNT(*) total FROM operations_audit" + where)
      .bind(...values)
      .first();
    return opsJson({
      items: await opsRows(
        env.DB.prepare(
          "SELECT * FROM operations_audit" +
            where +
            " ORDER BY created_at DESC,id DESC LIMIT 30 OFFSET ?",
        ).bind(...values, (page - 1) * 30),
      ),
      total: count.total,
      page,
      pageSize: 30,
    });
  }
  if (path === "/system" && request.method === "GET") {
    requireMarket(opsSupervisor(viewer), "El estado global corresponde a supervisión.", 403);
    await env.DB.prepare("SELECT 1").first();
    const counts = await env.DB.prepare(
      "SELECT (SELECT COUNT(*) FROM accounts) accounts,(SELECT COUNT(*) FROM jobs) jobs,(SELECT COUNT(*) FROM operations_cases) cases,(SELECT COUNT(*) FROM uploads) files,(SELECT COUNT(*) FROM staff) staff",
    ).first();
    const delivery = await env.DB.prepare(
      "SELECT COUNT(*) total,COALESCE(SUM(delivery_status='failed' OR delivery_status='uncertain'),0) failed,COALESCE(SUM(delivery_status='pending'),0) pending,COALESCE(SUM(delivery_status='sent'),0) sent FROM staff_invites WHERE created_at>?",
    )
      .bind(Date.now() - 30 * 86400000)
      .first();
    return opsJson({
      database: true,
      filesConfigured: Boolean(env.BUCKET),
      mail: staffMailStatus(env),
      aiConfigured: Boolean(env.OPENAI_API_KEY),
      counts,
      delivery,
      checkedAt: Date.now(),
    });
  }
  throw new MarketError("Herramienta operativa no encontrada.", 404);
}
