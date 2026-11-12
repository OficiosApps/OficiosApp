import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Crown,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  Mail,
  MapPin,
  ShieldCheck,
  UserPlus,
  Users,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ciudades } from "@/lib/mock-data";
import {
  activateInvitation,
  allowedInviteRole,
  createInvitation,
  initialInvitations,
  invitationStatus,
  isTeamInvitation,
  teamRoleLabels,
  type TeamInvitation,
} from "@/lib/team-demo";

type View = "ceo" | "superadmin" | "invitacion";
const STORAGE_KEY = "oficios-equipo-demo-v1";
const statusLabels = {
  pending: "Pendiente",
  active: "Cuenta activada",
  revoked: "Revocada",
  expired: "Vencida",
};

export const Route = createFileRoute("/equipo")({
  validateSearch: (search: Record<string, unknown>) => ({
    vista: (["ceo", "superadmin", "invitacion"].includes(String(search["vista"]))
      ? search["vista"]
      : "ceo") as View,
    invitacion: typeof search["invitacion"] === "string" ? search["invitacion"] : "",
  }),
  head: () => ({
    meta: [{ title: "Altas del equipo — Oficios" }, { name: "robots", content: "noindex" }],
  }),
  component: TeamDemo,
});

function cityLabel(id: string) {
  return id === "todas"
    ? "Todas las ciudades"
    : (ciudades.find((city) => city.id === id)?.nombre ?? id);
}

