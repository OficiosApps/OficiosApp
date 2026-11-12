import { getProfesional } from "./mock-data.ts";

export type PortfolioJob = {
  id: string;
  requestKey: string;
  requestId: string;
  professionalId: string;
  quoteId: string;
  service: string;
  status: "contratado" | "finalizado" | "cancelado";
  hiredAt: number;
  completedAt: number | null;
};
export type ContactMessage = {
  id: string;
  sender: "cliente" | "profesional";
  text: string;
  sentAt: number;
  clientRead: boolean;
  professionalRead: boolean;
};
export type ClientPortfolio = {
  version: 1;
  clientId: "cliente-demo-1";
  jobs: PortfolioJob[];
  conversations: Record<string, ContactMessage[]>;
};
export function initialClientPortfolio(): ClientPortfolio {
  const seed = [
    {
      id: "hist-1",
      professionalId: "pro-1",
      service: "Reparación de una pérdida de agua",
      date: "2026-10-22T15:00:00Z",
    },
    {
      id: "hist-2",
      professionalId: "pro-1",
      service: "Cambio de grifería de cocina",
      date: "2026-09-15T15:00:00Z",
    },
    {
      id: "hist-3",
      professionalId: "pro-2",
      service: "Revisión del tablero eléctrico",
      date: "2026-10-09T15:00:00Z",
    },
    {
      id: "hist-4",
      professionalId: "pro-5",
      service: "Cambio de cerradura de entrada",
      date: "2026-08-20T15:00:00Z",
    },
  ];
  return {
    version: 1,
    clientId: "cliente-demo-1",
    jobs: seed.map((job) => ({
      id: job.id,
      requestKey: job.id,
      requestId: "",
      professionalId: job.professionalId,
      quoteId: "",
      service: job.service,
      status: "finalizado",
      hiredAt: Date.parse(job.date) - 86400000,
      completedAt: Date.parse(job.date),
    })),
    conversations: {
      "pro-1": [
        {
          id: "example-message-1",
          sender: "cliente",
          text: "Gracias por reparar la pérdida. Quedó todo funcionando bien.",
          sentAt: Date.parse("2026-10-22T18:00:00Z"),
          clientRead: true,
          professionalRead: true,
        },
        {
          id: "example-message-2",
          sender: "profesional",
          text: "¡Gracias a vos! Cuando necesites otro trabajo, podés escribirme por acá.",
          sentAt: Date.parse("2026-10-22T18:10:00Z"),
          clientRead: true,
          professionalRead: true,
        },
      ],
    },
  };
}
export function contactIds(portfolio: ClientPortfolio): string[] {
  return [...new Set(portfolio.jobs.map((job) => job.professionalId))];
}
export function registerContract(
  portfolio: ClientPortfolio,
  input: {
    requestKey: string;
    requestId: string;
    professionalId: string;
    quoteId: string;
    service: string;
  },
  id: string,
  now = Date.now(),
): ClientPortfolio {
  if (!getProfesional(input.professionalId)) throw new Error("El profesional no existe.");
  if (
    !input.requestKey.trim() ||
    !input.requestId.trim() ||
    !input.quoteId.trim() ||
    !input.service.trim()
  )
    throw new Error("Faltan datos de la contratación.");
  const previous = portfolio.jobs.find((job) => job.requestKey === input.requestKey);
  if (previous) {
    if (previous.professionalId !== input.professionalId || previous.quoteId !== input.quoteId)
      throw new Error("Esta solicitud ya tiene otro profesional contratado.");
    return portfolio;
  }
  return {
    ...portfolio,
    jobs: [
      ...portfolio.jobs,
      {
        ...input,
        id,
        service: input.service.trim(),
        status: "contratado",
        hiredAt: now,
        completedAt: null,
      },
    ],
  };
}
export function completePortfolioJob(
  portfolio: ClientPortfolio,
  requestKey: string,
  now = Date.now(),
): ClientPortfolio {
  const previous = portfolio.jobs.find((job) => job.requestKey === requestKey);
  if (!previous) throw new Error("Primero contratá al profesional.");
  if (previous.status === "cancelado") throw new Error("El trabajo fue cancelado.");
  if (previous.status === "finalizado") return portfolio;
  return {
    ...portfolio,
    jobs: portfolio.jobs.map((job) =>
      job.requestKey === requestKey ? { ...job, status: "finalizado", completedAt: now } : job,
    ),
  };
}
export function sendContactMessage(
  portfolio: ClientPortfolio,
  professionalId: string,
  sender: ContactMessage["sender"],
  text: string,
  id: string,
  now = Date.now(),
): ClientPortfolio {
  if (!contactIds(portfolio).includes(professionalId))
    throw new Error("Sólo podés escribir a profesionales que ya contrataste.");
  if (!["cliente", "profesional"].includes(sender)) throw new Error("Autor del mensaje inválido.");
  const message = text.trim();
  if (!message || message.length > 2000)
    throw new Error("Escribí un mensaje de hasta 2000 caracteres.");
  const previous = portfolio.conversations[professionalId] ?? [];
  if (previous.length >= 200)
    throw new Error("Esta conversación alcanzó el límite de mensajes de la demo.");
  if (previous.some((item) => item.id === id)) return portfolio;
  return {
    ...portfolio,
    conversations: {
      ...portfolio.conversations,
      [professionalId]: [
        ...previous,
        {
          id,
          sender,
          text: message,
          sentAt: now,
          clientRead: sender === "cliente",
          professionalRead: sender === "profesional",
        },
      ],
    },
  };
}
export function unreadContactMessages(
  portfolio: ClientPortfolio,
  professionalId: string,
  reader: ContactMessage["sender"],
) {
  return (portfolio.conversations[professionalId] ?? []).filter((message) =>
    reader === "cliente" ? !message.clientRead : !message.professionalRead,
  ).length;
}
export function markContactMessagesRead(
  portfolio: ClientPortfolio,
  professionalId: string,
  reader: ContactMessage["sender"],
): ClientPortfolio {
  if (!unreadContactMessages(portfolio, professionalId, reader)) return portfolio;
  return {
    ...portfolio,
    conversations: {
      ...portfolio.conversations,
      [professionalId]: (portfolio.conversations[professionalId] ?? []).map((message) => ({
        ...message,
        clientRead: reader === "cliente" ? true : message.clientRead,
        professionalRead: reader === "profesional" ? true : message.professionalRead,
      })),
    },
  };
}
export function isClientPortfolio(value: unknown): value is ClientPortfolio {
  if (!value || typeof value !== "object") return false;
  const p = value as ClientPortfolio;
  return (
    p.version === 1 &&
    p.clientId === "cliente-demo-1" &&
    Array.isArray(p.jobs) &&
    p.jobs.every(
      (job) =>
        job &&
        typeof job.id === "string" &&
        typeof job.requestKey === "string" &&
        typeof job.requestId === "string" &&
        typeof job.quoteId === "string" &&
        typeof job.service === "string" &&
        Boolean(getProfesional(job.professionalId)) &&
        ["contratado", "finalizado", "cancelado"].includes(job.status) &&
        Number.isFinite(job.hiredAt) &&
        (job.completedAt === null || Number.isFinite(job.completedAt)),
    ) &&
    Boolean(p.conversations) &&
    typeof p.conversations === "object" &&
    Object.entries(p.conversations).every(
      ([id, messages]) =>
        contactIds(p).includes(id) &&
        Array.isArray(messages) &&
        messages.every(
          (message) =>
            message &&
            typeof message.id === "string" &&
            ["cliente", "profesional"].includes(message.sender) &&
            typeof message.text === "string" &&
            message.text.length <= 2000 &&
            Number.isFinite(message.sentAt) &&
            typeof message.clientRead === "boolean" &&
            typeof message.professionalRead === "boolean",
        ),
    )
  );
}

export function cancelPortfolioJob(portfolio: ClientPortfolio, requestKey: string): ClientPortfolio {
  return { ...portfolio, jobs: portfolio.jobs.map((job) => job.requestKey === requestKey && job.status !== "finalizado" ? { ...job, status: "cancelado" } : job) };
}
