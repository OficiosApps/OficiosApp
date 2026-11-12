/**
 * Datos mockeados del MVP.
 * Nada de esto está atado a Mercedes en la lógica: la ciudad es un registro
 * configurable más, para poder escalar a otras ciudades/provincias/países.
 */

export type Ciudad = {
  id: string;
  nombre: string;
  provincia: string;
  pais: string;
  moneda: string;
  activa: boolean;
};

export const ciudades: Ciudad[] = [
  {
    id: "mercedes-ba",
    nombre: "Mercedes",
    provincia: "Buenos Aires",
    pais: "Argentina",
    moneda: "ARS",
    activa: true,
  },
  {
    id: "lujan-ba",
    nombre: "Luján",
    provincia: "Buenos Aires",
    pais: "Argentina",
    moneda: "ARS",
    activa: false,
  },
  {
    id: "chivilcoy-ba",
    nombre: "Chivilcoy",
    provincia: "Buenos Aires",
    pais: "Argentina",
    moneda: "ARS",
    activa: false,
  },
];

export const ciudadActiva = ciudades[0]!;

export type Categoria = {
  slug: string;
  nombre: string;
  icono: string;
  descripcion: string;
  servicios: string[];
  urgencias: boolean;
};

export const categorias: Categoria[] = [
  {
    slug: "plomeria",
    nombre: "Plomería",
    icono: "Droplets",
    descripcion: "Pérdidas, destapaciones, termotanques e instalaciones de agua.",
    servicios: ["Pérdida de agua", "Destapación de cloacas", "Termotanque", "Instalación de sanitarios"],
    urgencias: true,
  },
  {
    slug: "electricidad",
    nombre: "Electricidad",
    icono: "Zap",
    descripcion: "Tableros, cortocircuitos, iluminación y nuevas bocas.",
    servicios: ["Cortocircuito", "Tablero eléctrico", "Iluminación", "Instalación de bocas"],
    urgencias: true,
  },
  {
    slug: "cerrajeria",
    nombre: "Cerrajería",
    icono: "KeyRound",
    descripcion: "Apertura de puertas, cambio de cerraduras y llaves.",
    servicios: ["Apertura de puerta", "Cambio de cerradura", "Copia de llaves"],
    urgencias: true,
  },
  {
    slug: "albanileria",
    nombre: "Albañilería",
    icono: "Hammer",
    descripcion: "Refacciones, revoques, contrapisos y ampliaciones.",
    servicios: ["Revoque", "Contrapiso", "Ampliación", "Reparación de humedad"],
    urgencias: false,
  },
  {
    slug: "pintura",
    nombre: "Pintura",
    icono: "PaintRoller",
    descripcion: "Interiores, exteriores, frentes y trabajos en altura.",
    servicios: ["Interior", "Exterior", "Frente", "Impermeabilización"],
    urgencias: false,
  },
  {
    slug: "jardineria",
    nombre: "Jardinería",
    icono: "Sprout",
    descripcion: "Corte de césped, poda, parquización y mantenimiento.",
    servicios: ["Corte de césped", "Poda", "Parquización", "Mantenimiento mensual"],
    urgencias: false,
  },
  {
    slug: "limpieza",
    nombre: "Limpieza",
    icono: "Sparkles",
    descripcion: "Limpieza profunda, fin de obra y mantenimiento periódico.",
    servicios: ["Limpieza profunda", "Fin de obra", "Periódica"],
    urgencias: false,
  },
  {
    slug: "gas",
    nombre: "Gasista matriculado",
    icono: "Flame",
    descripcion: "Instalaciones, pruebas de hermeticidad y certificaciones.",
    servicios: ["Instalación", "Prueba de hermeticidad", "Certificación"],
    urgencias: true,
  },
];

export type Verificacion = "identidad" | "domicilio" | "matricula" | "antecedentes" | "telefono";

