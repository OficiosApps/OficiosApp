import { ClientSelfieCapture, ClientSelfieSubmission } from "@/components/client-selfie";
import { useMarketConfig } from "@/hooks/use-market-config";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  MarketErrorText,
  MarketLayout,
  MarketNotice,
  RemoteImageUpload,
} from "@/components/market-common";
import { useMarket } from "@/hooks/use-market";
import { marketApi } from "@/lib/market-client";
import { categorias, ciudades } from "@/lib/mock-data";
export function MarketAccountPage({
  professional = false,
  referralCode = "",
}: {
  professional?: boolean;
  referralCode?: string;
}) {
  const { session, loading, error, refresh } = useMarket();
  const { cities: activeCities, error: configError, data: marketConfig } = useMarketConfig();
  const [clientSelfieId, setClientSelfieId] = useState("");
  const [clientSelfieConsent, setClientSelfieConsent] = useState(false);
  const [referral, setReferral] = useState(referralCode);
  const [kind, setKind] = useState(professional ? "profesional" : "cliente"),
    [name, setName] = useState(""),
    [phone, setPhone] = useState(""),
    [city, setCity] = useState(ciudades[0]!.id),
    [trade, setTrade] = useState(categorias[0]!.slug),
    [consent, setConsent] = useState(false),
    [busy, setBusy] = useState(false),
    [issue, setIssue] = useState(""),
    [invite, setInvite] = useState("");
  const registrationKind = professional ? "profesional" : kind;
  async function register(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setIssue("");
    try {
      await marketApi("/account", {
        method: "POST",
        body: JSON.stringify({
          kind: registrationKind,
          name,
          phone,
          cityId: city,
          trade,
          consent,
          clientSelfieId: registrationKind === "cliente" ? clientSelfieId : undefined,
          clientSelfieConsent: registrationKind === "cliente" ? clientSelfieConsent : undefined,
          referralCode: registrationKind === "profesional" ? referral.trim() : undefined,
        }),
      });
      await refresh();
    } catch (cause) {
      setIssue(cause instanceof Error ? cause.message : "No pudimos crear tu cuenta.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <MarketLayout
      title={professional ? "Trabajá con Oficios" : "Tu cuenta en Oficios"}
      subtitle={
        professional
          ? "Mostrá tu oficio, recibí pedidos y organizá tus trabajos."
          : "Tus solicitudes, direcciones y profesionales, siempre con vos."
      }
    >
      {session.authenticated && session.staffRole && (
        <section className="surface-panel mb-7 space-y-4 p-6">
          <h2 className="font-display text-xl font-semibold">Tu acceso privado de gestión</h2>
          <p className="text-sm text-muted-foreground">
            Ingresaste con una cuenta autorizada. Este acceso sólo aparece dentro de tu cuenta.
          </p>
          <Button asChild variant="outline">
            <Link to="/gestion">Entrar a la gestión de Oficios</Link>
          </Button>
        </section>
      )}
      {loading ? (
        <MarketNotice>Cargando tu cuenta…</MarketNotice>
      ) : error ? (
        <MarketErrorText error={error} />
      ) : !session.authenticated ? (
        <section className="surface-panel max-w-2xl p-8">
          <h2 className="font-display text-2xl font-semibold">Ingresá o creá tu cuenta</h2>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Usá tu cuenta de Google para identificarte. Después completás tu perfil y tu selfie
            privada de verificación. Si ofrecés servicios, también necesitás tu foto de perfil y DNI
            obligatorios.
          </p>
          <Button asChild size="lg" className="mt-6">
            <a
              href={`/auth/google?return_to=${encodeURIComponent(professional ? "/soy-profesional" : "/cuenta")}`}
              target="_top"
            >
              Continuar con Google
            </a>
          </Button>
          <p className="mt-4 text-xs text-muted-foreground">Oficios no recibe tu contraseña.</p>
        </section>
      ) : !session.account ? (
        <form onSubmit={register} className="surface-panel max-w-2xl space-y-5 p-6 sm:p-8">
          <h2 className="font-display text-xl font-semibold">
            {professional ? "Paso 1 · Tus datos profesionales" : "Completá tu perfil"}
          </h2>
          <p className="text-xs text-muted-foreground">
            Ingresaste como {session.identity?.email}.
          </p>
          {professional ? (
            <div className="rounded-xl bg-secondary p-4 text-sm">
              <p className="font-semibold text-primary">Alta de profesional independiente</p>
              <p className="mt-2 text-muted-foreground">
                1. Tus datos y oficio · 2. Foto de perfil y DNI · 3. Revisión del alta. Tu cuenta se
                crea directamente como profesional.
              </p>
            </div>
          ) : (
            <>
              {" "}
              <div className="space-y-2">
                <Label htmlFor="account-kind">Quiero usar Oficios como</Label>
                <select
                  id="account-kind"
                  value={kind}
                  onChange={(e) => setKind(e.target.value)}
                  className="h-11 w-full rounded-md border border-input bg-background px-3"
                >
                  <option value="cliente">Cliente: necesito contratar</option>
                  <option value="profesional">Profesional: ofrezco servicios</option>
                  <option value="empresa">Empresa: gestiono un equipo</option>
                </select>
              </div>
            </>
          )}
          <div className="space-y-2">
            <Label htmlFor="account-name">
              {registrationKind === "empresa" ? "Nombre de la empresa" : "Tu nombre"}
            </Label>
            <Input
              id="account-name"
              required
              minLength={2}
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="account-phone">Teléfono (opcional)</Label>
            <Input
              id="account-phone"
              type="tel"
              maxLength={40}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="account-city">Ciudad</Label>
            <select
              id="account-city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="h-11 w-full rounded-md border border-input bg-background px-3"
            >
              {!activeCities.some((c) => c.id === city) && (
                <option value={city} disabled>
                  Elegí una zona habilitada
                </option>
              )}
              {activeCities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}, {c.provincia}
                </option>
              ))}
            </select>
            {marketConfig && !activeCities.length && (
              <p role="status" className="text-sm text-muted-foreground">
                Por el momento no hay ciudades habilitadas para nuevos registros.
              </p>
            )}
          </div>
          {registrationKind !== "cliente" && (
            <div className="space-y-2">
              <Label htmlFor="account-trade">Oficio principal</Label>
              <select
                id="account-trade"
                value={trade}
                onChange={(e) => setTrade(e.target.value)}
                className="h-11 w-full rounded-md border border-input bg-background px-3"
              >
                {categorias.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}
          {registrationKind === "profesional" && (
            <div className="space-y-2">
              <Label htmlFor="signup-referral">Código de referido (opcional)</Label>
              <Input
                id="signup-referral"
                value={referral}
                maxLength={40}
                onChange={(e) => setReferral(e.target.value.toUpperCase())}
                placeholder="Si otro profesional te recomendó"
              />
            </div>
          )}
          {registrationKind === "cliente" && (
            <>
              <ClientSelfieCapture onChange={setClientSelfieId} />
              <label className="flex items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  required
                  checked={clientSelfieConsent}
                  onChange={(e) => setClientSelfieConsent(e.target.checked)}
                />
                <span>
                  Autorizo el almacenamiento privado y la revisión manual de mi selfie para
                  verificar mi cuenta de cliente.
                </span>
              </label>
            </>
          )}
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              required
              className="mt-1"
            />
            <span>
              Leí y acepto las{" "}
              <Link to="/condiciones" className="text-primary underline">
                términos y condiciones
              </Link>{" "}
              y la{" "}
              <Link to="/privacidad" className="text-primary underline">
                información de privacidad
              </Link>
              .
            </span>
          </label>
          <MarketErrorText error={issue || configError} />
          <Button
            disabled={
              busy ||
              !consent ||
              (registrationKind === "cliente" && (!clientSelfieId || !clientSelfieConsent)) ||
              !activeCities.some((c) => c.id === city)
            }
          >
            {busy
              ? "Creando cuenta…"
              : registrationKind === "profesional"
                ? "Continuar con foto de perfil y DNI"
                : "Crear mi cuenta"}
          </Button>
        </form>
      ) : professional && session.account.kind === "cliente" ? (
        <EnableProfessionalServices />
      ) : (
        <div className="space-y-6">
          <section className="surface-panel flex flex-wrap items-center justify-between gap-6 p-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                {session.account.kind}
              </p>
              <h2 className="mt-2 font-display text-2xl font-semibold">
                Hola, {session.account.name}
              </h2>
              <p className="mt-3 text-sm text-muted-foreground">{session.identity?.email}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link
                  to={
                    session.account.kind === "cliente"
                      ? "/mis-solicitudes"
                      : session.account.kind === "empresa"
                        ? "/panel-empresa"
                        : "/panel-profesional"
                  }
                >
                  Ir a mi espacio
                </Link>
              </Button>
              <form action="/auth/logout" method="post" target="_top">
                <Button type="submit" variant="outline">
                  Cerrar sesión
                </Button>
              </form>
            </div>
          </section>
          {session.account.kind === "cliente" ? <ClientSelfieSubmission /> : <IdentitySubmission />}
          <ProfileEditor
            key={session.account.profilePhotoId ?? session.account.logoId ?? "profile"}
          />
        </div>
      )}
      {session.authenticated && (
        <section className="surface-panel mt-8 max-w-2xl space-y-4 p-6">
          <h2 className="font-semibold">¿Recibiste una invitación?</h2>
          <p className="text-xs text-muted-foreground">
            Pegá el código que te compartieron. La invitación debe estar dirigida al correo con el
            que ingresaste.
          </p>
          <Input
            aria-label="Código de invitación"
            value={invite}
            onChange={(e) => setInvite(e.target.value)}
          />
          <div className="flex flex-wrap gap-3">
            {["staff", "company"].map((type) => (
              <Button
                key={type}
                variant="outline"
                size="sm"
                disabled={!invite.trim()}
                onClick={async () => {
                  try {
                    await marketApi(type === "staff" ? "/invites/accept" : "/company/accept", {
                      method: "POST",
                      body: JSON.stringify({ id: invite.trim() }),
                    });
                    setInvite("");
                    setIssue("");
                    await refresh();
                  } catch (cause) {
                    setIssue(
                      cause instanceof Error ? cause.message : "No pudimos aceptar la invitación.",
                    );
                  }
                }}
              >
                {type === "staff" ? "Aceptar invitación de administración" : "Unirme a una empresa"}
              </Button>
            ))}
          </div>
          <MarketErrorText error={issue} />
        </section>
      )}
    </MarketLayout>
  );
}
function ProfileEditor() {
  const { session, refresh } = useMarket();
  const account = session.account!;
  const [name, setName] = useState(account.name),
    [phone, setPhone] = useState(account.phone),
    [bio, setBio] = useState(account.bio),
    [logo, setLogo] = useState(account.profilePhotoId ?? account.logoId ?? ""),
    [issue, setIssue] = useState(""),
    [saved, setSaved] = useState(false),
    [busy, setBusy] = useState(false);
  return (
    <form
      className="surface-panel max-w-3xl space-y-4 p-6"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setIssue("");
        setSaved(false);
        try {
          await marketApi("/account", {
            method: "PATCH",
            body: JSON.stringify({ name, phone, bio, logoId: logo, version: account.version }),
          });
          await refresh();
          setSaved(true);
        } catch (cause) {
          setIssue(cause instanceof Error ? cause.message : "No pudimos guardar.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2 className="font-display text-xl font-semibold">Mi perfil</h2>
      <Label htmlFor="profile-name">Nombre</Label>
      <Input id="profile-name" required value={name} onChange={(e) => setName(e.target.value)} />
      <Label htmlFor="profile-phone">Teléfono</Label>
      <Input id="profile-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
      {account.kind !== "cliente" && (
        <>
          <Label htmlFor="profile-bio">Presentación de tus servicios</Label>
          <Textarea
            id="profile-bio"
            maxLength={1500}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
          />
          <RemoteImageUpload
            label={
              account.kind === "empresa" ? "Logo de la empresa" : "Foto de perfil (obligatoria)"
            }
            scope="logo"
            value={logo}
            onChange={setLogo}
          />
        </>
      )}
      <MarketErrorText error={issue} />
      {saved && (
        <p role="status" className="text-sm text-primary">
          Perfil guardado.
        </p>
      )}
      <Button disabled={busy || (account.kind === "profesional" && !logo)}>Guardar perfil</Button>
    </form>
  );
}
export function IdentitySubmission() {
  const { session, refresh } = useMarket();
  const account = session.account!;
  const professional = account.kind === "profesional";
  const [dni, setDni] = useState(account.identity?.["dni"] ?? ""),
    [front, setFront] = useState(account.identity?.["frontId"] ?? ""),
    [back, setBack] = useState(account.identity?.["backId"] ?? ""),
    [selfie, setSelfie] = useState(account.identity?.["selfieId"] ?? ""),
    [photo, setPhoto] = useState(""),
    [consent, setConsent] = useState(false),
    [busy, setBusy] = useState(false),
    [issue, setIssue] = useState("");
  const profilePhoto = photo || account.profilePhotoId || account.logoId || "";
  const missingPhoto = professional && !profilePhoto;
  const needsMandatoryPhoto = professional && !(account.profilePhotoId || account.logoId);
  const canSubmit = /^\d{7,8}$/.test(dni) && front && back && selfie && consent && !missingPhoto;
  return (
    <section className="surface-panel space-y-5 p-6">
      <div>
        <h2 className="font-display text-xl font-semibold">
          {professional
            ? "Alta profesional: foto de perfil y DNI obligatorios"
            : "DNI y foto del responsable"}
        </h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Estado: <strong>{account.verification}</strong>.{" "}
          {professional
            ? "Para habilitar tus servicios necesitás una foto de perfil, DNI (frente y dorso) y una selfie de verificación."
            : "Completá el DNI y la foto de la cara del responsable."}{" "}
          La revisión es manual; cargar los archivos no significa estar aprobado.
        </p>
        <p className="mt-3 text-xs text-muted-foreground">
          {professional
            ? "La foto de perfil se muestra públicamente cuando se aprueba el alta. "
            : ""}
          El DNI y la selfie quedan privados para la revisión. No es una verificación biométrica.
        </p>
      </div>
      <Button type="button" size="sm" variant="outline" onClick={() => void refresh()}>
        Actualizar estado de revisión
      </Button>
      {account.identity?.["review"]?.reason && (
        <MarketNotice>{account.identity["review"].reason}</MarketNotice>
      )}
      {!["pendiente", "aprobado"].includes(account.verification) || needsMandatoryPhoto ? (
        <form
          className="space-y-5"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!canSubmit) return;
            setBusy(true);
            setIssue("");
            try {
              await marketApi("/identity", {
                method: "POST",
                body: JSON.stringify({
                  dni,
                  frontId: front,
                  backId: back,
                  selfieId: selfie,
                  profilePhotoId: professional ? profilePhoto : undefined,
                  consent,
                }),
              });
              await refresh();
              setPhoto("");
            } catch (cause) {
              setIssue(cause instanceof Error ? cause.message : "No se pudo enviar el alta.");
            } finally {
              setBusy(false);
            }
          }}
        >
          {professional && (
            <div className="rounded-xl border border-border p-4">
              <RemoteImageUpload
                label="Foto de perfil (obligatoria)"
                scope="logo"
                value={profilePhoto}
                onChange={setPhoto}
              />
              <p className="mt-3 text-xs text-muted-foreground">
                Usá una foto de tu cara para que tus clientes puedan reconocerte. Es distinta de la
                selfie privada de verificación.
              </p>
            </div>
          )}
          <Label htmlFor="identity-dni">Número de DNI (obligatorio)</Label>
          <Input
            id="identity-dni"
            inputMode="numeric"
            pattern="[0-9]{7,8}"
            required
            maxLength={8}
            value={dni}
            onChange={(e) => setDni(e.target.value.replace(/\D/g, ""))}
          />
          <div className="grid gap-5 sm:grid-cols-3">
            <RemoteImageUpload
              label="Frente del DNI (obligatorio)"
              scope="identity"
              value={front}
              onChange={setFront}
            />
            <RemoteImageUpload
              label="Dorso del DNI (obligatorio)"
              scope="identity"
              value={back}
              onChange={setBack}
            />
            <RemoteImageUpload
              label="Selfie de verificación (obligatoria y privada)"
              scope="identity"
              value={selfie}
              onChange={setSelfie}
            />
          </div>
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              required
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-1"
            />
            <span>
              Autorizo la revisión de mi DNI y selfie para habilitar mis servicios
              {professional
                ? ", y la publicación de mi foto de perfil cuando se apruebe el alta"
                : ""}
              .
            </span>
          </label>
          <MarketErrorText error={issue} />
          <Button disabled={busy || !canSubmit}>
            {busy ? "Enviando…" : "Completar alta y enviar para revisión"}
          </Button>
        </form>
      ) : (
        <MarketNotice>
          {account.verification === "pendiente"
            ? "Tu documentación está enviada. Una persona autorizada debe aprobar el alta antes de que puedas ofrecer servicios."
            : "Tu alta está aprobada. Podés recibir solicitudes y enviar presupuestos."}
        </MarketNotice>
      )}
    </section>
  );
}

