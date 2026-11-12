import { OrdersMap } from "@/components/orders-map";
import { CompanyAssignment } from "@/components/market-professional";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DetailedQuoteForm } from "@/components/detailed-quotes";
import { MarketErrorText, MarketGate, MarketNotice } from "@/components/market-common";
import { useMarket, useRemote } from "@/hooks/use-market";
import {
  marketApi,
  marketMoney,
  marketStates,
  fileUrl,
  type MarketJob,
  type MarketRevision,
} from "@/lib/market-client";
import { localToday } from "@/lib/request-planning";
export function MarketJobList({
  contacts = false,
  professional = false,
}: {
  contacts?: boolean;
  professional?: boolean;
}) {
  const { session } = useMarket();
  const { data, loading, error, refresh } = useRemote<{ jobs: MarketJob[] }>(
    session.account ? (professional ? "/jobs?scope=provider" : "/jobs?scope=client") : null,
    true,
  );
  const jobs = (data?.jobs ?? []).filter((j) => !contacts || Boolean(j.professionalId));
  return (
    <MarketGate>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {contacts
            ? "Tus contactos y los trabajos que hicieron juntos."
            : "Consultá presupuestos, mensajes y el estado de tus trabajos."}
        </p>
        <Button size="sm" variant="outline" onClick={() => void refresh()}>
          Actualizar
        </Button>
      </div>
      <MarketErrorText error={error} />
      {loading ? (
        <MarketNotice>Cargando solicitudes…</MarketNotice>
      ) : !jobs.length ? (
        <section className="surface-panel p-10 text-center">
          <h2 className="font-display text-xl font-semibold">
            {contacts ? "Todavía no contrataste a un profesional" : "Todavía no tenés solicitudes"}
          </h2>
          <p className="mt-3 text-sm text-muted-foreground">
            {contacts
              ? "Después de contratar, vas a poder volver a escribirle desde acá."
              : "Tu próximo trabajo empieza contando qué necesitás."}
          </p>
          <Button asChild className="mt-6">
            <Link to="/solicitud">Pedir un servicio</Link>
          </Button>
        </section>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {jobs.map((job) => (
            <article key={job.id} className="surface-panel space-y-4 p-5">
              <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-primary">
                {marketStates[job.state]}
              </span>
              <h2 className="font-display text-xl font-semibold">
                {contacts ? job.professionalName : job.service}
              </h2>
              <p className="text-sm text-muted-foreground">{contacts ? job.service : job.when}</p>
              <p className="text-xs text-muted-foreground">
                {new Intl.DateTimeFormat("es-AR", {
                  dateStyle: "short",
                  timeZone: "America/Buenos_Aires",
                }).format(job.createdAt)}{" "}
                · {job.quotes.length} presupuestos
              </p>
              <Button asChild variant="outline">
                <Link to="/solicitudes/$id" params={{ id: "nueva" }} search={{ solicitud: job.id }}>
                  {contacts ? "Ver historial y escribir" : "Abrir seguimiento y mensajes"}
                </Link>
              </Button>
            </article>
          ))}
        </div>
      )}
    </MarketGate>
  );
}
export function LiveQuote({ value }: { value: MarketRevision }) {
  return (
    <div className="rounded-xl border border-border bg-secondary/30 p-4">
      <dl className="space-y-2 text-sm">
        {[
          ["Mano de obra", value.labor],
          ["Materiales", value.materials],
          ["Visita", value.visit],
          ["Total", value.labor + value.materials + value.visit],
        ].map(([label, amount]) => (
          <div key={label} className="flex justify-between gap-4">
            <dt>{label}</dt>
            <dd className={label === "Total" ? "font-semibold" : ""}>
              {marketMoney(Number(amount))}
            </dd>
          </div>
        ))}
        <div className="flex justify-between gap-3 border-t border-border pt-3">
          <dt>Plazo estimado</dt>
          <dd>{value.days} días</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt>Garantía</dt>
          <dd>{value.warrantyMonths} meses</dd>
        </div>
      </dl>
      {value.notes && (
        <p className="mt-4 whitespace-pre-wrap text-xs text-muted-foreground">{value.notes}</p>
      )}
    </div>
  );
}
export function MarketJobDetail({ id }: { id: string }) {
  const { session } = useMarket();
  const { data, loading, error, refresh } = useRemote<{ job: MarketJob }>(
    session.account && id ? `/jobs/${encodeURIComponent(id)}` : null,
    true,
  );
  const [issue, setIssue] = useState(""),
    [busy, setBusy] = useState(false),
    [date, setDate] = useState(""),
    [time, setTime] = useState(""),
    [reason, setReason] = useState(""),
    [message, setMessage] = useState(""),
    [chatPro, setChatPro] = useState("");
  const job = data?.job,
    client = job?.clientId === session.account?.id;
  async function action(input: Record<string, unknown>) {
    if (!job) return;
    setBusy(true);
    setIssue("");
    try {
      await marketApi(`/jobs/${encodeURIComponent(job.id)}`, {
        method: "POST",
        body: JSON.stringify({ ...input, version: job.version }),
      });
      await refresh();
      return true;
    } catch (cause) {
      setIssue(cause instanceof Error ? cause.message : "No pudimos guardar el cambio.");
      return false;
    } finally {
      setBusy(false);
    }
  }
  return (
    <MarketGate>
      {loading ? (
        <MarketNotice>Cargando tu trabajo…</MarketNotice>
      ) : error ? (
        <MarketErrorText error={error} />
      ) : !job ? (
        <MarketNotice>
          Elegí una solicitud desde Mis solicitudes para consultar su seguimiento.
        </MarketNotice>
      ) : (
        <div className="space-y-7">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              Solicitud {job.id.slice(0, 8)}
            </p>
            <h2 className="mt-3 font-display text-2xl font-semibold">{job.service}</h2>
            <p className="mt-3 text-sm text-muted-foreground">
              {job.when} · {job.professionalName ?? "Esperando propuestas"}
            </p>
          </div>
          <ol className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {[
              "solicitado",
              "presupuestado",
              "contratado",
              "visita-confirmada",
              "en-curso",
              "finalizado",
            ].map((state, i) => (
              <li
                key={state}
                className={`rounded-xl border p-3 text-xs ${job.events.some((e) => e.state === state) ? "border-primary bg-secondary font-semibold text-primary" : "border-border text-muted-foreground"}`}
              >
                {i + 1}. {marketStates[state]}
              </li>
            ))}
          </ol>
          <MarketErrorText error={issue} />
          <section className="surface-panel space-y-3 p-6">
            <p className="font-semibold">Estado: {marketStates[job.state]}</p>
            {job.visit && (
              <p className="text-sm">
                Visita: {job.visit.date} a las {job.visit.time} (Argentina)
              </p>
            )}
            {job.cancellationReason && <p className="text-sm">Motivo: {job.cancellationReason}</p>}
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">
              {job.description || "No se agregó una descripción."}
            </p>
            <p className="text-sm">
              {job.address || "La dirección exacta se comparte al contratar."}
            </p>
            {job.contact && <p className="text-sm">Contacto: {job.contact}</p>}
            {job.assignment && (
              <p className="text-sm text-primary">
                Integrante asignado: {job.assignment.name} · {job.assignment.date}{" "}
                {job.assignment.time}
              </p>
            )}
            {job.location && (
              <OrdersMap
                center={job.location}
                markers={[
                  { ...job.location, id: job.id, label: job.address || "Ubicación del pedido" },
                ]}
                height={280}
              />
            )}
            {job.photoIds.length > 0 && (
              <div className="grid gap-3 sm:grid-cols-3">
                {job.photoIds.map((id, i) => (
                  <img
                    key={id}
                    src={fileUrl(id)}
                    alt={`Foto del trabajo ${i + 1}`}
                    className="h-48 w-full rounded-xl border border-border object-contain"
                  />
                ))}
              </div>
            )}
          </section>
          <section className="space-y-4">
            <h2 className="font-display text-xl font-semibold">Presupuestos detallados</h2>
            {!job.quotes.length && (
              <MarketNotice>
                Todavía no recibiste presupuestos. Los profesionales verificados del oficio y la
                ciudad pueden ver tu solicitud.
              </MarketNotice>
            )}
            {job.quotes.map((q) => {
              const latest = q.revisions.at(-1)!,
                accepted = q.revisions.find((r) => r.version === q.acceptedVersion);
              return (
                <article key={q.id} className="surface-panel space-y-4 p-6">
                  <h3 className="font-semibold">{q.professionalName}</h3>
                  <p className="text-xs text-muted-foreground">
                    Versión {latest.version} ·{" "}
                    {latest.decision === "pending"
                      ? "Pendiente"
                      : latest.decision === "accepted"
                        ? "Aceptada"
                        : "Rechazada"}
                  </p>
                  {accepted && accepted.version !== latest.version && (
                    <div>
                      <p className="mb-2 text-sm font-semibold text-primary">Presupuesto vigente</p>
                      <LiveQuote value={accepted} />
                    </div>
                  )}
                  <LiveQuote value={latest} />
                  {client &&
                    latest.decision === "pending" &&
                    !["cancelado", "finalizado"].includes(job.state) &&
                    (!job.acceptedQuoteId || job.acceptedQuoteId === q.id) && (
                      <div className="flex flex-wrap gap-3">
                        <Button
                          disabled={busy}
                          onClick={() => {
                            if (
                              window.confirm(
                                accepted
                                  ? "¿Aceptás esta nueva versión del presupuesto?"
                                  : "¿Querés aceptar este presupuesto y contratar al profesional?",
                              )
                            )
                              void action({
                                action: "decide-quote",
                                quoteId: q.id,
                                revision: latest.version,
                                accept: true,
                              });
                          }}
                        >
                          {accepted
                            ? "Aceptar cambio de precio"
                            : "Aceptar presupuesto y contratar"}
                        </Button>
                        <Button
                          variant="outline"
                          disabled={busy}
                          onClick={() =>
                            void action({
                              action: "decide-quote",
                              quoteId: q.id,
                              revision: latest.version,
                              accept: false,
                            })
                          }
                        >
                          Rechazar
                        </Button>
                      </div>
                    )}
                  <p className="text-xs text-muted-foreground">
                    El importe aprobado se mantiene hasta que el cliente acepte una nueva versión.
                  </p>
                </article>
              );
            })}
          </section>
          {!client &&
            (!job.professionalId || job.professionalId === session.account?.id) &&
            session.account?.verification === "aprobado" &&
            !["cancelado", "finalizado"].includes(job.state) &&
            job.quotes.at(-1)?.revisions.at(-1)?.decision !== "pending" && (
              <section className="surface-panel p-6">
                <h2 className="mb-5 font-display text-xl font-semibold">
                  {job.acceptedQuoteId ? "Proponer una revisión" : "Preparar presupuesto"}
                </h2>
                <DetailedQuoteForm
                  disabled={busy}
                  id={`live-${job.id}`}
                  onSubmit={(value) => {
                    void action({ action: "quote", quote: value });
                    return false;
                  }}
                />
              </section>
            )}
          {session.account?.kind === "empresa" &&
            job.professionalId === session.account.id &&
            ["contratado", "visita-confirmada"].includes(job.state) && (
              <CompanyAssignment job={job} onRefresh={refresh} />
            )}
          {job.state === "contratado" && (
            <form
              className="surface-panel space-y-4 p-6"
              onSubmit={(e) => {
                e.preventDefault();
                void action({ action: "visit", date, time });
              }}
            >
              <h2 className="font-semibold">Confirmar la visita acordada</h2>
              <p className="text-xs text-muted-foreground">
                Coordiná por mensaje y registrá la fecha y hora definitivas.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="live-visit-date">Fecha</Label>
                  <Input
                    id="live-visit-date"
                    type="date"
                    required
                    min={localToday()}
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="live-visit-time">Hora</Label>
                  <Input
                    id="live-visit-time"
                    type="time"
                    required
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                  />
                </div>
              </div>
              <Button disabled={busy}>Confirmar visita</Button>
            </form>
          )}
          {!client && job.state === "visita-confirmada" && (
            <Button disabled={busy} onClick={() => void action({ action: "start" })}>
              Iniciar trabajo
            </Button>
          )}
          {client && job.state === "en-curso" && (
            <Button
              disabled={busy}
              onClick={() => {
                if (window.confirm("¿Confirmás que el trabajo terminó?"))
                  void action({ action: "finish" });
              }}
            >
              Confirmar trabajo finalizado
            </Button>
          )}
          {client && job.paymentMethods && job.paymentMethods.length > 0 && (
            <section className="surface-panel space-y-3 p-6">
              <h2 className="font-semibold">Cómo pagarle al profesional</h2>
              <p className="text-xs text-muted-foreground">
                Coordiná el pago directamente con el prestador. Oficios no procesa el cobro.
              </p>
              {job.paymentMethods.map((method: any, i: number) => (
                <p key={i} className="break-all text-sm">
                  <strong>{method.label}</strong> · {method.kind} ·{" "}
                  {method.value || "Acordar al finalizar"}
                </p>
              ))}
            </section>
          )}
          {job.quotes.length > 0 && (
            <section className="surface-panel space-y-4 p-6">
              <h2 className="font-display text-xl font-semibold">Mensajes</h2>
              {client && (
                <select
                  aria-label="Conversación con profesional"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={chatPro || job.professionalId || job.quotes[0]!.professionalId}
                  onChange={(e) => setChatPro(e.target.value)}
                >
                  {job.quotes.map((q) => (
                    <option key={q.id} value={q.professionalId}>
                      {q.professionalName}
                    </option>
                  ))}
                </select>
              )}
              <div className="max-h-96 space-y-3 overflow-y-auto" role="log" aria-live="polite">
                {job.messages
                  .filter(
                    (m) =>
                      m.professionalId ===
                      (client
                        ? chatPro || job.professionalId || job.quotes[0]!.professionalId
                        : session.account!.id),
                  )
                  .map((m) => (
                    <div
                      key={m.id}
                      className={`rounded-xl p-4 text-sm ${m.senderId === session.account?.id ? "ml-6 bg-secondary" : "mr-6 border border-border"}`}
                    >
                      <p className="text-xs font-semibold text-primary">{m.senderName}</p>
                      <p className="mt-2 whitespace-pre-wrap">{m.text}</p>
                    </div>
                  ))}
              </div>
              <form
                className="space-y-3"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (
                    await action({
                      action: "message",
                      text: message,
                      professionalId:
                        chatPro || job.professionalId || job.quotes[0]!.professionalId,
                    })
                  )
                    setMessage("");
                }}
              >
                <Textarea
                  aria-label="Mensaje al profesional o cliente"
                  maxLength={1600}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Escribí tu mensaje…"
                />
                <Button disabled={busy || !message.trim()}>Enviar mensaje</Button>
              </form>
            </section>
          )}
          {!["cancelado", "finalizado"].includes(job.state) &&
            (client || job.professionalId === session.account?.id) && (
              <details className="surface-panel p-6">
                <summary className="cursor-pointer text-sm font-semibold">
                  Cancelar solicitud o trabajo
                </summary>
                <form
                  className="mt-4 space-y-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void action({ action: "cancel", reason });
                  }}
                >
                  <Label htmlFor="live-cancel">Motivo</Label>
                  <Input
                    id="live-cancel"
                    required
                    minLength={5}
                    maxLength={500}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                  <Button disabled={busy} variant="outline">
                    Confirmar cancelación
                  </Button>
                </form>
              </details>
            )}
        </div>
      )}
    </MarketGate>
  );
}
