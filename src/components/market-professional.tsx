import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  MarketLayout,
  MarketNotice,
  MarketErrorText,
  RemoteImageUpload,
} from "@/components/market-common";
import { LiveReferrals } from "@/components/market-referrals";
import type { MarketEntitlements } from "@/lib/market-config";
import { IdentitySubmission } from "@/components/market-account";
import { MarketJobList } from "@/components/market-jobs";
import { useMarket, useRemote } from "@/hooks/use-market";
import { marketApi, fileUrl, type MarketJob } from "@/lib/market-client";
import { categorias } from "@/lib/mock-data";
import { addDays, localToday, weekStart } from "@/lib/request-planning";
export function LiveProfessionalPanel() {
  const { session } = useMarket();
  const { data: limits } = useRemote<MarketEntitlements>(
    session.account ? "/entitlements" : null,
    true,
  );
  return (
    <MarketLayout
      title={session.account?.kind === "empresa" ? "Mi empresa" : "Mi espacio profesional"}
      subtitle="Tus solicitudes, mensajes y trabajos, desde un solo lugar."
    >
      <div className="surface-panel mb-7 flex flex-wrap items-center justify-between gap-4 p-6">
        <div>
          <h2 className="font-display text-xl font-semibold">{session.account?.name}</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Identidad: {session.account?.verification} ·{" "}
            {session.account?.kind === "empresa"
              ? "Cuenta de empresa"
              : `Plan ${limits?.planName ?? "Inicial"}`}
          </p>
          {session.account?.kind === "profesional" && limits && (
            <p className="mt-2 text-xs text-muted-foreground">
              {limits.usedQuotes} propuestas nuevas este mes ·{" "}
              {limits.quoteLimit === null
                ? "Sin límite del plan"
                : `${limits.availableQuotes} disponibles`}{" "}
              · {limits.bonusQuotes} extra por referidos
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-3">
          {session.account?.kind === "profesional" && (
            <Button asChild variant="outline">
              <Link to="/planes-profesionales">Ver planes</Link>
            </Button>
          )}
          <Button asChild variant="outline">
            <Link to="/cuenta">Editar mi perfil</Link>
          </Button>
        </div>
      </div>
      <Tabs
        key={session.account?.verification}
        defaultValue={
          session.account?.verification === "aprobado" &&
          (session.account?.kind !== "profesional" ||
            session.account?.profilePhotoId ||
            session.account?.logoId)
            ? "jobs"
            : "identity"
        }
      >
        <TabsList className="h-auto flex-wrap justify-start gap-1">
          <TabsTrigger value="jobs">Solicitudes y mensajes</TabsTrigger>
          <TabsTrigger value="identity">Foto de perfil y DNI</TabsTrigger>
          <TabsTrigger value="works">Mi portafolio</TabsTrigger>
          <TabsTrigger value="payments">Mis cobros</TabsTrigger>
          {session.account?.kind === "profesional" && (
            <TabsTrigger value="referrals">Referidos</TabsTrigger>
          )}
          {session.account?.kind === "empresa" && (
            <TabsTrigger value="company">Equipo y agenda</TabsTrigger>
          )}
        </TabsList>
        <TabsContent value="jobs" className="mt-6 space-y-5">
          {session.account?.verification !== "aprobado" && (
            <MarketNotice>
              Completá la foto de perfil y la verificación del DNI. Cuando una persona autorizada la
              apruebe, vas a poder responder pedidos del oficio y ciudad de tu perfil.
            </MarketNotice>
          )}
          <MarketJobList professional />
        </TabsContent>
        <TabsContent value="identity" className="mt-6">
          <IdentitySubmission />
        </TabsContent>
        <TabsContent value="works" className="mt-6">
          <LiveWorkPortfolio />
        </TabsContent>
        <TabsContent value="payments" className="mt-6">
          <LivePaymentMethods />
        </TabsContent>
        {session.account?.kind === "profesional" && (
          <TabsContent value="referrals" className="mt-6">
            <LiveReferrals />
          </TabsContent>
        )}
        {session.account?.kind === "empresa" && (
          <TabsContent value="company" className="mt-6">
            <LiveCompany />
          </TabsContent>
        )}
      </Tabs>
    </MarketLayout>
  );
}
export function LiveWorkPortfolio() {
  const { data, error, refresh } = useRemote<{ works: any[] }>("/works");
  const [title, setTitle] = useState(""),
    [description, setDescription] = useState(""),
    [date, setDate] = useState(""),
    [before, setBefore] = useState(""),
    [after, setAfter] = useState(""),
    [clientWork, setClientWork] = useState(true),
    [consent, setConsent] = useState(false),
    [published, setPublished] = useState(false),
    [issue, setIssue] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <div className="grid items-start gap-6 lg:grid-cols-2">
      <div className="space-y-5">
        <MarketErrorText error={error || issue} />
        {!data?.works.length && (
          <MarketNotice>
            Todavía no cargaste trabajos. Mostrá el antes y después de tus servicios.
          </MarketNotice>
        )}
        {data?.works.map((work) => (
          <article key={work.id} className="surface-panel space-y-4 p-5">
            <h2 className="font-semibold">{work.title}</h2>
            <p className="text-xs text-muted-foreground">
              {work.date} · {work.published ? "Publicado" : "Borrador privado"}
            </p>
            <div className="grid grid-cols-2 gap-3">
              {[
                ["Antes", work.beforeId],
                ["Después", work.afterId],
              ].map(([label, id]) => (
                <figure key={label}>
                  <img
                    src={fileUrl(id)}
                    alt={`${label} ${work.title}`}
                    className="h-36 w-full rounded-xl object-contain"
                  />
                  <figcaption className="mt-2 text-xs">{label}</figcaption>
                </figure>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">{work.description}</p>
            {!work.published && work.clientWork && !work.clientConsent && (
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  if (
                    !window.confirm(
                      "¿Confirmás que obtuviste autorización del cliente para publicar este trabajo?",
                    )
                  )
                    return;
                  try {
                    await marketApi(`/works/${work.id}`, {
                      method: "PATCH",
                      body: JSON.stringify({ published: false, clientConsent: true }),
                    });
                    await refresh();
                  } catch (cause) {
                    setIssue(
                      cause instanceof Error
                        ? cause.message
                        : "No se pudo registrar la autorización.",
                    );
                  }
                }}
              >
                Registrar autorización obtenida
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              disabled={!work.published && work.clientWork && !work.clientConsent}
              onClick={async () => {
                try {
                  await marketApi(`/works/${work.id}`, {
                    method: "PATCH",
                    body: JSON.stringify({ published: !work.published }),
                  });
                  await refresh();
                } catch (cause) {
                  setIssue(cause instanceof Error ? cause.message : "No se pudo guardar.");
                }
              }}
            >
              {work.published ? "Retirar del perfil" : "Publicar en mi perfil"}
            </Button>
          </article>
        ))}
      </div>
      <form
        className="surface-panel space-y-4 p-6"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setIssue("");
          try {
            await marketApi("/works", {
              method: "POST",
              body: JSON.stringify({
                title,
                description,
                date,
                beforeId: before,
                afterId: after,
                clientWork,
                clientConsent: consent,
                published,
              }),
            });
            setTitle("");
            setDescription("");
            setBefore("");
            setAfter("");
            await refresh();
          } catch (cause) {
            setIssue(cause instanceof Error ? cause.message : "No se pudo guardar.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <h2 className="font-display text-xl font-semibold">Agregar un trabajo</h2>
        <Label htmlFor="work-title">Título</Label>
        <Input
          id="work-title"
          required
          minLength={3}
          maxLength={100}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <Label htmlFor="work-date">Fecha</Label>
        <Input
          id="work-date"
          type="date"
          required
          max={localToday()}
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <Label htmlFor="work-description">Descripción</Label>
        <Textarea
          id="work-description"
          required
          minLength={10}
          maxLength={1500}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <RemoteImageUpload label="Antes" scope="work" value={before} onChange={setBefore} />
          <RemoteImageUpload label="Después" scope="work" value={after} onChange={setAfter} />
        </div>
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            checked={clientWork}
            onChange={(e) => setClientWork(e.target.checked)}
            className="mt-1"
          />
          Es un trabajo realizado para un cliente.
        </label>
        {clientWork && (
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-1"
            />
            Confirmo que tengo autorización del cliente para publicar estas imágenes y su
            descripción.
          </label>
        )}
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            checked={published}
            onChange={(e) => setPublished(e.target.checked)}
            className="mt-1"
          />
          Publicar en mi perfil.
        </label>
        <p className="text-xs text-muted-foreground">
          La autorización se registra como una declaración tuya. Sin autorización, guardalo como
          borrador privado.
        </p>
        <Button disabled={busy || !before || !after || (published && clientWork && !consent)}>
          Guardar trabajo
        </Button>
      </form>
    </div>
  );
}
export function LivePaymentMethods() {
  const { session, refresh } = useMarket();
  const { data: limits } = useRemote<MarketEntitlements>("/entitlements");
  const methodLimit = limits?.maxPaymentMethods ?? 6;
  const methods = session.account?.profile?.["paymentMethods"] ?? [];
  const [kind, setKind] = useState("transferencia"),
    [label, setLabel] = useState(""),
    [value, setValue] = useState(""),
    [issue, setIssue] = useState(""),
    [busy, setBusy] = useState(false);
  async function save(paymentMethods: any[]) {
    setBusy(true);
    setIssue("");
    try {
      const account = session.account!;
      await marketApi("/account", {
        method: "PATCH",
        body: JSON.stringify({
          name: account.name,
          bio: account.bio,
          phone: account.phone,
          version: account.version,
          paymentMethods,
        }),
      });
      await refresh();
      setLabel("");
      setValue("");
    } catch (cause) {
      setIssue(cause instanceof Error ? cause.message : "No se pudo guardar.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="space-y-4">
        <h2 className="font-display text-xl font-semibold">Mis métodos de cobro</h2>
        <MarketNotice>
          El cliente contratado podrá ver estas instrucciones. El pago se acuerda directamente con
          vos; Oficios no procesa ni custodia el dinero.
        </MarketNotice>
        {methods.map((m: any, i: number) => (
          <article key={i} className="surface-panel space-y-3 p-5">
            <h3 className="font-semibold">{m.label}</h3>
            <p className="break-all text-sm text-muted-foreground">
              {m.kind} · {m.value || "Acordar al finalizar"}
            </p>
            <Button
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => void save(methods.filter((_: any, index: number) => index !== i))}
            >
              Eliminar
            </Button>
          </article>
        ))}
      </section>
      <form
        className="surface-panel space-y-4 p-6"
        onSubmit={(e) => {
          e.preventDefault();
          void save([...methods, { kind, label, value }]);
        }}
      >
        <h2 className="font-semibold">Agregar un método</h2>
        <Label htmlFor="pay-kind">Tipo</Label>
        <select
          id="pay-kind"
          value={kind}
          onChange={(e) => setKind(e.target.value)}
          className="h-10 w-full rounded-md border border-input bg-background px-3"
        >
          <option value="transferencia">Transferencia (alias o CBU)</option>
          <option value="billetera">Billetera (alias)</option>
          <option value="efectivo">Efectivo</option>
        </select>
        <Label htmlFor="pay-label">Nombre para identificarlo</Label>
        <Input
          id="pay-label"
          required
          maxLength={60}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Mi cuenta bancaria"
        />
        {kind !== "efectivo" && (
          <>
            <Label htmlFor="pay-value">Alias o CBU</Label>
            <Input
              id="pay-value"
              required
              maxLength={100}
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </>
        )}
        <MarketErrorText error={issue} />
        <Button disabled={busy || methods.length >= methodLimit}>Guardar método</Button>
        <p className="text-xs text-muted-foreground">
          Hasta {methodLimit} métodos. No cargues números de tarjeta ni códigos de seguridad.
        </p>
      </form>
    </div>
  );
}
export function LiveCompany() {
  const { data, error, refresh } = useRemote<{ members: any[] }>("/company");
  const { data: jobsData } = useRemote<{ jobs: MarketJob[] }>("/jobs", true);
  const [week, setWeek] = useState(() => weekStart(localToday())),
    [name, setName] = useState(""),
    [email, setEmail] = useState(""),
    [trade, setTrade] = useState(categorias[0]!.slug),
    [issue, setIssue] = useState("");
  const days = Array.from({ length: 7 }, (_, i) => addDays(week, i));
  return (
    <div className="space-y-7">
      <MarketErrorText error={error || issue} />
      <section className="surface-panel p-6">
        <h2 className="font-display text-xl font-semibold">Agenda del equipo</h2>
        <div className="my-5 flex flex-wrap items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setWeek(addDays(week, -7))}>
            Semana anterior
          </Button>
          <span className="text-sm">Semana del {week}</span>
          <Button variant="outline" size="sm" onClick={() => setWeek(addDays(week, 7))}>
            Semana siguiente
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-xs">
            <caption className="sr-only">Agenda por integrante, horarios de Argentina</caption>
            <thead>
              <tr>
                <th className="p-3 text-left">Integrante</th>
                {days.map((day) => (
                  <th key={day} className="p-3">
                    {day.slice(5)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data?.members.map((member) => (
                <tr key={member.id} className="border-t border-border">
                  <th className="p-3 text-left">{member.name}</th>
                  {days.map((day) => (
                    <td key={day} className="border-l border-border p-3 align-top">
                      {jobsData?.jobs
                        .filter(
                          (job) =>
                            job.assignment?.memberId === member.id && job.assignment?.date === day,
                        )
                        .map((job) => (
                          <div key={job.id} className="mb-2 rounded-lg bg-secondary p-2">
                            <p>
                              {job.assignment?.time} · {job.assignment?.minutes} min
                            </p>
                            <Link
                              to="/solicitudes/$id"
                              params={{ id: "nueva" }}
                              search={{ solicitud: job.id }}
                              className="mt-2 block font-semibold text-primary underline"
                            >
                              {job.service}
                            </Link>
                          </div>
                        ))}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <section className="space-y-4">
          <h2 className="font-display text-xl font-semibold">Integrantes e invitaciones</h2>
          {!data?.members.length && (
            <MarketNotice>Invitá al primer profesional de tu equipo.</MarketNotice>
          )}
          {data?.members.map((member) => (
            <article key={member.id} className="surface-panel space-y-3 p-5">
              <h3 className="font-semibold">{member.name}</h3>
              <p className="text-xs text-muted-foreground">
                {member.email} · {member.user_id ? "Invitación aceptada" : "Pendiente de aceptar"}
              </p>
              {!member.user_id && (
                <>
                  <p className="text-xs">
                    Compartí este código para que lo acepte desde su cuenta:
                  </p>
                  <code className="block break-all rounded-md bg-secondary p-3 text-xs">
                    {member.id}
                  </code>
                </>
              )}
            </article>
          ))}
        </section>
        <form
          className="surface-panel space-y-4 p-6"
          onSubmit={async (e) => {
            e.preventDefault();
            setIssue("");
            try {
              await marketApi("/company", {
                method: "POST",
                body: JSON.stringify({ name, email, trade }),
              });
              setName("");
              setEmail("");
              await refresh();
            } catch (cause) {
              setIssue(cause instanceof Error ? cause.message : "No se pudo invitar.");
            }
          }}
        >
          <h2 className="font-semibold">Invitar a un profesional</h2>
          <Label htmlFor="member-name">Nombre</Label>
          <Input id="member-name" required value={name} onChange={(e) => setName(e.target.value)} />
          <Label htmlFor="member-email">Correo de su cuenta</Label>
          <Input
            id="member-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Label htmlFor="member-trade">Oficio</Label>
          <select
            id="member-trade"
            value={trade}
            onChange={(e) => setTrade(e.target.value)}
            className="h-10 w-full rounded-md border border-input bg-background px-3"
          >
            {categorias.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.nombre}
              </option>
            ))}
          </select>
          <Button>Crear invitación</Button>
          <p className="text-xs text-muted-foreground">
            Se genera un código para compartir. No se envía un correo automáticamente.
          </p>
        </form>
      </div>
    </div>
  );
}
export function CompanyAssignment({
  job,
  onRefresh,
}: {
  job: MarketJob;
  onRefresh: () => Promise<void>;
}) {
  const { data } = useRemote<{ members: any[] }>("/company");
  const [member, setMember] = useState(""),
    [date, setDate] = useState(""),
    [time, setTime] = useState(""),
    [minutes, setMinutes] = useState(60),
    [issue, setIssue] = useState("");
  return (
    <form
      className="surface-panel space-y-4 p-6"
      onSubmit={async (e) => {
        e.preventDefault();
        try {
          await marketApi(`/jobs/${job.id}`, {
            method: "POST",
            body: JSON.stringify({
              action: "assign",
              version: job.version,
              memberId: member,
              date,
              time,
              minutes,
            }),
          });
          setIssue("");
          await onRefresh();
        } catch (cause) {
          setIssue(cause instanceof Error ? cause.message : "No se pudo asignar.");
        }
      }}
    >
      <h2 className="font-semibold">Responsable y turno del equipo</h2>
      <select
        aria-label="Responsable del trabajo"
        required
        value={member}
        onChange={(e) => setMember(e.target.value)}
        className="h-10 w-full rounded-md border border-input bg-background px-3"
      >
        <option value="">Elegí un integrante</option>
        {data?.members
          .filter((m) => m.user_id)
          .map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
      </select>
      <div className="grid gap-3 sm:grid-cols-3">
        <Input
          aria-label="Fecha del turno"
          type="date"
          required
          min={localToday()}
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <Input
          aria-label="Hora del turno"
          type="time"
          required
          value={time}
          onChange={(e) => setTime(e.target.value)}
        />
        <Input
          aria-label="Duración en minutos"
          type="number"
          min={15}
          max={480}
          step={15}
          required
          value={minutes}
          onChange={(e) => setMinutes(Number(e.target.value))}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        El integrante debe aceptar la invitación y tener su identidad aprobada. Se controlan
        superposiciones de horarios.
      </p>
      <MarketErrorText error={issue} />
      <Button>Guardar responsable y turno</Button>
    </form>
  );
}