export type Profesional = {
  id: string;
  nombre: string;
  oficio: string;
  categorias: string[];
  ciudadId: string;
  barrio: string;
  radioKm: number;
  distanciaKm: number;
  rating: number;
  reseñas: number;
  trabajosCompletados: number;
  desde: number;
  respuestaMin: number;
  estado: "disponible" | "ocupado" | "fuera-de-horario";
  urgencias: boolean;
  precioVisita: number;
  precioHora: number;
  verificaciones: Verificacion[];
  descripcion: string;
  horarios: string;
  iniciales: string;
};

export const profesionales: Profesional[] = [
  {
    id: "pro-1",
    nombre: "Gustavo Ferreyra",
    oficio: "Plomero matriculado",
    categorias: ["plomeria", "gas"],
    ciudadId: "mercedes-ba",
    barrio: "Centro",
    radioKm: 15,
    distanciaKm: 1.2,
    rating: 4.9,
    reseñas: 128,
    trabajosCompletados: 214,
    desde: 2019,
    respuestaMin: 6,
    estado: "disponible",
    urgencias: true,
    precioVisita: 12000,
    precioHora: 18000,
    verificaciones: ["identidad", "domicilio", "matricula", "telefono"],
    descripcion:
      "Plomero y gasista matriculado. Trabajo con urgencias las 24 h en Mercedes y alrededores. Presupuesto sin cargo antes de empezar.",
    horarios: "Lun a Sáb 7:00–20:00 · Urgencias 24 h",
    iniciales: "GF",
  },
  {
    id: "pro-2",
    nombre: "Mariana Sosa",
    oficio: "Electricista",
    categorias: ["electricidad"],
    ciudadId: "mercedes-ba",
    barrio: "Barrio Belgrano",
    radioKm: 12,
    distanciaKm: 2.8,
    rating: 4.8,
    reseñas: 96,
    trabajosCompletados: 173,
    desde: 2020,
    respuestaMin: 11,
    estado: "disponible",
    urgencias: true,
    precioVisita: 10000,
    precioHora: 16500,
    verificaciones: ["identidad", "domicilio", "matricula", "antecedentes", "telefono"],
    descripcion:
      "Instalaciones domiciliarias y comerciales. Certificados de instalación y garantía escrita de 6 meses en cada trabajo.",
    horarios: "Lun a Vie 8:00–19:00 · Sáb 9:00–14:00",
    iniciales: "MS",
  },
  {
    id: "pro-3",
    nombre: "Hernán Quiroga",
    oficio: "Albañil",
    categorias: ["albanileria", "pintura"],
    ciudadId: "mercedes-ba",
    barrio: "Villa Sarmiento",
    radioKm: 25,
    distanciaKm: 4.5,
    rating: 4.6,
    reseñas: 54,
    trabajosCompletados: 61,
    desde: 2017,
    respuestaMin: 45,
    estado: "ocupado",
    urgencias: false,
    precioVisita: 0,
    precioHora: 14000,
    verificaciones: ["identidad", "domicilio", "telefono"],
    descripcion:
      "Equipo de 3 personas para refacciones y ampliaciones. Presupuesto detallado por etapas, materiales aparte.",
    horarios: "Lun a Vie 7:30–17:30",
    iniciales: "HQ",
  },
  {
    id: "pro-4",
    nombre: "Lucía Benítez",
    oficio: "Pintora",
    categorias: ["pintura"],
    ciudadId: "mercedes-ba",
    barrio: "Centro",
    radioKm: 10,
    distanciaKm: 0.9,
    rating: 5,
    reseñas: 37,
    trabajosCompletados: 44,
    desde: 2021,
    respuestaMin: 18,
    estado: "disponible",
    urgencias: false,
    precioVisita: 0,
    precioHora: 12000,
    verificaciones: ["identidad", "telefono"],
    descripcion:
      "Pintura de interiores y exteriores con terminaciones prolijas. Cubro muebles y dejo todo limpio al finalizar.",
    horarios: "Lun a Sáb 8:00–18:00",
    iniciales: "LB",
  },
  {
    id: "pro-5",
    nombre: "Ramiro Ledesma",
    oficio: "Cerrajero",
    categorias: ["cerrajeria"],
    ciudadId: "mercedes-ba",
    barrio: "Barrio Norte",
    radioKm: 20,
    distanciaKm: 3.4,
    rating: 4.7,
    reseñas: 211,
    trabajosCompletados: 402,
    desde: 2015,
    respuestaMin: 4,
    estado: "disponible",
    urgencias: true,
    precioVisita: 9000,
    precioHora: 15000,
    verificaciones: ["identidad", "domicilio", "antecedentes", "telefono"],
    descripcion: "Aperturas sin daño y cambio de cerraduras. Atiendo urgencias todos los días, también de noche.",
    horarios: "Todos los días · Urgencias 24 h",
    iniciales: "RL",
  },
  {
    id: "pro-6",
    nombre: "Carlos Ojeda",
    oficio: "Jardinero",
    categorias: ["jardineria"],
    ciudadId: "mercedes-ba",
    barrio: "Barrio Los Aromos",
    radioKm: 18,
    distanciaKm: 6.1,
    rating: 4.5,
    reseñas: 42,
    trabajosCompletados: 88,
    desde: 2018,
    respuestaMin: 60,
    estado: "fuera-de-horario",
    urgencias: false,
    precioVisita: 0,
    precioHora: 9500,
    verificaciones: ["identidad", "telefono"],
    descripcion: "Mantenimiento mensual de jardines y parques. Corte, bordeado, poda y retiro de residuos.",
    horarios: "Lun a Vie 7:00–16:00",
    iniciales: "CO",
  },
  {
    id: "pro-7",
    nombre: "Silvana Rivas",
    oficio: "Limpieza profesional",
    categorias: ["limpieza"],
    ciudadId: "mercedes-ba",
    barrio: "Centro",
    radioKm: 12,
    distanciaKm: 1.8,
    rating: 4.9,
    reseñas: 73,
    trabajosCompletados: 152,
    desde: 2019,
    respuestaMin: 25,
    estado: "disponible",
    urgencias: false,
    precioVisita: 0,
    precioHora: 8500,
    verificaciones: ["identidad", "domicilio", "antecedentes", "telefono"],
    descripcion: "Limpieza profunda de casas, oficinas y fin de obra. Equipo propio de insumos y máquinas.",
    horarios: "Lun a Sáb 8:00–17:00",
    iniciales: "SR",
  },
  {
    id: "pro-8",
    nombre: "Daniel Peralta",
    oficio: "Gasista matriculado",
    categorias: ["gas", "plomeria"],
    ciudadId: "mercedes-ba",
    barrio: "Barrio Sarmiento",
    radioKm: 30,
    distanciaKm: 5.2,
    rating: 4.8,
    reseñas: 64,
    trabajosCompletados: 97,
    desde: 2016,
    respuestaMin: 15,
    estado: "disponible",
    urgencias: true,
    precioVisita: 13000,
    precioHora: 19000,
    verificaciones: ["identidad", "domicilio", "matricula", "telefono"],
    descripcion: "Matriculado categoría 1. Pruebas de hermeticidad, planos y certificaciones para habilitaciones.",
    horarios: "Lun a Vie 8:00–18:00 · Sáb a demanda",
    iniciales: "DP",
  },
];

