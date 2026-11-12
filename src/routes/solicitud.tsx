import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, Clock, MapPin, Zap } from "lucide-react";
import { useMarketConfig } from "@/hooks/use-market-config";
import type { MapPoint } from "@/lib/market-config";
import { RequestLocationPicker } from "@/components/orders-map";
import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WeeklyPlanner } from "@/components/weekly-planner";
import { RemoteImageUpload, MarketGate } from "@/components/market-common";
import { LiveAddressPicker } from "@/components/market-addresses";
import { useMarket } from "@/hooks/use-market";
import { marketApi } from "@/lib/market-client";

import {
  REQUEST_KEY,
  scheduleLabel,
  validSchedule,
  type SchedulePreference,
  type LocalRequest,
} from "@/lib/request-planning";
import { categorias, ciudades, ciudadActiva, getCategoria } from "@/lib/mock-data";

const searchSchema = z.object({
  categoria: z.string().optional(),
});

export const Route = createFileRoute("/solicitud")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Pedir presupuestos a profesionales | Oficios" },
      {
        name: "description",
        content: "Elegí un servicio, sumá los detalles y guardá tu pedido.",
      },
      { property: "og:title", content: "Pedir presupuestos | Oficios" },
      {
        property: "og:description",
        content: "Publicá tu necesidad y compará presupuestos de profesionales verificados.",
      },
    ],
  }),
  component: NuevaSolicitud,
});

