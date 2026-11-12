import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { useMarketConfig } from "@/hooks/use-market-config";
import { MarketNotice, MarketErrorText } from "@/components/market-common";
export function LivePlans() {
  const { data, loading, error } = useMarketConfig();
  return (
    <div className="space-y-6">
      <p className="max-w-2xl text-sm text-muted-foreground">
        Suscripciones exclusivas para profesionales. El catálogo muestra los precios y beneficios
        vigentes configurados por el CEO. El Plan Inicial sigue gratuito y no se generan cargos
        automáticos.
      </p>
      <MarketErrorText error={error} />
      {loading ? (
        <MarketNotice>Cargando planes…</MarketNotice>
      ) : (
        <div className="grid gap-5 md:grid-cols-3">
          {data?.plans.map((plan) => (
            <article key={plan.id} className="surface-panel flex flex-col p-6">
              <h2 className="font-display text-xl font-semibold">{plan.name}</h2>
              <p className="mt-4 font-display text-3xl font-semibold">
                USD {(plan.priceCents / 100).toLocaleString("es-AR", { maximumFractionDigits: 2 })}
                <span className="text-sm font-normal text-muted-foreground"> / mes</span>
              </p>
              <ul className="my-6 flex-1 space-y-3 text-sm text-muted-foreground">
                {plan.benefits.map((benefit, i) => (
                  <li key={i}>✓ {benefit}</li>
                ))}
                <li>
                  ✓{" "}
                  {plan.quoteLimit === null
                    ? "Propuestas mensuales sin límite"
                    : `Hasta ${plan.quoteLimit} propuestas nuevas por mes`}
                </li>
                <li>✓ Hasta {plan.maxPaymentMethods} métodos de cobro</li>
                <li>✓ Foto de perfil y verificación obligatorias</li>
              </ul>
              {plan.id === "inicial" ? (
                <Button asChild variant="outline">
                  <Link to="/panel-profesional">Plan activo · ir a mi panel</Link>
                </Button>
              ) : (
                <p className="rounded-xl bg-secondary p-3 text-xs text-muted-foreground">
                  La contratación de este plan requiere habilitar la facturación. No se realizan
                  cargos.
                </p>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
