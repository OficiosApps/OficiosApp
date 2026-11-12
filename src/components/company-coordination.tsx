import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DetailedQuoteForm, QuoteBreakdownView } from "@/components/detailed-quotes";
import {
  decideCompanyPriceChange,
  proposeCompanyPriceChange,
  scheduleAndAssignCompanyJob,
  setCompanyResponsible,
  type CompanyDemo,
  type CompanyJob,
} from "@/lib/company-demo";
import { addDays, localToday, weekStart } from "@/lib/request-planning";
import { useIdentityRecords } from "@/components/identity-verification";
import { formatARS } from "@/lib/mock-data";
type Props = {
  company: CompanyDemo;
  onUpdate: (operation: (company: CompanyDemo) => CompanyDemo, message: string) => boolean;
};
export function CompanyCoordination({ company, onUpdate }: Props) {
  const [week, setWeek] = useState(() => weekStart(localToday()));
  const [filter, setFilter] = useState("");
  const days = Array.from({ length: 7 }, (_, index) => addDays(week, index));
  return (
    <section className="space-y-5">
      <div className="surface-panel p-5">
        <h2 className="font-display text-xl font-semibold">Agenda y responsables del equipo</h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Turnos por integrante y seguimiento de cada trabajo. Se controlan superposiciones;
          horarios de Argentina.
        </p>
        <div className="my-5 flex flex-wrap items-center gap-3">
          <Button size="sm" variant="outline" onClick={() => setWeek(addDays(week, -7))}>
            Semana anterior
          </Button>
          <span className="text-sm">Semana del {week}</span>
          <Button size="sm" variant="outline" onClick={() => setWeek(addDays(week, 7))}>
            Semana siguiente
          </Button>
          <select
            aria-label="Filtrar por integrante"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Todo el equipo</option>
            {company.members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] table-fixed text-xs">
            <caption className="sr-only">Agenda semanal del equipo</caption>
            <thead>
              <tr>
                <th scope="col" className="w-32 p-3 text-left">
                  Profesional
                </th>
                {days.map((day) => (
                  <th key={day} scope="col" className="p-2">
                    {day.slice(5)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {company.members
                .filter((member) => !filter || member.id === filter)
                .map((member) => (
                  <tr key={member.id} className="border-t border-border">
                    <th scope="row" className="p-3 text-left">
                      {member.name}
                    </th>
                    {days.map((day) => (
                      <td key={day} className="border-l border-border p-2 align-top">
                        {company.jobs
                          .filter((job) => job.memberId === member.id && job.schedule?.date === day)
                          .map((job) => (
                            <div key={job.id} className="mb-2 rounded-lg bg-secondary p-2">
                              <p className="font-semibold">
                                {job.schedule?.time} · {job.schedule?.minutes} min
                              </p>
                              <p className="mt-1">{job.title}</p>
                              <p className="mt-1 text-primary">{job.status}</p>
                            </div>
                          ))}
                      </td>
                    ))}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="grid items-start gap-5 lg:grid-cols-2">
        {company.jobs
          .filter((job) => ["confirmada", "en-curso"].includes(job.status))
          .map((job) => (
            <JobCoordination key={job.id} job={job} company={company} onUpdate={onUpdate} />
          ))}
      </div>
    </section>
  );
}
function JobCoordination({ job, company, onUpdate }: Props & { job: CompanyJob }) {
  const { records } = useIdentityRecords();
  const verifiedIds = records
    .filter((record) => record.status === "approved")
    .map((record) => record.subjectId);
  const [performer, setPerformer] = useState(job.memberId ?? "");
  const [date, setDate] = useState(job.schedule?.date ?? "");
  const [time, setTime] = useState(job.schedule?.time ?? "");
  const [minutes, setMinutes] = useState(job.schedule?.minutes ?? 60);
  return (
    <article className="surface-panel space-y-4 p-5">
      <h3 className="font-semibold">{job.title}</h3>
      <p className="text-xs text-muted-foreground">
        {job.id} · {job.status} · profesional:{" "}
        {company.members.find((member) => member.id === job.memberId)?.name ?? "Sin asignar"}
      </p>
      <div className="space-y-2">
        <Label htmlFor={`responsible-${job.id}`}>Responsable de seguimiento</Label>
        <select
          id={`responsible-${job.id}`}
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          value={job.responsibleId ?? ""}
          onChange={(event) =>
            onUpdate(
              (company) => setCompanyResponsible(company, job.id, event.target.value),
              "Responsable guardado",
            )
          }
        >
          <option value="" disabled>
            Elegí un integrante
          </option>
          {company.members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name}
            </option>
          ))}
        </select>
      </div>
      {job.status === "confirmada" && (
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            onUpdate(
              (company) =>
                scheduleAndAssignCompanyJob(
                  company,
                  job.id,
                  performer,
                  { date, time, minutes },
                  verifiedIds,
                ),
              "Turno confirmado en la demo",
            );
          }}
        >
          <select
            aria-label="Profesional del turno"
            required
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={performer}
            onChange={(event) => setPerformer(event.target.value)}
          >
            <option value="">Elegí un profesional verificado</option>
            {company.members
              .filter(
                (member) =>
                  member.category === job.category &&
                  member.available &&
                  verifiedIds.includes(member.id),
              )
              .map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
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
              onChange={(event) => setDate(event.target.value)}
            />
            <Input
              aria-label="Hora del turno"
              type="time"
              required
              value={time}
              onChange={(event) => setTime(event.target.value)}
            />
            <Input
              aria-label="Duración en minutos"
              type="number"
              required
              min={15}
              max={480}
              step={15}
              value={minutes}
              onChange={(event) => setMinutes(Number(event.target.value))}
            />
          </div>
          <Button type="submit" variant="outline" disabled={!performer}>
            Guardar turno
          </Button>
          <p className="text-xs text-muted-foreground">
            Elegí el profesional y guardá el turno. Para iniciar necesita identidad aprobada y un
            horario sin superposiciones.
          </p>
        </form>
      )}
      <p className="font-semibold">Importe vigente: {formatARS(job.amount ?? 0)}</p>
      {job.breakdown && <QuoteBreakdownView value={job.breakdown} />}
      {job.pendingBreakdown ? (
        <div className="space-y-3">
          <p className="text-sm font-semibold">Cambio pendiente del cliente</p>
          <QuoteBreakdownView value={job.pendingBreakdown} />
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={() =>
                onUpdate(
                  (company) => decideCompanyPriceChange(company, job.id, true),
                  "Nuevo importe aceptado en la simulación",
                )
              }
            >
              Simular aceptación
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                onUpdate(
                  (company) => decideCompanyPriceChange(company, job.id, false),
                  "Se mantuvo el precio anterior",
                )
              }
            >
              Simular rechazo
            </Button>
          </div>
        </div>
      ) : (
        <details>
          <summary className="cursor-pointer text-sm font-semibold text-primary">
            Proponer cambio de precio
          </summary>
          <div className="mt-4">
            <DetailedQuoteForm
              id={`revision-${job.id}`}
              onSubmit={(value) =>
                onUpdate(
                  (company) => proposeCompanyPriceChange(company, job.id, value),
                  "Revisión pendiente; el precio vigente no cambió",
                )
              }
              label="Pedir aprobación del cambio"
            />
          </div>
        </details>
      )}
    </article>
  );
}
