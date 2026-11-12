import { useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { MapPin, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ciudades } from "@/lib/mock-data";
import { addSavedAddress, removeSavedAddress, type SavedAddress } from "@/lib/service-operations";
import { useServiceOperations } from "@/hooks/use-service-operations";

export function SavedAddresses() {
  const { state, ready, error, update } = useServiceOperations();
  const [label, setLabel] = useState("");
  const [kind, setKind] = useState<SavedAddress["kind"]>("casa");
  const [cityId, setCity] = useState(ciudades[0]!.id);
  const [address, setAddress] = useState("");
  const [reference, setReference] = useState("");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      update((state) =>
        addSavedAddress(state, { label, kind, cityId, address, reference }, crypto.randomUUID()),
      );
      setLabel("");
      setAddress("");
      setReference("");
      toast.success("Dirección guardada en este navegador");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar.");
    }
  }
  return (
    <div className="grid items-start gap-6 lg:grid-cols-2">
      <section className="surface-panel p-6">
        <h2 className="font-display text-xl font-semibold">Mis propiedades</h2>
        {error && (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="mt-5 space-y-4">
          {!state.addresses.length && (
            <p className="text-sm text-muted-foreground">
              Guardá tu casa, comercio u otra propiedad para completar futuras solicitudes con un
              clic.
            </p>
          )}
          {state.addresses.map((item) => (
            <article key={item.id} className="rounded-xl border border-border p-4">
              <div className="flex items-start justify-between gap-3">
                <h3 className="flex items-center gap-2 font-semibold">
                  <MapPin className="size-4 text-primary" />
                  {item.label}
                </h3>
                <span className="text-xs text-muted-foreground">
                  {item.kind}
                  {item.preferred ? " · Preferida" : ""}
                </span>
              </div>
              <p className="mt-3 text-sm">{item.address}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {ciudades.find((city) => city.id === item.cityId)?.nombre} · {item.reference}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link to="/solicitud">Pedir servicio</Link>
                </Button>
                {!item.preferred && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      try {
                        update((state) => ({
                          ...state,
                          addresses: state.addresses.map((address) => ({
                            ...address,
                            preferred: address.id === item.id,
                          })),
                        }));
                      } catch {
                        toast.error("No se pudo guardar.");
                      }
                    }}
                  >
                    Marcar preferida
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    try {
                      update((state) => removeSavedAddress(state, item.id));
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
          ))}
        </div>
      </section>
      <section className="surface-panel p-6">
        <h2 className="font-display text-xl font-semibold">Guardar una dirección</h2>
        <form onSubmit={submit} className="mt-5 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="address-label">Nombre de la propiedad</Label>
            <Input
              id="address-label"
              required
              minLength={2}
              maxLength={60}
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="Mi casa, local del centro…"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="address-kind">Tipo</Label>
              <select
                id="address-kind"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={kind}
                onChange={(event) => setKind(event.target.value as SavedAddress["kind"])}
              >
                <option value="casa">Casa</option>
                <option value="comercio">Comercio</option>
                <option value="otra">Otra propiedad</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address-city">Ciudad</Label>
              <select
                id="address-city"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={cityId}
                onChange={(event) => setCity(event.target.value)}
              >
                {ciudades.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="address-street">Calle, número o esquina</Label>
            <Input
              id="address-street"
              required
              minLength={6}
              maxLength={180}
              value={address}
              onChange={(event) => setAddress(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address-reference">Referencia (opcional)</Label>
            <Input
              id="address-reference"
              maxLength={200}
              value={reference}
              onChange={(event) => setReference(event.target.value)}
            />
          </div>
          <Button type="submit" disabled={!ready || Boolean(error)}>
            Guardar dirección
          </Button>
        </form>
        <p className="mt-5 text-xs text-muted-foreground">
          Tus direcciones se guardan en este navegador. Eliminar una dirección no
          modifica solicitudes ya creadas.
        </p>
      </section>
    </div>
  );
}
export function SavedAddressPicker({ onSelect }: { onSelect: (address: SavedAddress) => void }) {
  const { state, ready } = useServiceOperations();
  const [selected, setSelected] = useState("");
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-border bg-secondary/30 p-4">
      <Label htmlFor="saved-address">Usar una dirección guardada</Label>
      <select
        id="saved-address"
        className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
        value={selected}
        disabled={!ready}
        onChange={(event) => {
          setSelected(event.target.value);
          const address = state.addresses.find((item) => item.id === event.target.value);
          if (address) onSelect(address);
        }}
      >
        <option value="">Elegí una propiedad o escribí la dirección abajo</option>
        {state.addresses.map((address) => (
          <option key={address.id} value={address.id}>
            {address.label} · {address.address}
          </option>
        ))}
      </select>
      <Button
        type="button"
        variant="link"
        size="sm"
        className="mt-3 h-auto p-0"
        onClick={() => setOpen(true)}
      >
        Agregar o administrar direcciones sin salir de la solicitud
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-4xl overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>Mis direcciones</DialogTitle>
            <DialogDescription>
              Guardá una propiedad y después elegila en el formulario. Los datos de tu solicitud se
              conservan.
            </DialogDescription>
          </DialogHeader>
          <SavedAddresses />
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Volver a la solicitud
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