export const etiquetaVerificacion: Record<Verificacion, string> = {
  identidad: "Identidad verificada",
  domicilio: "Domicilio verificado",
  matricula: "Matrícula verificada",
  antecedentes: "Antecedentes chequeados",
  telefono: "Teléfono verificado",
};

export const etiquetaEstado: Record<Profesional["estado"], string> = {
  disponible: "Disponible ahora",
  ocupado: "Con agenda ocupada",
  "fuera-de-horario": "Fuera de horario",
};

export type Reseña = {
  id: string;
  profesionalId: string;
  cliente: string;
  rating: number;
  fecha: string;
  servicio: string;
  texto: string;
};

export const reseñas: Reseña[] = [
  {
    id: "r-1",
    profesionalId: "pro-1",
    cliente: "Ana M.",
    rating: 5,
    fecha: "hace 3 días",
    servicio: "Pérdida de agua",
    texto: "Vino en menos de una hora un domingo. Detectó la pérdida, la arregló y dejó todo limpio.",
  },
  {
    id: "r-2",
    profesionalId: "pro-1",
    cliente: "Jorge P.",
    rating: 5,
    fecha: "hace 2 semanas",
    servicio: "Termotanque",
    texto: "Cambió el termotanque en el día y respetó el presupuesto que había pasado por la app.",
  },
  {
    id: "r-3",
    profesionalId: "pro-2",
    cliente: "Vanina R.",
    rating: 5,
    fecha: "hace 5 días",
    servicio: "Tablero eléctrico",
    texto: "Explicó todo con paciencia, dejó el tablero rotulado y me pasó el certificado.",
  },
  {
    id: "r-4",
    profesionalId: "pro-3",
    cliente: "Marcelo T.",
    rating: 4,
    fecha: "hace 1 mes",
    servicio: "Ampliación",
    texto: "Buen trabajo y prolijo. Se demoró unos días más de lo previsto por la lluvia.",
  },
  {
    id: "r-5",
    profesionalId: "pro-5",
    cliente: "Rocío D.",
    rating: 5,
    fecha: "hace 6 días",
    servicio: "Apertura de puerta",
    texto: "Me quedé afuera a las 2 de la mañana y en 20 minutos estaba adentro, sin daños.",
  },
];

