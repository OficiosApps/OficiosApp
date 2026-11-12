import type { MarketSession } from "@/lib/market-client";
export const managementRoles = {
  ceo: {
    label: "CEO",
    title: "Dirección de Oficios",
    description: "Definí el negocio, acompañá el crecimiento y organizá tu equipo de dirección.",
    home: "/ceo",
    color: "bg-emerald-950 text-emerald-50",
    badge: "bg-emerald-200 text-emerald-950",
    tasks: [
      "Planes y precios",
      "Referidos y beneficios",
      "Zonas y mapa de pedidos",
      "Superadministradores",
    ],
  },
  superadmin: {
    label: "Superadministrador",
    title: "Supervisión y equipo",
    description: "Coordiná a los administradores y seguí la operación de la plataforma.",
    home: "/superadmin",
    color: "bg-blue-950 text-blue-50",
    badge: "bg-blue-200 text-blue-950",
    tasks: [
      "Equipo de administradores",
      "Invitaciones y accesos",
      "Revisión de identidades",
      "Métricas de actividad",
    ],
  },
  admin: {
    label: "Administrador",
    title: "Centro de operaciones",
    description: "Revisá las identidades pendientes y acompañá la actividad diaria de Oficios.",
    home: "/admin",
    color: "bg-amber-950 text-amber-50",
    badge: "bg-amber-200 text-amber-950",
    tasks: [
      "Selfies de clientes",
      "DNI e identidad profesional",
      "Solicitudes de nueva carga",
      "Indicadores operativos",
    ],
  },
} as const;
export function managementHome(role: MarketSession["staffRole"]) {
  return role ? managementRoles[role].home : null;
}
