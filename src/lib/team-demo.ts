export type TeamRole = "ceo" | "superadmin" | "admin";
export type InvitedRole = Exclude<TeamRole, "ceo">;

export type TeamInvitation = {
  id: string;
  name: string;
  email: string;
  role: InvitedRole;
  cityId: string;
  invitedBy: string;
  invitedByRole: "ceo" | "superadmin";
  expiresAt: number;
  status: "pending" | "active" | "revoked";
};

export const teamRoleLabels: Record<TeamRole, string> = {
  ceo: "CEO",
  superadmin: "Superadministrador",
  admin: "Administrador",
};

export function allowedInviteRole(actor: TeamRole): InvitedRole | null {
  return actor === "ceo" ? "superadmin" : actor === "superadmin" ? "admin" : null;
}

export function invitationStatus(invitation: TeamInvitation, now = Date.now()) {
  if (invitation.status === "pending" && invitation.expiresAt <= now) return "expired";
  return invitation.status;
}

export function createInvitation(
  actor: TeamRole,
  input: { name: string; email: string; cityId: string; invitedBy: string },
  existing: TeamInvitation[],
  id: string,
  now = Date.now(),
): TeamInvitation {
  const role = allowedInviteRole(actor);
  if (!role || actor === "admin")
    throw new Error("Los administradores no pueden dar de alta al equipo.");
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  if (name.length < 2) throw new Error("Ingresá el nombre y apellido de la persona.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Ingresá un correo válido.");
  if (role === "admin" && !input.cityId) throw new Error("Elegí la ciudad del administrador.");
  if (
    existing.some(
      (item) =>
        item.email.toLowerCase() === email &&
        ["pending", "active"].includes(invitationStatus(item, now)),
    )
  ) {
    throw new Error("Ese correo ya tiene una cuenta o una invitación pendiente.");
  }
  return {
    id,
    name,
    email,
    role,
    cityId: role === "superadmin" ? "todas" : input.cityId,
    invitedBy: input.invitedBy,
    invitedByRole: actor,
    status: "pending",
    expiresAt: now + 7 * 24 * 60 * 60 * 1000,
  };
}

export function activateInvitation(
  invitation: TeamInvitation,
  name: string,
  now = Date.now(),
): TeamInvitation {
  if (invitationStatus(invitation, now) !== "pending")
    throw new Error("Esta invitación ya no está disponible.");
  if (allowedInviteRole(invitation.invitedByRole) !== invitation.role)
    throw new Error("La invitación no tiene un rol válido.");
  if (name.trim().length < 2) throw new Error("Completá tu nombre y apellido.");
  return { ...invitation, name: name.trim(), status: "active" };
}

export function initialInvitations(now = Date.now()): TeamInvitation[] {
  const superadmin = createInvitation(
    "ceo",
    {
      name: "Camila Torres",
      email: "camila@ejemplo.com",
      cityId: "todas",
      invitedBy: "Dirección de Oficios",
    },
    [],
    "demo-superadmin",
    now,
  );
  const admin = createInvitation(
    "superadmin",
    {
      name: "Nicolás Pérez",
      email: "nicolas@ejemplo.com",
      cityId: "mercedes-ba",
      invitedBy: "Camila Torres",
    },
    [superadmin],
    "demo-admin",
    now,
  );
  return [superadmin, admin];
}

export function isTeamInvitation(value: unknown): value is TeamInvitation {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item["id"] === "string" &&
    typeof item["name"] === "string" &&
    typeof item["email"] === "string" &&
    typeof item["cityId"] === "string" &&
    typeof item["invitedBy"] === "string" &&
    typeof item["expiresAt"] === "number" &&
    Number.isFinite(item["expiresAt"]) &&
    ["pending", "active", "revoked"].includes(String(item["status"])) &&
    ((item["invitedByRole"] === "ceo" && item["role"] === "superadmin") ||
      (item["invitedByRole"] === "superadmin" && item["role"] === "admin"))
  );
}