export type Presupuesto = {
  id: string;
  profesionalId: string;
  monto: number;
  incluyeMateriales: boolean;
  disponibilidad: string;
  garantiaMeses: number;
  mensaje: string;
  enviadoHace: string;
  estado: "pendiente" | "aceptado" | "rechazado";
};

export const presupuestos: Presupuesto[] = [
  {
    id: "pp-1",
    profesionalId: "pro-1",
    monto: 46000,
    incluyeMateriales: true,
    disponibilidad: "Hoy entre 16:00 y 18:00",
    garantiaMeses: 6,
    mensaje:
      "Por lo que describís parece la unión del flexible. Llevo repuestos, si es otra cosa te aviso antes de tocar nada.",
    enviadoHace: "hace 8 min",
    estado: "pendiente",
  },
  {
    id: "pp-2",
    profesionalId: "pro-8",
    monto: 39000,
    incluyeMateriales: false,
    disponibilidad: "Mañana 9:00",
    garantiaMeses: 3,
    mensaje: "Puedo pasar mañana temprano. Materiales los compro y te los facturo aparte con el ticket.",
    enviadoHace: "hace 22 min",
    estado: "pendiente",
  },
  {
    id: "pp-3",
    profesionalId: "pro-2",
    monto: 52000,
    incluyeMateriales: true,
    disponibilidad: "Hoy 20:00",
    garantiaMeses: 6,
    mensaje: "Voy con equipo de detección para no romper de más. Incluye la reparación y el revoque fino.",
    enviadoHace: "hace 41 min",
    estado: "pendiente",
  },
];

export type SolicitudDemo = {
  id: string;
  categoriaSlug: string;
  servicio: string;
  tipo: "urgente" | "planificado";
  descripcion: string;
  direccion: string;
  creadaHace: string;
  estado: "abierta" | "contratada" | "en-curso" | "finalizada";
  vistas: number;
};

export const solicitudDemo: SolicitudDemo = {
  id: "SOL-1042",
  categoriaSlug: "plomeria",
  servicio: "Pérdida de agua",
  tipo: "urgente",
  descripcion:
    "Pierde agua debajo de la pileta de la cocina desde anoche. Cerré la llave de paso general. Casa de una planta, barrio Centro.",
  direccion: "Av. 29 y calle 14, Centro, Mercedes",
  creadaHace: "hace 52 min",
  estado: "abierta",
  vistas: 14,
};

