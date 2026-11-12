import { useDeferredValue, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMarket, useRemote } from "@/hooks/use-market";
import { marketApi } from "@/lib/market-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MarketErrorText } from "@/components/market-common";

const views = [
  {
    role: "superadmin",
    title: "Superadministrador",
    button: "Ver como superadministrador",
    description: "Supervisión, equipo, incidentes y métricas de operación.",
  },
  {
    role: "admin",
    title: "Administrador",
    button: "Ver como administrador",
    description: "Jornada, solicitudes, casos y verificaciones del administrador.",
  },
  {
    role: "profesional",
    title: "Profesional",
    button: "Ver como profesional",
    description: "Solicitudes, presupuestos, mensajes, portafolio y métodos de cobro.",
  },
  {
    role: "cliente",
    title: "Cliente",
    button: "Ver como cliente",
    description: "Solicitudes, profesionales contratados, direcciones y pedidos de servicios.",
  },
] as const;
type Role = (typeof views)[number]["role"];

export function CeoDashboardAccess() {
  const [accounts, setAccounts] = useState<Partial<Record<Role, string>>>({});
  const [busy, setBusy] = useState<Role | null>(null),
    [issue, setIssue] = useState("");
  async function open(role: Role) {
    setBusy(role);
    setIssue("");
    try {
      const result = await marketApi<{ next: string }>("/ceo/view", {
        method: "POST",
        body: JSON.stringify({ role, accountId: accounts[role] || null }),
      });
      window.location.assign(result.next);
    } catch (error) {
      setIssue(error instanceof Error ? error.message : "No pudimos abrir el panel.");
      setBusy(null);
    }
  }
  return (
    <section className="space-y-5" aria-labelledby="ceo-views-title">
      <div>
        <h2 id="ceo-views-title" className="font-display text-2xl font-semibold">
          Revisar otros paneles
        </h2>
        <p className="mt-3 max-w-3xl text-sm text-muted-foreground">
          Entrá con tu misma cuenta CEO para recorrer cada dashboard en modo de solo lectura. Podés
          seleccionar una cuenta real o abrir una vista vacía. No se crean usuarios de prueba ni se
          cambia tu rol de CEO.
        </p>
      </div>
      <MarketErrorText error={issue} />
      <div className="grid gap-5 md:grid-cols-2">
        {views.map((view) => (
          <article key={view.role} className="surface-panel flex min-w-0 flex-col gap-4 p-6">
            <h3 className="font-display text-xl font-semibold">{view.title}</h3>
            <p className="text-sm text-muted-foreground">{view.description}</p>
            {(view.role === "profesional" || view.role === "cliente") && (
              <AccountSelector
                role={view.role}
                value={accounts[view.role] || ""}
                onChange={(id) => setAccounts((current) => ({ ...current, [view.role]: id }))}
              />
            )}
            <Button
              className="mt-auto self-start"
              disabled={busy !== null}
              onClick={() => void open(view.role)}
            >
              {busy === view.role ? "Abriendo…" : view.button}
            </Button>
          </article>
        ))}
      </div>
    </section>
  );
}
function AccountSelector({
  role,
  value,
  onChange,
}: {
  role: "profesional" | "cliente";
  value: string;
  onChange: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const query = useDeferredValue(search);
  const { data, loading, error } = useRemote<{
    accounts: { id: string; name: string; email: string }[];
  }>(`/ceo/views?role=${role}&search=${encodeURIComponent(query)}`);
  return (
    <div className="space-y-3">
      <Label htmlFor={`ceo-search-${role}`}>
        Buscar {role === "profesional" ? "profesional" : "cliente"}
      </Label>
      <Input
        id={`ceo-search-${role}`}
        type="search"
        placeholder="Nombre o correo electrónico"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          onChange("");
        }}
      />
      <Label htmlFor={`ceo-account-${role}`}>
        Cuenta {role === "profesional" ? "profesional" : "de cliente"}
      </Label>
      <select
        id={`ceo-account-${role}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm"
      >
        <option value="">Vista vacía, sin cuenta seleccionada</option>
        {data?.accounts.map((account) => (
          <option key={account.id} value={account.id}>
            {account.name} · {account.email}
          </option>
        ))}
      </select>
      <p className="text-xs text-muted-foreground">
        {loading
          ? "Buscando cuentas…"
          : !data?.accounts.length
            ? "No hay cuentas con esta búsqueda. Podés recorrer la vista vacía."
            : "Elegí una cuenta para revisar sus datos reales. Se muestran hasta 100 resultados; usá la búsqueda para encontrarla."}
      </p>
      <MarketErrorText error={error} />
    </div>
  );
}
export function CeoPreviewBanner() {
  const { session } = useMarket();
  const preview = session.ceoPreview;
  if (!preview) return null;
  const title = views.find((view) => view.role === preview.role)!.title;
  return (
    <aside
      aria-label="Revisión de paneles del CEO"
      className="border-b border-amber-300 bg-amber-50 px-4 py-3 text-amber-950"
    >
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 text-sm">
        <div className="min-w-0">
          <p className="font-semibold">Modo CEO · Vista {title.toLowerCase()} · Solo lectura</p>
          <p className="mt-1 break-words text-xs">
            {preview.accountName
              ? `Cuenta: ${preview.accountName}`
              : preview.empty
                ? "Vista vacía: no hay una cuenta seleccionada. No se guardan datos."
                : `Acceso de revisión: ${preview.ownerEmail}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/ceo">Cambiar panel</Link>
          </Button>
          <form method="post" action="/api/market/ceo/view/exit">
            <Button size="sm" type="submit">
              Volver al panel CEO
            </Button>
          </form>
        </div>
      </div>
    </aside>
  );
}
