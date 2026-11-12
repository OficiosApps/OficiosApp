import { toast } from "sonner";
import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  ClipboardList,
  Download,
  Search,
  ShieldCheck,
  Users,
  Wallet,
  Clock3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { MarketNotice, MarketErrorText } from "@/components/market-common";
import { useMarket, useRemote } from "@/hooks/use-market";
import { marketApi, marketStates } from "@/lib/market-client";
const prefix = "/staff/operations";
const date = (value: number) =>
  new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Buenos_Aires",
  }).format(value);
const money = (value: number, currency = "ARS") =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency, maximumFractionDigits: 2 }).format(
    (value || 0) / 100,
  );
const labels: Record<string, string> = {
  nuevo: "Nuevo",
  en_curso: "En curso",
  escalado: "Escalado",
  resuelto: "Resuelto",
  baja: "Baja",
  media: "Media",
  alta: "Alta",
  critica: "Crítica",
  reclamo: "Reclamo",
  contratacion: "Contratación",
  verificacion: "Verificación",
  perfil: "Perfil reportado",
  pago: "Problema de pago",
  tecnico: "Problema técnico",
  seguimiento: "Seguimiento",
  cliente: "Cliente",
  profesional: "Profesional",
  empresa: "Empresa",
};
const categories = [
  "seguimiento",
  "reclamo",
  "contratacion",
  "verificacion",
  "perfil",
  "pago",
  "tecnico",
];
const priorities = ["baja", "media", "alta", "critica"];
function Select({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <label className="min-w-0 space-y-1.5 text-xs text-muted-foreground">
      <span>{label}</span>
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground"
      >
        {children}
      </select>
    </label>
  );
}
function Tag({ value }: { value: string }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${["critica", "escalado"].includes(value) ? "bg-red-100 text-red-900" : value === "resuelto" ? "bg-emerald-100 text-emerald-900" : "bg-secondary text-foreground"}`}
    >
      {labels[value] || value}
    </span>
  );
}
function Heading({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h2 className="font-display text-2xl font-semibold">{title}</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  );
}
function Table({ heads, children }: { heads: string[]; children: ReactNode }) {
  return (
    <div className="surface-panel overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-border bg-secondary/40 text-xs text-muted-foreground">
          <tr>
            {heads.map((h) => (
              <th key={h} className="whitespace-nowrap px-4 py-3 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">{children}</tbody>
      </table>
    </div>
  );
}
function Cell({ children }: { children: ReactNode }) {
  return <td className="max-w-xs px-4 py-4 align-top">{children}</td>;
}
function Empty({ children }: { children: ReactNode }) {
  return <MarketNotice>{children}</MarketNotice>;
}
function Pager({ data, page, setPage }: { data: any; page: number; setPage: (n: number) => void }) {
  if (!data) return null;
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
      <p>
        {data.total} registros · Página {page} de{" "}
        {Math.max(1, Math.ceil(data.total / data.pageSize))}
      </p>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>
          Anterior
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={page * data.pageSize >= data.total}
          onClick={() => setPage(page + 1)}
        >
          Siguiente
        </Button>
      </div>
    </div>
  );
}
function Modal({
  title,
  description,
  onClose,
  children,
}: {
  title: string;
  description: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}
function useMutation(done: () => Promise<void>) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return {
    busy,
    error,
    run: async (path: string, body: any, method = "POST") => {
      setBusy(true);
      setError("");
      try {
        const result = await marketApi(prefix + path, { method, body: JSON.stringify(body) });
        await done();
        return result;
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo guardar.");
        return null;
      } finally {
        setBusy(false);
      }
    },
  };
}
function exportPage(name: string, columns: string[], rows: any[][]) {
  const cell = (value: any) => {
    let text = String(value ?? "");
    if (/^[=+@\-\t\r]/.test(text)) text = "'" + text;
    return '"' + text.replaceAll('"', '""') + '"';
  };
  const csv = "\uFEFF" + [columns, ...rows].map((r) => r.map(cell).join(";")).join("\r\n");
  const link = document.createElement("a"),
    url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  link.href = url;
  link.download = name + ".csv";
  link.click();
  URL.revokeObjectURL(url);
}
function RegionsSelect({
  value,
  onChange,
  regions,
}: {
  value: string;
  onChange: (v: string) => void;
  regions: any[];
}) {
  return (
    <Select label="Zona" value={value} onChange={onChange}>
      <option value="">Todas las zonas</option>
      {regions.map((r) => (
        <option key={r.id} value={r.id}>
          {r.name}
        </option>
      ))}
    </Select>
  );
}
export function OperationsView({
  section,
  onSelect,
}: {
  section: string;
  onSelect: (id: string) => void;
}) {
  const [view, raw] = section.split("?");
  const presets = new URLSearchParams(raw || "");
  if (view === "resumen") return <OperationsOverview onSelect={onSelect} />;
  if (view === "solicitudes")
    return (
      <OperationsJobs
        initialAttention={presets.get("attention") || ""}
        initialCity={presets.get("city") || ""}
      />
    );
  if (view === "profesionales") return <OperationsDirectory initialKind="providers" />;
  if (view === "clientes") return <OperationsDirectory initialKind="cliente" />;
  if (view === "directorio") return <OperationsDirectory initialKind="" />;
  if (view === "casos")
    return (
      <OperationsCases
        initialStatus={presets.get("status") || ""}
        initialCity={presets.get("city") || ""}
      />
    );
  if (view === "zonas") return <OperationsRegions />;
  if (view === "auditoria") return <OperationsAudit />;
  if (view === "reglas") return <OperationsSettings />;
  if (view === "sistema") return <OperationsSystem />;
  return null;
}
function OperationsOverview({ onSelect }: { onSelect: (v: string) => void }) {
  const { session } = useMarket(),
    supervisor = session.staffRole !== "admin";
  const [days, setDays] = useState("30"),
    [city, setCity] = useState("");
  const { data, error, loading } = useRemote<any>(
    prefix + `/summary?days=${days}&city=${encodeURIComponent(city)}`,
    true,
  );
  return (
    <div>
      <Heading
        title={supervisor ? "Panorama de la plataforma" : "Tu jornada de operación"}
        description={
          supervisor
            ? "Seguí la oferta, las contrataciones y las prioridades de atención de todas las zonas."
            : "Detectá solicitudes que necesitan respuesta y organizá los casos que podés atender."
        }
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <Select label="Período de solicitudes" value={days} onChange={setDays}>
          {["7", "30", "90"].map((d) => (
            <option key={d} value={d}>
              Últimos {d} días
            </option>
          ))}
        </Select>
        <RegionsSelect value={city} onChange={setCity} regions={data?.regions || []} />
      </div>
      <MarketErrorText error={error} />
      {loading ? (
        <Empty>Cargando indicadores…</Empty>
      ) : (
        data && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                ["Solicitudes del período", data.totals.requests, ClipboardList],
                ["Contrataciones del período", data.totals.hired, CheckCircle2],
                ["Valor de presupuestos aceptados", money(data.acceptedValue), Wallet],
                ["Verificaciones pendientes", data.accounts.pending, ShieldCheck],
              ].map(([name, value, Icon]: any) => (
                <article key={name} className="surface-panel p-5">
                  <Icon className="size-5 text-primary" />
                  <p className="mt-4 text-xs text-muted-foreground">{name}</p>
                  <p className="mt-2 break-words font-display text-2xl font-semibold">{value}</p>
                </article>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              El valor corresponde a precios aceptados de solicitudes del período, excluye
              canceladas y no confirma cobros.
            </p>
            <div className="mt-6 grid gap-5 xl:grid-cols-2">
              <section className="surface-panel p-6">
                <h3 className="font-display text-lg font-semibold">Embudo del circuito</h3>
                <div className="mt-5 space-y-5">
                  {[
                    ["Solicitudes", data.totals.requests],
                    ["Con presupuesto", data.totals.responded],
                    ["Contratadas", data.totals.hired],
                    ["Finalizadas", data.totals.completed],
                  ].map(([name, value]) => (
                    <div key={String(name)}>
                      <div className="mb-2 flex justify-between text-sm">
                        <span>{name}</span>
                        <strong>{value}</strong>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-secondary">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{
                            width: `${data.totals.requests ? (Number(value) / data.totals.requests) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
              <section className="surface-panel p-6">
                <h3 className="font-display text-lg font-semibold">Liquidez y servicio</h3>
                <dl className="mt-5 space-y-4">
                  {[
                    [
                      "Tasa de respuesta",
                      data.totals.requests
                        ? Math.round((data.totals.responded / data.totals.requests) * 100) + "%"
                        : "Sin solicitudes",
                    ],
                    [
                      "Primera respuesta",
                      data.responseMs === null
                        ? "Sin datos"
                        : Math.round(data.responseMs / 60000) + " min",
                    ],
                    ["Profesionales registrados", data.accounts.professionals],
                    ["Empresas registradas", data.accounts.companies],
                    ["Clientes registrados", data.accounts.clients],
                    ["Clientes que volvieron en el período", data.returning],
                    ["Cancelaciones del período", data.totals.cancelled],
                  ].map(([name, value]) => (
                    <div
                      key={String(name)}
                      className="flex justify-between gap-3 border-b border-border pb-3 text-sm last:border-0"
                    >
                      <dt className="text-muted-foreground">{name}</dt>
                      <dd className="font-semibold">{value}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            </div>
            <section className="mt-6">
              <h3 className="mb-4 font-display text-lg font-semibold">Necesita atención</h3>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  ["Solicitudes sin presupuesto", data.unanswered, "solicitudes?attention=1"],
                  ["Casos abiertos", data.cases.open, "casos?status=abiertos"],
                  ["Fuera de plazo", data.cases.overdue, "casos?status=vencidos"],
                  ["Escalados a supervisión", data.cases.escalated, "casos?status=escalado"],
                ].map(([name, value, target]) => (
                  <button
                    key={String(name)}
                    onClick={() =>
                      onSelect(String(target) + (city ? "&city=" + encodeURIComponent(city) : ""))
                    }
                    className="surface-panel p-5 text-left transition hover:border-primary/40"
                  >
                    <div className="flex justify-between">
                      <AlertTriangle className="size-4 text-amber-700" />
                      <ArrowRight className="size-4 text-muted-foreground" />
                    </div>
                    <p className="mt-4 text-xs text-muted-foreground">{name}</p>
                    <p className="mt-2 font-display text-2xl font-semibold">{value}</p>
                  </button>
                ))}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Los casos muestran la cola actual. Hay {data.cases.waiting} casos nuevos que
                superaron el plazo de primera atención.
              </p>
            </section>
          </>
        )
      )}
    </div>
  );
}
function OperationsDirectory({ initialKind }: { initialKind: string }) {
  const { session } = useMarket(),
    supervisor = session.staffRole !== "admin";
  const [q, setQ] = useState(""),
    [city, setCity] = useState(""),
    [kind, setKind] = useState(initialKind),
    [verification, setVerification] = useState(""),
    [page, setPage] = useState(1),
    [newCase, setNewCase] = useState<any>(null),
    [moderation, setModeration] = useState<any>(null);
  const { data: zones } = useRemote<any>(prefix + "/regions");
  const { data, error, loading, refresh } = useRemote<any>(
    prefix +
      `/accounts?q=${encodeURIComponent(q)}&city=${encodeURIComponent(city)}&kind=${kind}&verification=${verification}&page=${page}`,
    true,
  );
  const filter = (setter: (v: string) => void) => (v: string) => {
    setter(v);
    setPage(1);
  };
  return (
    <div>
      <Heading
        title={
          initialKind === "cliente"
            ? "Clientes"
            : initialKind === "providers"
              ? "Profesionales y empresas"
              : "Directorio de la plataforma"
        }
        description="Consultá cuentas, zonas, oficios y actividad. Abrí un caso para documentar cada seguimiento."
      >
        <Button
          variant="outline"
          size="sm"
          disabled={!data?.items.length}
          onClick={() =>
            exportPage(
              "oficios-directorio",
              [
                "Nombre",
                "Tipo",
                "Correo",
                "Teléfono",
                "Zona",
                "Oficio",
                "Verificación",
                "Trabajos finalizados",
              ],
              data.items.map((r: any) => [
                r.name,
                labels[r.kind],
                r.email,
                r.phone,
                r.cityId,
                r.trade,
                r.verification,
                r.completedJobs,
              ]),
            )
          }
        >
          <Download className="size-4" />
          Exportar esta página
        </Button>
      </Heading>
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <label className="space-y-1.5 text-xs text-muted-foreground">
          <span>Buscar una cuenta</span>
          <Input
            aria-label="Buscar una cuenta"
            value={q}
            placeholder="Nombre, correo o teléfono"
            onChange={(e) => filter(setQ)(e.target.value)}
          />
        </label>
        <RegionsSelect value={city} onChange={filter(setCity)} regions={zones?.regions || []} />
        <Select label="Tipo de cuenta" value={kind} onChange={filter(setKind)}>
          <option value="">Todos</option>
          <option value="providers">Profesionales y empresas</option>
          {["cliente", "profesional", "empresa"].map((k) => (
            <option key={k} value={k}>
              {labels[k]}
            </option>
          ))}
        </Select>
        <Select label="Verificación" value={verification} onChange={filter(setVerification)}>
          <option value="">Todos los estados</option>
          {["sin-enviar", "pendiente", "aprobado", "rechazado"].map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </Select>
      </div>
      <MarketErrorText error={error} />
      {loading ? (
        <Empty>Cargando directorio…</Empty>
      ) : data?.items.length ? (
        <Table
          heads={[
            "Cuenta",
            "Contacto",
            "Zona y oficio",
            "Actividad",
            "Verificación y revisión",
            "Acciones",
          ]}
        >
          {data.items.map((r: any) => (
            <tr key={r.id}>
              <Cell>
                <strong>{r.name}</strong>
                <p className="mt-1 text-xs text-muted-foreground">{labels[r.kind]}</p>
              </Cell>
              <Cell>
                <p className="break-all">{r.email}</p>
                <p className="mt-1 text-xs text-muted-foreground">{r.phone || "Sin teléfono"}</p>
              </Cell>
              <Cell>
                {zones?.regions.find((z: any) => z.id === r.cityId)?.name || r.cityId}
                <p className="mt-1 text-xs text-muted-foreground">{r.trade || "—"}</p>
              </Cell>
              <Cell>
                {r.kind === "cliente"
                  ? `${r.requests} solicitudes`
                  : `${r.completedJobs} trabajos finalizados`}
              </Cell>
              <Cell>
                <Tag value={r.verification} />
                {r.kind !== "cliente" && (
                  <p
                    className={`mt-2 text-xs ${r.hidden ? "text-destructive" : "text-muted-foreground"}`}
                  >
                    {r.hidden ? "Perfil en revisión operativa" : "Sin restricción operativa"}
                  </p>
                )}
              </Cell>
              <Cell>
                <div className="flex flex-col gap-2">
                  <Button size="sm" variant="outline" onClick={() => setNewCase(r)}>
                    Abrir seguimiento
                  </Button>
                  {supervisor && r.kind !== "cliente" && (
                    <Button size="sm" variant="outline" onClick={() => setModeration(r)}>
                      {r.hidden ? "Restablecer perfil" : "Revisar publicación"}
                    </Button>
                  )}
                  {r.kind !== "cliente" && r.verification === "aprobado" && !r.hidden && (
                    <Button size="sm" variant="ghost" asChild>
                      <Link to="/profesionales/$id" params={{ id: r.id }}>
                        Ver perfil público
                      </Link>
                    </Button>
                  )}
                </div>
              </Cell>
            </tr>
          ))}
        </Table>
      ) : (
        <Empty>No hay cuentas que coincidan con estos filtros.</Empty>
      )}
      <Pager data={data} page={page} setPage={setPage} />
      {newCase && (
        <CreateCaseDialog
          seed={{
            accountId: newCase.id,
            cityId: newCase.cityId,
            title: `Seguimiento de ${newCase.name}`,
          }}
          onClose={() => setNewCase(null)}
          onSaved={async () => {
            setNewCase(null);
            await refresh();
          }}
        />
      )}
      {moderation && (
        <ReasonDialog
          title={moderation.hidden ? "Restablecer publicación" : "Revisar publicación del perfil"}
          description={`Cuenta: ${moderation.name}. ${moderation.hidden ? "La publicación y los nuevos presupuestos se restablecen si la identidad y la cobertura están habilitadas." : "La revisión oculta el perfil público y pausa los nuevos presupuestos. Los trabajos ya contratados continúan."}`}
          label="Motivo que se informará al profesional"
          onClose={() => setModeration(null)}
          onSubmit={async (reason) => {
            await marketApi(prefix + "/profile-control", {
              method: "POST",
              body: JSON.stringify({
                userId: moderation.id,
                version: moderation.controlVersion,
                hidden: !moderation.hidden,
                reason,
              }),
            });
            setModeration(null);
            await refresh();
          }}
        />
      )}
    </div>
  );
}
function OperationsJobs({
  initialAttention = "",
  initialCity = "",
}: {
  initialAttention?: string;
  initialCity?: string;
}) {
  const [q, setQ] = useState(""),
    [city, setCity] = useState(initialCity),
    [state, setState] = useState(""),
    [attention, setAttention] = useState(initialAttention),
    [page, setPage] = useState(1),
    [selected, setSelected] = useState<string | null>(null),
    [newCase, setNewCase] = useState<any>(null);
  const { data: zones } = useRemote<any>(prefix + "/regions");
  const { data, error, loading, refresh } = useRemote<any>(
    prefix +
      `/jobs?q=${encodeURIComponent(q)}&city=${encodeURIComponent(city)}&state=${state}&attention=${attention}&page=${page}`,
    true,
  );
  const filter = (setter: (v: string) => void) => (v: string) => {
    setter(v);
    setPage(1);
  };
  return (
    <div>
      <Heading
        title="Mesa de solicitudes"
        description="Seguí el circuito de contratación y registrá acciones de atención para las solicitudes que lo necesiten."
      >
        <Button
          variant="outline"
          size="sm"
          disabled={!data?.items.length}
          onClick={() =>
            exportPage(
              "oficios-solicitudes",
              ["ID", "Servicio", "Cliente", "Zona", "Estado", "Presupuestos", "Valor aceptado"],
              data.items.map((j: any) => [
                j.id,
                j.service,
                j.clientName,
                j.cityId,
                marketStates[j.state],
                j.quoteCount,
                j.acceptedValue / 100,
              ]),
            )
          }
        >
          <Download className="size-4" />
          Exportar esta página
        </Button>
      </Heading>
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <label className="space-y-1.5 text-xs text-muted-foreground">
          <span>Buscar solicitud</span>
          <Input
            aria-label="Buscar solicitud"
            placeholder="Servicio, cliente o ID"
            value={q}
            onChange={(e) => filter(setQ)(e.target.value)}
          />
        </label>
        <RegionsSelect value={city} onChange={filter(setCity)} regions={zones?.regions || []} />
        <Select label="Estado del trabajo" value={state} onChange={filter(setState)}>
          <option value="">Todos</option>
          {Object.entries(marketStates).map(([key, name]) => (
            <option key={key} value={key}>
              {name}
            </option>
          ))}
        </Select>
        <Select label="Atención" value={attention} onChange={filter(setAttention)}>
          <option value="">Todas las solicitudes</option>
          <option value="1">Sin presupuesto fuera de plazo</option>
        </Select>
      </div>
      <MarketErrorText error={error} />
      {loading ? (
        <Empty>Cargando solicitudes…</Empty>
      ) : data?.items.length ? (
        <Table
          heads={[
            "Servicio",
            "Cliente y profesional",
            "Estado",
            "Presupuestos",
            "Último movimiento",
            "Acciones",
          ]}
        >
          {data.items.map((j: any) => (
            <tr key={j.id}>
              <Cell>
                <strong>{j.service}</strong>
                <p className="mt-1 text-xs text-muted-foreground">
                  {zones?.regions.find((r: any) => r.id === j.cityId)?.name || j.cityId}
                </p>
              </Cell>
              <Cell>
                {j.clientName}
                <p className="mt-1 text-xs text-muted-foreground">
                  {j.professionalName || "Sin profesional contratado"}
                </p>
              </Cell>
              <Cell>
                <Tag value={marketStates[j.state] || j.state} />
              </Cell>
              <Cell>
                {j.quoteCount} presupuestos
                {j.acceptedValue > 0 && (
                  <p className="mt-1 text-xs">Aceptado: {money(j.acceptedValue)}</p>
                )}
              </Cell>
              <Cell>
                <p className="text-xs">{date(j.updatedAt)}</p>
              </Cell>
              <Cell>
                <div className="flex flex-col gap-2">
                  <Button variant="outline" size="sm" onClick={() => setSelected(j.id)}>
                    Ver seguimiento
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setNewCase(j)}>
                    Abrir caso
                  </Button>
                </div>
              </Cell>
            </tr>
          ))}
        </Table>
      ) : (
        <Empty>No hay solicitudes con estos filtros.</Empty>
      )}
      <Pager data={data} page={page} setPage={setPage} />
      {selected && (
        <JobDialog
          id={selected}
          onClose={() => setSelected(null)}
          onCase={(j) => {
            setSelected(null);
            setNewCase(j);
          }}
        />
      )}
      {newCase && (
        <CreateCaseDialog
          seed={{
            jobId: newCase.id,
            cityId: newCase.cityId,
            title: `Seguimiento: ${newCase.service}`,
          }}
          onClose={() => setNewCase(null)}
          onSaved={async () => {
            setNewCase(null);
            await refresh();
          }}
        />
      )}
    </div>
  );
}
function JobDialog({
  id,
  onClose,
  onCase,
}: {
  id: string;
  onClose: () => void;
  onCase: (job: any) => void;
}) {
  const { data, error, loading } = useRemote<any>(prefix + "/jobs/" + encodeURIComponent(id));
  const j = data?.job;
  return (
    <Modal
      title="Seguimiento de la solicitud"
      description="Datos de atención y recorrido del trabajo."
      onClose={onClose}
    >
      <MarketErrorText error={error} />
      {loading ? (
        <Empty>Cargando detalle…</Empty>
      ) : (
        j && (
          <div className="space-y-5">
            <h3 className="font-semibold">{j.service}</h3>
            <Tag value={marketStates[j.state] || j.state} />
            <p className="whitespace-pre-wrap text-sm">
              {j.description || "El cliente no agregó una descripción."}
            </p>
            <div className="rounded-xl bg-secondary/60 p-4 text-sm">
              <p>Cliente: {j.clientName}</p>
              <p className="mt-2">Dirección: {j.address}</p>
              <p className="mt-2">Contacto: {j.contact}</p>
              <p className="mt-2">Profesional: {j.professionalName || "Sin contratación"}</p>
              {j.acceptedValue > 0 && (
                <p className="mt-2">Presupuesto aceptado: {money(j.acceptedValue)}</p>
              )}
            </div>
            <h4 className="text-sm font-semibold">Historial del trabajo</h4>
            <ol className="space-y-3 border-l-2 border-primary/20 pl-4">
              {j.events.map((e: any, i: number) => (
                <li key={i} className="text-sm">
                  <strong>{marketStates[e.state] || e.state}</strong>
                  <p className="mt-1 text-xs text-muted-foreground">{date(e.at)}</p>
                </li>
              ))}
            </ol>
            {j.cancellationReason && <p className="text-sm">Cancelación: {j.cancellationReason}</p>}
            <Button onClick={() => onCase(j)}>Registrar caso o seguimiento</Button>
          </div>
        )
      )}
    </Modal>
  );
}
function OperationsCases({
  initialStatus = "",
  initialCity = "",
}: {
  initialStatus?: string;
  initialCity?: string;
}) {
  const { session } = useMarket(),
    supervisor = session.staffRole !== "admin";
  const [q, setQ] = useState(""),
    [city, setCity] = useState(initialCity),
    [status, setStatus] = useState(initialStatus),
    [priority, setPriority] = useState(""),
    [mine, setMine] = useState(""),
    [page, setPage] = useState(1),
    [selected, setSelected] = useState<string | null>(null),
    [create, setCreate] = useState(false);
  const { data: zones } = useRemote<any>(prefix + "/regions");
  const { data, error, loading, refresh } = useRemote<any>(
    prefix +
      `/cases?q=${encodeURIComponent(q)}&city=${encodeURIComponent(city)}&status=${status}&priority=${priority}&mine=${mine}&page=${page}`,
    true,
  );
  const filter = (setter: (v: string) => void) => (v: string) => {
    setter(v);
    setPage(1);
  };
  return (
    <div>
      <Heading
        title={supervisor ? "Control de incidentes" : "Casos y atención"}
        description={
          supervisor
            ? "Priorizá reclamos, distribuí responsables y resolvé los casos escalados."
            : "Tomá casos de la cola, registrá notas y escalá las situaciones que requieran supervisión."
        }
      >
        <Button onClick={() => setCreate(true)}>Registrar caso</Button>
      </Heading>
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <label className="space-y-1.5 text-xs text-muted-foreground">
          <span>Buscar caso</span>
          <Input
            aria-label="Buscar caso"
            placeholder="Título, persona o ID"
            value={q}
            onChange={(e) => filter(setQ)(e.target.value)}
          />
        </label>
        <RegionsSelect value={city} onChange={filter(setCity)} regions={zones?.regions || []} />
        <Select label="Estado del caso" value={status} onChange={filter(setStatus)}>
          <option value="">Todos</option>
          <option value="abiertos">Abiertos</option>
          <option value="vencidos">Fuera de plazo</option>
          {["nuevo", "en_curso", "escalado", "resuelto"].map((v) => (
            <option key={v} value={v}>
              {labels[v]}
            </option>
          ))}
        </Select>
        <Select label="Prioridad" value={priority} onChange={filter(setPriority)}>
          <option value="">Todas</option>
          {priorities.map((v) => (
            <option key={v} value={v}>
              {labels[v]}
            </option>
          ))}
        </Select>
        <Select label="Responsable" value={mine} onChange={filter(setMine)}>
          <option value="">{supervisor ? "Toda la operación" : "Mi cola y sin asignar"}</option>
          <option value="1">Sólo asignados a mí</option>
        </Select>
      </div>
      <MarketErrorText error={error} />
      {loading ? (
        <Empty>Cargando casos…</Empty>
      ) : data?.items.length ? (
        <Table
          heads={[
            "Caso",
            "Tipo",
            "Prioridad",
            "Estado",
            "Plazo de atención",
            "Responsable",
            "Acción",
          ]}
        >
          {data.items.map((c: any) => (
            <tr key={c.id}>
              <Cell>
                <strong>{c.title}</strong>
                <p className="mt-1 text-xs text-muted-foreground">
                  {c.account_name || "Caso general"}
                </p>
              </Cell>
              <Cell>{labels[c.category]}</Cell>
              <Cell>
                <Tag value={c.priority} />
              </Cell>
              <Cell>
                <Tag value={c.status} />
              </Cell>
              <Cell>
                <p
                  className={`text-xs ${c.status !== "resuelto" && c.due_at < Date.now() ? "font-semibold text-destructive" : ""}`}
                >
                  {date(c.due_at)}
                </p>
                {c.status !== "resuelto" && c.due_at < Date.now() && (
                  <p className="mt-1 text-xs text-destructive">Fuera de plazo</p>
                )}
              </Cell>
              <Cell>
                <p className="max-w-36 break-all text-xs">
                  {c.assignee_id === data.viewerId
                    ? "Asignado a mí"
                    : c.assignee_name || (c.assignee_id ? "Asignado" : "Sin asignar")}
                </p>
              </Cell>
              <Cell>
                <Button size="sm" variant="outline" onClick={() => setSelected(c.id)}>
                  Gestionar caso
                </Button>
              </Cell>
            </tr>
          ))}
        </Table>
      ) : (
        <Empty>
          No hay casos con estos filtros. Los reclamos recibidos por los canales de atención se
          registran desde este panel.
        </Empty>
      )}
      <Pager data={data} page={page} setPage={setPage} />
      {create && (
        <CreateCaseDialog
          onClose={() => setCreate(false)}
          onSaved={async () => {
            setCreate(false);
            await refresh();
          }}
        />
      )}
      {selected && (
        <CaseDialog id={selected} onClose={() => setSelected(null)} onChanged={refresh} />
      )}
    </div>
  );
}
function CreateCaseDialog({
  seed = {},
  onClose,
  onSaved,
}: {
  seed?: any;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const { data: zones } = useRemote<any>(prefix + "/regions");
  const [title, setTitle] = useState((seed.title || "").slice(0, 120)),
    [description, setDescription] = useState(""),
    [city, setCity] = useState(seed.cityId || ""),
    [category, setCategory] = useState("seguimiento"),
    [priority, setPriority] = useState("media");
  const mutation = useMutation(onSaved);
  return (
    <Modal
      title="Registrar caso"
      description="Creá un registro interno para dar seguimiento a una consulta, reclamo o incidente."
      onClose={onClose}
    >
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          await mutation.run("/cases", {
            title,
            description,
            cityId: city,
            category,
            priority,
            accountId: seed.accountId,
            jobId: seed.jobId,
          });
        }}
      >
        <MarketErrorText error={mutation.error} />
        <label className="block space-y-2 text-sm">
          <span>Título del caso</span>
          <Input
            aria-label="Título del caso"
            required
            minLength={5}
            maxLength={120}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label className="block space-y-2 text-sm">
          <span>Descripción del caso</span>
          <Textarea
            aria-label="Descripción del caso"
            required
            minLength={10}
            maxLength={2500}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Qué ocurrió, qué necesita la persona y qué se verificó hasta ahora."
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-3">
          <Select label="Tipo de incidente" value={category} onChange={setCategory}>
            {categories.map((k) => (
              <option key={k} value={k}>
                {labels[k]}
              </option>
            ))}
          </Select>
          <Select label="Prioridad del nuevo caso" value={priority} onChange={setPriority}>
            {priorities.map((k) => (
              <option key={k} value={k}>
                {labels[k]}
              </option>
            ))}
          </Select>
          <Select label="Zona del caso" value={city} onChange={setCity}>
            <option value="">Elegí una zona</option>
            {zones?.regions.map((r: any) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </Select>
        </div>
        {(seed.accountId || seed.jobId) && (
          <p className="text-xs text-muted-foreground">
            Se vinculará al registro desde el que abriste este seguimiento.
          </p>
        )}
        <Button type="submit" disabled={mutation.busy || !city}>
          {mutation.busy ? "Guardando…" : "Guardar caso"}
        </Button>
      </form>
    </Modal>
  );
}
function CaseDialog({
  id,
  onClose,
  onChanged,
}: {
  id: string;
  onClose: () => void;
  onChanged: () => Promise<void>;
}) {
  const { session } = useMarket(),
    supervisor = session.staffRole !== "admin";
  const { data, error, loading, refresh } = useRemote<any>(
    prefix + "/cases/" + encodeURIComponent(id),
    true,
  );
  const [note, setNote] = useState(""),
    [assignee, setAssignee] = useState(""),
    [priority, setPriority] = useState("alta");
  const mutation = useMutation(async () => {
    setNote("");
    await refresh();
    await onChanged();
  });
  const c = data?.case,
    own = c?.assignee_id === data?.viewerId,
    canOperate = supervisor || own;
  async function action(name: string, extra: any = {}) {
    await mutation.run("/cases/" + encodeURIComponent(id), {
      action: name,
      version: c.version,
      note,
      resolution: note,
      ...extra,
    });
  }
  return (
    <Modal
      title={c?.title || "Detalle del caso"}
      description="Seguimiento interno. Las notas y el cierre del caso no cambian el precio ni el estado del trabajo contratado."
      onClose={onClose}
    >
      <MarketErrorText error={error || mutation.error} />
      {loading ? (
        <Empty>Cargando caso…</Empty>
      ) : (
        c && (
          <div className="space-y-5">
            <div className="flex gap-2">
              <Tag value={c.status} />
              <Tag value={c.priority} />
            </div>
            <p className="whitespace-pre-wrap text-sm">{c.description}</p>
            <div className="rounded-xl bg-secondary/60 p-4 text-sm">
              <p>Persona: {c.account_name || "Caso general"}</p>
              <p className="mt-2">
                Responsable:{" "}
                {own
                  ? "Asignado a mí"
                  : c.assignee_name || (c.assignee_id ? "Asignado" : "Sin asignar")}
              </p>
              <p className="mt-2">Atender antes de: {date(c.due_at)}</p>
              {c.job_id && (
                <p className="mt-2 break-all text-xs">Solicitud vinculada: {c.job_id}</p>
              )}
            </div>
            {c.resolution && (
              <div className="rounded-xl border border-primary/20 p-4 text-sm">
                <strong>Resolución registrada</strong>
                <p className="mt-2 whitespace-pre-wrap">{c.resolution}</p>
              </div>
            )}
            {c.status !== "resuelto" && (!c.assignee_id || (supervisor && !own)) && (
              <Button disabled={mutation.busy} onClick={() => void action("claim")}>
                Tomar caso
              </Button>
            )}
            <section>
              <h3 className="font-semibold">Notas internas e historial</h3>
              <div className="mt-4 space-y-3">
                {!data.notes.length && (
                  <p className="text-sm text-muted-foreground">Todavía no hay notas.</p>
                )}
                {data.notes.map((n: any) => (
                  <article key={n.id} className="rounded-xl border border-border p-4">
                    <p className="whitespace-pre-wrap text-sm">{n.body}</p>
                    <p className="mt-3 text-xs text-muted-foreground">
                      {n.author_name} · {date(n.created_at)}
                    </p>
                  </article>
                ))}
              </div>
            </section>
            {canOperate && (
              <section className="space-y-4 border-t border-border pt-5">
                <label className="block space-y-2 text-sm">
                  <span>Nota o detalle de la resolución</span>
                  <Textarea
                    aria-label="Nota o detalle de la resolución"
                    maxLength={2500}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Dejá constancia del contacto, la decisión y el próximo paso."
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    disabled={mutation.busy || note.trim().length < 3}
                    onClick={() => void action("note")}
                  >
                    Guardar nota
                  </Button>
                  {c.status !== "resuelto" && (
                    <Button
                      variant="outline"
                      disabled={mutation.busy || note.trim().length < 5}
                      onClick={() => void action("escalate")}
                    >
                      Escalar a supervisión
                    </Button>
                  )}
                  {c.status !== "resuelto" &&
                    (supervisor || (c.status !== "escalado" && c.priority !== "critica")) && (
                      <Button
                        disabled={mutation.busy || note.trim().length < 10}
                        onClick={() => void action("resolve")}
                      >
                        Resolver caso
                      </Button>
                    )}
                  {c.status === "resuelto" && (
                    <Button
                      disabled={mutation.busy || note.trim().length < 5}
                      onClick={() => void action("reopen")}
                    >
                      Reabrir caso
                    </Button>
                  )}
                </div>
                {supervisor && c.status !== "resuelto" && (
                  <div className="grid gap-4 rounded-xl bg-secondary/50 p-4 sm:grid-cols-2">
                    <div className="space-y-3">
                      <Select label="Asignar responsable" value={assignee} onChange={setAssignee}>
                        <option value="">Elegí un responsable</option>
                        {data.assignees.map((a: any) => (
                          <option key={a.id} value={a.id}>
                            {a.name}
                          </option>
                        ))}
                      </Select>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={mutation.busy || !assignee || note.trim().length < 5}
                        onClick={() => void action("assign", { assigneeId: assignee })}
                      >
                        Asignar caso
                      </Button>
                    </div>
                    <div className="space-y-3">
                      <Select label="Cambiar prioridad" value={priority} onChange={setPriority}>
                        {priorities.map((v) => (
                          <option key={v} value={v}>
                            {labels[v]}
                          </option>
                        ))}
                      </Select>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={mutation.busy || note.trim().length < 5}
                        onClick={() => void action("priority", { priority })}
                      >
                        Aplicar prioridad
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground sm:col-span-2">
                      Escribí en la nota el motivo de la asignación o el cambio de prioridad.
                    </p>
                  </div>
                )}
              </section>
            )}
          </div>
        )
      )}
    </Modal>
  );
}
function OperationsRegions() {
  const { data, error, loading } = useRemote<any>(prefix + "/regions", true);
  return (
    <div>
      <Heading
        title="Zonas y liquidez"
        description="Compará la oferta y la demanda por ciudad y detectá dónde hace falta sumar profesionales o atender solicitudes."
      />
      <MarketErrorText error={error} />
      {loading ? (
        <Empty>Cargando zonas…</Empty>
      ) : (
        data && (
          <>
            <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {data.regions.map((r: any) => (
                <article key={r.id} className="surface-panel p-5">
                  <div className="flex flex-wrap justify-between gap-2">
                    <h3 className="font-display text-lg font-semibold">{r.name}</h3>
                    <Tag
                      value={
                        r.status === "activa"
                          ? "Activa"
                          : r.status === "pausada"
                            ? "Pausada"
                            : "En preparación"
                      }
                    />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{r.province} · Argentina</p>
                  <div className="mt-5 grid grid-cols-2 gap-4 text-sm">
                    {[
                      ["Profesionales y empresas verificados", r.providers || 0],
                      ["Clientes", r.clients || 0],
                      ["Solicitudes", r.requests || 0],
                      ["Trabajos finalizados", r.completed || 0],
                    ].map(([label, value]) => (
                      <div key={String(label)}>
                        <p className="font-display text-xl font-semibold">{value}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{label}</p>
                      </div>
                    ))}
                  </div>
                  <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
                    {r.unanswered || 0} solicitudes sin presupuesto · {r.pending || 0}{" "}
                    verificaciones pendientes
                  </p>
                </article>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              La apertura de nuevas ciudades y los precios de los planes se gestionan desde la
              dirección CEO.
            </p>
          </>
        )
      )}
    </div>
  );
}
const auditLabels: Record<string, string> = {
  "case-created": "Caso registrado",
  "case-claim": "Caso tomado",
  "case-note": "Nota interna",
  "case-assign": "Responsable asignado",
  "case-escalate": "Caso escalado",
  "case-resolve": "Caso resuelto",
  "case-reopen": "Caso reabierto",
  "case-priority": "Prioridad actualizada",
  "service-settings": "Reglas de atención actualizadas",
  "profile-hidden": "Perfil en revisión operativa",
  "profile-restored": "Publicación restablecida",
  "staff-paused": "Acceso pausado",
  "staff-restored": "Acceso reactivado",
  "identity-approved": "Identidad aprobada",
  "identity-rejected": "Nueva carga solicitada",
};
function OperationsAudit() {
  const [q, setQ] = useState(""),
    [page, setPage] = useState(1);
  const { data, error, loading } = useRemote<any>(
    prefix + `/audit?q=${encodeURIComponent(q)}&page=${page}`,
    true,
  );
  return (
    <div>
      <Heading
        title="Auditoría de operación"
        description="Consultá quién realizó cada cambio de atención, moderación o acceso, y cuándo quedó guardado."
      />
      <Input
        aria-label="Buscar en auditoría"
        className="mb-5 max-w-md"
        placeholder="Buscar actor o descripción"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setPage(1);
        }}
      />
      <MarketErrorText error={error} />
      {loading ? (
        <Empty>Cargando historial…</Empty>
      ) : data?.items.length ? (
        <Table heads={["Acción", "Responsable", "Registro", "Fecha"]}>
          {data.items.map((a: any) => (
            <tr key={a.id}>
              <Cell>
                <strong>{auditLabels[a.action] || a.action}</strong>
                <p className="mt-1 text-xs text-muted-foreground">{a.summary}</p>
              </Cell>
              <Cell>
                {a.actor_name}
                <p className="mt-1 text-xs text-muted-foreground">{a.actor_role}</p>
              </Cell>
              <Cell>
                <p className="max-w-40 break-all text-xs text-muted-foreground">{a.entity_id}</p>
              </Cell>
              <Cell>
                <p className="text-xs">{date(a.created_at)}</p>
              </Cell>
            </tr>
          ))}
        </Table>
      ) : (
        <Empty>
          Todavía no hay acciones registradas con estos filtros. El historial se completa con las
          operaciones guardadas.
        </Empty>
      )}
      <Pager data={data} page={page} setPage={setPage} />
    </div>
  );
}
function OperationsSettings() {
  const { data, error, loading, refresh } = useRemote<any>(prefix + "/settings");
  return (
    <div>
      <Heading
        title="Reglas de atención"
        description="Definí plazos internos para organizar las alertas y el seguimiento del equipo."
      />
      <MarketErrorText error={error} />
      {loading ? (
        <Empty>Cargando reglas…</Empty>
      ) : (
        data && <SettingsForm key={data.version} data={data} refresh={refresh} />
      )}
    </div>
  );
}
function SettingsForm({ data, refresh }: { data: any; refresh: () => Promise<void> }) {
  const [config, setConfig] = useState(data.config),
    [saved, setSaved] = useState(false);
  const mutation = useMutation(async () => {
    setSaved(true);
    toast.success("Reglas de atención guardadas");
    await refresh();
  });
  return (
    <form
      className="surface-panel max-w-2xl space-y-6 p-6"
      onSubmit={async (e) => {
        e.preventDefault();
        await mutation.run("/settings", { version: data.version, config }, "PUT");
      }}
    >
      <MarketErrorText error={mutation.error} />
      {saved && <MarketNotice>Reglas operativas guardadas.</MarketNotice>}
      {[
        ["responseHours", "Primera atención de un caso nuevo"],
        ["resolutionHours", "Plazo inicial para resolver nuevos casos"],
        ["unansweredHours", "Alertar solicitudes sin presupuesto"],
      ].map(([key, label]) => (
        <label key={key} className="block space-y-2 text-sm">
          <span>{label} (horas)</span>
          <Input
            aria-label={label}
            type="number"
            min={1}
            max={1440}
            required
            value={config[key!]}
            onChange={(e) => setConfig({ ...config, [key!]: Number(e.target.value) })}
          />
        </label>
      ))}
      <p className="text-xs leading-relaxed text-muted-foreground">
        Los plazos de nuevos casos se fijan al registrarlos. Los casos existentes conservan su
        vencimiento. Las alertas de solicitudes y primera atención se calculan con las reglas
        actuales. Estos son objetivos internos de atención.
      </p>
      <Button disabled={mutation.busy}>
        {mutation.busy ? "Guardando…" : "Guardar reglas de atención"}
      </Button>
    </form>
  );
}
function OperationsSystem() {
  const { data, error, loading, refresh } = useRemote<any>(prefix + "/system");
  return (
    <div>
      <Heading
        title="Estado del sistema"
        description="Configuración disponible y volumen real de registros para supervisar la operación."
      >
        <Button variant="outline" size="sm" onClick={() => void refresh()}>
          Actualizar estado
        </Button>
      </Heading>
      <MarketErrorText error={error} />
      {loading ? (
        <Empty>Comprobando sistema…</Empty>
      ) : (
        data && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                [
                  "Base de datos",
                  data.database ? "Consulta realizada correctamente" : "No disponible",
                  "Lectura validada desde el servidor.",
                ],
                [
                  "Archivos privados",
                  data.filesConfigured ? "Almacenamiento configurado" : "Sin almacenamiento",
                  "La configuración no sustituye una prueba de cada archivo.",
                ],
                [
                  "Invitaciones por correo",
                  data.mail.configured ? "Configuración cargada" : "Falta configurar correo",
                  `${data.delivery.sent} envíos aceptados · ${data.delivery.pending} pendientes · ${data.delivery.failed} rechazados o sin confirmar en los últimos 30 días.`,
                ],
                [
                  "Ayuda IA",
                  data.aiConfigured ? "Clave configurada" : "Sin clave",
                  "Este indicador no comprueba saldo ni disponibilidad del proveedor.",
                ],
              ].map(([label, value, detail]) => (
                <article key={String(label)} className="surface-panel p-6">
                  <div className="flex items-center gap-2">
                    <Activity className="size-4 text-primary" />
                    <h3 className="font-semibold">{label}</h3>
                  </div>
                  <p className="mt-4 font-medium">{value}</p>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{detail}</p>
                </article>
              ))}
            </div>
            <section className="surface-panel mt-6 p-6">
              <h3 className="font-display text-lg font-semibold">Registros de la plataforma</h3>
              <div className="mt-5 grid grid-cols-2 gap-5 sm:grid-cols-5">
                {[
                  ["Cuentas", data.counts.accounts],
                  ["Solicitudes", data.counts.jobs],
                  ["Casos", data.counts.cases],
                  ["Archivos", data.counts.files],
                  ["Integrantes de gestión", data.counts.staff],
                ].map(([label, value]) => (
                  <div key={String(label)}>
                    <p className="font-display text-2xl font-semibold">{value}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{label}</p>
                  </div>
                ))}
              </div>
            </section>
            <p className="mt-4 text-xs text-muted-foreground">
              Última comprobación: {date(data.checkedAt)}. Los envíos aceptados por el proveedor no
              confirman entrega en la bandeja.
            </p>
          </>
        )
      )}
    </div>
  );
}
function ReasonDialog({
  title,
  description,
  label = "Motivo",
  onClose,
  onSubmit,
}: {
  title: string;
  description: string;
  label?: string;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <Modal title={title} description={description} onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            await onSubmit(reason);
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : "No se pudo guardar.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <MarketErrorText error={error} />
        <label className="block space-y-2 text-sm">
          <span>{label}</span>
          <Textarea
            aria-label={label}
            required
            minLength={5}
            maxLength={1000}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </label>
        <Button disabled={busy}>{busy ? "Guardando…" : "Confirmar cambio"}</Button>
      </form>
    </Modal>
  );
}
export function StaffAccessButton({
  member,
  onSaved,
}: {
  member: any;
  onSaved: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        {member.access_paused ? "Reactivar acceso" : "Pausar acceso"}
      </Button>
      {open && (
        <ReasonDialog
          title={member.access_paused ? "Reactivar acceso de gestión" : "Pausar acceso de gestión"}
          description={`${member.email}. Para pausar un integrante, primero deben reasignarse sus casos abiertos.`}
          onClose={() => setOpen(false)}
          onSubmit={async (reason) => {
            await marketApi(prefix + "/team-access", {
              method: "POST",
              body: JSON.stringify({
                userId: member.user_id,
                version: member.access_version,
                paused: !member.access_paused,
                reason,
              }),
            });
            setOpen(false);
            await onSaved();
          }}
        />
      )}
    </>
  );
}
