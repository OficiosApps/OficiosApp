import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { MarketDirectory } from "@/components/market-providers";
import { ciudadActiva, getCategoria } from "@/lib/mock-data";
export const Route = createFileRoute("/categorias/$slug")({
  loader: ({ params }) => {
    const categoria = getCategoria(params.slug);
    if (!categoria) throw notFound();
    return { categoria };
  },
  head: ({ loaderData }) => ({
    meta: [{ title: `${loaderData?.categoria.nombre ?? "Categoría no encontrada"} | Oficios` }],
  }),
  component: Category,
  notFoundComponent: () => (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-xl px-4 py-20 text-center">
        <h1 className="font-display text-3xl font-semibold">No encontramos ese oficio</h1>
        <Button asChild className="mt-6">
          <Link to="/categorias">Ver oficios</Link>
        </Button>
      </main>
      <SiteFooter />
    </>
  ),
});
function Category() {
  const { categoria } = Route.useLoaderData();
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-12">
        <Link
          to="/categorias"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground"
        >
          <ArrowLeft className="size-4" />
          Todos los oficios
        </Link>
        <h1 className="mt-6 font-display text-3xl font-semibold sm:text-4xl">{categoria.nombre}</h1>
        <p className="mt-3 text-muted-foreground">{categoria.descripcion}</p>
        <div className="mt-7 flex flex-wrap gap-2">
          {categoria.servicios.map((service) => (
            <span key={service} className="rounded-full bg-secondary px-4 py-2 text-sm">
              {service}
            </span>
          ))}
        </div>
        <section className="mt-10"><h2 className="mb-5 font-display text-xl font-semibold">Profesionales del rubro</h2><MarketDirectory category={categoria.slug}/></section>
      </main>
      <SiteFooter />
    </>
  );
}
