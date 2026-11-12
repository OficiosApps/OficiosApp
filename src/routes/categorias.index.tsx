import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Droplets,
  Flame,
  Hammer,
  KeyRound,
  PaintRoller,
  Sparkles,
  Sprout,
  Zap,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { categorias, ciudadActiva } from "@/lib/mock-data";

export const Route = createFileRoute("/categorias/")({
  head: () => ({
    meta: [
      { title: "Categorías de servicios | Oficios" },
      {
        name: "description",
        content:
          "Plomería, electricidad, cerrajería, albañilería, pintura, jardinería, limpieza y gas: elegí el rubro y encontrá profesionales de tu zona.",
      },
      { property: "og:title", content: "Categorías de servicios | Oficios" },
      {
        property: "og:description",
        content: "Todos los rubros disponibles en el piloto de Mercedes, Buenos Aires.",
      },
    ],
  }),
  component: Categorias,
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

function Categorias() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl px-4 py-12">
        <h1 className="font-display text-3xl font-semibold sm:text-4xl">Categorías</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Explorá los servicios para tu casa o comercio y elegí una zona habilitada.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categorias.map((cat) => {
            const Icono = iconos[cat.icono] ?? Hammer;
            return (
              <Link
                key={cat.slug}
                to="/categorias/$slug"
                params={{ slug: cat.slug }}
                className="surface-panel flex flex-col gap-3 p-5 transition-shadow hover:shadow-[var(--shadow-lift)]"
              >
                <span className="flex size-11 items-center justify-center rounded-xl bg-secondary text-primary">
                  <Icono className="size-5" />
                </span>
                <div>
                  <p className="font-display text-lg font-semibold">{cat.nombre}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{cat.descripcion}</p>
                </div>
                <ul className="flex flex-wrap gap-1.5 text-xs text-muted-foreground">
                  {cat.servicios.slice(0, 3).map((s) => (
                    <li key={s} className="rounded-full bg-secondary px-2.5 py-1">
                      {s}
                    </li>
                  ))}
                </ul>
                <p className="mt-auto border-t border-border pt-3 text-sm font-medium">
                  Ver servicios
                </p>
              </Link>
            );
          })}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
