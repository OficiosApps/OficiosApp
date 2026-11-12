import { Link } from "@tanstack/react-router";
import { activityMetrics } from "@/lib/service-operations";
import { useServiceOperations } from "@/hooks/use-service-operations";
import { getProfesional } from "@/lib/mock-data";
export function ActivityMetrics() {
  const { state, ready, error } = useServiceOperations();
  const values = activityMetrics(state);
  return (
    <section className="space-y-5">
      <div className="surface-panel p-6">
        <h2 className="font-display text-xl font-semibold">Métricas de actividad registrada</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Calculadas desde solicitudes, presupuestos, contrataciones y cancelaciones realizados en
          este navegador desde esta actualización. Se excluyen los ejemplos precargados.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Son datos del recorrido local de prueba, no actividad global de usuarios reales. Para
          medir la plataforma completa hacen falta eventos y usuarios en una base compartida.
        </p>
        {error && (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { label: "Solicitudes registradas", value: values.requests },
          {
            label: "Solicitudes con respuesta",
            value: `${values.responded} · ${values.responseRate === null ? "sin datos" : `${Math.round(values.responseRate * 100)}%`}`,
          },
          {
            label: "Tiempo medio al primer presupuesto",
            value:
              values.firstResponseMs === null
                ? "Sin respuestas todavía"
                : `${Math.round(values.firstResponseMs / 60000)} min`,
          },
          { label: "Contrataciones registradas", value: values.hired },
          { label: "Cancelaciones registradas", value: values.cancelled },
          { label: "Clientes con más de una contratación", value: values.repeatClients },
        ].map((item) => (
          <div key={item.label} className="surface-panel p-5">
            <p className="text-xs text-muted-foreground">{item.label}</p>
            <p className="mt-3 font-display text-xl font-semibold">{ready ? item.value : "—"}</p>
          </div>
        ))}
      </div>
      <div className="surface-panel p-6">
        <h3 className="font-semibold">Embudo medido desde eventos</h3>
        <dl className="mt-4 grid gap-4 sm:grid-cols-4">
          {[
            ["Solicitudes", values.requests],
            ["Con presupuesto", values.responded],
            ["Contratadas", values.hired],
            ["Finalizadas", values.completed],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="mt-2 text-2xl font-semibold">{ready ? value : "—"}</dd>
            </div>
          ))}
        </dl>
        <Link
          to="/solicitud"
          className="mt-5 inline-block text-sm font-medium text-primary underline"
        >
          Crear una solicitud para probar el recorrido
        </Link>
      </div>
    </section>
  );
}
export function ProfessionalActivitySummary({ professionalId }: { professionalId: string }) {
  const { state, ready } = useServiceOperations();
  const pro = getProfesional(professionalId)!;
  const requests = state.requests.filter(
    (request) =>
      request.source === "local" &&
      request.cityId === pro.ciudadId &&
      pro.categorias.includes(request.category),
  );
  const keys = new Set(requests.map((request) => request.key));
  return (
    <section className="mt-8">
      <p className="mb-3 text-xs text-muted-foreground">
        Actividad registrada en este navegador. Se excluyen los pedidos de ejemplo.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { title: "Solicitudes de tu rubro", count: requests.length },
          {
            title: "Presupuestos detallados",
            count: state.quotes.filter(
              (quote) => quote.professionalId === professionalId && keys.has(quote.requestKey),
            ).length,
          },
          {
            title: "Contrataciones",
            count: requests.filter(
              (request) =>
                request.professionalId === professionalId &&
                request.timeline.some((event) => event.stage === "contratado"),
            ).length,
          },
          {
            title: "Trabajos finalizados",
            count: requests.filter(
              (request) =>
                request.professionalId === professionalId && request.stage === "finalizado",
            ).length,
          },
        ].map((item) => (
          <div key={item.title} className="surface-panel p-5">
            <p className="text-xs text-muted-foreground">{item.title}</p>
            <p className="mt-3 font-display text-2xl font-semibold">{ready ? item.count : "—"}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
