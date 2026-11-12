import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { useMarket } from "@/hooks/use-market";
import { fileUrl, uploadMarketImage } from "@/lib/market-client";
export function MarketLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
        <h1 className="font-display text-3xl font-semibold sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-3 max-w-2xl text-muted-foreground">{subtitle}</p>}
        <div className="mt-8">{children}</div>
      </main>
      <SiteFooter />
    </>
  );
}
export function MarketNotice({ children }: { children: ReactNode }) {
  return (
    <p role="status" className="surface-panel p-6 text-sm leading-relaxed text-muted-foreground">
      {children}
    </p>
  );
}
export function MarketErrorText({ error }: { error: string }) {
  return error ? (
    <p
      role="alert"
      className="my-4 rounded-xl border border-destructive/30 p-4 text-sm text-destructive"
    >
      {error}
    </p>
  ) : null;
}
export function MarketGate({ children, kind }: { children: ReactNode; kind?: string }) {
  const { session, loading, error } = useMarket();
  if (loading) return <MarketNotice>Cargando tu cuenta…</MarketNotice>;
  if (error) return <MarketErrorText error={error} />;
  if (!session.account)
    return (
      <section className="surface-panel p-8">
        <h2 className="font-display text-xl font-semibold">Tu cuenta, todo en un lugar</h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Ingresá para guardar tus datos, publicar solicitudes y consultar tus mensajes.
        </p>
        <Button asChild className="mt-5">
          <Link to="/cuenta">
            {session.authenticated ? "Completar mi cuenta" : "Ingresar o crear mi cuenta"}
          </Link>
        </Button>
      </section>
    );
  if (kind && session.account.kind !== kind)
    return (
      <MarketNotice>
        Esta sección corresponde a una cuenta de {kind}. Podés seguir desde tu cuenta.
      </MarketNotice>
    );
  return <>{children}</>;
}
export function RemoteImageUpload({
  label,
  scope,
  value,
  onChange,
  onBusy,
}: {
  label: string;
  scope: string;
  value: string;
  onChange: (id: string) => void;
  onBusy?: (busy: boolean) => void;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input
        type="file"
        aria-label={label}
        accept="image/jpeg,image/png,image/webp"
        disabled={busy}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          if (file.size > 5 * 1024 * 1024) {
            setError("La imagen debe pesar hasta 5 MB.");
            return;
          }
          setBusy(true);
          onBusy?.(true);
          setError("");
          try {
            onChange(await uploadMarketImage(file, scope));
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : "No se pudo subir la imagen.");
          } finally {
            setBusy(false);
            onBusy?.(false);
          }
        }}
      />
      {busy && (
        <p role="status" className="text-xs text-muted-foreground">
          Subiendo imagen…
        </p>
      )}
      {value && (
        <img
          src={fileUrl(value)}
          alt={label}
          className="h-32 w-full rounded-xl border border-border object-contain"
        />
      )}
      <MarketErrorText error={error} />
    </div>
  );
}
