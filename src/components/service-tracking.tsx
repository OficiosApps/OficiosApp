import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QuoteBreakdownView } from "@/components/detailed-quotes";
import { ContactConversation } from "@/components/contact-conversation";
import { useServiceOperations } from "@/hooks/use-service-operations";
import { useClientPortfolio } from "@/hooks/use-client-portfolio";
import { cancelPortfolioJob, completePortfolioJob, registerContract } from "@/lib/client-portfolio";
import {
  acceptedRevision,
  advanceServiceRequest,
  cancelServiceRequest,
  decideServiceQuote,
  workStages,
  workStageLabels,
} from "@/lib/service-operations";
import { getProfesional } from "@/lib/mock-data";
import { localToday } from "@/lib/request-planning";

export function ServiceTracking({ requestKey }: { requestKey: string }) {
  const { state, ready, error, update } = useServiceOperations();
  const { update: updatePortfolio } = useClientPortfolio();
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [reason, setReason] = useState("");
  const request = state.requests.find((request) => request.key === requestKey);
  if (!request) return null;
  const quotes = state.quotes.filter((quote) => quote.requestKey === requestKey);
  function action(operation: () => void) {
    try {
      operation();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar el cambio.");
    }
  }
  return (
    <div className="mt-7 space-y-6">
      <section className="surface-panel p-5">
        <h2 className="font-display text-xl font-semibold">Seguimiento del trabajo</h2>
        <ol className="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {workStages.map((stage, index) => (
            <li
              key={stage}
              className={`rounded-xl border p-3 text-xs ${request.timeline.some((event) => event.stage === stage) ? "border-primary bg-secondary font-semibold text-primary" : "border-border text-muted-foreground"}`}
            >
              {index + 1}. {workStageLabels[stage]}
            </li>
          ))}
        </ol>
        <p className="mt-4 text-sm font-semibold">
          Estado actual: {workStageLabels[request.stage]}
        </p>
        {request.visit && (
          <p className="mt-2 text-sm text-primary">
            Visita acordada: {request.visit.date} a las {request.visit.time} · Argentina
          </p>
        )}
        {request.stage === "cancelado" && (
          <p className="mt-3 text-sm text-muted-foreground">Motivo: {request.cancellationReason}</p>
        )}
        {error && (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {error}
          </p>
        )}
        <p className="mt-3 text-xs text-muted-foreground">
          Recorrido de demostración guardado en este navegador. Cada avance registra su fecha para
          calcular actividad sin inventar cifras.
        </p>
      </section>
      <section className="space-y-4">
        <h2 className="font-display text-xl font-semibold">
          Presupuestos detallados ({quotes.length})
        </h2>
        {!quotes.length && (
          <div className="surface-panel p-6">
            <p className="text-sm text-muted-foreground">
              Todavía no recibiste presupuestos para esta solicitud. Para probar el flujo, abrí el
              panel del profesional verificado y prepará una propuesta del mismo oficio y ciudad.
            </p>
            <Button variant="outline" asChild className="mt-4">
              <Link to="/panel-profesional">Ir al panel profesional de prueba</Link>
            </Button>
          </div>
        )}
        {quotes.map((quote) => {
          const latest = quote.revisions.at(-1)!;
          const accepted = acceptedRevision(quote);
          return (
            <article key={quote.id} className="surface-panel space-y-4 p-5">
              <div>
                <h3 className="font-semibold">{getProfesional(quote.professionalId)?.nombre}</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Propuesta versión {latest.version} ·{" "}
                  {latest.decision === "pending"
                    ? "Pendiente de tu decisión"
                    : latest.decision === "accepted"
                      ? "Aceptada"
                      : "Rechazada"}
                </p>
              </div>
              {accepted && latest.version !== accepted.version && (
                <div>
                  <p className="mb-2 text-xs font-semibold text-primary">
                    Importe vigente: versión {accepted.version}
                  </p>
                  <QuoteBreakdownView value={accepted} />
                </div>
              )}
              <QuoteBreakdownView value={latest} />
              {latest.decision === "pending" &&
                !["cancelado", "finalizado"].includes(request.stage) && (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      disabled={
                        !ready ||
                        Boolean(error) ||
                        Boolean(request.acceptedQuoteId && request.acceptedQuoteId !== quote.id)
                      }
                      onClick={() =>
                        action(() => {
                          update((current) =>
                            decideServiceQuote(current, quote.id, latest.version, true),
                          );
                          updatePortfolio((portfolio) =>
                            registerContract(
                              portfolio,
                              {
                                requestKey,
                                requestId: request.routeId,
                                professionalId: quote.professionalId,
                                quoteId: quote.id,
                                service: request.service,
                              },
                              crypto.randomUUID(),
                            ),
                          );
                          toast.success(
                            accepted
                              ? "Cambio de presupuesto aceptado"
                              : "Presupuesto aceptado y profesional agregado a tu agenda",
                          );
                        })
                      }
                    >
                      {accepted ? "Aceptar cambio de precio" : "Aceptar presupuesto y contratar"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() =>
                        action(() => {
                          update((state) =>
                            decideServiceQuote(state, quote.id, latest.version, false),
                          );
                          toast.success(
                            "Propuesta rechazada; el importe aceptado anterior no cambió",
                          );
                        })
                      }
                    >
                      Rechazar propuesta
                    </Button>
                  </div>
                )}
              <p className="text-xs text-muted-foreground">
                Cualquier revisión requiere tu aceptación. El presupuesto aprobado se conserva hasta
                que aceptes otro.
              </p>
            </article>
          );
        })}
      </section>
      {request.stage === "contratado" && (
        <form
          className="surface-panel space-y-4 p-5"
          onSubmit={(event) => {
            event.preventDefault();
            action(() => {
              update((state) =>
                advanceServiceRequest(state, requestKey, "visita-confirmada", { date, time }),
              );
              toast.success("Visita confirmada en la demo");
            });
          }}
        >
          <h2 className="font-semibold">Confirmar la visita acordada</h2>
          <p className="text-xs text-muted-foreground">
            Después de coordinar con el profesional por mensaje, registrá el día y la hora
            definitivos.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="visit-date">Fecha</Label>
              <Input
                id="visit-date"
                type="date"
                min={localToday()}
                required
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="visit-time">Hora</Label>
              <Input
                id="visit-time"
                type="time"
                required
                value={time}
                onChange={(event) => setTime(event.target.value)}
              />
            </div>
          </div>
          <Button type="submit">Confirmar visita de prueba</Button>
        </form>
      )}
      {request.stage === "visita-confirmada" && (
        <Button
          onClick={() =>
            action(() => {
              update((state) => advanceServiceRequest(state, requestKey, "en-curso"));
              toast.success("Trabajo en curso");
            })
          }
        >
          Marcar trabajo en curso
        </Button>
      )}
      {request.stage === "en-curso" && (
        <Button
          onClick={() =>
            action(() => {
              update((state) => advanceServiceRequest(state, requestKey, "finalizado"));
              updatePortfolio((portfolio) => completePortfolioJob(portfolio, requestKey));
              toast.success("Trabajo finalizado y agregado al historial");
            })
          }
        >
          Confirmar trabajo finalizado
        </Button>
      )}
      {request.professionalId && (
        <div>
          <h2 className="mb-4 font-display text-xl font-semibold">
            Conversación con tu profesional
          </h2>
          <ContactConversation professionalId={request.professionalId} />
        </div>
      )}
      {!["cancelado", "finalizado"].includes(request.stage) && (
        <details className="surface-panel p-5">
          <summary className="cursor-pointer text-sm font-semibold">
            Cancelar esta solicitud o trabajo
          </summary>
          <form
            className="mt-4 space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              action(() => {
                update((state) => cancelServiceRequest(state, requestKey, reason));
                if (request.professionalId)
                  updatePortfolio((portfolio) => cancelPortfolioJob(portfolio, requestKey));
                toast.success("Cancelación registrada");
              });
            }}
          >
            <Label htmlFor="cancel-reason">Motivo de cancelación</Label>
            <Input
              id="cancel-reason"
              required
              minLength={5}
              maxLength={500}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
            <Button type="submit" variant="outline">
              Confirmar cancelación de prueba
            </Button>
          </form>
        </details>
      )}
    </div>
  );
}