function EnableProfessionalServices() {
  const { session, refresh } = useMarket();
  const { cities: activeCities, error: configError, data: marketConfig } = useMarketConfig();
  const [kind, setKind] = useState("profesional"),
    [trade, setTrade] = useState(categorias[0]!.slug),
    [cityId, setCity] = useState(session.account!.cityId),
    [issue, setIssue] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <form
      className="surface-panel mt-7 max-w-2xl space-y-4 p-6"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setIssue("");
        try {
          await marketApi("/account", {
            method: "PATCH",
            body: JSON.stringify({ action: "enable-services", kind, trade, cityId }),
          });
          await refresh();
        } catch (cause) {
          setIssue(cause instanceof Error ? cause.message : "No pudimos habilitar tus servicios.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2 className="font-display text-xl font-semibold">Empezá a ofrecer tus servicios</h2>
      <p className="text-sm text-muted-foreground">
        Conservás tus pedidos como cliente. Completá tus datos profesionales y luego enviá tu
        identidad para revisión.
      </p>
      <Label htmlFor="enable-kind">Ofrezco servicios como</Label>
      <select
        id="enable-kind"
        value={kind}
        onChange={(e) => setKind(e.target.value)}
        className="h-11 w-full rounded-md border border-input bg-background px-3"
      >
        <option value="profesional">Profesional independiente</option>
        <option value="empresa">Empresa</option>
      </select>
      <Label htmlFor="enable-trade">Oficio principal</Label>
      <select
        id="enable-trade"
        value={trade}
        onChange={(e) => setTrade(e.target.value)}
        className="h-11 w-full rounded-md border border-input bg-background px-3"
      >
        {categorias.map((c) => (
          <option key={c.slug} value={c.slug}>
            {c.nombre}
          </option>
        ))}
      </select>
      <Label htmlFor="enable-city">Ciudad de trabajo</Label>
      <select
        id="enable-city"
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
      {marketConfig && !activeCities.length && (
        <p role="status" className="text-sm text-muted-foreground">
          Por el momento no hay ciudades habilitadas para nuevos registros.
        </p>
      )}
      <MarketErrorText error={issue || configError} />
      <Button disabled={busy || !activeCities.some((c) => c.id === cityId)}>
        Agregar mi perfil profesional
      </Button>
    </form>
  );
}
