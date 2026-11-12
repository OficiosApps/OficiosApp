import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  addDays,
  availableHours,
  localToday,
  periods,
  scheduleLabel,
  weekStart,
  type SchedulePreference,
} from "@/lib/request-planning";

export function WeeklyPlanner({
  value,
  onChange,
}: {
  value: SchedulePreference | null;
  onChange: (value: SchedulePreference | null) => void;
}) {
  const [today, setToday] = useState("");
  const [week, setWeek] = useState("");
  const [mode, setMode] = useState<"turno" | "hora">(value?.mode ?? "turno");
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const refresh = () => {
      const date = new Date();
      setNow(date);
      setToday(localToday(date));
      setWeek((week) => week || weekStart(value?.date ?? localToday(date)));
    };
    refresh();
    const timer = window.setInterval(refresh, 60000);
    return () => window.clearInterval(timer);
  }, []);
  if (!week || !today)
    return (
      <p role="status" className="text-sm">
        Preparando agenda semanal…
      </p>
    );
  const days = Array.from({ length: 7 }, (_, index) => addDays(week, index));
  return (
    <section
      className="rounded-2xl border border-primary/25 bg-secondary/25 p-4"
      aria-labelledby="planner-title"
    >
      <h2 id="planner-title" className="flex items-center gap-2 font-semibold">
        <CalendarDays className="size-4 text-primary" />
        Elegí cuándo te queda cómodo
      </h2>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        Seleccioná un día y un turno, o indicá una hora puntual. Es una preferencia: el profesional
        debe confirmar la disponibilidad.
      </p>
      <div className="my-4 flex flex-wrap gap-2">
        {(["turno", "hora"] as const).map((option) => (
          <Button
            key={option}
            size="sm"
            variant={mode === option ? "default" : "outline"}
            aria-pressed={mode === option}
            onClick={() => {
              setMode(option);
              if (value) onChange({ ...value, hour: "", mode: option });
            }}
          >
            {option === "turno" ? "Por turno" : "Hora puntual"}
          </Button>
        ))}
      </div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <Button
          size="icon"
          variant="outline"
          aria-label="Semana anterior"
          disabled={week <= weekStart(today)}
          onClick={() => setWeek(addDays(week, -7))}
        >
          <ChevronLeft />
        </Button>
        <p className="text-center text-xs font-semibold">
          Semana del{" "}
          {new Intl.DateTimeFormat("es-AR", {
            timeZone: "UTC",
            day: "numeric",
            month: "long",
          }).format(new Date(`${week}T12:00:00Z`))}
        </p>
        <Button
          size="icon"
          variant="outline"
          aria-label="Semana siguiente"
          disabled={addDays(week, 7) > addDays(today, 55)}
          onClick={() => setWeek(addDays(week, 7))}
        >
          <ChevronRight />
        </Button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full min-w-[550px] table-fixed text-xs">
          <caption className="sr-only">
            Agenda semanal de preferencias horarias, zona horaria de Argentina
          </caption>
          <thead>
            <tr>
              <th scope="col" className="w-20 p-2 text-left">
                Turno
              </th>
              {days.map((day) => (
                <th
                  key={day}
                  scope="col"
                  className={`p-2 text-center ${day === today ? "text-primary" : "text-muted-foreground"}`}
                >
                  {new Intl.DateTimeFormat("es-AR", { timeZone: "UTC", weekday: "short" }).format(
                    new Date(`${day}T12:00:00Z`),
                  )}
                  <span className="mt-1 block font-normal">
                    {day.slice(8)}/{day.slice(5, 7)}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {periods.map((period) => (
              <tr key={period.id} className="border-t border-border">
                <th scope="row" className="p-2 text-left">
                  <span className="block">{period.label}</span>
                  <span className="mt-1 block font-normal text-muted-foreground">
                    {period.from}–{period.to} h
                  </span>
                </th>
                {days.map((day) => {
                  const selected = value?.date === day && value.period === period.id;
                  const available = availableHours(day, period.id, now).length > 0;
                  return (
                    <td key={day} className="p-1">
                      <button
                        type="button"
                        disabled={!available}
                        aria-pressed={selected}
                        aria-label={`${period.label}, ${day}`}
                        onClick={() => onChange({ date: day, period: period.id, hour: "", mode })}
                        className={`h-11 w-full rounded-lg text-[11px] font-medium transition-colors disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground/50 ${selected ? "bg-primary text-primary-foreground" : "bg-secondary/70 text-primary hover:bg-secondary"}`}
                      >
                        {!available ? "—" : selected ? "Elegido" : "Elegir"}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {mode === "hora" && value && (
        <div className="mt-4 space-y-2">
          <Label htmlFor="planned-hour">Hora de preferencia *</Label>
          <select
            id="planned-hour"
            required
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={value.hour}
            onChange={(event) => onChange({ ...value, hour: event.target.value })}
          >
            <option value="">Elegí un horario</option>
            {availableHours(value.date, value.period, now).map((hour) => (
              <option key={hour} value={hour}>
                {hour}
              </option>
            ))}
          </select>
        </div>
      )}
      {value && (
        <p className="mt-4 text-xs font-medium text-primary">
          Preferencia: {scheduleLabel(value)}
          {mode === "hora" && !value.hour ? " · falta elegir la hora" : ""}
        </p>
      )}
      <p className="mt-3 text-[11px] text-muted-foreground">
        Horarios de Argentina (UTC−3). Podés planificar las próximas 8 semanas.
      </p>
    </section>
  );
}
