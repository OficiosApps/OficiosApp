import { isCalendarDate } from "./request-planning.ts";
import { categorias, ciudades } from "./mock-data.ts";
import { quoteTotal, validateQuote, type QuoteBreakdown } from "./service-operations.ts";

export type CompanyProfile = {
  logoAssetId?: string;
  name: string;
  email: string;
  phone: string;
  cityId: string;
  description: string;
  categories: string[];
  radiusKm: number;
  urgent: boolean;
};
export type CompanyMember = {
  id: string;
  name: string;
  email: string;
  category: string;
  available: boolean;
};
export type CompanyJobStatus = "nueva" | "presupuestada" | "confirmada" | "en-curso" | "finalizada";
export type CompanyJob = {
  responsibleId?: string;
  schedule?: { date: string; time: string; minutes: number };
  breakdown?: QuoteBreakdown;
  pendingBreakdown?: QuoteBreakdown;
  id: string;
  title: string;
  client: string;
  category: string;
  cityId: string;
  zone: string;
  status: CompanyJobStatus;
  amount: number | null;
  memberId: string | null;
};
export type CompanyDemo = {
  version: 1;
  profile: CompanyProfile;
  members: CompanyMember[];
  jobs: CompanyJob[];
};

export function validateCompanyProfile(profile: CompanyProfile): CompanyProfile {
  const name = profile.name.trim();
  const email = profile.email.trim().toLowerCase();
  if (name.length < 2) throw new Error("Ingresá el nombre de la empresa.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new Error("Ingresá un correo válido para la empresa.");
  if (!ciudades.some((city) => city.id === profile.cityId))
    throw new Error("Elegí una ciudad válida.");
  const selected = [...new Set(profile.categories)];
  if (
    !selected.length ||
    selected.some((slug) => !categorias.some((category) => category.slug === slug))
  )
    throw new Error("Elegí al menos un oficio válido.");
  if (!Number.isFinite(profile.radiusKm) || profile.radiusKm < 2 || profile.radiusKm > 50)
    throw new Error("El radio de trabajo debe estar entre 2 y 50 km.");
  return { ...profile, name, email, categories: selected };
}

export function newCompanyDemo(profile: CompanyProfile): CompanyDemo {
  const validated = validateCompanyProfile(profile);
  const titles: Record<string, string> = {
    plomeria: "Reparación de pérdida en la cocina",
    electricidad: "Revisión de tablero eléctrico",
    cerrajeria: "Cambio de cerradura de entrada",
    albanileria: "Reparación de revoque en una pared",
    pintura: "Pintura de dos ambientes",
    jardineria: "Mantenimiento de jardín",
    limpieza: "Limpieza de una casa después de obra",
    gas: "Revisión de instalación de gas",
  };
  return {
    version: 1,
    profile: validated,
    members: [],
    jobs: categorias.map((category, index) => ({
      id: `EMP-${1001 + index}`,
      title: titles[category.slug] ?? category.nombre,
      client: ["María López", "Diego Ruiz", "Ana García", "Pablo Díaz"][index % 4]!,
      category: category.slug,
      cityId: validated.cityId,
      zone: index % 2 ? "Zona norte" : "Centro",
      status: "nueva",
      amount: null,
      memberId: null,
    })),
  };
}

export function initialCompanyDemo(): CompanyDemo {
  const company = newCompanyDemo({
    name: "Soluciones del Oeste",
    email: "contacto@ejemplo.com",
    phone: "",
    cityId: ciudades[0]!.id,
    description:
      "Un equipo de profesionales para resolver instalaciones, reparaciones y mantenimiento. Coordinamos cada trabajo y te acompañamos de principio a fin.",
    categories: ["plomeria", "electricidad"],
    radiusKm: 15,
    urgent: true,
  });
  company.members = [
    {
      id: "empresa-pro-1",
      name: "Martín Suárez",
      email: "martin@ejemplo.com",
      category: "plomeria",
      available: true,
    },
    {
      id: "empresa-pro-2",
      name: "Valentina Gómez",
      email: "valentina@ejemplo.com",
      category: "electricidad",
      available: true,
    },
    {
      id: "empresa-pro-3",
      name: "Lucas Medina",
      email: "lucas@ejemplo.com",
      category: "plomeria",
      available: false,
    },
  ];
  company.jobs[0] = {
    ...company.jobs[0]!,
    status: "confirmada",
    amount: 48000,
    memberId: "empresa-pro-1",
  };
  company.jobs[1] = { ...company.jobs[1]!, status: "presupuestada", amount: 65000 };
  company.jobs.push({
    id: "EMP-1009",
    title: "Instalación de una grifería",
    client: "Florencia Castro",
    category: "plomeria",
    cityId: company.profile.cityId,
    zone: "Centro",
    status: "nueva",
    amount: null,
    memberId: null,
  });
  return company;
}

export function addCompanyMember(
  company: CompanyDemo,
  input: Omit<CompanyMember, "id" | "available">,
  id: string,
): CompanyDemo {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  if (name.length < 2) throw new Error("Ingresá el nombre y apellido del profesional.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Ingresá un correo válido.");
  if (!company.profile.categories.includes(input.category))
    throw new Error("Elegí uno de los oficios activos de tu empresa.");
  if (company.members.some((member) => member.email.toLowerCase() === email))
    throw new Error("Ese correo ya pertenece al equipo.");
  return {
    ...company,
    members: [...company.members, { ...input, id, name, email, available: true }],
  };
}

export function memberIsBusy(company: CompanyDemo, memberId: string, exceptJobId = ""): boolean {
  return company.jobs.some(
    (job) =>
      job.id !== exceptJobId &&
      job.memberId === memberId &&
      ["confirmada", "en-curso"].includes(job.status),
  );
}

export function quoteCompanyJob(company: CompanyDemo, jobId: string, amount: number): CompanyDemo {
  const job = company.jobs.find((item) => item.id === jobId);
  if (!job || job.status !== "nueva")
    throw new Error("Esta solicitud ya no admite un presupuesto nuevo.");
  if (!company.profile.categories.includes(job.category) || job.cityId !== company.profile.cityId)
    throw new Error("La solicitud no corresponde a los servicios o la ciudad de tu empresa.");
  if (!Number.isFinite(amount) || amount < 0.01 || amount > 1_000_000_000)
    throw new Error("Ingresá un monto válido mayor a cero.");
  return {
    ...company,
    jobs: company.jobs.map((item) =>
      item.id === jobId
        ? { ...item, amount: Math.round(amount * 100) / 100, status: "presupuestada" }
        : item,
    ),
  };
}

export function advanceCompanyJob(
  company: CompanyDemo,
  jobId: string,
  verifiedMemberIds: string[] = [],
): CompanyDemo {
  const job = company.jobs.find((item) => item.id === jobId);
  if (!job) throw new Error("No se encontró el trabajo.");
  const next: Partial<Record<CompanyJobStatus, CompanyJobStatus>> = {
    presupuestada: "confirmada",
    confirmada: "en-curso",
    "en-curso": "finalizada",
  };
  const status = next[job.status];
  if (!status) throw new Error("El trabajo no puede avanzar desde este estado.");
  if (job.status === "confirmada") {
    if (!job.memberId || !company.members.some((member) => member.id === job.memberId))
      throw new Error("Asigná un profesional antes de iniciar el trabajo.");
    if (
      company.jobs.some(
        (other) =>
          other.id !== jobId &&
          other.memberId === job.memberId &&
          ["confirmada", "en-curso"].includes(other.status) &&
          !other.schedule,
      ) ||
      (job.schedule && companyScheduleConflict(company, jobId, job.memberId, job.schedule))
    )
      throw new Error("El profesional tiene otro trabajo sin horario o un turno superpuesto.");
    if (!verifiedMemberIds.includes(job.memberId))
      throw new Error(
        "La identidad del profesional debe estar aprobada antes de iniciar el trabajo.",
      );
  }
  if (job.status === "confirmada" && !job.schedule)
    throw new Error("Confirmá un horario en Agenda del equipo antes de iniciar el trabajo.");
  if (job.status === "en-curso" && job.pendingBreakdown)
    throw new Error("El cliente debe decidir el cambio de presupuesto antes de finalizar.");
  return {
    ...company,
    jobs: company.jobs.map((item) => (item.id === jobId ? { ...item, status } : item)),
  };
}

export function assignCompanyJob(
  company: CompanyDemo,
  jobId: string,
  memberId: string,
  verifiedMemberIds: string[] = [],
): CompanyDemo {
  const job = company.jobs.find((item) => item.id === jobId);
  const member = company.members.find((item) => item.id === memberId);
  if (!job || job.status !== "confirmada")
    throw new Error("Sólo podés asignar trabajos confirmados por el cliente.");
  if (!member || !member.available || member.category !== job.category)
    throw new Error("Elegí un profesional disponible del oficio solicitado.");
  if (memberIsBusy(company, memberId, jobId))
    throw new Error("Ese profesional ya tiene un trabajo asignado.");
  if (!verifiedMemberIds.includes(memberId))
    throw new Error(
      "El profesional necesita DNI y selfie aprobados antes de recibir asignaciones.",
    );
  return {
    ...company,
    jobs: company.jobs.map((item) => (item.id === jobId ? { ...item, memberId } : item)),
  };
}

export function companyScheduleConflict(
  company: CompanyDemo,
  jobId: string,
  memberId: string,
  schedule: NonNullable<CompanyJob["schedule"]>,
) {
  const start = Date.parse(`${schedule.date}T${schedule.time}:00-03:00`);
  return company.jobs.some(
    (job) =>
      job.id !== jobId &&
      job.memberId === memberId &&
      job.schedule &&
      ["confirmada", "en-curso"].includes(job.status) &&
      start <
        Date.parse(`${job.schedule.date}T${job.schedule.time}:00-03:00`) +
          job.schedule.minutes * 60000 &&
      start + schedule.minutes * 60000 >
        Date.parse(`${job.schedule.date}T${job.schedule.time}:00-03:00`),
  );
}
export function scheduleCompanyJob(
  company: CompanyDemo,
  jobId: string,
  schedule: NonNullable<CompanyJob["schedule"]>,
  now = Date.now(),
): CompanyDemo {
  const job = company.jobs.find((job) => job.id === jobId);
  const start = Date.parse(`${schedule.date}T${schedule.time}:00-03:00`);
  if (!job || job.status !== "confirmada" || !job.memberId)
    throw new Error("Primero confirmá el presupuesto y asigná un profesional al trabajo.");
  if (
    !isCalendarDate(schedule.date) ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(schedule.time) ||
    !Number.isFinite(start) ||
    start < now ||
    !Number.isInteger(schedule.minutes) ||
    schedule.minutes < 15 ||
    schedule.minutes > 480
  )
    throw new Error("Elegí un turno futuro de 15 a 480 minutos.");
  if (companyScheduleConflict(company, jobId, job.memberId, schedule))
    throw new Error("El horario se superpone con otro trabajo del profesional.");
  return {
    ...company,
    jobs: company.jobs.map((item) => (item.id === jobId ? { ...item, schedule } : item)),
  };
}
export function setCompanyResponsible(
  company: CompanyDemo,
  jobId: string,
  memberId: string,
): CompanyDemo {
  if (!company.members.some((member) => member.id === memberId))
    throw new Error("El responsable debe pertenecer a la empresa.");
  return {
    ...company,
    jobs: company.jobs.map((job) => (job.id === jobId ? { ...job, responsibleId: memberId } : job)),
  };
}
export function proposeCompanyPriceChange(
  company: CompanyDemo,
  jobId: string,
  values: QuoteBreakdown,
): CompanyDemo {
  const job = company.jobs.find((job) => job.id === jobId);
  if (!job || !["confirmada", "en-curso"].includes(job.status) || job.pendingBreakdown)
    throw new Error("El trabajo no admite revisiones o ya tiene una pendiente.");
  const pendingBreakdown = validateQuote(values);
  return {
    ...company,
    jobs: company.jobs.map((job) => (job.id === jobId ? { ...job, pendingBreakdown } : job)),
  };
}
export function decideCompanyPriceChange(
  company: CompanyDemo,
  jobId: string,
  accept: boolean,
): CompanyDemo {
  const job = company.jobs.find((job) => job.id === jobId);
  if (!job?.pendingBreakdown) throw new Error("No hay cambios pendientes.");
  return {
    ...company,
    jobs: company.jobs.map((item) => {
      if (item.id !== jobId) return item;
      const { pendingBreakdown, ...previous } = item;
      return accept
        ? { ...previous, amount: quoteTotal(pendingBreakdown!), breakdown: pendingBreakdown! }
        : previous;
    }),
  };
}
export function isCompanyDemo(value: unknown): value is CompanyDemo {
  if (!value || typeof value !== "object") return false;
  const data = value as CompanyDemo;
  try {
    if (data.version !== 1 || !Array.isArray(data.members) || !Array.isArray(data.jobs))
      return false;
    const p = data.profile;
    if (
      !p ||
      typeof p.name !== "string" ||
      typeof p.email !== "string" ||
      typeof p.phone !== "string" ||
      typeof p.description !== "string" ||
      typeof p.urgent !== "boolean" ||
      !Array.isArray(p.categories)
    )
      return false;
    validateCompanyProfile(p);
    return (
      data.members.every(
        (m) =>
          typeof m.id === "string" &&
          typeof m.name === "string" &&
          typeof m.email === "string" &&
          typeof m.available === "boolean" &&
          categorias.some((c) => c.slug === m.category),
      ) &&
      data.jobs.every(
        (j) =>
          typeof j.id === "string" &&
          typeof j.title === "string" &&
          typeof j.client === "string" &&
          typeof j.zone === "string" &&
          typeof j.cityId === "string" &&
          categorias.some((c) => c.slug === j.category) &&
          ["nueva", "presupuestada", "confirmada", "en-curso", "finalizada"].includes(j.status) &&
          (j.amount === null ||
            (typeof j.amount === "number" && Number.isFinite(j.amount) && j.amount > 0)) &&
          (j.memberId === null || data.members.some((m) => m.id === j.memberId)),
      )
    );
  } catch {
    return false;
  }
}

export function scheduleAndAssignCompanyJob(
  company: CompanyDemo,
  jobId: string,
  memberId: string,
  schedule: NonNullable<CompanyJob["schedule"]>,
  verifiedIds: string[],
  now = Date.now(),
): CompanyDemo {
  const job = company.jobs.find((job) => job.id === jobId);
  const member = company.members.find((member) => member.id === memberId);
  if (
    !job ||
    job.status !== "confirmada" ||
    !member ||
    member.category !== job.category ||
    !member.available ||
    !verifiedIds.includes(memberId)
  )
    throw new Error("Elegí un profesional disponible del oficio con identidad aprobada.");
  if (
    company.jobs.some(
      (other) =>
        other.id !== jobId &&
        other.memberId === memberId &&
        ["confirmada", "en-curso"].includes(other.status) &&
        !other.schedule,
    )
  )
    throw new Error(
      "El integrante tiene otro trabajo sin horario. Agendalo primero para verificar superposiciones.",
    );
  return scheduleCompanyJob(
    {
      ...company,
      jobs: company.jobs.map((item) => (item.id === jobId ? { ...item, memberId } : item)),
    },
    jobId,
    schedule,
    now,
  );
}