function TeamDemo() {
  const { vista, invitacion } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
  const [ready, setReady] = useState(false);
  const [storageUnavailable, setStorageUnavailable] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let data = initialInvitations();
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: unknown = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.every(isTeamInvitation)) data = parsed;
      }
    } catch {
      setStorageUnavailable(true);
    }
    setInvitations(data);
    setReady(true);
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(invitations));
    } catch {
      setStorageUnavailable(true);
    }
  }, [invitations, ready]);

  function openInvitation(id: string) {
    void navigate({ search: { vista: "invitacion", invitacion: id } });
  }

  function resetDemo() {
    if (
      !window.confirm(
        "¿Reiniciar esta demostración? Se borrarán las altas de prueba de este navegador.",
      )
    )
      return;
    setInvitations(initialInvitations());
    void navigate({ search: { vista: "ceo", invitacion: "" } });
    toast.success("Demostración reiniciada");
  }

  const selected = invitations.find((item) => item.id === invitacion);
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="border-b border-amber-200 bg-amber-50">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-3 text-xs text-amber-950">
          <p>
            <strong>Vista de demostración.</strong> Probá los roles y el primer ingreso. No envía
            correos ni crea accesos reales.
          </p>
          <button
            type="button"
            onClick={resetDemo}
            disabled={!ready}
            className="font-semibold underline underline-offset-4"
          >
            Reiniciar demo
          </button>
        </div>
      </div>
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:py-12">
        {storageUnavailable && (
          <p role="status" className="mb-4 rounded-xl bg-secondary p-3 text-sm">
            El navegador no permite guardar la prueba. Los cambios se perderán al recargar.
          </p>
        )}
        <div className="mb-8 flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-2">
          <span className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Probar como
          </span>
          {(["ceo", "superadmin"] as const).map((role) => (
            <Button key={role} variant={vista === role ? "default" : "ghost"} size="sm" asChild>
              <Link to="/equipo" search={{ vista: role, invitacion: "" }}>
                {teamRoleLabels[role]}
              </Link>
            </Button>
          ))}
          <span className="hidden h-5 w-px bg-border sm:block" />
          <Button
            size="sm"
            variant={
              vista === "invitacion" && selected?.role === "superadmin" ? "secondary" : "ghost"
            }
            disabled={!ready}
            onClick={() => openInvitation("demo-superadmin")}
          >
            Nuevo superadmin
          </Button>
          <Button
            size="sm"
            variant={vista === "invitacion" && selected?.role === "admin" ? "secondary" : "ghost"}
            disabled={!ready}
            onClick={() => openInvitation("demo-admin")}
          >
            Nuevo administrador
          </Button>
        </div>

        {!ready ? (
          <div role="status" className="surface-panel p-12 text-center text-muted-foreground">
            Preparando la demostración…
          </div>
        ) : vista === "invitacion" ? (
          <InvitationScreen
            key={invitacion}
            invitation={selected}
            now={now}
            onActivate={(item) =>
              setInvitations((previous) =>
                previous.map((entry) => (entry.id === item.id ? item : entry)),
              )
            }
          />
        ) : (
          <ManagementScreen
            key={vista}
            actor={vista}
            invitations={invitations}
            now={now}
            onCreate={(item) => setInvitations((previous) => [item, ...previous])}
            onOpen={openInvitation}
            onRevoke={(id) =>
              setInvitations((previous) =>
                previous.map((item) =>
                  item.id === id &&
                  item.invitedByRole === vista &&
                  invitationStatus(item) === "pending"
                    ? { ...item, status: "revoked" }
                    : item,
                ),
              )
            }
          />
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

function ManagementScreen({
  actor,
  invitations,
  now,
  onCreate,
  onOpen,
  onRevoke,
}: {
  actor: "ceo" | "superadmin";
  invitations: TeamInvitation[];
  now: number;
  onCreate: (invitation: TeamInvitation) => void;
  onOpen: (id: string) => void;
  onRevoke: (id: string) => void;
}) {
  const targetRole = allowedInviteRole(actor)!;
  const visible = invitations.filter((item) => item.invitedByRole === actor);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [cityId, setCityId] = useState("");
  const [error, setError] = useState("");
  const [createdId, setCreatedId] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try {
      if (targetRole === "admin" && !ciudades.some((city) => city.id === cityId))
        throw new Error("Elegí una ciudad válida.");
      const item = createInvitation(
        actor,
        {
          name,
          email,
          cityId,
          invitedBy: actor === "ceo" ? "Dirección de Oficios" : "Camila Torres",
        },
        invitations,
        crypto.randomUUID(),
      );
      onCreate(item);
      setCreatedId(item.id);
      setName("");
      setEmail("");
      toast.success("Invitación de prueba creada");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo crear la invitación.");
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            Equipo de Oficios · {teamRoleLabels[actor]}
          </p>
          <h1 className="mt-3 max-w-2xl font-display text-3xl font-semibold leading-tight sm:text-4xl">
            El equipo crece.
            <br />
            Los permisos tienen un orden.
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
            {actor === "ceo"
              ? "Como CEO, das de alta a quienes van a liderar la plataforma. Cada superadministrador podrá incorporar a los administradores."
              : "Como superadministrador, incorporás a quienes se ocupan de la operación de cada ciudad. Su acceso empieza con tu invitación."}
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs font-medium">
          <LockKeyhole className="size-4 text-primary" />
          Alta por invitación
        </span>
      </div>

      <div className="my-8 grid gap-3 sm:grid-cols-3">
        {(
          [
            { role: "ceo", icon: Crown, text: "Da de alta a superadministradores" },
            { role: "superadmin", icon: ShieldCheck, text: "Da de alta a administradores" },
            { role: "admin", icon: Users, text: "Opera su ciudad. No da altas al equipo" },
          ] as const
        ).map((item, index) => (
          <div
            key={item.role}
            className={`flex items-center gap-3 rounded-2xl border p-4 ${actor === item.role ? "border-primary bg-secondary" : "border-border bg-card"}`}
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-background text-primary">
              <item.icon className="size-5" />
            </span>
            <div>
              <p className="text-sm font-semibold">
                {index + 1}. {teamRoleLabels[item.role]}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{item.text}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[0.9fr_1.3fr]">
        <section className="surface-panel p-5 sm:p-7" aria-labelledby="invite-heading">
          <div className="mb-5 flex size-11 items-center justify-center rounded-xl bg-secondary text-primary">
            <UserPlus className="size-5" />
          </div>
          <h2 id="invite-heading" className="font-display text-xl font-semibold">
            {targetRole === "superadmin" ? "Invitar superadministrador" : "Invitar administrador"}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Vos definís el acceso. La persona invitada completa su cuenta.
          </p>
          <form className="mt-6 space-y-4" onSubmit={submit}>
            <div className="space-y-2">
              <Label htmlFor="invite-name">Nombre y apellido</Label>
              <Input
                id="invite-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                minLength={2}
                maxLength={100}
                placeholder="Ej.: Valentina Gómez"
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-email">Correo electrónico</Label>
              <Input
                id="invite-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                maxLength={200}
                placeholder="nombre@ejemplo.com"
                autoComplete="off"
              />
            </div>
            <div className="rounded-xl border border-border bg-secondary/40 p-4">
              <p className="text-xs text-muted-foreground">
                Rol asignado por {actor === "ceo" ? "el CEO" : "el superadministrador"}
              </p>
              <p className="mt-1 flex items-center gap-2 text-sm font-semibold">
                <ShieldCheck className="size-4 text-primary" />
                {teamRoleLabels[targetRole]}
              </p>
            </div>
            {targetRole === "admin" ? (
              <div className="space-y-2">
                <Label htmlFor="invite-city">Ciudad a cargo</Label>
                <select
                  id="invite-city"
                  required
                  value={cityId}
                  onChange={(event) => setCityId(event.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">Elegí una ciudad</option>
                  {ciudades.map((city) => (
                    <option key={city.id} value={city.id}>
                      {city.nombre}, {city.provincia}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <MapPin className="size-4" />
                Alcance: todas las ciudades.
              </p>
            )}
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full">
              <UserPlus />
              Crear invitación de prueba
            </Button>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Vigencia: 7 días. En esta demo, la invitación queda guardada en este navegador y no se
              envía por correo.
            </p>
          </form>
          {createdId && (
            <div
              role="status"
              className="mt-5 rounded-xl border border-primary/20 bg-secondary p-4"
            >
              <p className="flex items-center gap-2 text-sm font-semibold">
                <CheckCircle2 className="size-4 text-primary" />
                Invitación lista
              </p>
              <Button
                variant="link"
                className="mt-2 h-auto whitespace-normal p-0 text-left"
                onClick={() => onOpen(createdId)}
              >
                Ver como persona invitada
                <ArrowRight />
              </Button>
            </div>
          )}
        </section>

        <section className="surface-panel min-w-0 overflow-hidden" aria-labelledby="team-heading">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5 sm:p-7">
            <div>
              <h2 id="team-heading" className="font-display text-xl font-semibold">
                {targetRole === "superadmin" ? "Superadministradores" : "Administradores"}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Altas autorizadas por {actor === "ceo" ? "el CEO" : "el superadministrador"}.
              </p>
            </div>
            <Badge variant="secondary">
              {visible.length} {visible.length === 1 ? "persona" : "personas"}
            </Badge>
          </div>
          <div className="divide-y divide-border">
            {visible.length === 0 && (
              <p className="p-8 text-center text-sm text-muted-foreground">
                Todavía no hay invitaciones. Creá la primera desde el formulario.
              </p>
            )}
            {visible.map((item) => {
              const status = invitationStatus(item, now);
              return (
                <div key={item.id} className="p-5 sm:px-7">
                  <div className="flex items-start gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-primary">
                      {item.name
                        .split(" ")
                        .slice(0, 2)
                        .map((part) => part[0])
                        .join("")}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-sm font-semibold">{item.name}</p>
                      <p className="mt-1 break-all text-xs text-muted-foreground">{item.email}</p>
                    </div>
                    <Badge
                      variant={status === "active" ? "default" : "secondary"}
                      className="shrink-0"
                    >
                      {statusLabels[status]}
                    </Badge>
                  </div>
                  <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="size-3.5" />
                    {cityLabel(item.cityId)}
                  </p>
                  {status === "pending" && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Vence el{" "}
                      {new Intl.DateTimeFormat("es-AR", {
                        timeZone: "America/Buenos_Aires",
                        day: "numeric",
                        month: "long",
                      }).format(item.expiresAt)}
                    </p>
                  )}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => onOpen(item.id)}>
                      <Eye />
                      {status === "active" ? "Ver bienvenida" : "Ver invitación"}
                    </Button>
                    {status === "pending" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          onRevoke(item.id);
                          toast.success("Invitación revocada");
                        }}
                      >
                        Revocar
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </>
  );
}

function InvitationScreen({
  invitation,
  now,
  onActivate,
}: {
  invitation: TeamInvitation | undefined;
  now: number;
  onActivate: (invitation: TeamInvitation) => void;
}) {
  const [name, setName] = useState(invitation?.name ?? "");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState("");
  const status = invitation ? invitationStatus(invitation, now) : null;

  if (!invitation || status === "revoked" || status === "expired")
    return (
      <section className="surface-panel mx-auto max-w-xl p-8 text-center sm:p-12">
        <LockKeyhole className="mx-auto mb-5 size-10 text-primary" />
        <h1 className="font-display text-2xl font-semibold">
          {status === "expired"
            ? "Esta invitación venció"
            : status === "revoked"
              ? "Esta invitación fue revocada"
              : "Necesitás una invitación"}
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          {invitation?.role === "admin"
            ? "Pedile una nueva invitación a tu superadministrador."
            : "Para crear una cuenta de superadministrador, necesitás el alta de un CEO. Los administradores reciben su invitación de un superadministrador."}
        </p>
        <Button asChild variant="outline" className="mt-6">
          <Link to="/equipo" search={{ vista: invitation?.invitedByRole ?? "ceo", invitacion: "" }}>
            <ArrowLeft />
            Volver a la demostración
          </Link>
        </Button>
      </section>
    );

  if (status === "active")
    return (
      <section className="surface-panel mx-auto max-w-3xl overflow-hidden">
        <div className="gradient-trust px-6 py-10 text-center text-primary-foreground sm:px-10">
          <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-white/15">
            <CheckCircle2 className="size-8" />
          </span>
          <Badge className="mt-5 border-white/25 bg-white/10 text-white">
            Cuenta de prueba activada
          </Badge>
          <h1 className="mt-4 font-display text-3xl font-semibold">
            ¡Bienvenido/a, {invitation.name.split(" ")[0]}!
          </h1>
          <p className="mt-3 text-sm text-white/85">Ya sos parte del equipo de Oficios.</p>
        </div>
        <div className="p-6 sm:p-10">
          <div className="mb-7 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-secondary p-4">
            <div>
              <p className="text-xs text-muted-foreground">Tu rol</p>
              <p className="mt-1 font-semibold">{teamRoleLabels[invitation.role]}</p>
            </div>
            <p className="flex items-center gap-2 text-sm">
              <MapPin className="size-4 text-primary" />
              {cityLabel(invitation.cityId)}
            </p>
          </div>
          <h2 className="font-display text-lg font-semibold">Tu primer día empieza acá</h2>
          <ul className="mt-4 space-y-4">
            {(invitation.role === "superadmin"
              ? [
                  "Revisá la operación de todas las ciudades.",
                  "Invitá a los administradores de cada ciudad.",
                  "Consultá las métricas y la auditoría de la plataforma.",
                ]
              : [
                  "Revisá las solicitudes y verificaciones de tu ciudad.",
                  "Acompañá a los profesionales y la operación diaria.",
                  "Consultá a tu superadministrador si necesitás cambiar permisos.",
                ]
            ).map((text) => (
              <li key={text} className="flex items-start gap-3 text-sm">
                <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                {text}
              </li>
            ))}
          </ul>
          <p className="mt-6 rounded-xl border border-border p-4 text-xs leading-relaxed text-muted-foreground">
            {invitation.role === "superadmin"
              ? "Tu alta fue autorizada por un CEO. Podés incorporar administradores; las altas de otros superadministradores siguen a cargo de los CEOs."
              : "Tu alta fue autorizada por un superadministrador. El rol administrador no permite dar altas al equipo ni acceder al control global."}
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button asChild>
              <Link to={invitation.role === "superadmin" ? "/superadmin" : "/admin"}>
                Ver mi panel de ejemplo
                <ArrowRight />
              </Link>
            </Button>
            {invitation.role === "superadmin" && (
              <Button variant="outline" asChild>
                <Link to="/equipo" search={{ vista: "superadmin", invitacion: "" }}>
                  Probar alta de administrador
                </Link>
              </Button>
            )}
          </div>
          <p className="mt-5 text-xs text-muted-foreground">
            Esto es una vista de prueba: los paneles todavía muestran datos simulados y no tienen
            autenticación real.
          </p>
        </div>
      </section>
    );

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!invitation) return;
    if (password.length < 12) {
      setError("Usá una contraseña de prueba de al menos 12 caracteres.");
      return;
    }
    if (password !== confirmation) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    if (!accepted) {
      setError("Confirmá que aceptás la responsabilidad de este acceso.");
      return;
    }
    try {
      onActivate(activateInvitation(invitation, name));
      setPassword("");
      setConfirmation("");
      toast.success("Cuenta de prueba activada");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo activar la cuenta.");
    }
  }

  return (
    <div className="surface-panel grid overflow-hidden lg:grid-cols-[0.85fr_1fr]">
      <aside className="gradient-trust flex flex-col justify-between p-6 text-primary-foreground sm:p-10">
        <div>
          <span className="inline-flex items-center gap-2 text-lg font-semibold">
            <Wrench className="size-6" />
            Oficios{" "}
            <span className="ml-2 border-l border-white/25 pl-4 text-xs font-normal text-white/75">
              Equipo
            </span>
          </span>
          <p className="mt-10 text-xs uppercase tracking-[0.18em] text-white/65">
            Una invitación para vos
          </p>
          <h1 className="mt-4 font-display text-3xl font-semibold leading-tight sm:text-4xl">
            Tu próximo paso,
            <br />
            dentro del equipo.
          </h1>
          <p className="mt-5 text-sm leading-relaxed text-white/80">
            {invitation.invitedBy} te invita a sumarte a Oficios como{" "}
            {teamRoleLabels[invitation.role].toLowerCase()}.
          </p>
          <div className="mt-8 rounded-2xl border border-white/20 bg-white/10 p-5">
            <p className="text-xs text-white/65">Acceso autorizado por</p>
            <p className="mt-2 font-semibold">{invitation.invitedBy}</p>
            <p className="mt-1 text-xs text-white/75">{teamRoleLabels[invitation.invitedByRole]}</p>
            <div className="mt-4 border-t border-white/20 pt-4">
              <p className="flex items-center gap-2 text-sm">
                <ShieldCheck className="size-4" />
                {teamRoleLabels[invitation.role]}
              </p>
              <p className="mt-2 flex items-center gap-2 text-sm">
                <MapPin className="size-4" />
                {cityLabel(invitation.cityId)}
              </p>
            </div>
          </div>
        </div>
        <ol className="mt-10 flex flex-wrap gap-5 text-xs text-white/80">
          <li className="flex items-center gap-2">
            <CheckCircle2 className="size-4" />
            1. Invitación
          </li>
          <li className="flex items-center gap-2 font-semibold text-white">
            <span className="flex size-5 items-center justify-center rounded-full bg-white/20">
              2
            </span>
            Tu cuenta
          </li>
          <li className="flex items-center gap-2">3. Bienvenida</li>
        </ol>
      </aside>
      <section className="p-6 sm:p-10" aria-labelledby="activation-heading">
        <span className="mb-5 flex size-11 items-center justify-center rounded-xl bg-secondary text-primary">
          <KeyRound className="size-5" />
        </span>
        <h2 id="activation-heading" className="font-display text-2xl font-semibold">
          Activá tu cuenta
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Completá tus datos para aceptar la invitación.
        </p>
        <form className="mt-6 space-y-4" onSubmit={submit}>
          <div className="space-y-2">
            <Label htmlFor="account-name">Nombre y apellido</Label>
            <Input
              id="account-name"
              required
              minLength={2}
              maxLength={100}
              autoComplete="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="account-email">Correo invitado</Label>
            <div className="flex items-center gap-2 rounded-md border border-input bg-muted px-3">
              <Mail className="size-4 shrink-0 text-muted-foreground" />
              <Input
                id="account-email"
                className="border-0 px-0 shadow-none"
                readOnly
                value={invitation.email}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              El correo y el rol ya vienen definidos en tu invitación.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="account-password">Contraseña de prueba</Label>
            <div className="relative">
              <Input
                id="account-password"
                type={showPassword ? "text" : "password"}
                required
                minLength={12}
                maxLength={128}
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="pr-12"
                placeholder="Al menos 12 caracteres"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-md text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="account-confirm">Repetí la contraseña</Label>
            <Input
              id="account-confirm"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              required
              minLength={12}
              maxLength={128}
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
            />
          </div>
          <label className="flex cursor-pointer items-start gap-3 py-2 text-xs leading-relaxed">
            <input
              type="checkbox"
              required
              checked={accepted}
              onChange={(event) => setAccepted(event.target.checked)}
              className="mt-0.5 size-4 shrink-0 accent-primary"
            />
            <span>
              Acepto la invitación y la responsabilidad de usar únicamente los permisos asignados a
              mi rol.
            </span>
          </label>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" className="w-full">
            Activar cuenta de prueba
            <ArrowRight />
          </Button>
          <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
            <LockKeyhole className="mt-0.5 size-4 shrink-0" />
            Usá una contraseña ficticia. Esta demo no la guarda ni la envía.
          </p>
        </form>
      </section>
    </div>
  );
}