export type MensajeChat = {
  id: string;
  autor: "cliente" | "profesional";
  texto: string;
  hora: string;
};

export const chatDemo: MensajeChat[] = [
  { id: "m-1", autor: "profesional", texto: "Hola, vi tu solicitud. ¿La pérdida es constante o sólo al abrir el agua?", hora: "14:02" },
  { id: "m-2", autor: "cliente", texto: "Constante, aunque cierre la canilla sigue goteando.", hora: "14:04" },
  { id: "m-3", autor: "profesional", texto: "Perfecto. Te paso presupuesto con materiales incluidos y puedo pasar hoy a las 16.", hora: "14:05" },
];

export type SolicitudEntrante = {
  id: string;
  servicio: string;
  tipo: "urgente" | "planificado";
  zona: string;
  distanciaKm: number;
  hace: string;
  presupuestosEnviados: number;
};

export const solicitudesEntrantes: SolicitudEntrante[] = [
  { id: "SOL-1042", servicio: "Pérdida de agua", tipo: "urgente", zona: "Centro", distanciaKm: 1.1, hace: "hace 52 min", presupuestosEnviados: 3 },
  { id: "SOL-1039", servicio: "Termotanque no calienta", tipo: "urgente", zona: "B. Belgrano", distanciaKm: 2.4, hace: "hace 3 h", presupuestosEnviados: 5 },
  { id: "SOL-1031", servicio: "Instalación de sanitarios", tipo: "planificado", zona: "B. Norte", distanciaKm: 3.9, hace: "ayer", presupuestosEnviados: 2 },
  { id: "SOL-1028", servicio: "Destapación de cloacas", tipo: "urgente", zona: "V. Sarmiento", distanciaKm: 4.6, hace: "ayer", presupuestosEnviados: 4 },
];

export type TrabajoPro = {
  id: string;
  cliente: string;
  servicio: string;
  fecha: string;
  monto: number;
  estado: "agendado" | "en-curso" | "finalizado" | "a-cobrar";
};

export const trabajosPro: TrabajoPro[] = [
  { id: "TR-881", cliente: "Ana M.", servicio: "Pérdida de agua", fecha: "Hoy 16:00", monto: 46000, estado: "agendado" },
  { id: "TR-878", cliente: "Jorge P.", servicio: "Cambio de termotanque", fecha: "Ayer", monto: 165000, estado: "a-cobrar" },
  { id: "TR-874", cliente: "Estudio Ramos", servicio: "Instalación baño", fecha: "12/08", monto: 240000, estado: "finalizado" },
  { id: "TR-870", cliente: "Norma S.", servicio: "Destapación", fecha: "09/08", monto: 38000, estado: "finalizado" },
];

export const metricasAdmin = {
  solicitudes7d: 186,
  contratacionesMes: 74,
  tasaRespuesta: 0.82,
  tiempoPrimeraRespuesta: "9 min",
  profesionalesActivos: 48,
  verificacionesPendientes: 6,
  ratingPromedio: 4.7,
  valorContratacionesMes: 4820000,
};

export const verificacionesPendientes = [
  { id: "V-21", profesional: "Néstor Ayala", oficio: "Electricista", documento: "Matrícula municipal", enviado: "hace 2 h" },
  { id: "V-22", profesional: "Paola Giménez", oficio: "Limpieza", documento: "DNI (dorso)", enviado: "hace 5 h" },
  { id: "V-23", profesional: "Ezequiel Bravo", oficio: "Gasista", documento: "Matrícula cat. 1", enviado: "ayer" },
  { id: "V-24", profesional: "Sergio Molina", oficio: "Albañil", documento: "Comprobante de domicilio", enviado: "ayer" },
  { id: "V-25", profesional: "Lorena Vera", oficio: "Jardinería", documento: "DNI (frente)", enviado: "hace 2 días" },
  { id: "V-26", profesional: "Iván Duarte", oficio: "Cerrajería", documento: "Certificado antecedentes", enviado: "hace 3 días" },
];

