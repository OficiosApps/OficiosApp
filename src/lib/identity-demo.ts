export type IdentityStatus = "missing" | "pending" | "approved" | "rejected";
export type IdentityRecord = {
  subjectId: string;
  name: string;
  dni: string;
  frontId: string;
  backId: string;
  selfieId: string;
  status: Exclude<IdentityStatus, "missing">;
  reason: string;
  submittedAt: number;
  reviewedAt: number | null;
};
export const identityLabels: Record<IdentityStatus, string> = {
  missing: "Identidad sin completar",
  pending: "Pendiente de revisión",
  approved: "Identidad aprobada",
  rejected: "Necesita nueva carga",
};
export function validDni(value: string): boolean {
  return /^\d{7,8}$/.test(value.trim());
}
export function identityReady(record: IdentityRecord | undefined): boolean {
  return record?.status === "approved";
}
export function validateIdentitySubmission(input: {
  dni: string;
  front: Blob | null;
  back: Blob | null;
  selfie: Blob | null;
  consent: boolean;
}) {
  if (!validDni(input.dni)) throw new Error("Ingresá un DNI de 7 u 8 números, sin puntos.");
  if (!input.front || !input.back || !input.selfie)
    throw new Error("El frente, el dorso del DNI y la selfie son obligatorios.");
  if (!input.consent) throw new Error("Necesitamos tu autorización para revisar la identidad.");
}
export function reviewIdentity(
  record: IdentityRecord,
  approved: boolean,
  reason: string,
): IdentityRecord {
  if (record.status !== "pending") throw new Error("Esta carga ya fue revisada.");
  if (!approved && reason.trim().length < 5)
    throw new Error("Indicá por qué hay que volver a cargar la documentación.");
  return {
    ...record,
    status: approved ? "approved" : "rejected",
    reason: approved ? "" : reason.trim(),
    reviewedAt: Date.now(),
  };
}
