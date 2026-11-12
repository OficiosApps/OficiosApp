export type PlanId = "inicial" | "profesional" | "premium";
export const professionalPlans = [
  {
    id: "inicial",
    name: "Inicial",
    usd: 0,
    quotes: 5,
    radius: 10,
    methods: 1,
    description: "Para crear tu perfil y empezar a recibir pedidos de tu zona.",
  },
  {
    id: "profesional",
    name: "Profesional",
    usd: 10,
    quotes: 30,
    radius: 25,
    methods: 3,
    description: "Para ampliar tu cobertura y responder a más oportunidades de trabajo.",
  },
  {
    id: "premium",
    name: "Premium",
    usd: 20,
    quotes: null,
    radius: 50,
    methods: 6,
    description: "Para profesionales con mayor volumen de consultas y cobertura.",
  },
] as const;
export type CollectionMethod = {
  id: string;
  type: "transferencia" | "billetera" | "efectivo" | "link";
  label: string;
  holder: string;
  destination: string;
  preferred: boolean;
};
export type ProfessionalAccount = {
  version: 1;
  professionalId: string;
  planId: PlanId;
  methods: CollectionMethod[];
  quotes: Record<string, string[]>;
};
export function defaultProfessionalAccount(): ProfessionalAccount {
  return { version: 1, professionalId: "pro-1", planId: "inicial", methods: [], quotes: {} };
}
export function planFor(id: PlanId) {
  return professionalPlans.find((plan) => plan.id === id)!;
}
export function monthKey(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
  }).format(now);
}
export function chooseProfessionalPlan(
  account: ProfessionalAccount,
  planId: PlanId,
): ProfessionalAccount {
  const plan = planFor(planId);
  if (!plan) throw new Error("Elegí un plan válido para profesionales.");
  if (account.methods.length > plan.methods)
    throw new Error(
      `Antes de elegir ${plan.name}, dejá como máximo ${plan.methods} métodos de cobro guardados.`,
    );
  return { ...account, planId };
}
export function addCollectionMethod(
  account: ProfessionalAccount,
  input: Omit<CollectionMethod, "id" | "preferred">,
  id: string,
): ProfessionalAccount {
  if (account.methods.length >= planFor(account.planId).methods)
    throw new Error("Alcanzaste el límite de métodos de tu plan. Eliminá uno o cambiá de plan.");
  const label = input.label.trim();
  const holder = input.holder.trim();
  const destination = input.destination.trim();
  if (label.length < 2 || label.length > 60)
    throw new Error("Dale un nombre de entre 2 y 60 caracteres al método.");
  if (!["transferencia", "billetera", "efectivo", "link"].includes(input.type))
    throw new Error("Elegí un método válido.");
  if (input.type !== "efectivo" && holder.length < 2)
    throw new Error("Completá el titular de la cuenta o del enlace de cobro.");
  if (
    ["transferencia", "billetera"].includes(input.type) &&
    !/^(?:\d{22}|[a-zA-Z0-9.-]{6,20})$/.test(destination)
  )
    throw new Error("Ingresá un alias de 6 a 20 caracteres o un CBU/CVU de 22 dígitos.");
  if (input.type === "link") {
    let url: URL;
    try {
      url = new URL(destination);
    } catch {
      throw new Error("Ingresá un enlace de pago HTTPS válido.");
    }
    if (url.protocol !== "https:" || url.username || url.password || destination.length > 500)
      throw new Error("Usá un enlace HTTPS sin contraseñas ni credenciales.");
  }
  if (
    account.methods.some(
      (item) =>
        item.type === input.type &&
        (input.type === "efectivo" || item.destination.toLowerCase() === destination.toLowerCase()),
    )
  )
    throw new Error("Ese método ya está agregado.");
  return {
    ...account,
    methods: [
      ...account.methods,
      {
        ...input,
        id,
        label,
        holder: input.type === "efectivo" ? "" : holder,
        destination: input.type === "efectivo" ? "" : destination,
        preferred: account.methods.length === 0,
      },
    ],
  };
}
export function removeCollectionMethod(
  account: ProfessionalAccount,
  id: string,
): ProfessionalAccount {
  const methods = account.methods.filter((item) => item.id !== id);
  if (methods.length && !methods.some((item) => item.preferred))
    methods[0] = { ...methods[0]!, preferred: true };
  return { ...account, methods };
}
export function recordProfessionalQuote(
  account: ProfessionalAccount,
  requestId: string,
  now = new Date(),
): ProfessionalAccount {
  const month = monthKey(now);
  const used = account.quotes[month] ?? [];
  const limit = planFor(account.planId).quotes;
  if (used.includes(requestId)) return account;
  if (limit !== null && used.length >= limit)
    throw new Error(
      "Alcanzaste los presupuestos de este mes en tu plan. Podés cambiar de plan o esperar al próximo mes.",
    );
  return { ...account, quotes: { ...account.quotes, [month]: [...used, requestId] } };
}
export function isProfessionalAccount(value: unknown): value is ProfessionalAccount {
  if (!value || typeof value !== "object") return false;
  const v = value as ProfessionalAccount;
  return (
    v.version === 1 &&
    v.professionalId === "pro-1" &&
    professionalPlans.some((plan) => plan.id === v.planId) &&
    Array.isArray(v.methods) &&
    v.methods.every(
      (item) =>
        item &&
        typeof item.id === "string" &&
        typeof item.label === "string" &&
        typeof item.holder === "string" &&
        typeof item.destination === "string" &&
        typeof item.preferred === "boolean" &&
        ["transferencia", "billetera", "efectivo", "link"].includes(item.type),
    ) &&
    Boolean(v.quotes) &&
    typeof v.quotes === "object" &&
    Object.values(v.quotes).every(
      (items) => Array.isArray(items) && items.every((item) => typeof item === "string"),
    )
  );
}
