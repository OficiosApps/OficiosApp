// Public entry pages do not grant a role. Internal tools stay closed until
// server-managed roles are connected; there is no client-side role switch.
export const internalAreas = [
  "ceo",
  "admin",
  "superadmin",
  "equipo",
  "panel-profesional",
  "panel-empresa",
  "metodos-de-pago",
  "planes-profesionales",
];
export function isInternalPath(pathname) {
  try {
    const path = decodeURIComponent(pathname).replace(/\/{2,}/g, "/");
    return internalAreas.some((area) => new RegExp(`^/${area}(?:/|\\.html$|$)`, "i").test(path));
  } catch {
    return true;
  }
}
