import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatARS, getProfesional } from "@/lib/mock-data";
import { quoteTotal, validateQuote, type QuoteBreakdown } from "@/lib/service-operations";
import { useServiceOperations } from "@/hooks/use-service-operations";
import { proposeServiceQuote, acceptedRevision } from "@/lib/service-operations";
import { useProfessionalAccount } from "@/hooks/use-professional-account";
import { recordProfessionalQuote } from "@/lib/professional-account";
import { useIdentityRecords } from "@/components/identity-verification";
import { toast } from "sonner";

export const blankQuote: QuoteBreakdown = {
  labor: 0,
  materials: 0,
  visit: 0,
  days: 1,
  warrantyMonths: 0,
  notes: "",
};
export function QuoteBreakdownView({ value }: { value: QuoteBreakdown }) {
  return (
    <div className="rounded-xl border border-border bg-secondary/30 p-4">
      <dl className="space-y-2 text-sm">
        {[
          ["Mano de obra", value.labor],
          ["Materiales", value.materials],
          ["Visita", value.visit],
        ].map(([label, amount]) => (
          <div key={label} className="flex justify-between gap-4">
            <dt className="text-muted-foreground">{label}</dt>
            <dd>{formatARS(Number(amount))}</dd>
          </div>
        ))}
        <div className="flex justify-between gap-4 border-t border-border pt-3 font-semibold">
          <dt>Total ARS</dt>
          <dd>{formatARS(quoteTotal(value))}</dd>
        </div>
        <div className="flex justify-between gap-4 pt-2">
          <dt className="text-muted-foreground">Plazo estimado</dt>
          <dd>{value.days} días</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Garantía ofrecida</dt>
          <dd>{value.warrantyMonths} meses</dd>
        </div>
      </dl>
      {value.notes && (
        <p className="mt-4 whitespace-pre-wrap text-xs text-muted-foreground">{value.notes}</p>
      )}
    </div>
  );
}
export function DetailedQuoteForm({
  initial = blankQuote,
  onSubmit,
  label = "Proponer presupuesto",
  disabled = false,
  id = "quote",
}: {
  initial?: QuoteBreakdown;
  onSubmit: (value: QuoteBreakdown) => boolean;
  label?: string;
  disabled?: boolean;
  id?: string;
}) {
  const [value, setValue] = useState(initial);
  const [error, setError] = useState("");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const validated = validateQuote(value);
      if (onSubmit(validated)) setError("");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Revisá el presupuesto.");
    }
  }
  return (
    <form className="space-y-4" onSubmit={submit}>
      <fieldset disabled={disabled} className="space-y-4">
        <legend className="sr-only">Desglose del presupuesto en pesos argentinos</legend>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { key: "labor", name: "Mano de obra (ARS)" },
            { key: "materials", name: "Materiales (ARS)" },
            { key: "visit", name: "Visita (ARS)" },
          ].map((field) => (
            <div key={field.key} className="space-y-2">
              <Label htmlFor={`${id}-${field.key}`} className="text-xs">
                {field.name}
              </Label>
              <Input
                id={`${id}-${field.key}`}
                type="number"
                min={0}
                max={1000000000}
                step="0.01"
                required
                value={value[field.key as "labor" | "materials" | "visit"]}
                onChange={(event) =>
                  setValue({ ...value, [field.key]: Number(event.target.value) })
                }
              />
            </div>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={`${id}-days`}>Plazo estimado (días)</Label>
            <Input
              id={`${id}-days`}
              type="number"
              min={1}
              max={365}
              required
              value={value.days}
              onChange={(event) => setValue({ ...value, days: Number(event.target.value) })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${id}-warranty`}>Garantía ofrecida (meses)</Label>
            <Input
              id={`${id}-warranty`}
              type="number"
              min={0}
              max={60}
              required
              value={value.warrantyMonths}
              onChange={(event) =>
                setValue({ ...value, warrantyMonths: Number(event.target.value) })
              }
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${id}-notes`}>Alcance y condiciones</Label>
          <Textarea
            id={`${id}-notes`}
            maxLength={1000}
            rows={2}
            value={value.notes}
            onChange={(event) => setValue({ ...value, notes: event.target.value })}
            placeholder="Detallá qué incluye, qué no incluye y condiciones de la garantía."
          />
        </div>
        <p className="font-semibold">Total: {formatARS(quoteTotal(value))}</p>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button type="submit">{label}</Button>
      </fieldset>
    </form>
  );
}