export const embudo = [
  { etapa: "Solicitudes creadas", valor: 186 },
  { etapa: "Con al menos 1 presupuesto", valor: 152 },
  { etapa: "Con profesional contratado", valor: 74 },
  { etapa: "Trabajos finalizados", valor: 61 },
  { etapa: "Con reseña verificada", valor: 47 },
];

export function formatARS(monto: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: ciudadActiva.moneda,
    maximumFractionDigits: 0,
  }).format(monto);
}

export function getCategoria(slug: string) {
  return categorias.find((c) => c.slug === slug);
}

export function getProfesional(id: string) {
  return profesionales.find((p) => p.id === id);
}

export function profesionalesPorCategoria(slug: string) {
  return profesionales.filter((p) => p.categorias.includes(slug));
}

export function reseñasDe(profesionalId: string) {
  return reseñas.filter((r) => r.profesionalId === profesionalId);
}

/* ── Superadmin ──────────────────────────────────────────────────────────── */

export type RolPlataforma = "superadmin" | "admin-ciudad" | "soporte" | "verificador";

export type UsuarioEquipo = {
  id: string;
  nombre: string;
  email: string;
  rol: RolPlataforma;
  ciudadId: string | "todas";
  estado: "activo" | "suspendido" | "invitado";
  ultimoAcceso: string;
};

export const etiquetaRol: Record<RolPlataforma, string> = {
  superadmin: "Superadmin",
  "admin-ciudad": "Admin de ciudad",
  soporte: "Soporte",
  verificador: "Verificador",
};

export const equipoPlataforma: UsuarioEquipo[] = [
  {
    id: "U-1",
    nombre: "Tadeo Acuña",
    email: "tadeo@oficios.app",
    rol: "superadmin",
    ciudadId: "todas",
    estado: "activo",
    ultimoAcceso: "hace 5 min",
  },
  {
    id: "U-2",
    nombre: "Camila Ríos",
    email: "camila@oficios.app",
    rol: "admin-ciudad",
    ciudadId: "mercedes-ba",
    estado: "activo",
    ultimoAcceso: "hace 2 h",
  },
  {
    id: "U-3",
    nombre: "Bruno Lezcano",
    email: "bruno@oficios.app",
    rol: "verificador",
    ciudadId: "mercedes-ba",
    estado: "activo",
    ultimoAcceso: "ayer",
  },
  {
    id: "U-4",
    nombre: "Julieta Peralta",
    email: "julieta@oficios.app",
    rol: "soporte",
    ciudadId: "todas",
    estado: "invitado",
    ultimoAcceso: "sin ingresar",
  },
  {
    id: "U-5",
    nombre: "Diego Maidana",
    email: "diego@oficios.app",
    rol: "admin-ciudad",
    ciudadId: "lujan-ba",
    estado: "suspendido",
    ultimoAcceso: "hace 21 días",
  },
];

export type FeatureFlag = {
  key: string;
  nombre: string;
  descripcion: string;
  activo: boolean;
  alcance: "global" | "por-ciudad";
};

export const featureFlags: FeatureFlag[] = [
  {
    key: "urgencias_24h",
    nombre: "Urgencias 24 h",
    descripcion: "Permite pedidos urgentes fuera del horario habitual con recargo.",
    activo: true,
    alcance: "por-ciudad",
  },
  {
    key: "pago_en_plataforma",
    nombre: "Pago dentro de la plataforma",
    descripcion: "Cobro del trabajo con retención de comisión automática.",
    activo: false,
    alcance: "global",
  },
  {
    key: "chat_archivos",
    nombre: "Archivos en el chat",
    descripcion: "Enviar fotos y documentos en la conversación de la solicitud.",
    activo: true,
    alcance: "global",
  },
  {
    key: "reseñas_publicas",
    nombre: "Reseñas públicas",
    descripcion: "Mostrar reseñas verificadas en el perfil público del profesional.",
    activo: true,
    alcance: "global",
  },
  {
    key: "onboarding_automatico",
    nombre: "Alta automática de profesionales",
    descripcion: "Publicar el perfil sin revisión manual cuando las verificaciones son OK.",
    activo: false,
    alcance: "por-ciudad",
  },
];