function NuevaSolicitud() {
  const { categoria: categoriaInicial } = Route.useSearch();
  const navigate = useNavigate();
  const { session, loading } = useMarket();
  const { cities: activeCities, error: configError, data: marketConfig } = useMarketConfig();
  const [location, setLocation] = useState<MapPoint | null>(null);
  const operationsReady = Boolean(session.account) && !loading;
  const [saving, setSaving] = useState(false);
  const [requestCityId, setRequestCityId] = useState(ciudadActiva.id);
  const requestCity = activeCities.find((city) => city.id === requestCityId) ?? ciudadActiva;

  const [paso, setPaso] = useState(1);
  const [categoriaSlug, setCategoriaSlug] = useState(categoriaInicial ?? "");
  const [servicio, setServicio] = useState("");
  const [tipo, setTipo] = useState<"urgente" | "planificado">("urgente");
  const [descripcion, setDescripcion] = useState("");
  const [direccion, setDireccion] = useState("");
  const [contacto, setContacto] = useState("");
  const [cuando, setCuando] = useState("Lo antes posible");
  const [schedule, setSchedule] = useState<SchedulePreference | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [photosBusy, setPhotosBusy] = useState(false);
  const [publishError, setPublishError] = useState("");
  const plannedReady = tipo !== "planificado" || validSchedule(schedule);
  const effectiveWhen =
    tipo === "planificado" ? (schedule ? scheduleLabel(schedule) : "Elegí día y turno") : cuando;
  async function publish() {
    if (tipo === "planificado" && !validSchedule(schedule)) {
      setPublishError("El horario elegido ya pasó. Elegí otro día o turno.");
      setPaso(1);
      return;
    }
    if (photosBusy || saving || !direccion.trim() || !contacto.trim()) return;
    setSaving(true);
    setPublishError("");
    try {
      const { job } = await marketApi<{ job: { id: string } }>("/jobs", {
        method: "POST",
        body: JSON.stringify({
          category: categoriaSlug,
          cityId: requestCityId,
          service: servicio,
          type: tipo,
          description: descripcion.trim(),
          address: direccion.trim(),
          contact: contacto.trim(),
          when: effectiveWhen,
          schedule: tipo === "planificado" ? schedule : null,
          photoIds: photos.filter(Boolean),
          location,
        }),
      });
      void navigate({
        to: "/solicitudes/$id",
        params: { id: "nueva" },
        search: { solicitud: job.id },
      });
    } catch (cause) {
      setPublishError(cause instanceof Error ? cause.message : "No pudimos publicar tu solicitud.");
    } finally {
      setSaving(false);
    }
  }

  const cat = categoriaSlug ? getCategoria(categoriaSlug) : undefined;

  const puedeSeguir1 = Boolean(categoriaSlug && servicio) && plannedReady;
  const puedeSeguir2 = !photosBusy && plannedReady;
  const puedePublicar =
    direccion.trim().length > 5 &&
    contacto.trim().length > 5 &&
    plannedReady &&
    !photosBusy &&
    !saving &&
    operationsReady &&
    activeCities.some((c) => c.id === requestCityId);

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl px-4 py-10">
        <MarketGate>
          <h1 className="font-display text-3xl font-semibold sm:text-4xl">
            Contanos qué necesitás
          </h1>
          <p className="mt-2 text-muted-foreground">
            Elegí el servicio, sumá los detalles y publicá tu pedido para {requestCity.nombre}.
          </p>

          <ol className="mt-8 flex items-center gap-2 text-sm">
            {["Servicio", "Detalle", "Ubicación"].map((label, i) => {
              const n = i + 1;
              const activo = paso >= n;
              return (
                <li key={label} className="flex flex-1 items-center gap-2">
                  <span
                    className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                      activo
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {n}
                  </span>
                  <span className={activo ? "font-medium" : "text-muted-foreground"}>{label}</span>
                  {n < 3 && <span className="h-px flex-1 bg-border" />}
                </li>
              );
            })}
          </ol>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <div className="surface-panel p-6">
              {paso === 1 && (
                <div className="space-y-5">
                  <div className="space-y-2">
                    <Label>Categoría</Label>
                    <Select
                      value={categoriaSlug}
                      onValueChange={(v) => {
                        setCategoriaSlug(v);
                        setServicio("");
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Elegí un rubro" />
                      </SelectTrigger>
                      <SelectContent>
                        {categorias.map((c) => (
                          <SelectItem key={c.slug} value={c.slug}>
                            {c.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {cat && (
                    <div className="space-y-2">
                      <Label>Servicio</Label>
                      <div className="flex flex-wrap gap-2">
                        {cat.servicios.map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setServicio(s)}
                            className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                              servicio === s
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-card hover:bg-secondary"
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>¿Es urgente o planificado?</Label>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {(
                        [
                          { v: "urgente", t: "Urgente", d: "Necesito que venga hoy", icon: Zap },
                          {
                            v: "planificado",
                            t: "Planificado",
                            d: "Elegí día, turno u horario",
                            icon: Clock,
                          },
                        ] as const
                      ).map((op) => (
                        <button
                          key={op.v}
                          type="button"
                          onClick={() => setTipo(op.v)}
                          className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-colors ${
                            tipo === op.v
                              ? "border-primary bg-secondary"
                              : "border-border hover:bg-secondary/60"
                          }`}
                        >
                          <op.icon className="mt-0.5 size-4 text-primary" />
                          <span>
                            <span className="block font-medium">{op.t}</span>
                            <span className="block text-sm text-muted-foreground">{op.d}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {tipo === "planificado" && (
                    <WeeklyPlanner value={schedule} onChange={setSchedule} />
                  )}
                  <Button
                    disabled={!puedeSeguir1}
                    onClick={() => setPaso(2)}
                    className="w-full sm:w-auto"
                  >
                    Continuar <ArrowRight className="size-4" />
                  </Button>
                </div>
              )}

              {paso === 2 && (
                <div className="space-y-5">
                  <Tabs defaultValue="descripcion">
                    <TabsList className="h-auto max-w-full flex-wrap justify-start">
                      <TabsTrigger value="descripcion" disabled={photosBusy}>
                        Descripción (opcional)
                      </TabsTrigger>
                      <TabsTrigger value="fotos" disabled={photosBusy}>
                        Subir fotos ({photos.filter(Boolean).length}/3)
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="descripcion" className="mt-5 space-y-2">
                      <Label htmlFor="desc">
                        Contá el problema con detalle{" "}
                        <span className="font-normal text-muted-foreground">(opcional)</span>
                      </Label>
                      <Textarea
                        id="desc"
                        rows={6}
                        maxLength={2000}
                        value={descripcion}
                        onChange={(event) => setDescripcion(event.target.value)}
                        placeholder="Si querés, contanos qué ocurre y qué necesitás resolver…"
                      />
                      <p className="text-xs text-muted-foreground">
                        Podés dejarlo vacío y continuar. Si agregás detalles o fotos, ayudás al
                        profesional a preparar el presupuesto.
                      </p>
                    </TabsContent>
                    <TabsContent value="fotos" className="mt-5">
                      <div className="space-y-5">
                        {[0, 1, 2].map((index) => (
                          <RemoteImageUpload
                            key={index}
                            label={`Foto ${index + 1} (opcional)`}
                            scope="request"
                            value={photos[index] ?? ""}
                            onChange={(id) =>
                              setPhotos((current) => {
                                const next = [...current];
                                next[index] = id;
                                return next;
                              })
                            }
                            onBusy={setPhotosBusy}
                          />
                        ))}
                        <p className="text-xs text-muted-foreground">
                          Hasta tres imágenes JPG, PNG o WEBP de 5 MB.
                        </p>
                      </div>
                    </TabsContent>
                  </Tabs>
                  {tipo === "urgente" ? (
                    <div className="space-y-2">
                      <Label htmlFor="cuando">¿Cuándo lo necesitás?</Label>
                      <Input
                        id="cuando"
                        value={cuando}
                        onChange={(event) => setCuando(event.target.value)}
                      />
                    </div>
                  ) : (
                    <div className="rounded-xl bg-secondary p-4">
                      <p className="text-sm font-medium">Tu preferencia de visita</p>
                      <p className="mt-2 text-sm text-muted-foreground">{effectiveWhen}</p>
                      <Button
                        size="sm"
                        variant="link"
                        className="mt-2 h-auto p-0"
                        onClick={() => setPaso(1)}
                      >
                        Cambiar día o turno
                      </Button>
                    </div>
                  )}
                  <div className="flex gap-3">
                    <Button variant="outline" disabled={photosBusy} onClick={() => setPaso(1)}>
                      Volver
                    </Button>
                    <Button disabled={!puedeSeguir2} onClick={() => setPaso(3)}>
                      Continuar <ArrowRight className="size-4" />
                    </Button>
                  </div>
                </div>
              )}

              {paso === 3 && (
                <div className="space-y-5">
                  <div className="space-y-2">
                    <LiveAddressPicker
                      onSelect={(address) => {
                        setDireccion(
                          `${address.address}${address.reference ? ` · ${address.reference}` : ""}`,
                        );
                        setRequestCityId(address.cityId);
                        setLocation(null);
                      }}
                    />
                    <Label htmlFor="dir">Dirección y localidad</Label>
                    <Input
                      id="dir"
                      value={direccion}
                      onChange={(e) => setDireccion(e.target.value)}
                      placeholder="Calle, número o esquina y localidad"
                    />
                    <p className="text-xs text-muted-foreground">
                      La dirección exacta sólo se comparte con el profesional que contrates.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="request-city">Ciudad o partido</Label>
                    <select
                      id="request-city"
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      value={requestCityId}
                      onChange={(event) => {
                        setRequestCityId(event.target.value);
                        setLocation(null);
                      }}
                    >
                      {!activeCities.some((c) => c.id === requestCityId) && (
                        <option value={requestCityId} disabled>
                          Elegí una zona habilitada
                        </option>
                      )}
                      {activeCities.map((city) => (
                        <option key={city.id} value={city.id}>
                          {city.nombre}, {city.provincia}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-muted-foreground">
                      Elegí el partido de tu localidad e indicá la localidad en la dirección.
                    </p>
                    {marketConfig && !activeCities.length && (
                      <p role="status" className="text-sm text-muted-foreground">
                        Por el momento no hay ciudades habilitadas para nuevos pedidos.
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tel">Teléfono o WhatsApp</Label>
                    <Input
                      id="tel"
                      value={contacto}
                      onChange={(e) => setContacto(e.target.value)}
                      placeholder="2324 55-5555"
                    />
                  </div>
                  <RequestLocationPicker
                    center={
                      activeCities.find((c) => c.id === requestCityId)?.center ?? {
                        lat: -34.65,
                        lng: -59.43,
                      }
                    }
                    value={location}
                    onChange={setLocation}
                  />
                  {configError && (
                    <p role="alert" className="text-sm text-destructive">
                      {configError}
                    </p>
                  )}
                  {publishError && (
                    <p role="alert" className="text-sm text-destructive">
                      {publishError}
                    </p>
                  )}
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setPaso(2)}>
                      Volver
                    </Button>
                    <Button disabled={!puedePublicar} onClick={publish}>
                      {saving ? "Publicando…" : "Publicar mi solicitud"}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <aside className="space-y-4">
              <div className="surface-panel p-5">
                <p className="font-display font-semibold">Resumen</p>
                <dl className="mt-4 space-y-3 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Categoría</dt>
                    <dd className="text-right font-medium">{cat?.nombre ?? "—"}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Servicio</dt>
                    <dd className="text-right font-medium">{servicio || "—"}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Tipo</dt>
                    <dd className="text-right font-medium capitalize">{tipo}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Cuándo</dt>
                    <dd className="text-right font-medium">{effectiveWhen}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Fotos adjuntas</dt>
                    <dd className="font-medium">{photos.filter(Boolean).length}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Zona</dt>
                    <dd className="text-right font-medium">
                      {requestCity.nombre}, {requestCity.provincia}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="surface-panel p-5">
                <p className="flex items-center gap-2 text-sm font-medium">
                  <MapPin className="size-4 text-primary" /> Alcance de tu pedido
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Tu solicitud queda disponible para profesionales con identidad aprobada del oficio
                  y ciudad que elegiste. Recibir propuestas depende de la disponibilidad de
                  prestadores.
                </p>
              </div>

              <div className="surface-panel p-5 text-sm">
                <p className="flex items-center gap-2 font-medium">
                  <CheckCircle2 className="size-4 text-success" /> Sin costo para vos
                </p>
                <p className="mt-2 text-muted-foreground">
                  Publicar tu pedido es gratis. Compará los presupuestos y elegí si querés
                  contratar.
                </p>
                <Link
                  to="/como-funciona"
                  className="mt-3 inline-block font-medium text-primary underline-offset-4 hover:underline"
                >
                  Cómo funciona
                </Link>
              </div>
            </aside>
          </div>
        </MarketGate>
      </main>
      <SiteFooter />
    </div>
  );
}