export function ProfessionalQuoteBoard() {
  const { state, ready, error, update } = useServiceOperations();
  const { update: updateAccount } = useProfessionalAccount();
  const { records } = useIdentityRecords();
  const verified = records.some(
    (record) => record.subjectId === "individual-pro-1" && record.status === "approved",
  );
  const pro = getProfesional("pro-1")!;
  const requests = state.requests.filter(
    (request) =>
      pro.categorias.includes(request.category) &&
      request.cityId === pro.ciudadId &&
      !["cancelado", "finalizado"].includes(request.stage) &&
      (!request.professionalId || request.professionalId === pro.id),
  );
  return (
    <section className="space-y-5">
      <div className="surface-panel p-5">
        <h2 className="font-display text-xl font-semibold">Presupuestos detallados</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Solicitudes registradas desde el formulario del cliente. Las revisiones nunca cambian el
          precio aceptado sin una nueva aprobación del cliente.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Probá el recorrido en este navegador: creá una solicitud de plomería y volvé a esta
          pestaña.
        </p>
        {!verified && (
          <p className="mt-3 text-sm text-primary">
            Completá la verificación de DNI y selfie para proponer presupuestos.
          </p>
        )}
        {error && (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
      {!ready ? (
        <p role="status">Cargando solicitudes…</p>
      ) : !requests.length ? (
        <p className="surface-panel p-8 text-sm text-muted-foreground">
          Todavía no hay solicitudes de tu oficio y ciudad registradas en este navegador.
        </p>
      ) : (
        requests.map((request) => {
          const quote = state.quotes.find(
            (quote) => quote.requestKey === request.key && quote.professionalId === pro.id,
          );
          const latest = quote?.revisions.at(-1);
          const accepted = quote && acceptedRevision(quote);
          return (
            <article key={request.key} className="surface-panel space-y-5 p-5">
              <div>
                <h3 className="font-semibold">{request.service}</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {request.routeId} · {request.stage} ·{" "}
                  {request.source === "ejemplo"
                    ? "Ejemplo excluido de métricas"
                    : "Actividad de este navegador"}
                </p>
              </div>
              {accepted && (
                <div>
                  <p className="mb-2 text-xs font-semibold text-primary">
                    Versión aceptada {accepted.version} · importe vigente
                  </p>
                  <QuoteBreakdownView value={accepted} />
                </div>
              )}
              {latest?.decision === "pending" ? (
                <div>
                  <p className="mb-3 text-sm font-semibold">
                    Propuesta v{latest.version} pendiente del cliente
                  </p>
                  <QuoteBreakdownView value={latest} />
                </div>
              ) : (
                <DetailedQuoteForm
                  id={request.key}
                  initial={accepted ?? blankQuote}
                  disabled={!verified}
                  label={
                    accepted ? "Proponer cambio para aprobación" : "Preparar presupuesto detallado"
                  }
                  onSubmit={(values) => {
                    try {
                      const next = proposeServiceQuote(
                        state,
                        request.key,
                        pro.id,
                        values,
                        crypto.randomUUID(),
                      );
                      if (!quote)
                        updateAccount((account) => recordProfessionalQuote(account, request.key));
                      update(() => next);
                      toast.success(
                        "Propuesta guardada. El cliente debe aceptarla desde el seguimiento.",
                      );
                      return true;
                    } catch (error) {
                      toast.error(error instanceof Error ? error.message : "No se pudo guardar.");
                      return false;
                    }
                  }}
                />
              )}
            </article>
          );
        })
      )}
    </section>
  );
}
