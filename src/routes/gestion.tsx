import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { z } from "zod";
import { ShieldCheck, Wrench, ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { useMarket } from "@/hooks/use-market";
import { managementHome } from "@/lib/management-access";
import { marketApi } from "@/lib/market-client";
import { MarketErrorText, MarketNotice } from "@/components/market-common";
import { Button } from "@/components/ui/button";
export const Route = createFileRoute("/gestion")({
  validateSearch: z.object({ invitacion: z.string().uuid().optional().catch(undefined) }),
  head: () => ({
    meta: [
      { title: "Acceso al equipo | Oficios" },
      { name: "robots", content: "noindex, nofollow" },
      { name: "referrer", content: "no-referrer" },
    ],
  }),
  component: ManagementEntry,
});
function ManagementEntry() {
  const { invitacion: requestedInvitation } = Route.useSearch();
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const invitacion = hydrated ? requestedInvitation : undefined;
  const { session, loading, error, refresh } = useMarket();
  const [busy, setBusy] = useState(false),
    [issue, setIssue] = useState("");
  const home = managementHome(session.staffRole);
  if (!loading && home) return <Navigate to={home} replace />;
  const returnTo = invitacion
    ? `/gestion?invitacion=${encodeURIComponent(invitacion)}`
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
            {invitacion ? "Tenés una invitación al equipo" : "Ingresar a gestión"}
          </h2>
          <MarketErrorText error={error || issue} />
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
              {invitacion ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    Aceptá la invitación para activar tu acceso. Sólo funciona con el correo al que
                    fue enviada.
                  </p>
                  <Button
                    className="w-full"
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      setIssue("");
                      try {
                        await marketApi("/invites/accept", {
                          method: "POST",
                          body: JSON.stringify({ id: invitacion }),
                        });
                        await refresh();
                      } catch (cause) {
                        setIssue(
                          cause instanceof Error
                            ? cause.message
                            : "No se pudo aceptar la invitación.",
                        );
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    {busy ? "Activando acceso…" : "Aceptar invitación y entrar"}
                  </Button>
                </>
              ) : (
                <MarketNotice>
                  Este correo todavía no tiene acceso al equipo. Abrí el enlace de tu invitación o
                  pedí una al responsable correspondiente.
                </MarketNotice>
              )}
              <form method="post" action="/auth/logout">
                <Button type="submit" variant="outline" className="w-full">
                  Salir para usar otra cuenta
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
