export class MarketError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}
export function requireMarket(condition, message, status = 400) {
  if (!condition) throw new MarketError(message, status);
}
export const marketTrades = [
  "plomeria",
  "electricidad",
  "cerrajeria",
  "albanileria",
  "pintura",
  "jardineria",
  "limpieza",
  "gas",
];
export const marketCities = ["mercedes-ba", "lujan-ba", "chivilcoy-ba"];
export function marketText(value, min = 0, max = 1000) {
  requireMarket(typeof value === "string", "Completá los campos del formulario.");
  const text = value.trim();
  requireMarket(
    text.length >= min && text.length <= max,
    `El texto debe tener entre ${min} y ${max} caracteres.`,
  );
  return text;
}
export function marketProfile(input, allowedCities = marketCities) {
  requireMarket(
    ["cliente", "profesional", "empresa"].includes(input.kind),
    "Elegí tu tipo de cuenta.",
  );
  requireMarket(
    allowedCities.includes(input.cityId),
    "Esta zona no está habilitada para nuevas altas.",
  );
  if (input.kind !== "cliente")
    requireMarket(marketTrades.includes(input.trade), "Elegí tu oficio principal.");
  requireMarket(
    input.consent === true,
    "Aceptá las condiciones de uso y privacidad para crear tu cuenta.",
  );
  return {
    name: marketText(input.name, 2, 100),
    kind: input.kind,
    cityId: input.cityId,
    trade: input.kind === "cliente" ? "" : input.trade,
    phone: marketText(input.phone ?? "", 0, 40),
    bio: marketText(input.bio ?? "", 0, 1500),
  };
}
export function marketQuote(input) {
  const money = (key) => {
    const value = input[key];
    requireMarket(
      typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100000000,
      "Revisá los importes del presupuesto.",
    );
    return Math.round(value * 100);
  };
  const result = {
    labor: money("labor"),
    materials: money("materials"),
    visit: money("visit"),
    days: input.days,
    warrantyMonths: input.warrantyMonths,
    notes: marketText(input.notes ?? "", 0, 1000),
  };
  requireMarket(
    result.labor + result.materials + result.visit > 0,
    "El total debe ser mayor a cero.",
  );
  requireMarket(
    Number.isInteger(result.days) && result.days >= 1 && result.days <= 365,
    "El plazo debe ser de 1 a 365 días.",
  );
  requireMarket(
    Number.isInteger(result.warrantyMonths) &&
      result.warrantyMonths >= 0 &&
      result.warrantyMonths <= 60,
    "La garantía debe ser de 0 a 60 meses.",
  );
  return result;
}
export function createMarketJob(
  input,
  account,
  id,
  now = Date.now(),
  allowedCities = marketCities,
) {
  requireMarket(Boolean(account.user_id), "Ingresá con tu cuenta para publicar.", 401);
  requireMarket(
    marketTrades.includes(input.category) && allowedCities.includes(input.cityId),
    "Elegí oficio y ciudad.",
  );
  requireMarket(["urgente", "planificado"].includes(input.type), "Elegí el tipo de visita.");
  if (input.type === "planificado") {
    const schedule = input.schedule;
    requireMarket(
      schedule &&
        /^\d{4}-\d{2}-\d{2}$/.test(schedule.date) &&
        ["manana", "tarde", "noche"].includes(schedule.period),
      "Elegí un día y turno.",
    );
    requireMarket(["turno", "hora"].includes(schedule.mode), "Elegí un turno o una hora.");
    if (schedule.mode === "hora") {
      const range = { manana: [8, 12], tarde: [12, 18], noche: [18, 22] }[schedule.period];
      const hour = Number(schedule.hour?.slice(0, 2));
      requireMarket(
        /^([01]\d|2[0-3]):00$/.test(schedule.hour ?? "") && hour >= range[0] && hour < range[1],
        "La hora no corresponde al turno elegido.",
      );
    }
    const ending =
      schedule.mode === "hora"
        ? schedule.hour
        : { manana: "12:00", tarde: "18:00", noche: "22:00" }[schedule.period];
    requireMarket(/^([01]\d|2[0-3]):[0-5]\d$/.test(ending ?? ""), "Elegí un horario válido.");
    const at = Date.parse(`${schedule.date}T${ending}:00-03:00`);
    requireMarket(
      Number.isFinite(at) &&
        at > now &&
        new Date(`${schedule.date}T12:00:00Z`).toISOString().slice(0, 10) === schedule.date,
      "El turno elegido ya pasó o la fecha no es válida.",
    );
  }
  const photoIds = input.photoIds ?? [];
  requireMarket(
    Array.isArray(photoIds) && photoIds.length <= 3 && photoIds.every((x) => typeof x === "string"),
    "Podés adjuntar hasta tres fotos.",
  );
  return {
    id,
    clientId: account.user_id,
    clientName: account.name,
    category: input.category,
    cityId: input.cityId,
    service: marketText(input.service, 2, 150),
    description: marketText(input.description ?? "", 0, 2000),
    address: marketText(input.address, 6, 250),
    contact: marketText(input.contact, 6, 60),
    when: marketText(input.when, 2, 200),
    type: input.type,
    schedule: input.type === "planificado" ? input.schedule : null,
    photoIds,
    location: input.location ? { ...marketPoint(input.location), source: "cliente" } : null,
    createdAt: now,
    updatedAt: now,
    state: "solicitado",
    professionalId: null,
    professionalName: null,
    acceptedQuoteId: null,
    visit: null,
    quotes: [],
    messages: [],
    events: [{ state: "solicitado", at: now }],
    cancellationReason: "",
    version: 1,
  };
}
export function marketPoint(input) {
  requireMarket(
    input &&
      typeof input.lat === "number" &&
      Number.isFinite(input.lat) &&
      input.lat >= -90 &&
      input.lat <= 90 &&
      typeof input.lng === "number" &&
      Number.isFinite(input.lng) &&
      input.lng >= -180 &&
      input.lng <= 180,
    "Elegí un punto válido en el mapa.",
  );
  return {
    lat: Math.round(input.lat * 1000000) / 1000000,
    lng: Math.round(input.lng * 1000000) / 1000000,
  };
}
export function marketProfilePhoto(account) {
  if (!account || account.kind !== "profesional") return null;
  const profile = typeof account.profile_json === "string" ? JSON.parse(account.profile_json) : {};
  const id = profile.profilePhotoId ?? profile.logoId;
  return typeof id === "string" && id.trim() ? id : null;
}
export function marketProfileComplete(account) {
  return Boolean(account && (account.kind !== "profesional" || marketProfilePhoto(account)));
}
export function providerMatches(account, job) {
  return (
    account &&
    account.kind !== "cliente" &&
    account.verification === "aprobado" &&
    marketProfileComplete(account) &&
    account.trade === job.category &&
    account.city_id === job.cityId
  );
}
export function mayReadJob(account, job) {
  return (
    account &&
    (job.clientId === account.user_id ||
      job.professionalId === account.user_id ||
      job.assignment?.userId === account.user_id ||
      (!job.professionalId &&
        !["cancelado", "finalizado"].includes(job.state) &&
        providerMatches(account, job)) ||
      job.quotes.some((q) => q.professionalId === account.user_id))
  );
}
export function visibleMarketJob(job, account) {
  requireMarket(mayReadJob(account, job), "No tenés acceso a esta solicitud.", 403);
  if (job.clientId === account.user_id) return job;
  return {
    ...job,
    location:
      job.professionalId === account.user_id || job.assignment?.userId === account.user_id
        ? (job.location ?? null)
        : null,
    address:
      job.professionalId === account.user_id || job.assignment?.userId === account.user_id
        ? job.address
        : "",
    contact:
      job.professionalId === account.user_id || job.assignment?.userId === account.user_id
        ? job.contact
        : "",
    quotes: job.quotes.filter((q) => q.professionalId === account.user_id),
    messages: job.messages.filter((m) => m.professionalId === account.user_id),
  };
}
export function changeMarketJob(previous, actor, input, now = Date.now()) {
  requireMarket(mayReadJob(actor, previous), "No tenés acceso a este trabajo.", 403);
  const job = structuredClone(previous),
    client = job.clientId === actor.user_id,
    provider = job.professionalId === actor.user_id;
  const active = !["finalizado", "cancelado"].includes(job.state);
  const step = (state) => {
    job.state = state;
    job.events.push({ state, at: now });
  };
  requireMarket(
    input.version === job.version,
    "El trabajo cambió. Actualizá la pantalla y volvé a intentar.",
    409,
  );
  switch (input.action) {
    case "quote": {
      requireMarket(
        active && !client && providerMatches(actor, job) && (!job.professionalId || provider),
        "No podés enviar un presupuesto para este trabajo.",
        403,
      );
      requireMarket(
        job.quotes.length < 100 || job.quotes.some((q) => q.professionalId === actor.user_id),
        "La solicitud llegó al límite de propuestas.",
      );
      const quote = job.quotes.find((q) => q.professionalId === actor.user_id);
      requireMarket(
        quote?.revisions.at(-1)?.decision !== "pending",
        "Esperá la decisión del cliente antes de enviar otra versión.",
      );
      const revision = {
        ...marketQuote(input.quote),
        version: (quote?.revisions.length ?? 0) + 1,
        decision: "pending",
        createdAt: now,
        decidedAt: null,
      };
      if (quote) quote.revisions.push(revision);
      else
        job.quotes.push({
          id: crypto.randomUUID(),
          professionalId: actor.user_id,
          professionalName: actor.name,
          revisions: [revision],
          acceptedVersion: null,
        });
      if (job.state === "solicitado") step("presupuestado");
      break;
    }
    case "decide-quote": {
      requireMarket(client && active, "Sólo el cliente puede decidir el presupuesto.", 403);
      const quote = job.quotes.find((q) => q.id === input.quoteId),
        revision = quote?.revisions.at(-1);
      requireMarket(
        quote && revision && revision.decision === "pending" && revision.version === input.revision,
        "Esta propuesta ya cambió.",
        409,
      );
      requireMarket(typeof input.accept === "boolean", "Indicá si aceptás o rechazás.");
      requireMarket(
        !job.acceptedQuoteId || job.acceptedQuoteId === quote.id,
        "Ya contrataste otro presupuesto.",
      );
      revision.decision = input.accept ? "accepted" : "rejected";
      revision.decidedAt = now;
      if (input.accept) {
        quote.acceptedVersion = revision.version;
        job.acceptedQuoteId = quote.id;
        job.professionalId = quote.professionalId;
        job.professionalName = quote.professionalName;
        if (["solicitado", "presupuestado"].includes(job.state)) step("contratado");
      }
      break;
    }
    case "visit": {
      requireMarket(
        (client || provider) && job.state === "contratado",
        "La visita se confirma después de contratar.",
      );
      requireMarket(
        /^\d{4}-\d{2}-\d{2}$/.test(input.date ?? "") &&
          /^([01]\d|2[0-3]):[0-5]\d$/.test(input.time ?? ""),
        "Completá fecha y hora.",
      );
      const at = Date.parse(`${input.date}T${input.time}:00-03:00`);
      requireMarket(
        Number.isFinite(at) &&
          at > now &&
          new Date(`${input.date}T12:00:00Z`).toISOString().slice(0, 10) === input.date,
        "La fecha debe ser válida y futura.",
      );
      job.visit = { date: input.date, time: input.time };
      step("visita-confirmada");
      break;
    }
    case "start":
      requireMarket(
        actor.kind !== "profesional" ||
          (actor.verification === "aprobado" && marketProfileComplete(actor)),
        "Completá tu foto de perfil y la revisión del DNI antes de iniciar trabajos.",
        403,
      );
      requireMarket(
        (provider || job.assignment?.userId === actor.user_id) && job.state === "visita-confirmada",
        "Sólo el profesional contratado puede iniciar una visita confirmada.",
        403,
      );
      step("en-curso");
      break;
    case "finish": {
      requireMarket(
        client && job.state === "en-curso",
        "El cliente confirma la finalización de un trabajo en curso.",
        403,
      );
      requireMarket(
        !job.quotes
          .find((q) => q.id === job.acceptedQuoteId)
          ?.revisions.some((r) => r.decision === "pending"),
        "Primero resolvé el cambio de presupuesto pendiente.",
      );
      step("finalizado");
      break;
    }
    case "cancel":
      requireMarket((client || provider) && active, "No podés cancelar este trabajo.", 403);
      job.cancellationReason = marketText(input.reason, 5, 500);
      step("cancelado");
      break;
    case "message": {
      const professionalId = client ? input.professionalId : actor.user_id;
      requireMarket(
        job.quotes.some((q) => q.professionalId === professionalId) &&
          (client || professionalId === actor.user_id),
        "La conversación requiere un presupuesto de este profesional.",
        403,
      );
      requireMarket(job.messages.length < 1000, "La conversación llegó a su límite.");
      job.messages.push({
        id: crypto.randomUUID(),
        professionalId,
        senderId: actor.user_id,
        senderName: actor.name,
        text: marketText(input.text, 1, 1600),
        at: now,
      });
      break;
    }
    case "assign":
      requireMarket(
        provider &&
          actor.kind === "empresa" &&
          ["contratado", "visita-confirmada"].includes(job.state),
        "Sólo la empresa contratada puede asignar su equipo.",
        403,
      );
      job.assignment = input.assignment;
      break;
    default:
      throw new MarketError("La acción no existe.", 404);
  }
  job.version++;
  job.updatedAt = now;
  return job;
}
