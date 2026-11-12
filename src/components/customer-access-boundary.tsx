import { managementHome } from "@/lib/management-access";
import { Link, Navigate, Outlet, useLocation } from "@tanstack/react-router";
import { isInternalPath } from "@/lib/customer-access.js";
import { useMarket } from "@/hooks/use-market";
import { MarketLayout, MarketNotice, MarketErrorText } from "@/components/market-common";
import { LiveProfessionalPanel, LivePaymentMethods } from "@/components/market-professional";
import { LiveCeoPanel } from "@/components/market-ceo";
import { LiveStaffPanel } from "@/components/market-staff";
import { LivePlans } from "@/components/market-plans";
import { Button } from "@/components/ui/button";
export function CustomerAccessBoundary() {
  const { pathname } = useLocation();
  const { session, loading, error } = useMarket();
  if (!isInternalPath(pathname)) return <Outlet />;
  if (loading)
    return (
      <MarketLayout title="Tu espacio en Oficios">
        <MarketNotice>Cargando tu cuenta…</MarketNotice>
      </MarketLayout>
    );
  if (error)
    return (
      <MarketLayout title="Tu espacio en Oficios">
        <MarketErrorText error={error} />
      </MarketLayout>
    );
  if (pathname.startsWith("/ceo"))
    return session.staffRole === "ceo" ? (
      <LiveCeoPanel />
    ) : (
      <MarketLayout title="Acceso restringido">
        <MarketNotice>Este espacio está reservado a la cuenta CEO.</MarketNotice>
      </MarketLayout>
    );
  const staff = /^\/(admin|superadmin|equipo)(\/|$)/.test(pathname);
  if (
    staff &&
    session.staffRole &&
    (!pathname.startsWith("/superadmin") || session.staffRole !== "admin")
  )
    return pathname !== managementHome(session.staffRole) ? (
      <Navigate to={managementHome(session.staffRole)!} replace />
    ) : (
      <LiveStaffPanel />
    );
  if (
    !staff &&
    session.account &&
    session.account.kind !== "cliente" &&
    (!pathname.startsWith("/planes-profesionales") || session.account.kind === "profesional") &&
    (!pathname.startsWith("/panel-empresa") || session.account.kind === "empresa")
  ) {
    if (pathname.startsWith("/metodos-de-pago"))
      return (
        <MarketLayout title="Mis métodos de cobro">
          <LivePaymentMethods />
        </MarketLayout>
      );
    if (pathname.startsWith("/planes-profesionales"))
      return (
        <MarketLayout title="Planes para profesionales">
          <LivePlans />
        </MarketLayout>
      );
    return <LiveProfessionalPanel />;
  }
  return (
    <MarketLayout title={session.authenticated ? "Acceso restringido" : "Ingresá a tu cuenta"}>
      <MarketNotice>
        {session.account
          ? "Este espacio no corresponde a los permisos de tu cuenta."
          : "Ingresá y completá tu cuenta profesional para acceder a tu panel."}
      </MarketNotice>
      <Button asChild className="mt-5">
        <Link to="/cuenta">Ir a mi cuenta</Link>
      </Button>
    </MarketLayout>
  );
}
