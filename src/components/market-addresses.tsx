import { useMarketConfig } from "@/hooks/use-market-config";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MarketErrorText, MarketGate, MarketNotice } from "@/components/market-common";
import { useMarket, useRemote } from "@/hooks/use-market";
import { marketApi } from "@/lib/market-client";
import { ciudades } from "@/lib/mock-data";
export type LiveAddress = {
  id: string;
  label: string;
  address: string;
  reference: string;
  cityId: string;
  kind: string;
};
export function LiveAddressPicker({ onSelect }: { onSelect: (address: LiveAddress) => void }) {
  const { session } = useMarket();
  const { data } = useRemote<{ addresses: LiveAddress[] }>(session.account ? "/addresses" : null);
  return (
    <div className="space-y-2">
      <Label htmlFor="live-address-picker">Usar una dirección guardada</Label>
      <select
        id="live-address-picker"
        className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
        defaultValue=""
        onChange={(e) => {
          const selected = data?.addresses.find((a) => a.id === e.target.value);
          if (selected) onSelect(selected);
        }}
      >
        <option value="">Elegí una dirección o completala abajo</option>
        {data?.addresses.map((a) => (
          <option key={a.id} value={a.id}>
            {a.label} · {a.address}
          </option>
        ))}
      </select>
    </div>
  );
}
export function LiveAddresses() {
  const { cities: activeCities, error: configError } = useMarketConfig();
  const { session } = useMarket();
  const { data, loading, error, refresh } = useRemote<{ addresses: LiveAddress[] }>(
    session.account ? "/addresses" : null,
  );
  const [label, setLabel] = useState(""),
    [address, setAddress] = useState(""),
    [reference, setReference] = useState(""),
    [cityId, setCity] = useState(ciudades[0]!.id),
    [kind, setKind] = useState("casa"),
    [issue, setIssue] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <MarketGate>
      <MarketErrorText error={error || issue || configError} />
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <section className="space-y-4">
          {loading ? (
            <MarketNotice>Cargando direcciones…</MarketNotice>
          ) : !data?.addresses.length ? (
            <MarketNotice>
              Todavía no guardaste direcciones. Agregá tu casa, comercio u otra propiedad.
            </MarketNotice>
          ) : (
            data.addresses.map((a) => (
              <article key={a.id} className="surface-panel space-y-3 p-5">
                <h2 className="font-semibold">{a.label}</h2>
                <p className="text-sm">{a.address}</p>
                <p className="text-xs text-muted-foreground">
                  {activeCities.find((c) => c.id === a.cityId)?.nombre ??
                    ciudades.find((c) => c.id === a.cityId)?.nombre ??
                    a.cityId}{" "}
                  · {a.kind} · {a.reference}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    try {
                      await marketApi("/addresses", {
                        method: "DELETE",
                        body: JSON.stringify({ id: a.id }),
                      });
                      await refresh();
                    } catch (cause) {
                      setIssue(cause instanceof Error ? cause.message : "No se pudo eliminar.");
                    }
                  }}
                >
                  Eliminar
                </Button>
              </article>
            ))
          )}
        </section>
        <form
          className="surface-panel space-y-4 p-6"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setIssue("");
            try {
              await marketApi("/addresses", {
                method: "POST",
                body: JSON.stringify({ label, address, reference, cityId, kind }),
              });
              setLabel("");
              setAddress("");
              setReference("");
              await refresh();
            } catch (cause) {
              setIssue(cause instanceof Error ? cause.message : "No se pudo guardar.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <h2 className="font-display text-xl font-semibold">Guardar una dirección</h2>
          <Label htmlFor="live-address-label">Nombre de la propiedad</Label>
          <Input
            id="live-address-label"
            required
            minLength={2}
            maxLength={60}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Mi casa, comercio del centro…"
          />
          <Label htmlFor="live-address-kind">Tipo de propiedad</Label>
          <select
            id="live-address-kind"
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            className="h-11 w-full rounded-md border border-input bg-background px-3"
          >
            <option value="casa">Casa</option>
            <option value="comercio">Comercio</option>
            <option value="otra">Otra propiedad</option>
          </select>
          <Label htmlFor="live-address-city">Ciudad o partido</Label>
          <select
            id="live-address-city"
            value={cityId}
            onChange={(e) => setCity(e.target.value)}
            className="h-11 w-full rounded-md border border-input bg-background px-3"
          >
            {!activeCities.some((c) => c.id === cityId) && (
              <option value={cityId} disabled>
                Elegí una zona habilitada
              </option>
            )}
            {activeCities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
          <Label htmlFor="live-address-street">Dirección y localidad</Label>
          <Input
            id="live-address-street"
            placeholder="Calle, número y localidad"
            required
            minLength={6}
            maxLength={200}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
          <Label htmlFor="live-address-reference">Referencia (opcional)</Label>
          <Input
            id="live-address-reference"
            maxLength={200}
            value={reference}
            onChange={(e) => setReference(e.target.value)}
          />
          <Button disabled={busy || !activeCities.some((c) => c.id === cityId)}>
            {busy ? "Guardando…" : "Guardar dirección"}
          </Button>
        </form>
      </div>
    </MarketGate>
  );
}
