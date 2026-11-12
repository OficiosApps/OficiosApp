import { customerStorage } from "./customer-state.ts";
export const periods = [
  { id: "manana", label: "Mañana", from: 8, to: 12 },
  { id: "tarde", label: "Tarde", from: 12, to: 18 },
  { id: "noche", label: "Noche", from: 18, to: 22 },
] as const;
export type PeriodId = (typeof periods)[number]["id"];
export type SchedulePreference = {
  date: string;
  period: PeriodId;
  hour: string;
  mode: "turno" | "hora";
};
export type LocalRequest = {
  cityId?: string;
  id: string;
  instanceId: string;
  categoriaSlug: string;
  servicio: string;
  tipo: "urgente" | "planificado";
  descripcion: string;
  direccion: string;
  contacto: string;
  cuando: string;
  schedule: SchedulePreference | null;
  photoIds: string[];
};
export const REQUEST_KEY = customerStorage.request;
export function isCalendarDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export function localToday(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
function localHour(now: Date) {
  return Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "America/Buenos_Aires",
      hour: "2-digit",
      hourCycle: "h23",
    }).format(now),
  );
}
export function addDays(date: string, days: number) {
  const result = new Date(`${date}T12:00:00Z`);
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString().slice(0, 10);
}
export function weekStart(date: string) {
  const day = new Date(`${date}T12:00:00Z`).getUTCDay();
  return addDays(date, -(day === 0 ? 6 : day - 1));
}
export function availableHours(date: string, period: PeriodId, now = new Date()) {
  const p = periods.find((item) => item.id === period);
  if (
    !p ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    date < localToday(now) ||
    date > addDays(localToday(now), 55)
  )
    return [];
  const parsed = new Date(`${date}T12:00:00Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) return [];
  return Array.from({ length: p.to - p.from }, (_, index) => p.from + index)
    .filter((hour) => date !== localToday(now) || hour > localHour(now))
    .map((hour) => `${String(hour).padStart(2, "0")}:00`);
}
export function validSchedule(schedule: SchedulePreference | null, now = new Date()) {
  if (!schedule) return false;
  const hours = availableHours(schedule.date, schedule.period, now);
  return schedule.mode === "hora"
    ? hours.includes(schedule.hour)
    : schedule.mode === "turno" && hours.length > 0;
}
export function scheduleLabel(schedule: SchedulePreference) {
  const date = new Intl.DateTimeFormat("es-AR", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(`${schedule.date}T12:00:00Z`));
  const period = periods.find((item) => item.id === schedule.period)!;
  return `${date} · ${schedule.hour || `${period.label} (${period.from}:00–${period.to}:00)`}`;
}
