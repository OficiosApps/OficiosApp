import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MarketLayout, MarketNotice, MarketErrorText } from "@/components/market-common";
import { useMarket, useRemote } from "@/hooks/use-market";
import { marketApi, fileUrl } from "@/lib/market-client";
export function LiveStaffPanel() {
  const { session } = useMarket();
  const { data, error, loading, refresh } = useRemote<any>("/staff", true);
  const [email, setEmail] = useState(""),
    [reason, setReason] = useState(""),
    [issue, setIssue] = useState(""),
    [busy, setBusy] = useState(false);
  async function review(user: any, decision: string) {
    setBusy(true);
    setIssue("");
    try {
      await marketApi("/staff/review", {
        method: "POST",
        body: JSON.stringify({ userId: user.id, version: user.version, decision, reason }),
      });
      setReason("");
      await refresh();
    } catch (cause) {
      setIssue(cause instanceof Error ? cause.message : "No se pudo revisar.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <MarketLayout
      title="Administración de Oficios"
      subtitle={`Cuenta autorizada como ${session.staffRole}.`}
    >
      {session.staffRole === "ceo" && (
        <Button asChild variant="outline" className="mb-5">
          <Link to="/ceo">Abrir gestión de planes, zonas y mapa de pedidos</Link>
        </Button>
      )}
      <MarketErrorText error={error || issue} />
      {loading ? (
        <MarketNotice>Cargando actividad…</MarketNotice>
      ) : (
        data && (
          <div className="space-y-8">
            <section>
              <h2 className="font-display text-xl font-semibold">Actividad de la plataforma</h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  ["Solicitudes", data.metrics.requests],
                  ["Con presupuesto", data.metrics.responded],
                  [
                    "Tiempo al primer presupuesto",
                    data.metrics.firstResponseMs === null
                      ? "Sin datos"
                      : `${Math.round(data.metrics.firstResponseMs / 60000)} min`,
                  ],
                  ["Contrataciones", data.metrics.hired],
                  ["Cancelaciones", data.metrics.cancelled],
                  ["Clientes que vuelven", data.metrics.returning],
                ].map(([title, value]) => (
                  <article key={String(title)} className="surface-panel p-5">
                    <p className="text-xs text-muted-foreground">{title}</p>
                    <p className="mt-3 font-display text-2xl font-semibold">{value}</p>
                  </article>
                ))}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Datos de solicitudes guardadas en la plataforma. Se muestran hasta las 1.000 más
                recientes; sin ejemplos precargados.
              </p>
            </section>
            <section className="space-y-5">
              <h2 className="font-display text-xl font-semibold">Revisión de identidad</h2>
              <Input
                aria-label="Motivo para pedir nueva carga"
                placeholder="Motivo al rechazar una carga (mínimo 5 caracteres)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
              {!data.reviews.length && (
                <MarketNotice>No hay identidades pendientes de revisión.</MarketNotice>
              )}
              {data.reviews
                .filter((u: any) => u.verification === "pendiente")
                .map((user: any) => (
                  <article key={user.id} className="surface-panel space-y-4 p-6">
                    <h3 className="font-semibold">{user.name}</h3>
                    <p className="text-sm">
                      {user.kind === "cliente"
                        ? "Cliente · selfie privada, sin DNI"
                        : `DNI: ${user.identity.dni} · ${user.kind}`}
                    </p>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      {(user.kind === "cliente"
                        ? [["Selfie de verificación", user.identity.clientSelfieId]]
                        : [
                            ...(user.kind === "profesional" && user.profilePhotoId
                              ? [["Foto de perfil", user.profilePhotoId]]
                              : []),
                            ["Frente", user.identity.frontId],
                            ["Dorso", user.identity.backId],
                            ["Foto de la cara", user.identity.selfieId],
                          ]
                      ).map(([label, id]) => (
                        <figure key={label}>
                          <img
                            src={fileUrl(id)}
                            alt={label}
                            className="h-52 w-full rounded-xl border border-border object-contain"
                          />
                          <figcaption className="mt-2 text-xs text-muted-foreground">
                            {label}
                          </figcaption>
                        </figure>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <Button
                        disabled={busy || (user.kind === "profesional" && !user.profilePhotoId)}
                        onClick={() => {
                          if (
                            window.confirm(
                              user.kind === "cliente"
                                ? "¿Confirmás que revisaste la selfie del cliente y aprobás esta carga?"
                                : "¿Confirmás que revisaste los archivos y la foto de perfil cuando corresponde, y aprobás esta identidad?",
                            )
                          )
                            void review(user, "aprobado");
                        }}
                      >
                        {user.kind === "cliente" ? "Aprobar selfie" : "Aprobar identidad"}
                      </Button>
                      <Button
                        disabled={busy || reason.trim().length < 5}
                        variant="outline"
                        onClick={() => void review(user, "rechazado")}
                      >
                        Solicitar nueva carga
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Revisión manual. No constituye una prueba biométrica ni una validación contra
                      un registro oficial.
                    </p>
                  </article>
                ))}
            </section>
            {session.staffRole !== "admin" && (
              <section className="surface-panel space-y-5 p-6">
                <h2 className="font-display text-xl font-semibold">
                  Invitar {session.staffRole === "ceo" ? "superadministrador" : "administrador"}
                </h2>
                <form
                  className="flex flex-wrap gap-3"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    try {
                      await marketApi("/staff/invite", {
                        method: "POST",
                        body: JSON.stringify({ email }),
                      });
                      setEmail("");
                      await refresh();
                    } catch (cause) {
                      setIssue(
                        cause instanceof Error ? cause.message : "No se pudo crear la invitación.",
                      );
                    }
                  }}
                >
                  <Input
                    aria-label="Correo de la invitación"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="max-w-md"
                  />
                  <Button>Crear invitación</Button>
                </form>
                <p className="text-xs text-muted-foreground">
                  Compartí el código con esa persona. Debe ingresar con el correo indicado y
                  aceptarlo desde su cuenta. Vigencia: 7 días.
                </p>
                <div className="space-y-3">
                  {data.invites.map((invite: any) => (
                    <article key={invite.id} className="rounded-xl border border-border p-4">
                      <p className="text-sm font-semibold">
                        {invite.email} · {invite.role}
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {invite.used_by
                          ? "Aceptada"
                          : invite.expires_at < Date.now()
                            ? "Vencida"
                            : "Pendiente"}
                      </p>
                      {!invite.used_by && invite.expires_at > Date.now() && (
                        <code className="mt-3 block break-all text-xs">{invite.id}</code>
                      )}
                    </article>
                  ))}
                </div>
              </section>
            )}
          </div>
        )
      )}
    </MarketLayout>
  );
}