export type ConfigComercial = {
  comisionPorcentaje: number;
  cargoVisitaMinimo: number;
  radioMaximoKm: number;
  presupuestosPorSolicitud: number;
};

export const configComercial: ConfigComercial = {
  comisionPorcentaje: 12,
  cargoVisitaMinimo: 8000,
  radioMaximoKm: 30,
  presupuestosPorSolicitud: 4,
};

export type EventoAuditoria = {
  id: string;
  actor: string;
  accion: string;
  objetivo: string;
  fecha: string;
  criticidad: "info" | "alta";
};

export const auditoria: EventoAuditoria[] = [
  { id: "A-901", actor: "camila@oficios.app", accion: "Aprobó verificación de matrícula", objetivo: "V-19 · Néstor Ayala", fecha: "hoy 11:42", criticidad: "info" },
  { id: "A-900", actor: "tadeo@oficios.app", accion: "Cambió comisión de la plataforma", objetivo: "10% → 12%", fecha: "hoy 09:15", criticidad: "alta" },
  { id: "A-898", actor: "bruno@oficios.app", accion: "Suspendió profesional por reclamos", objetivo: "pro-7 · Damián Ocampo", fecha: "ayer 18:30", criticidad: "alta" },
  { id: "A-895", actor: "tadeo@oficios.app", accion: "Invitó usuario al equipo", objetivo: "julieta@oficios.app (soporte)", fecha: "ayer 16:02", criticidad: "info" },
  { id: "A-890", actor: "sistema", accion: "Reintento de notificaciones push", objetivo: "38 dispositivos", fecha: "12/08 22:10", criticidad: "info" },
];

export const saludSistema = [
  { servicio: "API de solicitudes", estado: "ok" as const, detalle: "Latencia p95 210 ms" },
  { servicio: "Notificaciones push", estado: "degradado" as const, detalle: "3,1% de fallas en envíos" },
  { servicio: "Verificación de identidad", estado: "ok" as const, detalle: "Cola: 6 documentos" },
  { servicio: "Buscador y geolocalización", estado: "ok" as const, detalle: "Índice actualizado hace 4 min" },
];

export type LiquidezCiudad = {
  ciudadId: string;
  estado: string;
  profesionales: number;
  clientes: number;
  solicitudes: number;
  trabajos: number;
};

export const liquidezPorCiudad: LiquidezCiudad[] = [
  { ciudadId: "mercedes-ba", estado: "Activa", profesionales: 124, clientes: 1240, solicitudes: 680, trabajos: 420 },
  { ciudadId: "lujan-ba", estado: "Preparada", profesionales: 0, clientes: 0, solicitudes: 0, trabajos: 0 },
  { ciudadId: "chivilcoy-ba", estado: "Preparada", profesionales: 0, clientes: 0, solicitudes: 0, trabajos: 0 },
];

export type Incidente = {
  id: string;
  tipo: "Profesional reportado" | "Cliente reportado" | "Problema de contratación" | "Verificación fallida" | "Error de pago" | "Problema técnico" | "Reclamo";
  severidad: "crítico" | "alto" | "medio" | "bajo";
  descripcion: string;
  reportadoHace: string;
};

export const incidentesAbiertos: Incidente[] = [];

export const metricasSuperadmin = {
  valorContratacionesAcumulado: 18740000,
  trabajosCompletadosTotal: 420,
  ciudadesActivas: 1,
  ciudadesPreparadas: 2,
  usuariosPlataforma: 5,
  incidentesAbiertos: 0,
};
