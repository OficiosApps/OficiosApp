import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MarketNotice, MarketErrorText } from "@/components/market-common";
import { useMarket, useRemote } from "@/hooks/use-market";
import { marketApi } from "@/lib/market-client";
import type { ReferralPolicy, MarketEntitlements } from "@/lib/market-config";
type ReferralData = {
  code: string | null;
  totals: { registered: number; qualified: number };
  hasReferrer: boolean;
  policy: ReferralPolicy;
  entitlements: MarketEntitlements;
  entries: {
    id: string;
    created_at: number;
    qualified_at: number | null;
    amount: number | null;
    expires_at: number | null;
    promisedQuotes: number;
  }[];
};
export function LiveReferrals() {
  const { session } = useMarket();
  const { data, error, loading, refresh } = useRemote<ReferralData>("/referrals", true);
  const [code, setCode] = useState(""),
    [issue, setIssue] = useState(""),
    [busy, setBusy] = useState(false),
    [copied, setCopied] = useState(false);
  async function action(input: Record<string, string>) {
    setBusy(true);
    setIssue("");
    try {
      await marketApi("/referrals", { method: "POST", body: JSON.stringify(input) });
      setCode("");
      await refresh();
    } catch (cause) {
      setIssue(cause instanceof Error ? cause.message : "No pudimos guardar el referido.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="space-y-6">
      <h2 className="font-display text-2xl font-semibold">Recomendá profesionales</h2>
      <MarketErrorText error={error || issue} />
      {loading ? (
        <MarketNotice>Cargando tu programa de referidos…</MarketNotice>
      ) : (
        data && (
          <>
            <MarketNotice>
              {data.policy.enabled
                ? data.policy.description
                : "El programa de referidos todavía no está activo."}
            </MarketNotice>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                ["Altas con tu código", data.totals.registered],
                ["Referidos aprobados", data.totals.qualified],
                ["Propuestas extra este mes", data.entitlements.bonusQuotes],
              ].map(([label, value]) => (
                <article key={String(label)} className="surface-panel p-5">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="mt-3 font-display text-2xl font-semibold">{value}</p>
                </article>
              ))}
            </div>
            {data.policy.enabled && (
              <section className="surface-panel space-y-4 p-6">
                <h3 className="font-semibold">Tu código para invitar</h3>
                <p className="text-sm text-muted-foreground">
                  Se acreditan {data.policy.rewardQuotes} propuestas extra cuando el profesional
                  invitado completa su perfil y se aprueba su identidad. Máximo:{" "}
                  {data.policy.maxRewardsPerReferrer} recompensas por cuenta.
                </p>
                {data.code ? (
                  <>
                    <Input readOnly aria-label="Tu código de referido" value={data.code} />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(
                            `${window.location.origin}/soy-profesional?referido=${encodeURIComponent(data.code!)}`,
                          );
                          setCopied(true);
                        } catch {
                          setIssue(
                            "No pudimos copiar el enlace. Podés copiar el código que se muestra arriba.",
                          );
                        }
                      }}
                    >
                      {copied ? "Enlace copiado" : "Copiar enlace para compartir"}
                    </Button>
                  </>
                ) : (
                  <Button
                    disabled={busy || session.account?.verification !== "aprobado"}
                    onClick={() => void action({ action: "create-code" })}
                  >
                    Crear mi código
                  </Button>
                )}
                {session.account?.verification !== "aprobado" && (
                  <p className="text-xs text-muted-foreground">
                    Tu alta debe estar aprobada para crear un código.
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  El bono vence al terminar el mes en que se acredita. No es dinero. Si tu plan ya
                  tiene propuestas ilimitadas, no aumenta su capacidad.
                </p>
              </section>
            )}
            {data.policy.enabled &&
              !data.hasReferrer &&
              session.account?.verification !== "aprobado" && (
                <form
                  className="surface-panel space-y-4 p-6"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void action({ action: "bind", code: code.trim() });
                  }}
                >
                  <Label htmlFor="referrer-code">¿Te invitó otro profesional?</Label>
                  <Input
                    id="referrer-code"
                    required
                    minLength={6}
                    maxLength={40}
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="Código de quien te recomendó"
                  />
                  <Button disabled={busy}>Registrar código antes de la aprobación</Button>
                </form>
              )}
            <section className="space-y-3">
              <h3 className="font-semibold">Historial de referidos (hasta 100 altas recientes)</h3>
              {!data.entries.length ? (
                <MarketNotice>Todavía no hay altas registradas con tu código.</MarketNotice>
              ) : (
                data.entries.map((entry) => (
                  <article key={entry.id} className="surface-panel space-y-2 p-5">
                    <p className="text-sm font-semibold">
                      {entry.amount !== null
                        ? `${entry.amount} propuestas extra acreditadas`
                        : entry.qualified_at
                          ? "Profesional aprobado: no se acreditó un bono por el límite del programa"
                          : "Pendiente de aprobación del profesional"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Alta:{" "}
                      {new Intl.DateTimeFormat("es-AR", {
                        dateStyle: "short",
                        timeZone: "America/Buenos_Aires",
                      }).format(entry.created_at)}
                      {entry.expires_at
                        ? ` · Vencimiento: ${new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeZone: "America/Buenos_Aires" }).format(entry.expires_at - 1)}`
                        : ""}
                    </p>
                  </article>
                ))
              )}
            </section>
          </>
        )
      )}
    </section>
  );
}
