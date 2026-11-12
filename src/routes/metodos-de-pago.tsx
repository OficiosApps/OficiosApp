import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import {
  Banknote,
  Building2,
  Check,
  ExternalLink,
  Link2,
  Plus,
  Trash2,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProfessionalAccount } from "@/hooks/use-professional-account";
import {
  addCollectionMethod,
  planFor,
  removeCollectionMethod,
  type CollectionMethod,
} from "@/lib/professional-account";
import { getProfesional } from "@/lib/mock-data";

export const Route = createFileRoute("/metodos-de-pago")({
  head: () => ({
    meta: [
      { title: "Mis métodos de cobro — profesionales | Oficios" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PaymentMethods,
});
const methodTypes = {
  transferencia: { label: "Transferencia bancaria", icon: Building2 },
  billetera: { label: "Billetera virtual", icon: Wallet },
  efectivo: { label: "Efectivo", icon: Banknote },
  link: { label: "Enlace de pago", icon: Link2 },
};
function PaymentMethods() {
  const { account, ready, error: storageError, update } = useProfessionalAccount();
  const pro = getProfesional("pro-1")!;
  const plan = planFor(account.planId);
  const [type, setType] = useState<CollectionMethod["type"]>("transferencia");
  const [label, setLabel] = useState("");
  const [holder, setHolder] = useState("");
  const [destination, setDestination] = useState("");
  const [error, setError] = useState("");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try {
      update((account) =>
        addCollectionMethod(account, { type, label, holder, destination }, crypto.randomUUID()),
      );
      setLabel("");
      setHolder("");
      setDestination("");
      toast.success("Método de cobro guardado en la demo");
    } catch (error) {
      setError(error instanceof Error ? error.message : "No se pudo guardar el método.");
    }
  }
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="border-b border-amber-200 bg-amber-50">
        <p className="mx-auto max-w-6xl px-4 py-3 text-xs leading-relaxed text-amber-950">
          <strong>Demostración para profesionales.</strong> Usá datos ficticios. Cargar un método
          guarda una preferencia local; no conecta una cuenta ni procesa cobros.
        </p>
      </div>
      <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:py-14">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              Panel profesional · {pro.nombre}
            </p>
            <h1 className="mt-3 font-display text-3xl font-semibold sm:text-4xl">
              Mis métodos de cobro
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
              Agregá cómo preferís cobrar tus trabajos: cuenta bancaria, billetera, efectivo o un
              enlace de tu proveedor de pagos.
            </p>
          </div>
          <Badge variant="secondary" className="gap-2 px-3 py-2">
            <Wallet className="size-4" />
            {account.methods.length} de {plan.methods} métodos
          </Badge>
        </div>
        {storageError && (
          <p role="alert" className="mt-5 text-sm text-destructive">
            {storageError}
          </p>
        )}
        <div className="mt-8 grid items-start gap-6 lg:grid-cols-[1.2fr_1fr]">
          <section className="surface-panel p-5 sm:p-7">
            <h2 className="font-display text-xl font-semibold">Métodos guardados</h2>
            <p className="mt-2 text-xs text-muted-foreground">
              Configuración del profesional de ejemplo. Disponible sólo en este navegador.
            </p>
            {!ready ? (
              <p role="status" className="mt-6">
                Cargando métodos…
              </p>
            ) : !account.methods.length ? (
              <div className="my-6 rounded-2xl border border-dashed border-border p-8 text-center">
                <Wallet className="mx-auto mb-4 size-9 text-primary" />
                <h3 className="font-semibold">Agregá tu primer método de cobro</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Completá el formulario para verlo en tu perfil profesional de prueba.
                </p>
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                {account.methods.map((method) => {
                  const details = methodTypes[method.type];
                  return (
                    <article key={method.id} className="rounded-xl border border-border p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 gap-3">
                          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
                            <details.icon className="size-5" />
                          </span>
                          <div className="min-w-0">
                            <h3 className="break-words font-semibold">{method.label}</h3>
                            <p className="mt-1 text-xs text-muted-foreground">{details.label}</p>
                          </div>
                        </div>
                        {method.preferred && <Badge variant="secondary">Preferido</Badge>}
                      </div>
                      {method.holder && (
                        <p className="mt-4 text-xs text-muted-foreground">
                          Titular:{" "}
                          <span className="font-medium text-foreground">{method.holder}</span>
                        </p>
                      )}
                      {method.destination && (
                        <div className="mt-2 break-all rounded-lg bg-secondary/50 p-3 text-sm">
                          {method.type === "link" && /^https:\/\//i.test(method.destination) ? (
                            <a
                              href={method.destination}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 text-primary underline"
                            >
                              Abrir enlace de prueba
                              <ExternalLink className="size-3.5" />
                            </a>
                          ) : (
                            method.destination
                          )}
                        </div>
                      )}
                      <p className="mt-3 text-[11px] text-muted-foreground">
                        Datos declarados por el profesional. Sin validación de titularidad ni
                        conciliación de pagos.
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {!method.preferred && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              try {
                                update((account) => ({
                                  ...account,
                                  methods: account.methods.map((item) => ({
                                    ...item,
                                    preferred: item.id === method.id,
                                  })),
                                }));
                              } catch {
                                toast.error("No se pudo actualizar la preferencia.");
                              }
                            }}
                          >
                            <Check />
                            Usar como preferido
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            try {
                              update((account) => removeCollectionMethod(account, method.id));
                              toast.success("Método eliminado de la demo");
                            } catch {
                              toast.error("No se pudo eliminar.");
                            }
                          }}
                        >
                          <Trash2 />
                          Eliminar
                        </Button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
            <div className="mt-6 rounded-xl bg-secondary/60 p-4">
              <p className="text-sm font-semibold">
                Plan {plan.name} · USD {plan.usd}/mes
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Podés guardar hasta {plan.methods} métodos de cobro con este plan.
              </p>
              <Button asChild size="sm" variant="link" className="mt-2 h-auto p-0">
                <Link to="/planes-profesionales">Ver planes para profesionales</Link>
              </Button>
            </div>
          </section>
          <section className="surface-panel p-5 sm:p-7">
            <h2 className="font-display text-xl font-semibold">Agregar método de cobro</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Elegí el tipo de cobro y completá sus datos de prueba.
            </p>
            <form className="mt-6 space-y-4" onSubmit={submit}>
              <div className="space-y-2">
                <Label htmlFor="collection-type">Tipo de método</Label>
                <select
                  id="collection-type"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={type}
                  onChange={(event) => {
                    setType(event.target.value as CollectionMethod["type"]);
                    setDestination("");
                  }}
                >
                  {Object.entries(methodTypes).map(([key, method]) => (
                    <option key={key} value={key}>
                      {method.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="collection-label">Nombre para identificarlo</Label>
                <Input
                  id="collection-label"
                  required
                  minLength={2}
                  maxLength={60}
                  value={label}
                  onChange={(event) => setLabel(event.target.value)}
                  placeholder={
                    type === "efectivo" ? "Ej.: Efectivo al finalizar" : "Ej.: Mi cuenta de trabajo"
                  }
                />
              </div>
              {type !== "efectivo" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="collection-holder">Titular</Label>
                    <Input
                      id="collection-holder"
                      required
                      minLength={2}
                      maxLength={100}
                      value={holder}
                      onChange={(event) => setHolder(event.target.value)}
                      placeholder="Nombre y apellido"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="collection-destination">
                      {type === "link"
                        ? "Enlace de pago HTTPS"
                        : type === "billetera"
                          ? "Alias o CVU"
                          : "Alias o CBU"}
                    </Label>
                    <Input
                      id="collection-destination"
                      required
                      type={type === "link" ? "url" : "text"}
                      maxLength={type === "link" ? 500 : 22}
                      value={destination}
                      onChange={(event) => setDestination(event.target.value)}
                      placeholder={type === "link" ? "https://..." : "Alias o 22 dígitos"}
                    />
                  </div>
                </>
              )}
              {type === "efectivo" && (
                <p className="rounded-xl bg-secondary p-4 text-xs leading-relaxed text-muted-foreground">
                  El efectivo se acuerda directamente con el cliente. Marcarlo no registra un pago
                  ni confirma que un trabajo esté abonado.
                </p>
              )}
              {error && (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              )}
              <Button
                type="submit"
                className="w-full"
                disabled={!ready || Boolean(storageError) || account.methods.length >= plan.methods}
              >
                <Plus />
                Guardar método de prueba
              </Button>
              <p className="text-xs leading-relaxed text-muted-foreground">
                No cargues números de tarjeta, códigos de seguridad ni claves bancarias. El cobro
                con tarjetas requiere un proveedor conectado.
              </p>
            </form>
          </section>
        </div>
        <Button asChild variant="outline" className="mt-7">
          <Link to="/panel-profesional">Volver a mi panel profesional</Link>
        </Button>
      </main>
      <SiteFooter />
    </div>
  );
}
