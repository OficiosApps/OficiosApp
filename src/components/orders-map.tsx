import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, LayerGroup } from "leaflet";
import "leaflet/dist/leaflet.css";
import { Button } from "@/components/ui/button";
import type { MapPoint } from "@/lib/market-config";
export type OrderMapMarker = MapPoint & { id: string; label: string; state?: string };
export function OrdersMap({
  center,
  markers,
  selectedId,
  onSelect,
  onPick,
  height = 440,
}: {
  center: MapPoint;
  markers: OrderMapMarker[];
  selectedId?: string;
  onSelect?: (id: string) => void;
  onPick?: ((point: MapPoint) => void) | undefined;
  height?: number;
}) {
  const root = useRef<HTMLDivElement>(null),
    map = useRef<LeafletMap | null>(null),
    layers = useRef<LayerGroup | null>(null),
    handlers = useRef({ onSelect, onPick }),
    points = useRef(markers),
    [ready, setReady] = useState(false),
    [error, setError] = useState("");
  handlers.current = { onSelect, onPick };
  points.current = markers;
  useEffect(() => {
    let disposed = false;
    const element = root.current;
    if (!element) return;
    void import("leaflet")
      .then((module) => {
        if (disposed) return;
        const L = ("default" in module ? module.default : module) as typeof import("leaflet");
        const view = L.map(element, { scrollWheelZoom: false, zoomControl: false }).setView(
          [center.lat, center.lng],
          12,
        );
        L.control.zoom({ zoomInTitle: "Acercar", zoomOutTitle: "Alejar" }).addTo(view);
        map.current = view;
        layers.current = L.layerGroup().addTo(view);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>',
        })
          .on("tileerror", () =>
            setError(
              "No pudimos cargar parte del mapa. Revisá la conexión; la lista de pedidos sigue disponible.",
            ),
          )
          .addTo(view);
        view.on("click", (event) =>
          handlers.current.onPick?.({
            lat: Number(event.latlng.lat.toFixed(6)),
            lng: Number(event.latlng.lng.toFixed(6)),
          }),
        );
        setReady(true);
        requestAnimationFrame(() => view.invalidateSize());
      })
      .catch(() => setError("No pudimos cargar el mapa. Podés usar la lista de pedidos."));
    return () => {
      disposed = true;
      map.current?.remove();
      map.current = null;
      layers.current = null;
    };
  }, []);
  useEffect(() => {
    if (!ready || !map.current) return;
    map.current.setView([center.lat, center.lng], 12);
  }, [ready, center.lat, center.lng]);
  useEffect(() => {
    if (!ready) return;
    let disposed = false;
    void import("leaflet").then((module) => {
      if (disposed || !layers.current) return;
      const L = ("default" in module ? module.default : module) as typeof import("leaflet");
      layers.current.clearLayers();
      for (const point of markers) {
        const color =
          point.id === selectedId
            ? "#d58d2c"
            : point.state === "finalizado"
              ? "#6b7280"
              : point.state === "cancelado"
                ? "#991b1b"
                : "#08654e";
        const icon = L.divIcon({
          className: "oficios-map-marker",
          html: `<span style="display:block;width:22px;height:22px;border:3px solid white;border-radius:50% 50% 50% 0;background:${color};transform:rotate(-45deg);box-shadow:0 2px 8px #0005"></span>`,
          iconSize: [28, 28],
          iconAnchor: [14, 28],
        });
        const popup = document.createElement("div");
        popup.style.whiteSpace = "pre-wrap";
        popup.textContent = point.label;
        L.marker([point.lat, point.lng], { icon, keyboard: true, title: point.label })
          .bindPopup(popup)
          .on("click", () => handlers.current.onSelect?.(point.id))
          .addTo(layers.current);
      }
      const selected = markers.find((p) => p.id === selectedId);
      if (selected && map.current) map.current.setView([selected.lat, selected.lng], 15);
    });
    return () => {
      disposed = true;
    };
  }, [ready, markers, selectedId]);
  function fit() {
    if (!map.current || !points.current.length) return;
    const latitudes = points.current.map((p) => p.lat),
      longitudes = points.current.map((p) => p.lng);
    map.current.fitBounds(
      [
        [Math.min(...latitudes), Math.min(...longitudes)],
        [Math.max(...latitudes), Math.max(...longitudes)],
      ],
      { padding: [35, 35], maxZoom: 16 },
    );
  }
  return (
    <div className="space-y-3">
      <div
        ref={root}
        aria-label={onPick ? "Mapa: hacé clic para marcar una ubicación" : "Mapa de pedidos"}
        role="region"
        className="relative z-0 w-full overflow-hidden rounded-2xl border border-border bg-secondary"
        style={{ height }}
      />
      {!ready && !error && (
        <p role="status" className="text-xs text-muted-foreground">
          Cargando mapa…
        </p>
      )}
      {error && (
        <p role="status" className="text-xs text-muted-foreground">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!ready || !markers.length}
          onClick={fit}
        >
          Ver puntos guardados
        </Button>
        {onPick && (
          <p className="text-xs text-muted-foreground">
            Hacé clic en el mapa para elegir el punto.
          </p>
        )}
      </div>
    </div>
  );
}
export function RequestLocationPicker({
  center,
  value,
  onChange,
}: {
  center: MapPoint;
  value: MapPoint | null;
  onChange: (point: MapPoint | null) => void;
}) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <section className="space-y-4 rounded-xl border border-border p-4">
      <div>
        <h3 className="text-sm font-semibold">Ubicación en el mapa (opcional)</h3>
        <p className="mt-2 text-xs text-muted-foreground">
          Marcá el lugar del pedido. La ubicación exacta se comparte al contratar y con el equipo
          autorizado para gestionar el servicio.
        </p>
      </div>
      <OrdersMap
        center={center}
        markers={value ? [{ ...value, id: "selected", label: "Ubicación de tu pedido" }] : []}
        onPick={onChange}
        height={300}
      />
      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() => {
            if (!navigator.geolocation) {
              setError("Este navegador no permite obtener tu ubicación. Marcá el punto a mano.");
              return;
            }
            setBusy(true);
            setError("");
            navigator.geolocation.getCurrentPosition(
              (position) => {
                onChange({ lat: position.coords.latitude, lng: position.coords.longitude });
                setBusy(false);
              },
              () => {
                setError("No pudimos obtener tu ubicación. Podés marcarla en el mapa.");
                setBusy(false);
              },
              { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
            );
          }}
        >
          {busy ? "Buscando ubicación…" : "Usar mi ubicación"}
        </Button>
        {value && (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
            Quitar punto
          </Button>
        )}
      </div>
      {value && (
        <p className="text-xs text-primary">
          Punto seleccionado: {value.lat.toFixed(5)}, {value.lng.toFixed(5)}
        </p>
      )}
      {error && (
        <p role="status" className="text-xs text-muted-foreground">
          {error}
        </p>
      )}
    </section>
  );
}
