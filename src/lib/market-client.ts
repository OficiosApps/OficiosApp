export type MarketAccount = {
  id: string;
  name: string;
  kind: "cliente" | "profesional" | "empresa";
  cityId: string;
  cityName?: string;
  trade: string;
  bio: string;
  verification: string;
  logoId: string | null;
  profilePhotoId: string | null;
  phone: string;
  version: number;
  identity: Record<string, any>;
  profile: Record<string, any>;
};
export type MarketSession = {
  authenticated: boolean;
  identity: { name: string; email: string } | null;
  account: MarketAccount | null;
  staffRole: "ceo" | "superadmin" | "admin" | null;
};
export type MarketJob = {
  id: string;
  clientId: string;
  clientName: string;
  category: string;
  cityId: string;
  service: string;
  description: string;
  location?: { lat: number; lng: number; source?: string } | null;
  address: string;
  contact: string;
  when: string;
  type: string;
  photoIds: string[];
  state: string;
  professionalId: string | null;
  professionalName: string | null;
  acceptedQuoteId: string | null;
  visit: { date: string; time: string } | null;
  quotes: MarketProposal[];
  messages: {
    id: string;
    professionalId: string;
    senderId: string;
    senderName: string;
    text: string;
    at: number;
  }[];
  events: { state: string; at: number }[];
  cancellationReason: string;
  version: number;
  createdAt: number;
  assignment?: {
    name: string;
    date: string;
    time: string;
    minutes: number;
    memberId: string;
    userId: string;
  };
  paymentMethods?: any[];
};
export type MarketRevision = {
  version: number;
  labor: number;
  materials: number;
  visit: number;
  days: number;
  warrantyMonths: number;
  notes: string;
  decision: string;
};
export type MarketProposal = {
  id: string;
  professionalId: string;
  professionalName: string;
  acceptedVersion: number | null;
  revisions: MarketRevision[];
};
export async function marketApi<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api/market${path}`, {
    credentials: "same-origin",
    cache: "no-store",
    ...options,
    headers: {
      ...(options.body instanceof FormData ? {} : { "content-type": "application/json" }),
      ...options.headers,
    },
  });
  let payload: any;
  try {
    payload = await response.json();
  } catch {
    throw new Error("No pudimos conectar con Oficios. Intentá nuevamente.");
  }
  if (!response.ok) throw new Error(payload.error ?? "No pudimos completar la operación.");
  return payload as T;
}
export async function uploadMarketImage(file: File, scope: string) {
  const form = new FormData();
  form.set("file", file);
  form.set("scope", scope);
  return (await marketApi<{ id: string }>("/upload", { method: "POST", body: form })).id;
}
export const fileUrl = (id: string) => `/api/market/files/${encodeURIComponent(id)}`;
export const marketMoney = (cents: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 2,
  }).format(cents / 100);
export const marketStates: Record<string, string> = {
  solicitado: "Solicitado",
  presupuestado: "Presupuestado",
  contratado: "Contratado",
  "visita-confirmada": "Visita confirmada",
  "en-curso": "En curso",
  finalizado: "Finalizado",
  cancelado: "Cancelado",
};
