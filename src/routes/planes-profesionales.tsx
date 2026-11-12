import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, CheckCircle2, Sparkles, Users } from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useProfessionalAccount } from "@/hooks/use-professional-account";
import { chooseProfessionalPlan, professionalPlans } from "@/lib/professional-account";
import { getProfesional } from "@/lib/mock-data";

export const Route = createFileRoute("/planes-profesionales")({
  head: () => ({
    meta: [
      { title: "Planes para profesionales — USD 0, 10 y 20 | Oficios" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProfessionalPlans,
});

function ProfessionalPlans() {
  const { account, ready, error, update } = useProfessionalAccount();
  const pro = getProfesional("pro-1")!;
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="border-b border-amber-200 bg-amber-50">
        <p className="mx-auto max-w-6xl px-4 py-3 text-xs leading-relaxed text-amber-950">
          <strong>Precios y selección de demostración.</strong> Elegir un plan no genera cargos,
          renovaciones ni una suscripción paga real.
        </p>
      </div>
      <main className="mx-auto w-full max-w-6xl px-4 py-12">
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="secondary" className="gap-2">
            <Users className="size-3.5" />
            Exclusivos para profesionales
          </Badge>
          <h1 className="mt-5 font-display text-3xl font-semibold leading-tight sm:text-4xl">
            Un plan para cada etapa
            <br />
            de tu trabajo
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Los clientes no necesitan suscribirse para pedir servicios. Estos planes corresponden
            únicamente al perfil profesional; no otorgan permisos de empresa ni de administración.
          </p>
          <p className="mt-4 text-xs font-medium text-primary">
            Probando como {pro.nombre} · {pro.oficio}
          </p>
        </div>
        {error && (
          <p role="alert" className="mt-5 text-center text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="mt-10 grid items-stretch gap-5 lg:grid-cols-3">
          {professionalPlans.map((plan) => {
            const active = account.planId === plan.id;
            return (
              <section
                key={plan.id}
                className={`surface-panel relative flex flex-col p-6 sm:p-8 ${plan.id === "profesional" ? "border-primary ring-1 ring-primary" : ""}`}
                aria-labelledby={`plan-${plan.id}`}
              >
                <div className="mb-5 flex h-6 items-center justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                    {plan.id === "inicial"
                      ? "Para empezar"
                      : plan.id === "profesional"
                        ? "Para crecer"
                        : "Para mayor volumen"}
                  </span>
                  {plan.id === "profesional" && <Sparkles className="size-4 text-primary" />}
                </div>
                <h2 id={`plan-${plan.id}`} className="font-display text-2xl font-semibold">
                  {plan.name}
                </h2>
                <p className="mt-4">
                  <span className="text-sm font-medium text-muted-foreground">USD </span>
                  <span className="font-display text-5xl font-semibold">{plan.usd}</span>
                  <span className="ml-1 text-sm text-muted-foreground">/mes</span>
                </p>
                <p className="mt-4 min-h-14 text-sm leading-relaxed text-muted-foreground">
                  {plan.description}
                </p>
                <ul className="my-7 flex-1 space-y-4 text-sm">
                  {[
                    "Perfil profesional con servicios y disponibilidad",
                    "Verificación obligatoria con DNI y selfie",
                    plan.quotes === null
                      ? "Presupuestos de prueba sin límite mensual"
                      : `Hasta ${plan.quotes} presupuestos de prueba por mes`,
                    `Cobertura configurable de hasta ${plan.radius} km`,
                    `Hasta ${plan.methods} ${plan.methods === 1 ? "método de cobro guardado" : "métodos de cobro guardados"}`,
                    "Recepción de pedidos urgentes y planificados",
                  ].map((benefit) => (
                    <li key={benefit} className="flex items-start gap-3">
                      <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  variant={active ? "secondary" : plan.id === "profesional" ? "default" : "outline"}
                  disabled={!ready || Boolean(error) || active}
                  onClick={() => {
                    try {
                      update((account) => chooseProfessionalPlan(account, plan.id));
                      toast.success(`Plan ${plan.name} seleccionado en la demo`);
                    } catch (error) {
                      toast.error(
                        error instanceof Error ? error.message : "No se pudo cambiar el plan.",
                      );
                    }
                  }}
                >
                  {active ? (
                    <>
                      <CheckCircle2 />
                      Plan actual de prueba
                    </>
                  ) : (
                    `Probar plan ${plan.name}`
                  )}
                </Button>
                <p className="mt-3 text-center text-[11px] text-muted-foreground">
                  {plan.usd === 0
                    ? "Sin cuota de suscripción"
                    : "Precio propuesto en USD · facturación aún sin activar"}
                </p>
              </section>
            );
          })}
        </div>
        <section className="surface-panel mt-8 p-6">
          <h2 className="font-display text-lg font-semibold">Qué cambia al elegir un plan</h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            En esta demo se aplican el límite de presupuestos del mes, el radio máximo de cobertura
            y la cantidad de métodos de cobro. Los presupuestos se cuentan cuando los preparás en tu
            panel; la verificación de identidad es obligatoria en los tres planes.
          </p>
          <p className="mt-3 text-xs text-muted-foreground">
            El cambio de plan es local a este navegador. La verificación de identidad no se compra y
            ningún plan garantiza contrataciones.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button asChild>
              <Link to="/panel-profesional">Ir a mi panel profesional</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/metodos-de-pago">Mis métodos de cobro</Link>
            </Button>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
