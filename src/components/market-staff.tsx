import { useState } from "react";
import { Mail, Users, ClipboardCheck, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { MarketNotice, MarketErrorText } from "@/components/market-common";
import { ManagementLayout } from "@/components/management-layout";
import { useMarket, useRemote } from "@/hooks/use-market";
import { marketApi, fileUrl } from "@/lib/market-client";
export function LiveStaffPanel() {
  const { session } = useMarket();
  const supervisor = session.staffRole === "superadmin";
  return (
    <ManagementLayout>
      <Tabs defaultValue={supervisor ? "equipo" : "revisiones"}>
        <TabsList className="h-auto flex-wrap gap-1">
          {supervisor && (
            <TabsTrigger value="equipo">
              <Users className="mr-2 size-4" />
              Mi equipo
            </TabsTrigger>
          )}
          <TabsTrigger value="revisiones">
            <ClipboardCheck className="mr-2 size-4" />
            {supervisor ? "Supervisar revisiones" : "Identidades pendientes"}
          </TabsTrigger>
          <TabsTrigger value="actividad">
            <Activity className="mr-2 size-4" />
            Actividad
          </TabsTrigger>
        </TabsList>
        {supervisor && (
          <TabsContent value="equipo" className="mt-6">
            <StaffWorkspace section="team" />
          </TabsContent>
        )}
        <TabsContent value="revisiones" className="mt-6">
          <StaffWorkspace section="reviews" />
        </TabsContent>
        <TabsContent value="actividad" className="mt-6">
          <StaffWorkspace section="metrics" />
        </TabsContent>
      </Tabs>
    </ManagementLayout>
  );
}
export function StaffWorkspace({ section }: { section: "team" | "reviews" | "metrics" }) {
  const { session } = useMarket();
  const { data, error, loading, refresh } = useRemote<any>(
    session.staffRole ? "/staff" : null,
    true,
  );
  const [email, setEmail] = useState(""),
    [reason, setReason] = useState(""),
    [issue, setIssue] = useState(""),
    [notice, setNotice] = useState(""),
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
  async function send(id?: string) {
    setBusy(true);
    setIssue("");
    setNotice("");
    try {
      const result = await marketApi(id ? "/staff/invite/resend" : "/staff/invite", {
        method: "POST",
        body: JSON.stringify(id ? { id } : { email }),
      });
      setNotice(result.delivery.message);
      if (!id) setEmail("");
      await refresh();
    } catch (cause) {
      setIssue(cause instanceof Error ? cause.message : "No se pudo enviar la invitación.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-6">
      <MarketErrorText error={error || issue} />
      {notice && <MarketNotice>{notice}</MarketNotice>}
      {loading ? (
        <MarketNotice>Cargando la operación…</MarketNotice>
      ) : (
        data && (
          <>
            {section === "metrics" && (
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
            )}
            {section === "reviews" && (
              <section className="space-y-5">
                <h2 className="font-display text-xl font-semibold">Revisión de identidad</h2>
                <Input
                  aria-label="Motivo para pedir nueva carga"
                  placeholder="Motivo al rechazar una carga (mínimo 5 caracteres)"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
                {!data.reviews.some((user: any) => user.verification === "pendiente") && (
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
                        Revisión manual. No constituye una prueba biométrica ni una validación
                        contra un registro oficial.
                      </p>
                    </article>
                  ))}
              </section>
            )}
            {section === "team" && session.staffRole !== "admin" && (
              <>
                <section className="surface-panel space-y-5 p-6">
                  <div className="flex items-center gap-3">
                    <Mail className="size-5 text-primary" />
                    <h2 className="font-display text-xl font-semibold">
                      Invitar {session.staffRole === "ceo" ? "superadministrador" : "administrador"}
                    </h2>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Recibirá un correo con un enlace para aceptar e ingresar al equipo. La
                    invitación dura 7 días.
                  </p>
                  {!data.mail?.configured && (
                    <MarketNotice>
                      El envío de correo todavía no está activado. Las invitaciones se guardan, pero
                      no se envían. {data.mail?.issue && data.deliveryMessages?.[data.mail.issue]}{" "}
                      {session.staffRole === "ceo"
                        ? "Completá la configuración de correo de abajo."
                        : "Pedile al CEO que active el correo de la plataforma."}
                    </MarketNotice>
                  )}
                  <form
                    className="flex flex-wrap gap-3"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void send();
                    }}
                  >
                    <Input
                      aria-label="Correo de la invitación"
                      placeholder="persona@gmail.com"
                      type="email"
                      required
                      maxLength={200}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="max-w-md"
                      disabled={busy}
                    />
                    <Button disabled={busy}>
                      {busy
                        ? "Procesando…"
                        : data.mail?.configured
                          ? "Crear y enviar invitación"
                          : "Guardar invitación pendiente"}
                    </Button>
                  </form>
                  <div className="space-y-3">
                    {!data.invites.length && (
                      <p className="text-sm text-muted-foreground">
                        Todavía no creaste invitaciones.
                      </p>
                    )}
                    {data.invites.map((invite: any) => (
                      <article
                        key={invite.id}
                        className="space-y-3 rounded-xl border border-border p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="break-all text-sm font-semibold">{invite.email}</p>
                          <span className="rounded-full bg-secondary px-3 py-1 text-xs">
                            {invite.used_by
                              ? "Aceptada"
                              : invite.expires_at <= Date.now()
                                ? "Vencida"
                                : (
                                    {
                                      pending: "Pendiente de envío",
                                      sending: "Procesando envío",
                                      sent: "Envío aceptado por Brevo",
                                      failed: "Envío rechazado",
                                      uncertain: "Envío sin confirmar",
                                    } as Record<string, string>
                                  )[invite.delivery_status]}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Acceso de{" "}
                          {invite.role === "superadmin" ? "superadministrador" : "administrador"} ·
                          Vence: {new Date(invite.expires_at).toLocaleDateString("es-AR")}
                        </p>
                        {invite.delivery_sent_at && (
                          <p className="text-xs text-muted-foreground">
                            Último envío aceptado:{" "}
                            {new Date(invite.delivery_sent_at).toLocaleString("es-AR")}. No confirma
                            la recepción en la bandeja.
                          </p>
                        )}
                        {invite.delivery_error && !invite.used_by && (
                          <p className="text-xs text-destructive">
                            {data.deliveryMessages?.[invite.delivery_error] ||
                              "No se pudo enviar el correo."}
                          </p>
                        )}
                        {!invite.used_by && invite.expires_at > Date.now() && (
                          <div className="flex flex-wrap gap-3">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={
                                busy ||
                                !data.mail?.configured ||
                                (invite.delivery_attempted_at &&
                                  Date.now() - invite.delivery_attempted_at <
                                    (invite.delivery_status === "sending" ? 120000 : 60000))
                              }
                              onClick={() => {
                                if (
                                  invite.delivery_status === "uncertain" &&
                                  !window.confirm(
                                    "El envío anterior no se pudo confirmar. Reenviar podría generar otro correo. ¿Querés continuar?",
                                  )
                                )
                                  return;
                                void send(invite.id);
                              }}
                            >
                              {invite.delivery_status === "sent"
                                ? "Reenviar correo"
                                : "Enviar correo"}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={async () => {
                                try {
                                  await navigator.clipboard.writeText(
                                    `${window.location.origin}/gestion?invitacion=${encodeURIComponent(invite.id)}`,
                                  );
                                  setNotice(
                                    "Enlace copiado. Sólo puede aceptarlo el correo invitado.",
                                  );
                                } catch {
                                  setIssue(
                                    "No pudimos copiar el enlace. Habilitá el portapapeles del navegador.",
                                  );
                                }
                              }}
                            >
                              Copiar enlace
                            </Button>
                          </div>
                        )}
                      </article>
                    ))}
                  </div>
                </section>
                <section className="surface-panel space-y-4 p-6">
                  <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
                    <Users className="size-5 text-primary" />
                    {session.staffRole === "ceo"
                      ? "Tus superadministradores"
                      : "Tus administradores"}
                  </h2>
                  {!data.team?.length ? (
                    <p className="text-sm text-muted-foreground">
                      Tu equipo aparecerá acá cuando acepte las invitaciones.
                    </p>
                  ) : (
                    data.team.map((member: any) => (
                      <article
                        key={member.user_id}
                        className="flex flex-wrap justify-between gap-2 rounded-xl border border-border p-4 text-sm"
                      >
                        <span className="break-all font-medium">{member.email}</span>
                        <span className="text-muted-foreground">
                          {member.role === "superadmin" ? "Superadministrador" : "Administrador"} ·
                          Activo
                        </span>
                      </article>
                    ))
                  )}
                </section>
                {session.staffRole === "ceo" && (
                  <section className="surface-panel space-y-3 p-6">
                    <h2 className="font-display text-xl font-semibold">Correo de la plataforma</h2>
                    <p className="text-sm text-muted-foreground">
                      Proveedor: Brevo · Remitente: {data.mail?.from || "Sin configurar"} ·{" "}
                      {data.mail?.configured
                        ? "Configuración cargada; cada envío confirma si Brevo lo acepta."
                        : "Falta activar el correo."}
                    </p>
                    {!data.mail?.configured && (
                      <ol className="list-inside list-decimal space-y-2 text-sm text-muted-foreground">
                        <li>
                          Creá tu cuenta en{" "}
                          <a
                            className="underline"
                            href="https://www.brevo.com/"
                            target="_blank"
                            rel="noreferrer"
                          >
                            Brevo
                          </a>{" "}
                          y activá el correo transaccional.
                        </li>
                        <li>Agregá y verificá el remitente pqroficiosapp@gmail.com.</li>
                        <li>
                          En Railway → OficiosApp → Variables, guardá la clave de Brevo como{" "}
                          <code>BREVO_API_KEY</code> y el remitente como <code>MAIL_FROM</code>.
                        </li>
                        <li>Esperá el despliegue y volvé a enviar la invitación pendiente.</li>
                      </ol>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Las claves se cargan únicamente en Railway. Con Gmail, Brevo puede sustituir
                      la dirección de envío; las respuestas se dirigen al remitente configurado.
                    </p>
                  </section>
                )}
              </>
            )}
          </>
        )
      )}
    </div>
  );
}
