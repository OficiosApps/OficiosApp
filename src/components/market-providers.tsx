import { useState } from "react";
import { useMarketConfig } from "@/hooks/use-market-config";
import { Link } from "@tanstack/react-router";
import { useRemote } from "@/hooks/use-market";
import { fileUrl, type MarketAccount } from "@/lib/market-client";
import { MarketErrorText, MarketNotice } from "@/components/market-common";
import { Button } from "@/components/ui/button";
import { categorias, ciudades } from "@/lib/mock-data";
export function MarketDirectory({ category }: { category?: string }) {
  const { cities } = useMarketConfig();
  const [city, setCity] = useState("");
  const { data, loading, error } = useRemote<{ providers: MarketAccount[] }>(
    `/providers?category=${encodeURIComponent(category ?? "")}&city=${encodeURIComponent(city)}`,
  );
  return (
    <>
      <select
        aria-label="Filtrar profesionales por ciudad"
        value={city}
        onChange={(event) => setCity(event.target.value)}
        className="mb-5 h-11 w-full max-w-md rounded-md border border-input bg-background px-3 text-sm"
      >
        <option value="">Todas las zonas habilitadas</option>
        {cities.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nombre}
          </option>
        ))}
      </select>
      <MarketErrorText error={error} />
      {loading ? (
        <MarketNotice>Cargando profesionales…</MarketNotice>
      ) : !data?.providers.length ? (
        <MarketNotice>
          Todavía no hay profesionales verificados publicados en esta categoría. Podés publicar tu
          solicitud; quedará disponible para los prestadores habilitados de tu zona.
        </MarketNotice>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {data.providers.map((pro) => (
            <article key={pro.id} className="surface-panel space-y-4 p-6">
              {pro.logoId && (
                <img
                  src={fileUrl(pro.logoId)}
                  alt={`Foto de ${pro.name}`}
                  className="size-16 rounded-2xl border border-border object-contain"
                />
              )}
              <p className="text-xs font-semibold text-primary">Identidad revisada</p>
              <h3 className="font-display text-xl font-semibold">{pro.name}</h3>
              <p className="text-sm text-muted-foreground">
                {categorias.find((c) => c.slug === pro.trade)?.nombre} ·{" "}
                {pro.cityName ?? ciudades.find((c) => c.id === pro.cityId)?.nombre ?? pro.cityId}
              </p>
              {pro.bio && <p className="line-clamp-3 text-sm text-muted-foreground">{pro.bio}</p>}
              <Button asChild variant="outline">
                <Link to="/profesionales/$id" params={{ id: "ver" }} search={{ perfil: pro.id }}>
                  Ver perfil y trabajos
                </Link>
              </Button>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
export function LiveProviderProfile({ id }: { id: string }) {
  const { data, loading, error } = useRemote<{ provider: MarketAccount; works: any[] }>(
    id ? `/providers/${encodeURIComponent(id)}` : null,
  );
  return loading ? (
    <MarketNotice>Cargando perfil…</MarketNotice>
  ) : error ? (
    <MarketErrorText error={error} />
  ) : !data ? (
    <MarketNotice>Este perfil no está disponible.</MarketNotice>
  ) : (
    <div className="space-y-7">
      <div className="surface-panel space-y-4 p-7">
        {data.provider.logoId && (
          <img
            src={fileUrl(data.provider.logoId)}
            alt={data.provider.name}
            className="size-24 rounded-2xl object-contain"
          />
        )}
        <p className="text-xs font-semibold text-primary">Identidad revisada</p>
        <h2 className="font-display text-3xl font-semibold">{data.provider.name}</h2>
        <p className="text-sm text-muted-foreground">
          {categorias.find((c) => c.slug === data.provider.trade)?.nombre} ·{" "}
          {data.provider.cityName ??
            ciudades.find((c) => c.id === data.provider.cityId)?.nombre ??
            data.provider.cityId}
        </p>
        <p className="whitespace-pre-wrap text-sm">{data.provider.bio}</p>
        <Button asChild>
          <Link to="/solicitud" search={{ categoria: data.provider.trade }}>
            Pedir este servicio
          </Link>
        </Button>
      </div>
      <h2 className="font-display text-2xl font-semibold">Trabajos realizados</h2>
      {!data.works.length ? (
        <MarketNotice>Todavía no publicó trabajos en su portafolio.</MarketNotice>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {data.works.map((work) => (
            <article key={work.id} className="surface-panel space-y-4 p-6">
              <h3 className="font-semibold">{work.title}</h3>
              <p className="text-xs text-muted-foreground">{work.date}</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  ["Antes", work.beforeId],
                  ["Después", work.afterId],
                ].map(([label, id]) => (
                  <figure key={label}>
                    <img
                      src={fileUrl(id)}
                      alt={`${label}: ${work.title}`}
                      className="h-40 w-full rounded-xl object-contain"
                    />
                    <figcaption className="mt-2 text-xs text-muted-foreground">{label}</figcaption>
                  </figure>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">{work.description}</p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
