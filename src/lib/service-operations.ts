import { categorias, ciudades, getProfesional } from "./mock-data.ts";
import { isCalendarDate, localToday, type LocalRequest } from "./request-planning.ts";
export const workStages = [
  "solicitado",
  "presupuestado",
  "contratado",
  "visita-confirmada",
  "en-curso",
  "finalizado",
] as const;
export type WorkStage = (typeof workStages)[number] | "cancelado";
export const workStageLabels: Record<WorkStage, string> = {
  solicitado: "Solicitado",
  presupuestado: "Presupuestado",
  contratado: "Contratado",
  "visita-confirmada": "Visita confirmada",
  "en-curso": "En curso",
  finalizado: "Finalizado",
  cancelado: "Cancelado",
};
export type SavedAddress = {
  id: string;
  label: string;
  kind: "casa" | "comercio" | "otra";
  cityId: string;
  address: string;
  reference: string;
  preferred: boolean;
};
export type QuoteBreakdown = {
  labor: number;
  materials: number;
  visit: number;
  days: number;
  warrantyMonths: number;
  notes: string;
};
export type QuoteRevision = QuoteBreakdown & {
  version: number;
  createdAt: number;
  decision: "pending" | "accepted" | "rejected";
  decidedAt: number | null;
};
export type ServiceQuote = {
  id: string;
  requestKey: string;
  professionalId: string;
  revisions: QuoteRevision[];
  acceptedVersion: number | null;
};
export type ServiceRequest = {
  address: string;
  description: string;
  when: string;
  photoIds: string[];
  requestType: "urgente" | "planificado";
  key: string;
  routeId: string;
  clientId: string;
  category: string;
  cityId: string;
  service: string;
  createdAt: number;
  source: "local" | "ejemplo";
  stage: WorkStage;
  timeline: { stage: WorkStage; at: number }[];
  acceptedQuoteId: string | null;
  professionalId: string | null;
  visit: { date: string; time: string } | null;
  cancellationReason: string;
};
export type PublishedWork = {
  id: string;
  professionalId: string;
  title: string;
  category: string;
  date: string;
  description: string;
  beforeId: string;
  afterId: string;
  clientWork: boolean;
  clientConsent: boolean;
  consentDeclaredAt: number | null;
  published: boolean;
};
export type ServiceOperations = {
  version: 1;
  addresses: SavedAddress[];
  requests: ServiceRequest[];
  quotes: ServiceQuote[];
  works: PublishedWork[];
};
export function initialServiceOperations(): ServiceOperations {
  return { version: 1, addresses: [], requests: [], quotes: [], works: [] };
}
export function requestInstanceKey(request: Pick<LocalRequest, "id" | "instanceId">) {
  return `${request.id}:${request.instanceId}`;
}
export function addSavedAddress(
  state: ServiceOperations,
  input: Omit<SavedAddress, "id" | "preferred">,
  id: string,
): ServiceOperations {
  if (input.label.trim().length < 2 || input.address.trim().length < 6)
    throw new Error("Completá el nombre y la dirección de la propiedad.");
  if (
    !["casa", "comercio", "otra"].includes(input.kind) ||
    !ciudades.some((city) => city.id === input.cityId)
  )
    throw new Error("Elegí un tipo de propiedad y una ciudad válidos.");
  return {
    ...state,
    addresses: [
      ...state.addresses,
      {
        ...input,
        id,
        label: input.label.trim(),
        address: input.address.trim(),
        reference: input.reference.trim(),
        preferred: state.addresses.length === 0,
      },
    ],
  };
}
export function removeSavedAddress(state: ServiceOperations, id: string) {
  const addresses = state.addresses.filter((address) => address.id !== id);
  if (addresses.length && !addresses.some((address) => address.preferred))
    addresses[0] = { ...addresses[0]!, preferred: true };
  return { ...state, addresses };
}
export function registerServiceRequest(
  state: ServiceOperations,
  input: LocalRequest & { cityId?: string },
  now = Date.now(),
  source: "local" | "ejemplo" = "local",
): ServiceOperations {
  const key = requestInstanceKey(input);
  if (state.requests.some((request) => request.key === key)) return state;
  if (
    !categorias.some((category) => category.slug === input.categoriaSlug) ||
    !input.servicio.trim()
  )
    throw new Error("La solicitud debe tener oficio y servicio.");
  const request: ServiceRequest = {
    key,
    routeId: input.id,
    clientId: "cliente-demo-1",
    category: input.categoriaSlug,
    cityId: input.cityId ?? ciudades[0]!.id,
    service: input.servicio,
    address: input.direccion,
    description: input.descripcion,
    when: input.cuando,
    photoIds: [...input.photoIds],
    requestType: input.tipo,
    createdAt: now,
    source,
    stage: "solicitado",
    timeline: [{ stage: "solicitado", at: now }],
    acceptedQuoteId: null,
    professionalId: null,
    visit: null,
    cancellationReason: "",
  };
  return { ...state, requests: [...state.requests, request] };
}
export function quoteTotal(input: Pick<QuoteBreakdown, "labor" | "materials" | "visit">) {
  return Math.round((input.labor + input.materials + input.visit) * 100) / 100;
}
export function validateQuote(input: QuoteBreakdown): QuoteBreakdown {
  if (
    [input.labor, input.materials, input.visit].some(
      (value) => !Number.isFinite(value) || value < 0 || value > 1_000_000_000,
    ) ||
    quoteTotal(input) <= 0
  )
    throw new Error("Ingresá importes válidos. El total debe ser mayor a cero.");
  if (
    !Number.isInteger(input.days) ||
    input.days < 1 ||
    input.days > 365 ||
    !Number.isInteger(input.warrantyMonths) ||
    input.warrantyMonths < 0 ||
    input.warrantyMonths > 60
  )
    throw new Error("Indicá un plazo de 1 a 365 días y una garantía de 0 a 60 meses.");
  const normalized = {
    ...input,
    labor: Math.round(input.labor * 100) / 100,
    materials: Math.round(input.materials * 100) / 100,
    visit: Math.round(input.visit * 100) / 100,
    notes: input.notes.trim().slice(0, 1000),
  };
  if (quoteTotal(normalized) <= 0) throw new Error("El total redondeado debe ser mayor a cero.");
  return normalized;
}
export function proposeServiceQuote(
  state: ServiceOperations,
  requestKey: string,
  professionalId: string,
  input: QuoteBreakdown,
  id: string,
  now = Date.now(),
): ServiceOperations {
  const request = state.requests.find((item) => item.key === requestKey);
  const professional = getProfesional(professionalId);
  if (
    !request ||
    !professional ||
    !professional.categorias.includes(request.category) ||
    professional.ciudadId !== request.cityId
  )
    throw new Error("La solicitud no corresponde a este profesional.");
  if (
    ["finalizado", "cancelado"].includes(request.stage) ||
    (request.professionalId && request.professionalId !== professionalId)
  )
    throw new Error("Esta solicitud ya no admite este presupuesto.");
  const values = validateQuote(input);
  const previous = state.quotes.find(
    (quote) => quote.requestKey === requestKey && quote.professionalId === professionalId,
  );
  if (previous?.revisions.at(-1)?.decision === "pending")
    throw new Error("El cliente todavía debe aceptar o rechazar tu propuesta pendiente.");
  const revision: QuoteRevision = {
    ...values,
    version: (previous?.revisions.length ?? 0) + 1,
    createdAt: now,
    decision: "pending",
    decidedAt: null,
  };
  const quotes = previous
    ? state.quotes.map((quote) =>
        quote.id === previous.id ? { ...quote, revisions: [...quote.revisions, revision] } : quote,
      )
    : [
        ...state.quotes,
        { id, requestKey, professionalId, revisions: [revision], acceptedVersion: null },
      ];
  return {
    ...state,
    quotes,
    requests: state.requests.map((item) =>
      item.key === requestKey && item.stage === "solicitado"
        ? {
            ...item,
            stage: "presupuestado",
            timeline: [...item.timeline, { stage: "presupuestado", at: now }],
          }
        : item,
    ),
  };
}
export function decideServiceQuote(
  state: ServiceOperations,
  quoteId: string,
  version: number,
  accept: boolean,
  now = Date.now(),
): ServiceOperations {
  const quote = state.quotes.find((item) => item.id === quoteId);
  const revision = quote?.revisions.at(-1);
  const request = state.requests.find((item) => item.key === quote?.requestKey);
  if (
    !quote ||
    !revision ||
    revision.version !== version ||
    revision.decision !== "pending" ||
    !request ||
    ["finalizado", "cancelado"].includes(request.stage)
  )
    throw new Error("La propuesta ya no está disponible o cambió de versión.");
  if (accept && request.acceptedQuoteId && request.acceptedQuoteId !== quoteId)
    throw new Error("Ya hay otro profesional contratado para esta solicitud.");
  const firstAcceptance = accept && !request.acceptedQuoteId;
  return {
    ...state,
    quotes: state.quotes.map((item) =>
      item.id === quoteId
        ? {
            ...item,
            acceptedVersion: accept ? version : item.acceptedVersion,
            revisions: item.revisions.map((revision) =>
              revision.version === version
                ? { ...revision, decision: accept ? "accepted" : "rejected", decidedAt: now }
                : revision,
            ),
          }
        : item,
    ),
    requests: state.requests.map((item) =>
      item.key === request.key && accept
        ? {
            ...item,
            professionalId: quote.professionalId,
            acceptedQuoteId: quote.id,
            stage: firstAcceptance ? "contratado" : item.stage,
            timeline: firstAcceptance
              ? [...item.timeline, { stage: "contratado", at: now }]
              : item.timeline,
          }
        : item,
    ),
  };
}
export function acceptedRevision(quote: ServiceQuote) {
  return quote.revisions.find((revision) => revision.version === quote.acceptedVersion);
}
export function advanceServiceRequest(
  state: ServiceOperations,
  key: string,
  next: WorkStage,
  visit?: { date: string; time: string },
  now = Date.now(),
): ServiceOperations {
  const request = state.requests.find((item) => item.key === key);
  if (!request) throw new Error("No se encontró la solicitud.");
  const nextStage: Partial<Record<WorkStage, WorkStage>> = {
    contratado: "visita-confirmada",
    "visita-confirmada": "en-curso",
    "en-curso": "finalizado",
  };
  if (nextStage[request.stage] !== next)
    throw new Error("Primero completá la etapa anterior del trabajo.");
  if (
    next === "finalizado" &&
    state.quotes.some(
      (quote) =>
        quote.requestKey === key &&
        quote.id === request.acceptedQuoteId &&
        quote.revisions.at(-1)?.decision === "pending",
    )
  )
    throw new Error("Aceptá o rechazá la revisión de precio pendiente antes de finalizar.");
  if (next === "visita-confirmada") {
    if (
      !visit ||
      !isCalendarDate(visit.date) ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(visit.time) ||
      !Number.isFinite(Date.parse(`${visit.date}T${visit.time}:00-03:00`)) ||
      Date.parse(`${visit.date}T${visit.time}:00-03:00`) < now
    )
      throw new Error("Elegí una fecha y hora futuras para confirmar la visita.");
  }
  return {
    ...state,
    requests: state.requests.map((item) =>
      item.key === key
        ? {
            ...item,
            stage: next,
            visit: next === "visita-confirmada" ? visit! : item.visit,
            timeline: [...item.timeline, { stage: next, at: now }],
          }
        : item,
    ),
  };
}
export function cancelServiceRequest(
  state: ServiceOperations,
  key: string,
  reason: string,
  now = Date.now(),
): ServiceOperations {
  const request = state.requests.find((item) => item.key === key);
  if (!request || ["cancelado", "finalizado"].includes(request.stage) || reason.trim().length < 5)
    throw new Error(
      "Indicá un motivo de al menos 5 caracteres para un trabajo que no esté cerrado.",
    );
  return {
    ...state,
    requests: state.requests.map((item) =>
      item.key === key
        ? {
            ...item,
            stage: "cancelado",
            cancellationReason: reason.trim().slice(0, 500),
            timeline: [...item.timeline, { stage: "cancelado", at: now }],
          }
        : item,
    ),
  };
}
export function addPublishedWork(state: ServiceOperations, work: PublishedWork): ServiceOperations {
  const pro = getProfesional(work.professionalId);
  if (
    !pro ||
    !pro.categorias.includes(work.category) ||
    work.title.trim().length < 3 ||
    work.description.trim().length < 10 ||
    !work.beforeId.startsWith("work-photo-") ||
    !work.afterId.startsWith("work-photo-") ||
    !isCalendarDate(work.date) ||
    work.date > localToday()
  )
    throw new Error("Completá oficio, título, fecha, descripción y ambas fotos del trabajo.");
  if (work.published && work.clientWork && !work.clientConsent)
    throw new Error("Para publicar fotos de un cliente necesitás su autorización.");
  return {
    ...state,
    works: [
      ...state.works,
      {
        ...work,
        title: work.title.trim(),
        description: work.description.trim(),
        consentDeclaredAt: work.clientConsent ? Date.now() : null,
      },
    ],
  };
}
export function publishWork(state: ServiceOperations, id: string): ServiceOperations {
  const work = state.works.find((item) => item.id === id);
  if (!work || (work.clientWork && !work.clientConsent))
    throw new Error("La publicación necesita autorización del cliente.");
  return {
    ...state,
    works: state.works.map((item) =>
      item.id === id ? { ...item, published: !item.published } : item,
    ),
  };
}
export function activityMetrics(state: ServiceOperations) {
  const requests = state.requests.filter((request) => request.source === "local");
  const firstTimes: number[] = [];
  let responded = 0;
  let hired = 0;
  let completed = 0;
  let cancelled = 0;
  const clients = new Map<string, number>();
  for (const request of requests) {
    const dates = state.quotes
      .filter((quote) => quote.requestKey === request.key)
      .flatMap((quote) => quote.revisions.map((revision) => revision.createdAt));
    if (dates.length) {
      responded++;
      firstTimes.push(Math.max(0, Math.min(...dates) - request.createdAt));
    }
    if (request.timeline.some((event) => event.stage === "contratado")) {
      hired++;
      if (request.stage !== "cancelado")
        clients.set(request.clientId, (clients.get(request.clientId) ?? 0) + 1);
    }
    if (request.stage === "finalizado") completed++;
    if (request.stage === "cancelado") cancelled++;
  }
  return {
    requests: requests.length,
    responded,
    hired,
    completed,
    cancelled,
    repeatClients: [...clients.values()].filter((count) => count >= 2).length,
    responseRate: requests.length ? responded / requests.length : null,
    firstResponseMs: firstTimes.length
      ? firstTimes.reduce((sum, value) => sum + value, 0) / firstTimes.length
      : null,
  };
}
export function isServiceOperations(value: unknown): value is ServiceOperations {
  if (!value || typeof value !== "object") return false;
  const v = value as ServiceOperations;
  return (
    v.version === 1 &&
    Array.isArray(v.addresses) &&
    Array.isArray(v.requests) &&
    Array.isArray(v.quotes) &&
    Array.isArray(v.works) &&
    v.addresses.every((a) => a && typeof a.id === "string" && typeof a.address === "string") &&
    v.requests.every(
      (r) =>
        r &&
        typeof r.key === "string" &&
        typeof r.service === "string" &&
        [...workStages, "cancelado"].includes(r.stage) &&
        Array.isArray(r.timeline),
    ) &&
    v.quotes.every(
      (q) =>
        q &&
        typeof q.id === "string" &&
        typeof q.professionalId === "string" &&
        Array.isArray(q.revisions) &&
        q.revisions.length > 0,
    ) &&
    v.works.every(
      (w) =>
        w &&
        typeof w.id === "string" &&
        typeof w.professionalId === "string" &&
        typeof w.published === "boolean",
    )
  );
}
