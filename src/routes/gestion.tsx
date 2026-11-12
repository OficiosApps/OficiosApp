import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { z } from "zod";
import { ShieldCheck, Wrench, ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { useMarket, useRemote } from "@/hooks/use-market";
import { managementHome } from "@/lib/management-access";
import { marketApi } from "@/lib/market-client";
import { MarketErrorText, MarketNotice } from "@/components/market-common";
import { Button } from "@/components/ui/button";
export const Route = createFileRoute("/gestion")({
  validateSearch: z.object({ invitacion: z.string().max(200).optional().catch("invalid") }),
  head: () => ({
    meta: [
      { title: "Acceso al equipo | Oficios" },
      { name: "robots", content: "noindex, nofollow" },
      { name: "referrer", content: "strict-origin" },
    ],
  }),
  component: ManagementEntry,
});
function ManagementEntry() {
  const { invitacion: requestedInvitation } = Route.useSearch();
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const invitacion = hydrated ? requestedInvitation : undefined;
  const { session, loading, error } = useMarket();
  const hasInvitation = requestedInvitation !== undefined;
  const home = managementHome(session.staffRole);
  // An invitation always takes priority over the browser's existing staff session.
  if (hydrated && !loading && !error && !hasInvitation && home)
    return <Navigate to={home} replace />;
  const returnTo = hasInvitation
    ? `/gestion?invitacion=${encodeURIComponent(invitacion ?? requestedInvitation ?? "invalid")}`
    : "/gestion";
  return (
    <div className="min-h-screen bg-secondary/30">
      <header className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-6">
        <Link to="/" className="flex items-center gap-2 font-display text-xl font-semibold">
          <Wrench className="size-6 text-primary" />
          Oficios
        </Link>
        <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground">
          <ArrowLeft className="size-4" />
          Volver al sitio
        </Link>
      </header>
      <main className="mx-auto grid max-w-5xl gap-10 px-5 py-12 md:grid-cols-2 md:items-center md:py-24">
        <section>
          <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
            <ShieldCheck className="size-4" />
            Equipo de Oficios
          </span>
          <h1 className="mt-6 font-display text-4xl font-semibold sm:text-5xl">
            El equipo tiene su propio espacio.
          </h1>
          <p className="mt-5 leading-relaxed text-muted-foreground">
            Ingresá con tu correo autorizado. Te llevamos directamente a las herramientas que
            corresponden a tu rol.
          </p>
          <p className="mt-5 text-sm text-muted-foreground">
            Los superadministradores reciben su invitación del CEO. Los administradores, de un
            superadministrador.
          </p>
        </section>
        <section className="surface-panel space-y-5 p-6 sm:p-8">
          <h2 className="font-display text-2xl font-semibold">
            {invitacion !== undefined ? "Tenés una invitación al equipo" : "Ingresar a gestión"}
          </h2>
          <MarketErrorText error={error} />
          {loading ? (
            <MarketNotice>Comprobando tu acceso…</MarketNotice>
          ) : !session.authenticated ? (
            <>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Usá la cuenta de Google que recibió la invitación. No necesitás crear un perfil de
                cliente.
              </p>
              <Button asChild size="lg" className="w-full">
                <a href={`/auth/google?return_to=${encodeURIComponent(returnTo)}`} target="_top">
                  Continuar con Google
                </a>
              </Button>
            </>
          ) : (
            <>
              <p className="break-all text-sm text-muted-foreground">
                Ingresaste como <strong>{session.identity?.email}</strong>.
              </p>
              {hasInvitation ? (
                hydrated && invitacion !== undefined ? (
                  <InvitationAcceptance id={invitacion} returnTo={returnTo} />
                ) : (
                  <MarketNotice>Comprobando invitación…</MarketNotice>
                )
              ) : (
                <MarketNotice>
                  {session.staffAccessPaused
                    ? "Tu acceso de gestión está pausado. Contactá al responsable de tu equipo para que lo revise."
                    : "Este correo todavía no tiene acceso al equipo. Abrí el enlace de tu invitación o pedí una al responsable correspondiente."}
                </MarketNotice>
              )}
              <form
                method="post"
                target="_top"
                action={`/auth/logout?return_to=${encodeURIComponent(`/auth/google?return_to=${encodeURIComponent(returnTo)}`)}`}
              >
                <Button type="submit" variant="outline" className="w-full">
                  Salir y elegir otra cuenta de Google
                </Button>
              </form>
            </>
          )}
          <p className="text-xs leading-relaxed text-muted-foreground">
            El acceso se valida en el servidor. Iniciar sesión no otorga permisos de administración.
          </p>
        </section>
      </main>
    </div>
  );
}

type InvitationPreview = {
  role: "superadmin" | "admin";
  maskedEmail: string;
  email: string | null;
  matchesEmail: boolean;
  status: "pending" | "accepted" | "expired";
  acceptedByYou: boolean;
  canAccept: boolean;
  message: string;
};
function InvitationAcceptance({ id, returnTo }: { id: string; returnTo: string }) {
  const { session } = useMarket();
  // A new identity requires a fresh preview, including after a Google account change.
  const path = `/invites/preview?id=${encodeURIComponent(id)}&account=${encodeURIComponent(session.identity?.email || "")}`;
  const { data, loading, error, refresh } = useRemote<InvitationPreview>(path);
  const [busy, setBusy] = useState(false),
    [issue, setIssue] = useState("");
  const roleLabel = data?.role === "superadmin" ? "superadministrador" : "administrador";
  const home = managementHome(session.staffRole);
  async function accept() {
    setBusy(true);
    setIssue("");
    try {
      const result = await marketApi<{ role: string; next: string }>("/invites/accept", {
        method: "POST",
        body: JSON.stringify({ id }),
      });
      const next =
        result.role === "superadmin" ? "/superadmin" : result.role === "admin" ? "/admin" : null;
      if (!next || result.next !== next)
        throw new Error("No pudimos confirmar el panel asignado. Actualizá el acceso.");
      // Reload the authorized page so no cached role from another account can select the panel.
      window.location.assign(next);
    } catch (cause) {
      setIssue(cause instanceof Error ? cause.message : "No se pudo aceptar la invitación.");
      setBusy(false);
      await refresh();
    }
  }
  return (
    <div className="space-y-4">
      <MarketErrorText error={error || issue} />
      {loading ? (
        <MarketNotice>Comprobando el correo y la invitación…</MarketNotice>
      ) : (
        data && (
          <>
            <div className="rounded-xl bg-secondary/70 p-4 text-sm">
              <p className="font-semibold">Invitación de {roleLabel}</p>
              <p className="mt-2 text-muted-foreground">
                Correo invitado: <strong>{data.email || data.maskedEmail}</strong>
              </p>
              <p className="mt-3">{data.message}</p>
            </div>
            {data.canAccept && (
              <Button className="w-full" disabled={busy} onClick={() => void accept()}>
                {busy ? "Activando acceso…" : "Aceptar invitación y entrar"}
              </Button>
            )}
            {data.acceptedByYou && home && (
              <Button asChild className="w-full">
                <Link to={home}>
                  Entrar a mi panel de{" "}
                  {session.staffRole === "superadmin"
                    ? "superadministrador"
                    : session.staffRole === "admin"
                      ? "administrador"
                      : "CEO"}
                </Link>
              </Button>
            )}
            {!data.matchesEmail && (
              <Button asChild className="w-full">
                <a href={`/auth/google?return_to=${encodeURIComponent(returnTo)}`} target="_top">
                  Elegir la cuenta invitada en Google
                </a>
              </Button>
            )}
            {session.staffRole && !data.acceptedByYou && (
              <p className="text-xs leading-relaxed text-muted-foreground">
                Tu sesión actual es de{" "}
                {session.staffRole === "ceo"
                  ? "CEO"
                  : session.staffRole === "superadmin"
                    ? "superadministrador"
                    : "administrador"}
                . Abrir este enlace no cambia ese rol ni acepta la invitación por otra persona.
              </p>
            )}
          </>
        )
      )}
    </div>
  );
}
