import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  ClipboardList,
  Droplets,
  Flame,
  Hammer,
  House,
  KeyRound,
  MapPin,
  PaintRoller,
  Search,
  Sparkles,
  Sprout,
  Zap,
} from "lucide-react";
import { useMarket } from "@/hooks/use-market";
import { useMarketConfig } from "@/hooks/use-market-config";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { categorias, ciudadActiva } from "@/lib/mock-data";
import heroImg from "@/assets/hero-pro.jpg";
export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Oficios — Resolvé lo que necesita tu hogar" },
      {
        name: "description",
        content: "Explorá oficios, organizá tu pedido y encontrá ayuda para tu casa o comercio.",
      },
    ],
  }),
  component: Home,
});
const iconos: Record<string, typeof Droplets> = {
  Droplets,
  Zap,
  KeyRound,
  Hammer,
  PaintRoller,
  Sprout,
  Sparkles,
  Flame,
};
function Home() {
  const { session } = useMarket();
  const { cities } = useMarketConfig();
  const [search, setSearch] = useState("");
  const normalized = search
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
  const filtered = categorias.filter((c) =>
    `${c.nombre} ${c.servicios.join(" ")}`
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .includes(normalized),
  );
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main>
        <section className="overflow-hidden border-b border-border">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 lg:grid-cols-[1.1fr_1fr] lg:py-20">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-primary">
                <MapPin className="size-3.5" />
                {cities.length === 1
                  ? `${cities[0]!.nombre}, ${cities[0]!.provincia}`
                  : "Servicios por ciudad"}
              </span>
              <p className="mt-6 text-sm font-semibold text-primary">Bienvenido a Oficios</p>
              <h1 className="mt-3 font-display text-4xl font-semibold leading-[1.08] sm:text-5xl lg:text-6xl">
                Tu casa necesita algo.
                <br />
                Empezá por acá.
              </h1>
              <p className="mt-5 max-w-lg text-lg text-muted-foreground">
                Desde una pérdida de agua hasta una reparación pendiente. Elegí el oficio y contanos
                qué necesitás resolver.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Button asChild size="lg">
                  <Link to="/solicitud">
                    Pedir un servicio
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <a href="#oficios">Explorar oficios</a>
                </Button>
              </div>
              {session.account?.kind !== "cliente" && (
                <p className="mt-5 text-sm text-muted-foreground">
                  ¿Ofrecés servicios?{" "}
                  <Link
                    to="/soy-profesional"
                    className="inline-flex items-center gap-1 font-semibold text-primary underline-offset-4 hover:underline"
                  >
                    Soy profesional <ArrowRight className="size-3.5" />
                  </Link>
                </p>
              )}
              <div className="mt-8 flex flex-wrap gap-x-5 gap-y-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-2">
                  <ClipboardList className="size-4 text-primary" />
                  Publicá tu pedido sin costo
                </span>
                <span className="flex items-center gap-2">
                  <House className="size-4 text-primary" />
                  Para tu casa o comercio
                </span>
              </div>
            </div>
            <img
              src={heroImg}
              alt="Profesional con herramientas trabajando en una vivienda"
              width={1408}
              height={1104}
              className="aspect-[4/3] w-full rounded-3xl border border-border object-cover shadow-[var(--shadow-lift)]"
            />
          </div>
        </section>
        <section id="oficios" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-14">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <h2 className="font-display text-2xl font-semibold sm:text-3xl">
                ¿Qué necesitás resolver?
              </h2>
              <p className="mt-2 text-muted-foreground">
                Encontrá el rubro para tu próximo trabajo.
              </p>
            </div>
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                placeholder="Buscá un oficio o servicio"
                aria-label="Buscar oficio"
              />
            </div>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {filtered.map((cat) => {
              const Icon = iconos[cat.icono] ?? Hammer;
              return (
                <Link
                  key={cat.slug}
                  to="/categorias/$slug"
                  params={{ slug: cat.slug }}
                  className="surface-panel p-5 transition-shadow hover:shadow-[var(--shadow-lift)]"
                >
                  <span className="flex size-11 items-center justify-center rounded-xl bg-secondary text-primary">
                    <Icon className="size-5" />
                  </span>
                  <h3 className="mt-4 font-display font-semibold">{cat.nombre}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{cat.descripcion}</p>
                  <span className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-primary">
                    Ver servicios
                    <ArrowRight className="size-3.5" />
                  </span>
                </Link>
              );
            })}
          </div>
          {!filtered.length && (
            <p role="status" className="surface-panel mt-5 p-7 text-muted-foreground">
              No encontramos ese oficio. Probá con otro nombre.
            </p>
          )}
        </section>
        <section className="border-y border-border bg-secondary/40">
          <div className="mx-auto max-w-6xl px-4 py-14">
            <h2 className="font-display text-2xl font-semibold">Tu primer pedido, paso a paso</h2>
            <div className="mt-8 grid gap-7 md:grid-cols-3">
              {[
                [
                  "01",
                  "Elegí el servicio",
                  "Indicá el oficio y si necesitás resolverlo pronto o preferís planificar una visita.",
                ],
                [
                  "02",
                  "Sumá los detalles",
                  "Agregá una foto si te ayuda a explicar el trabajo. La descripción es opcional.",
                ],
                [
                  "03",
                  "Recibí presupuestos",
                  "Compará mano de obra, materiales, plazo y garantía antes de contratar.",
                ],
              ].map(([number, title, text]) => (
                <div key={number}>
                  <span className="font-display text-3xl font-semibold text-primary/40">
                    {number}
                  </span>
                  <h3 className="mt-3 font-semibold">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section className="mx-auto max-w-6xl px-4 pt-14">
          <div className="surface-panel flex flex-wrap items-center justify-between gap-6 p-7 sm:p-10">
            <div>
              <h2 className="font-display text-2xl font-semibold">
                Todo empieza con tu primer pedido
              </h2>
              <p className="mt-3 max-w-xl text-sm text-muted-foreground">
                Creá tu cuenta, publicá lo que necesitás y seguí cada propuesta desde tu espacio. La
                disponibilidad depende de los profesionales de tu zona.
              </p>
            </div>
            <Button asChild>
              <Link to="/solicitud">
                Empezar
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
