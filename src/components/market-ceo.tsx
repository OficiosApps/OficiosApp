import { OperationsView } from "@/components/staff-operations";
import { ManagementLayout } from "@/components/management-layout";
import { StaffWorkspace } from "@/components/market-staff";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { MarketNotice, MarketErrorText } from "@/components/market-common";
import { OrdersMap } from "@/components/orders-map";
import { useRemote } from "@/hooks/use-market";
import { marketApi, marketStates } from "@/lib/market-client";
import type { CommercialConfig, MapPoint, MarketPlan, MarketRegion } from "@/lib/market-config";
type CeoData = {
  config: CommercialConfig;
  version: number;
  updatedAt: number | null;
  audit: { id: string; action: string; entity_id: string; created_at: number }[];
  referralMetrics: { registered: number; qualified: number; rewards: number; bonusQuotes: number };
};
type MapOrder = {
  id: string;
  version: number;
  service: string;
  cityId: string;
  state: string;
  address: string;
  clientName: string;
  when: string;
  createdAt: number;
  location: (MapPoint & { source?: string }) | null;
};
export function LiveCeoPanel() {
  const { data, loading, error, refresh } = useRemote<CeoData>("/ceo/config");
  const [tab, setTab] = useState("mapa");
  return (
    <ManagementLayout>
      <div className="mb-7 flex flex-wrap gap-3">
        <Button variant="outline" size="sm" onClick={() => void refresh()}>
          Actualizar panel
        </Button>
      </div>
      <MarketErrorText error={error} />
      {loading ? (
        <MarketNotice>Cargando la gestión de la plataforma…</MarketNotice>
      ) : (
        data && (
          <>
            <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["Zonas activas", data.config.regions.filter((r) => r.status === "activa").length],
                [
                  "Zonas en preparación",
                  data.config.regions.filter((r) => r.status === "preparacion").length,
                ],
                ["Referidos aprobados", data.referralMetrics.qualified],
                ["Propuestas bonificadas", data.referralMetrics.bonusQuotes],
              ].map(([label, value]) => (
                <article key={String(label)} className="surface-panel p-5">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="mt-3 font-display text-2xl font-semibold">{value}</p>
                  {label === "Zonas en preparación" && (
                    <Button
                      variant="link"
                      className="mt-2 h-auto p-0"
                      onClick={() => setTab("ciudades")}
                    >
                      Administrar ciudades
                    </Button>
                  )}
                </article>
              ))}
            </div>
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="h-auto flex-wrap justify-start gap-1">
                <TabsTrigger value="mapa">Mapa de pedidos</TabsTrigger>
                <TabsTrigger value="ciudades">Ciudades</TabsTrigger>
                <TabsTrigger value="gestion">Planes, referidos y zonas</TabsTrigger>
                <TabsTrigger value="equipo">Equipo e invitaciones</TabsTrigger>
                <TabsTrigger value="operacion">Operación</TabsTrigger>
                <TabsTrigger value="historial">Historial de cambios</TabsTrigger>
              </TabsList>
              <TabsContent value="ciudades" className="mt-6">
                <CitySwitches data={data} onSaved={refresh} />
              </TabsContent>
              <TabsContent value="equipo" className="mt-6">
                <StaffWorkspace section="team" />
              </TabsContent>
              <TabsContent value="operacion" className="mt-6 space-y-8">
                <CeoOperations />
              </TabsContent>
              <TabsContent value="mapa" className="mt-6">
                <CeoOrdersMap regions={data.config.regions} />
              </TabsContent>
              <TabsContent value="gestion" className="mt-6">
                <CommercialEditor key={data.version} data={data} onSaved={refresh} />
              </TabsContent>
              <TabsContent value="historial" className="mt-6 space-y-4">
                <p className="text-sm text-muted-foreground">
                  Últimos 30 cambios guardados por el CEO. Se conserva quién hizo cada cambio en el
                  registro del servidor.
                </p>
                {!data.audit.length ? (
                  <MarketNotice>Todavía no hay cambios guardados desde este panel.</MarketNotice>
                ) : (
                  data.audit.map((item) => (
                    <article
                      key={item.id}
                      className="surface-panel flex flex-wrap justify-between gap-3 p-5"
                    >
                      <p className="text-sm font-semibold">
                        {item.action === "commercial-settings"
                          ? "Configuración de planes, referidos y zonas"
                          : item.action === "region-status"
                            ? `Alta/baja de ciudad: ${data.config.regions.find((r) => r.id === item.entity_id)?.name ?? item.entity_id}`
                            : "Ubicación de un pedido"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Intl.DateTimeFormat("es-AR", {
                          dateStyle: "short",
                          timeStyle: "short",
                          timeZone: "America/Buenos_Aires",
                        }).format(item.created_at)}
                      </p>
                    </article>
                  ))
                )}
              </TabsContent>
            </Tabs>
          </>
        )
      )}
    </ManagementLayout>
  );
}
function CitySwitches({ data, onSaved }: { data: CeoData; onSaved: () => Promise<void> }) {
  const [saved, setSaved] = useState({ config: data.config, version: data.version });
  const [busy, setBusy] = useState<string | null>(null);
  const [issue, setIssue] = useState("");
  useEffect(() => {
    setSaved({ config: data.config, version: data.version });
  }, [data.config, data.version]);
  async function changeStatus(region: MarketRegion, active: boolean) {
    if (busy) return;
    setBusy(region.id);
    setIssue("");
    try {
      const next = await marketApi<{ config: CommercialConfig; version: number }>(
        `/ceo/regions/${region.id}/status`,
        { method: "PATCH", body: JSON.stringify({ version: saved.version, active }) },
      );
      setSaved(next);
      toast.success(`${region.name}: ${active ? "dada de alta" : "dada de baja"}`);
      await onSaved();
    } catch (e) {
      setIssue(e instanceof Error ? e.message : "No pudimos cambiar el estado de la ciudad.");
      await onSaved();
    } finally {
      setBusy(null);
    }
  }
  return (
    <section className="space-y-5" aria-labelledby="cities-heading">
      <div>
        <h2 id="cities-heading" className="font-display text-2xl font-semibold">
          Ciudades: alta y baja
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Encendé el switch para habilitar nuevos registros y pedidos. Apagalo para darlos de baja
          en esa ciudad. Los trabajos existentes continúan. Cada cambio se guarda automáticamente.
        </p>
      </div>
      <MarketErrorText error={issue} />
      <div className="grid gap-4 md:grid-cols-2">
        {saved.config.regions.map((region) => {
          const active = region.status === "activa";
          const status = active
            ? "De alta"
            : region.status === "preparacion"
              ? "En preparación"
              : "De baja";
          return (
            <article
              key={region.id}
              className="surface-panel flex items-center justify-between gap-4 p-5"
            >
              <div className="min-w-0">
                <Label htmlFor={`city-status-${region.id}`} className="text-base font-semibold">
                  {region.name}
                </Label>
                <p className="mt-1 text-sm text-muted-foreground">{region.province}</p>
                <p
                  className={`mt-3 text-sm font-medium ${active ? "text-primary" : "text-muted-foreground"}`}
                  aria-live="polite"
                >
                  {busy === region.id ? "Guardando…" : status}
                </p>
              </div>
              <Switch
                id={`city-status-${region.id}`}
                aria-label={`Dar de alta o baja a ${region.name}`}
                checked={active}
                disabled={busy !== null}
                onCheckedChange={(value) => void changeStatus(region, value)}
              />
            </article>
          );
        })}
      </div>
    </section>
  );
}
function CommercialEditor({ data, onSaved }: { data: CeoData; onSaved: () => Promise<void> }) {
  const [config, setConfig] = useState(() => structuredClone(data.config)),
    [issue, setIssue] = useState(""),
    [busy, setBusy] = useState(false),
    [saved, setSaved] = useState(false);
  function planChange(index: number, patch: Partial<MarketPlan>) {
    setConfig((current) => ({
      ...current,
      plans: current.plans.map((p, i) => (i === index ? { ...p, ...patch } : p)),
    }));
  }
  function regionChange(index: number, patch: Partial<MarketRegion>) {
    setConfig((current) => ({
      ...current,
      regions: current.regions.map((r, i) => (i === index ? { ...r, ...patch } : r)),
    }));
  }
  return (
    <form
      className="space-y-9"
      onSubmit={async (event) => {
        event.preventDefault();
        setIssue("");
        setBusy(true);
        setSaved(false);
        try {
          await marketApi("/ceo/config", {
            method: "PUT",
            body: JSON.stringify({ version: data.version, config }),
          });
          setSaved(true);
          toast.success("Cambios del CEO guardados y aplicados");
          await onSaved();
        } catch (cause) {
          setIssue(cause instanceof Error ? cause.message : "No pudimos guardar la configuración.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <section className="space-y-5">
        <div>
          <h2 className="font-display text-2xl font-semibold">Suscripciones y precios</h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Los cambios se reflejan en el catálogo de planes. El plan Inicial se mantiene gratuito.
            Guardar precios no genera cargos; los cobros automáticos siguen sin habilitarse.
          </p>
        </div>
        <div className="grid items-start gap-5 lg:grid-cols-3">
          {config.plans.map((plan, i) => (
            <article key={plan.id} className="surface-panel space-y-4 p-6">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-primary">
                {plan.id}
              </h3>
              <div className="space-y-2">
                <Label htmlFor={`plan-name-${i}`}>Nombre del plan</Label>
                <Input
                  id={`plan-name-${i}`}
                  required
                  minLength={2}
                  maxLength={60}
                  value={plan.name}
                  onChange={(e) => planChange(i, { name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`plan-price-${i}`}>Precio mensual (USD)</Label>
                <Input
                  id={`plan-price-${i}`}
                  type="number"
                  min={0}
                  max={100000}
                  step="0.01"
                  required
                  readOnly={plan.id === "inicial"}
                  value={plan.priceCents / 100}
                  onChange={(e) =>
                    planChange(i, { priceCents: Math.round(Number(e.target.value) * 100) })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`plan-quota-${i}`}>Nuevas propuestas por mes</Label>
                <Input
                  id={`plan-quota-${i}`}
                  type="number"
                  min={1}
                  max={10000}
                  value={plan.quoteLimit ?? ""}
                  placeholder="Sin límite"
                  onChange={(e) =>
                    planChange(i, {
                      quoteLimit: e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Vacío significa sin límite. Las revisiones de un presupuesto no consumen otra
                  propuesta.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor={`plan-methods-${i}`}>Máximo de métodos de cobro</Label>
                <Input
                  id={`plan-methods-${i}`}
                  type="number"
                  required
                  min={1}
                  max={10}
                  value={plan.maxPaymentMethods}
                  onChange={(e) => planChange(i, { maxPaymentMethods: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`plan-benefits-${i}`}>Beneficios (uno por línea)</Label>
                <Textarea
                  id={`plan-benefits-${i}`}
                  rows={6}
                  required
                  value={plan.benefits.join("\n")}
                  onChange={(e) => planChange(i, { benefits: e.target.value.split("\n") })}
                />
              </div>
              <label className="flex items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={plan.published}
                  disabled={plan.id === "inicial"}
                  onChange={(e) => planChange(i, { published: e.target.checked })}
                />
                Mostrar en el catálogo
              </label>
              <p className="text-xs text-muted-foreground">
                La verificación de identidad sigue siendo obligatoria en todos los planes.
              </p>
            </article>
          ))}
        </div>
      </section>
      <section className="surface-panel space-y-5 p-6">
        <h2 className="font-display text-2xl font-semibold">Beneficios por referidos</h2>
        <label className="flex items-center gap-3 text-sm font-semibold">
          <input
            type="checkbox"
            checked={config.referrals.enabled}
            onChange={(e) =>
              setConfig((current) => ({
                ...current,
                referrals: { ...current.referrals, enabled: e.target.checked },
              }))
            }
          />
          Activar programa para profesionales
        </label>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="referral-quotes">Propuestas extra por referido aprobado</Label>
            <Input
              id="referral-quotes"
              required
              type="number"
              min={1}
              max={500}
              value={config.referrals.rewardQuotes}
              onChange={(e) =>
                setConfig((current) => ({
                  ...current,
                  referrals: { ...current.referrals, rewardQuotes: Number(e.target.value) },
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="referral-cap">Máximo de recompensas por referente</Label>
            <Input
              id="referral-cap"
              required
              type="number"
              min={1}
              max={1000}
              value={config.referrals.maxRewardsPerReferrer}
              onChange={(e) =>
                setConfig((current) => ({
                  ...current,
                  referrals: {
                    ...current.referrals,
                    maxRewardsPerReferrer: Number(e.target.value),
                  },
                }))
              }
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="referral-description">Mensaje del beneficio</Label>
          <Textarea
            id="referral-description"
            required
            minLength={5}
            maxLength={500}
            value={config.referrals.description}
            onChange={(e) =>
              setConfig((current) => ({
                ...current,
                referrals: { ...current.referrals, description: e.target.value },
              }))
            }
          />
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          El bono se acredita una sola vez cuando se aprueba el alta del profesional invitado. Vence
          al terminar el mes de acreditación en Argentina. No es dinero ni un descuento cobrado. Las
          condiciones se conservan para los referidos ya registrados.
        </p>
        {config.referrals.enabled && config.plans[0]?.quoteLimit === null && (
          <MarketNotice>
            El Plan Inicial tiene propuestas ilimitadas: los bonos se registran, pero no agregan
            capacidad mientras el plan siga sin límite.
          </MarketNotice>
        )}
      </section>
      <section className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-semibold">Zonas de operación</h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Una zona activa permite nuevas altas y pedidos. Preparación y pausa cierran nuevos
              registros, conservando los trabajos existentes.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              setConfig((current) => ({
                ...current,
                regions: [
                  ...current.regions,
                  {
                    id: `zona-${crypto.randomUUID().slice(0, 8)}`,
                    name: "",
                    province: "",
                    status: "preparacion",
                    center: { lat: -34.6037, lng: -58.3816 },
                  },
                ],
              }))
            }
          >
            Agregar lugar
          </Button>
        </div>
        <div className="grid items-start gap-5 md:grid-cols-2">
          {config.regions.map((region, i) => (
            <article key={region.id} className="surface-panel space-y-4 p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-semibold">{region.name || "Nueva zona"}</h3>
                <span className="rounded-full bg-secondary px-3 py-1 text-xs text-primary">
                  {region.status === "preparacion"
                    ? "En preparación"
                    : region.status === "activa"
                      ? "Activa"
                      : "Pausada"}
                </span>
              </div>
              <Label htmlFor={`region-name-${i}`}>Ciudad o zona</Label>
              <Input
                id={`region-name-${i}`}
                required
                minLength={2}
                maxLength={100}
                value={region.name}
                onChange={(e) => regionChange(i, { name: e.target.value })}
              />
              <Label htmlFor={`region-province-${i}`}>Provincia</Label>
              <Input
                id={`region-province-${i}`}
                required
                minLength={2}
                maxLength={100}
                value={region.province}
                onChange={(e) => regionChange(i, { province: e.target.value })}
              />
              <Label htmlFor={`region-state-${i}`}>Estado</Label>
              <select
                id={`region-state-${i}`}
                className="h-11 w-full rounded-md border border-input bg-background px-3"
                value={region.status}
                onChange={(e) =>
                  regionChange(i, { status: e.target.value as MarketRegion["status"] })
                }
              >
                <option value="preparacion">En preparación</option>
                <option value="activa">Activa: habilitar altas y pedidos</option>
                <option value="pausada">Pausada</option>
              </select>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor={`region-lat-${i}`}>Latitud del centro</Label>
                  <Input
                    id={`region-lat-${i}`}
                    type="number"
                    step="0.000001"
                    min={-90}
                    max={90}
                    required
                    value={region.center.lat}
                    onChange={(e) =>
                      regionChange(i, { center: { ...region.center, lat: Number(e.target.value) } })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`region-lng-${i}`}>Longitud del centro</Label>
                  <Input
                    id={`region-lng-${i}`}
                    type="number"
                    step="0.000001"
                    min={-180}
                    max={180}
                    required
                    value={region.center.lng}
                    onChange={(e) =>
                      regionChange(i, { center: { ...region.center, lng: Number(e.target.value) } })
                    }
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                El centro es una referencia para el mapa de esta zona; no representa un pedido.
              </p>
            </article>
          ))}
        </div>
      </section>
      <div className="surface-panel sticky bottom-4 z-10 space-y-3 border-primary/30 p-5 shadow-lg">
        <MarketErrorText error={issue} />
        {saved && (
          <p role="status" className="text-sm text-primary">
            Configuración guardada.
          </p>
        )}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            Guardás planes, referidos y zonas juntos. Se registra el cambio y quién lo realizó.
          </p>
          <Button type="submit" disabled={busy}>
            {busy ? "Guardando…" : "Guardar y aplicar cambios"}
          </Button>
        </div>
      </div>
    </form>
  );
}
function CeoOrdersMap({ regions }: { regions: MarketRegion[] }) {
  const { data, error, loading, refresh } = useRemote<{
    orders: MapOrder[];
    total: number;
    limit: number;
  }>("/ceo/orders");
  const [city, setCity] = useState(""),
    [state, setState] = useState(""),
    [search, setSearch] = useState(""),
    [selected, setSelected] = useState(""),
    [draft, setDraft] = useState<MapPoint | null>(null),
    [issue, setIssue] = useState(""),
    [busy, setBusy] = useState(false);
  const orders = (data?.orders ?? []).filter(
    (o) =>
      (!city || o.cityId === city) &&
      (!state || o.state === state) &&
      (!search.trim() ||
        `${o.address} ${o.service} ${o.clientName}`.toLowerCase().includes(search.toLowerCase())),
  );
  const order = orders.find((o) => o.id === selected);
  const center = (regions.find((r) => r.id === (city || order?.cityId)) ??
    regions.find((r) => r.status === "activa") ??
    regions[0])!.center;
  const markers = orders
    .filter((o) => o.location)
    .map((o) => ({
      ...o.location!,
      id: o.id,
      label: `${o.service}\n${o.address}\n${marketStates[o.state]}`,
      state: o.state,
    }));
  if (order && draft) {
    const index = markers.findIndex((p) => p.id === order.id);
    const point = {
      ...draft,
      id: order.id,
      label: `Punto sin guardar: ${order.service}`,
      state: order.state,
    };
    if (index >= 0) markers[index] = point;
    else markers.push(point);
  }
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-2xl font-semibold">Mapa de pedidos y direcciones</h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Cada punto corresponde a un pedido con ubicación guardada. Las direcciones sin punto
          quedan en la lista hasta que se ubiquen.
        </p>
      </div>
      <div className="surface-panel grid gap-3 p-4 md:grid-cols-4">
        <select
          aria-label="Filtrar pedidos por zona"
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={city}
          onChange={(e) => {
            setCity(e.target.value);
            setSelected("");
            setDraft(null);
          }}
        >
          <option value="">Todas las zonas</option>
          {regions.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Filtrar por estado del pedido"
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={state}
          onChange={(e) => setState(e.target.value)}
        >
          <option value="">Todos los estados</option>
          {Object.entries(marketStates).map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
        <Input
          aria-label="Buscar dirección o servicio"
          placeholder="Buscar dirección, cliente o servicio"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Button type="button" variant="outline" onClick={() => void refresh()}>
          Actualizar pedidos
        </Button>
      </div>
      <MarketErrorText error={error || issue} />
      {loading ? (
        <MarketNotice>Cargando pedidos…</MarketNotice>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            {orders.length} pedidos en la selección · {orders.filter((o) => o.location).length}{" "}
            ubicados · {orders.filter((o) => !o.location).length} sin ubicar. Se muestran hasta{" "}
            {data?.limit ?? 500} pedidos recientes de {data?.total ?? 0} registrados.
          </p>
          <div className="grid items-start gap-5 lg:grid-cols-[1.5fr_1fr]">
            <OrdersMap
              center={center}
              markers={markers}
              selectedId={selected}
              onSelect={(id) => {
                setSelected(id);
                setDraft(null);
              }}
              onPick={order ? setDraft : undefined}
              height={520}
            />
            <section className="max-h-[600px] space-y-3 overflow-y-auto">
              {!orders.length && (
                <MarketNotice>
                  Todavía no hay pedidos para estos filtros. No se muestran direcciones ni puntos de
                  ejemplo.
                </MarketNotice>
              )}
              {orders.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  className={`surface-panel block w-full space-y-2 p-4 text-left ${o.id === selected ? "border-primary bg-secondary" : ""}`}
                  onClick={() => {
                    setSelected(o.id);
                    setDraft(null);
                    setIssue("");
                  }}
                >
                  <span className="text-xs font-semibold text-primary">
                    {marketStates[o.state]} · {o.location ? "Ubicado" : "Sin ubicar"}
                  </span>
                  <span className="block font-semibold">{o.service}</span>
                  <span className="block text-sm text-muted-foreground">{o.address}</span>
                  <span className="block text-xs text-muted-foreground">
                    {o.clientName} · {regions.find((r) => r.id === o.cityId)?.name ?? o.cityId}
                  </span>
                </button>
              ))}
            </section>
          </div>
          {order && (
            <section className="surface-panel space-y-4 p-6">
              <h3 className="font-semibold">Ubicar pedido: {order.service}</h3>
              <p className="text-sm text-muted-foreground">
                {order.address}. Elegí el punto en el mapa y guardalo. La dirección escrita no se
                modifica.
              </p>
              {draft && (
                <p className="text-sm text-primary">
                  Punto pendiente de guardar: {draft.lat.toFixed(5)}, {draft.lng.toFixed(5)}
                </p>
              )}
              <Button
                disabled={!draft || busy}
                onClick={async () => {
                  setBusy(true);
                  setIssue("");
                  try {
                    await marketApi(`/ceo/orders/${order.id}/location`, {
                      method: "PATCH",
                      body: JSON.stringify({ version: order.version, location: draft }),
                    });
                    setDraft(null);
                    await refresh();
                  } catch (cause) {
                    setIssue(
                      cause instanceof Error ? cause.message : "No se pudo guardar el punto.",
                    );
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {busy ? "Guardando…" : "Guardar ubicación del pedido"}
              </Button>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function CeoOperations() {
  const [section, setSection] = useState("resumen");
  return (
    <div className="space-y-6">
      <label className="block max-w-sm space-y-2 text-sm">
        <span>Área de operación</span>
        <select
          aria-label="Área de operación"
          value={section.split("?")[0]}
          onChange={(e) => setSection(e.target.value)}
          className="h-10 w-full rounded-xl border border-input bg-background px-3"
        >
          {[
            ["resumen", "Panorama general"],
            ["solicitudes", "Mesa de solicitudes"],
            ["casos", "Control de incidentes"],
            ["directorio", "Directorio y moderación"],
            ["zonas", "Zonas y liquidez"],
            ["revisiones", "Verificaciones"],
            ["auditoria", "Auditoría operativa"],
            ["reglas", "Reglas de atención"],
            ["sistema", "Estado del sistema"],
          ].map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
      </label>
      {section === "revisiones" ? (
        <StaffWorkspace section="reviews" />
      ) : (
        <OperationsView key={section} section={section} onSelect={setSection} />
      )}
    </div>
  );
}
