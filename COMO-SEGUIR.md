# Cómo seguir trabajando con esta carpeta

Proyecto: marketplace transaccional de oficios (PWA instalable, frontend con datos simulados).
Stack: TanStack Start v1 (React 19) + Vite + Tailwind CSS v4 + shadcn/ui + lucide-react.

## 1. Instalar y correr

```sh
bun install     # o: npm install
bun run dev     # o: npm run dev
```

La consola imprime la dirección local (por ejemplo `http://localhost:5173`).

## 2. Comandos útiles

| Comando | Qué hace |
| --- | --- |
| `bun run dev` | Levanta el sitio en local con recarga en caliente. |
| `bun run build` | Compila el sitio. Deja HTML estático en `dist/` (27 rutas prerenderizadas) listo para Netlify Drop u otro host estático. |
| `bun run preview` | Sirve la compilación para revisarla. |
| `bun run lint` | Revisa el código con ESLint. |
| `bun run format` | Formatea el código con Prettier. |

## 3. Dónde está cada cosa

- `src/lib/mock-data.ts` — todos los datos: ciudades, categorías, profesionales, verificaciones, reseñas, presupuestos, solicitudes, métricas de admin y superadmin. Cambiá acá para probar.
- `src/routes/` — una pantalla por archivo:
  - `index.tsx` (home), `categorias.index.tsx`, `categorias.$slug.tsx`, `solicitud.tsx` (pedido en 3 pasos), `solicitudes.$id.tsx` (seguimiento, presupuestos y chat), `profesionales.$id.tsx`, `como-funciona.tsx`, `panel-profesional.tsx`, `admin.tsx`, `superadmin.tsx`.
- `src/components/` — piezas propias: `site-header.tsx`, `site-footer.tsx`, `pro-card.tsx`. En `src/components/ui/` están los componentes de shadcn/ui.
- `src/styles.css` — tokens de color (OKLCH), fuentes y utilidades visuales. Los colores de la marca se cambian acá.
- `src/router.tsx` — configuración del enrutador.
- `src/routeTree.gen.ts` — se genera solo al crear o renombrar rutas: no lo edites a mano.
- `vite.config.ts` — prerenderizado estático y entrada del servidor.
- `public/` — manifest, íconos, service worker y pantalla offline (lo que hace que se pueda instalar como app).

## 4. Reglas del producto (para no romperlas)

- Marketplace transaccional, no un directorio de contacto.
- Piloto en Mercedes (Buenos Aires), pero la ciudad es un dato configurable: no hardcodear la ciudad en la lógica.
- Todo el texto en español rioplatense (voseo).
- Los tres pilares: confianza (verificaciones), cercanía (radio y distancia) y rapidez (disponibilidad y tiempo de respuesta).
- Las reseñas sólo pueden provenir de trabajos contratados y finalizados dentro de la plataforma.
- Debe seguir siendo responsive e instalable (PWA): manifest, service worker y pantalla offline.
- MVP sin cobros obligatorios: no mostrar cifras que la plataforma no puede conocer realmente (por eso se dice "valor total de contrataciones", no GMV).

## 5. Estado actual

Las pantallas del marketplace todavía usan datos de `src/lib/mock-data.ts` y almacenamiento local de demostración. El chat tiene un endpoint de servidor separado, preparado para OpenAI cuando se configure su clave.
El siguiente paso para el marketplace es reemplazar sus lecturas simuladas por una API real, dejando las mismas formas de datos.

## 6. Demostración de altas del equipo

- `/equipo` permite probar el alta y primer ingreso de superadministradores y administradores.
- Sólo un CEO invita superadministradores; sólo un superadministrador invita administradores. Un administrador no da altas al equipo.
- La persona invitada no elige su correo ni su rol. El administrador recibe una ciudad asignada.
- Es una simulación visual: las invitaciones viven en `localStorage` de ese navegador, no se envían correos y no hay autenticación real ni autorización de servidor. Los paneles anteriores siguen siendo pantallas de ejemplo.
- Las contraseñas ingresadas son ficticias: no se guardan ni se envían. La demo permite activar, revocar y vencer invitaciones y reiniciarlas.
- La lógica del flujo está en `src/lib/team-demo.ts`. Sus pruebas se ejecutan con `node --test tests/team-demo.test.mjs` usando Node 24.

## 7. Panel de empresas de oficios

- `/panel-empresa` tiene un resumen de operación, solicitudes y trabajos, equipo de profesionales, servicios por oficio y perfil de empresa con vista previa.
- Una empresa puede ofrecer cualquiera de los ocho oficios, o varios a la vez. Los nuevos pedidos de ejemplo se filtran por oficios activos y ciudad configurada.
- El responsable puede agregar prestadores, indicar su oficio y disponibilidad, preparar presupuestos, simular la aceptación del cliente, asignar un profesional e iniciar/finalizar el trabajo.
- Sólo se asignan trabajos confirmados a un profesional disponible del oficio correspondiente y sin otro trabajo asignado/en curso. Pausar un servicio conserva los trabajos ya contratados.
- Los prestadores de una empresa no son los administradores de plataforma: se conserva la jerarquía CEO → superadministrador → administrador.
- Es una demostración con `localStorage`, sin cuentas, envíos ni contrataciones reales. Crear otra empresa reemplaza el ejemplo de ese navegador. La vista previa del perfil no publica una ficha en el catálogo de clientes.
- Modelo y validaciones: `src/lib/company-demo.ts`; pruebas: `node --test tests/company-demo.test.mjs` en Node 24.

## 8. Logos e identidad obligatoria

- El perfil de empresa permite subir un logo JPG/PNG/WEBP de hasta 2 MB y quitarlo. Se ve en la cabecera y vista previa una vez guardado el perfil.
- Los profesionales independientes y los integrantes de empresas deben completar número de DNI (7–8 dígitos), fotos del frente y dorso y selfie, y autorizar la revisión. Cada imagen admite JPG/PNG/WEBP de hasta 5 MB, mínimo 100 × 100 px; la selfie usa captura frontal cuando el dispositivo lo admite.
- Cargar archivos deja el estado pendiente; no aprueba la identidad. En Administración → DNI y selfie se revisa la carga local y se aprueba o pide una nueva carga con motivo. Sin aprobación no se habilita disponibilidad, envío de presupuestos individuales ni nuevas asignaciones/inicio de trabajos en empresas.
- La demo NO valida autenticidad del DNI, coincidencia facial ni prueba de vida. Usar imágenes ficticias. No es un sistema de identidad de producción.
- Fotos y número de DNI se guardan únicamente en IndexedDB del navegador, sin enviarse a un servidor ni guardarse en localStorage. La carga puede eliminarse, lo que quita sus tres imágenes y revoca la habilitación local. Los perfiles públicos nunca muestran documentos ni selfies.
- Las fotos de un logo también se guardan en IndexedDB; localStorage sólo conserva la referencia del logo. No se sincronizan entre dispositivos.
- Para producción hacen falta autenticación/autorización de servidor, almacenamiento privado y un proceso real de verificación; los paneles siguen siendo demostraciones.
- Pruebas: `node --test tests/*.test.mjs`. Las pruebas de almacenamiento usan fake-indexeddb y un decodificador de imágenes simulado; no reemplazan pruebas de cámara y navegador.

## 9. Chat de ayuda con IA de OpenAI

- El botón flotante Ayuda IA abre el chat en cualquier pantalla. Incluye consultas rápidas, conversación con contexto, reintento, nueva conversación y accesos a las pantallas de Oficios.
- Las respuestas se solicitan al servidor en `/api/chat`, que llama a OpenAI Responses API con `gpt-4.1-mini` por defecto. No se reemplazan errores ni falta de clave por respuestas prefabricadas que parezcan IA.
- Configurar `OPENAI_API_KEY` como secreto de servidor mediante OpenAI Developers y Sites. Nunca pegarla en el chat ni usar una variable `VITE_`. `OPENAI_MODEL` es opcional. `.env.example` documenta sólo los nombres.
- Sin clave, `/api/chat/status` devuelve `configured: false` y la interfaz indica pendiente de activación. No se hacen llamadas de pago hasta configurar una clave. ChatGPT y el consumo de API tienen facturación separada.
- Sólo se envía el texto del chat (hasta 12 mensajes con límites de longitud); nunca se leen automáticamente DNI, fotos, localStorage o IndexedDB. El historial se conserva sólo en memoria de la pestaña. OpenAI recibe `store: false`; esto no sustituye sus políticas de tratamiento de datos.
- El asistente conoce los flujos de demostración y no tiene herramientas para contratar, modificar cuentas, revisar identidad ni acceder a pedidos reales.
- La API requiere la identidad proporcionada por Sites y el mismo origen. Tiene tiempo límite, límite de entrada y control de ráfagas por usuario en memoria del Worker (no es una cuota distribuida permanente). Se conserva el acceso privado del sitio.
- El sitio se publica ahora como Worker ESM: `npm run build:site` compila la app y empaqueta sus archivos estáticos en `dist/server/index.js`, junto con la API. Se conserva `.output/public` para exportación estática a Netlify, pero una subida estática por sí sola no ejecuta la API de chat.
- Para comprobar el paquete completo: `npm run build:site` y `node --test tests/*.test.mjs`. Las pruebas de OpenAI usan respuestas simuladas; hace falta una clave autorizada para comprobar una respuesta real.

## 10. Vista de métodos de pago

- `/metodos-de-pago`, accesible desde Pagos y desde el panel profesional, permite al profesional de ejemplo guardar sus preferencias de cobro: transferencia, billetera, efectivo y enlace HTTPS. Permite elegir el preferido y eliminar métodos.
- Usa datos ficticios y almacenamiento local; no conecta cuentas, cobra, verifica titularidad ni guarda tarjetas/CVV/claves. La configuración del asistente OpenAI es independiente.

## 11. Solicitudes con fotos y agenda semanal

- La descripción del paso Detalle es opcional, sin longitud mínima. Se agregó la pestaña Subir fotos, hasta tres imágenes JPG/PNG/WEBP de hasta 5 MB, con vista previa y eliminación, guardadas en IndexedDB.
- Planificado abre una agenda semanal con navegación por ocho semanas y turnos Mañana (8–12), Tarde (12–18), Noche (18–22). Se puede elegir una hora puntual. Se descartan fechas/horas pasadas usando America/Buenos_Aires.
- La selección es una preferencia que requiere confirmación del profesional, no una reserva efectiva. Debe completarse para continuar una solicitud planificada.
- Al publicar, el último pedido de demostración se guarda en sessionStorage para mostrarse en el seguimiento del mismo ID de ejemplo, con fotos y horario. No se envía a profesionales reales; los presupuestos del seguimiento siguen siendo ejemplos.

## 12. Suscripciones sólo para profesionales

- `/planes-profesionales` muestra tres planes mensuales en USD: Inicial 0 (5 presupuestos, 10 km, 1 método de cobro); Profesional 10 (30 presupuestos, 25 km, 3 métodos); Premium 20 (sin límite de presupuestos, 50 km, 6 métodos).
- La elección se guarda para el profesional de ejemplo pro-1. No se ofrece una suscripción a clientes, empresas ni administradores. Pedir presupuestos como cliente sigue siendo gratis.
- En la demo se aplican los límites de presupuestos por mes de Argentina, radio de cobertura y métodos guardados. La verificación de identidad es obligatoria en todos los planes. No se permite bajar a un plan que admita menos métodos que los ya guardados sin eliminarlos primero.
- Elegir un plan no activa facturación, cargos ni renovaciones; para suscripciones reales hacen falta autenticación, proveedor de pagos y control de permisos/límites en servidor. Los límites actuales son de demostración en el navegador.

## 13. Agenda Mis profesionales y mensajes de clientes

- `/mis-profesionales` reúne a los profesionales contratados por el cliente de ejemplo. Incluye contactos de muestra con trabajos finalizados, búsqueda por nombre/oficio/servicio, filtros e historial por profesional.
- Aceptar un presupuesto agrega el trabajo a la agenda automáticamente. Finalizarlo actualiza el historial. Volver a contratar al mismo profesional crea otro trabajo sin duplicar su contacto. Las nuevas solicitudes de prueba tienen un identificador de instancia para distinguir trabajos que usan la misma ruta de seguimiento.
- Cada profesional tiene una conversación propia con ese cliente. Los mensajes se conservan al volver y se comparten entre el chat del seguimiento, la agenda y la pestaña Mensajes de clientes del panel profesional.
- El panel profesional sigue siendo la vista de Gustavo (pro-1); permite responder a los mensajes del cliente de ejemplo para probar el intercambio local. No hay respuestas automáticas que se hagan pasar por profesionales.
- Historial, conversaciones y lecturas viven en localStorage bajo el cliente de ejemplo; no se sincronizan entre dispositivos ni se envían a personas reales. No se accede a referencias de otros clientes ni se publican datos de contacto de terceros.
- Para mensajería real hacen falta usuarios autenticados, almacenamiento y autorización de participantes en servidor y transporte/notificaciones. La agenda y sus guardas actuales son de demostración, no una frontera de seguridad.

## 14. Portafolio, presupuestos versionados, propiedades y operación

- Panel profesional → Mi portafolio: trabajos con fotos antes/después, oficio, fecha y descripción. Se guardan como borradores. Los trabajos de clientes requieren autorización declarada para publicarse y aparecen en el perfil del profesional sólo después de publicarlos. Los archivos viven en IndexedDB, con un espacio de nombres separado de DNI/selfies; la declaración no es una autorización verificada desde una cuenta de cliente.
- Mis direcciones permite guardar casa, comercio u otra propiedad y elegir una preferida. En el paso Ubicación de una solicitud se elige la propiedad y se completan dirección y ciudad. El administrador de direcciones puede abrirse sin abandonar la solicitud.
- `/mis-solicitudes` conserva cada solicitud con su dirección, descripción, fotos y preferencia horaria. Cada seguimiento tiene un enlace con identificador de instancia para retomar pedidos anteriores sin mezclarlos con el último.
- Las nuevas solicitudes registran eventos en `oficios-service-operations-v1`. El panel profesional abre Presupuestos detallados, con solicitudes de su oficio y ciudad. Requiere identidad aprobada y respeta la cuota del plan para la primera propuesta de cada solicitud.
- Cada presupuesto separa mano de obra, materiales, visita, plazo estimado en días y garantía ofrecida en meses. El cliente acepta o rechaza una versión; una revisión pendiente nunca cambia el importe vigente. Las revisiones rechazadas se conservan. El cierre se bloquea si queda una revisión pendiente del presupuesto contratado.
- El seguimiento de solicitudes nuevas tiene seis estados: solicitado, presupuestado, contratado, visita confirmada, en curso y finalizado. Se validan las transiciones y la fecha/hora de la visita; las cancelaciones requieren motivo. La contratación y el cierre se sincronizan con Mis profesionales; una cancelación conserva el contacto y marca el trabajo cancelado.
- Los seguimientos antiguos continúan como ejemplos y se rotulan sus desgloses ilustrativos. Para probar el nuevo recorrido, crear una solicitud desde el formulario y cotizarla desde Presupuestos detallados del profesional de ejemplo.
- Empresa → Agenda del equipo: responsable de seguimiento, profesional asignado, turnos con duración, filtro por integrante y semana. Se rechazan superposiciones. Se pueden agendar varios trabajos no superpuestos para el mismo profesional aprobado. Para iniciar se exige turno e identidad aprobada.
- Los presupuestos de empresa también tienen desglose. Las revisiones conservan el importe anterior hasta una aceptación simulada del cliente; el formulario nunca reemplaza directamente un precio contratado.
- Administración/Superadmin → Actividad registrada: solicitudes con respuesta, tiempo medio al primer presupuesto, contrataciones, cancelaciones y clientes con más de una contratación no cancelada. Se calculan desde eventos de solicitudes locales y excluyen ejemplos. Los paneles profesionales también muestran actividad calculada, sin ingresos inventados.
- Estas métricas son observaciones del navegador, no actividad global de usuarios reales. Las funciones permanecen locales y no generan cobros, reservas, notificaciones ni contratos reales. Medir y operar toda la plataforma exige base de datos compartida, usuarios y permisos de servidor; la configuración privada del sitio se conserva.


## 15. Entrada como cliente nuevo

- La publicación ahora expone sólo el recorrido de cliente: portada, categorías, preparación de pedidos, solicitudes, direcciones y agenda. No infiere privilegios por ser el dueño del hosting.
- Se retiraron perfiles, reseñas, cifras, historial y mensajes precargados de la experiencia pública. El directorio muestra disponibilidad vacía hasta conectar prestadores reales.
- Los datos del nuevo recorrido usan `oficios-customer-v1-*`. No se leen ni borran los registros anteriores de trabajo. La agenda empieza vacía. Las direcciones y los nuevos borradores persisten en este navegador.
- Los pedidos se guardan explícitamente como borradores, sin envío ni contratación. Ya no hay botones para simular respuestas, presupuestos o cambios de rol en el recorrido del cliente. Las fotos y la planificación semanal se conservan.
- `customer-access.js` cierra paneles profesionales, empresa, equipo, administración, superadmin, planes y cobros en el cliente y en el Worker (HTTP 403, no-store). Esto es una publicación sólo para clientes, no un sistema completo de roles: todavía falta conectar identidad de cuentas y autorizaciones de servidor para reabrir paneles por rol. Las implementaciones anteriores se conservan en el código.
- El service worker usa un caché nuevo, retira los cachés anteriores de Oficios y no almacena páginas HTML ni usa paneles anteriores como respaldo sin conexión.
- Se preservan la audiencia privada del sitio y la clave del asistente. El chat orienta sólo sobre las funciones actuales de cliente. No se realizan llamadas pagas de prueba.


## 16. Acceso visible para profesionales

- `Soy profesional` aparece junto a las acciones principales de la portada, en el menú de escritorio/móvil y en el pie. Apunta a `/soy-profesional`, una página pública independiente del panel.
- La página presenta el futuro recorrido de cuenta, identidad y aprobación. Indica que registro e inicio de sesión aún no están habilitados, sin formularios ficticios ni cambios de rol. Los paneles internos siguen cerrados con HTTP 403.


## 17. Cuentas reales e ingreso profesional

Este apartado reemplaza el estado local de las secciones anteriores.

- Se conectaron Cloudflare D1 (`DB`) y R2 (`BUCKET`), con la migración de esquema `drizzle/0000_marketplace.sql`. No hay datos de ejemplo en estas tablas. La migración ya está aplicada en el sitio.
- El acceso usa Sign in with ChatGPT administrado por Sites. El Worker obtiene el identificador y correo verificados desde los headers de la plataforma. No se crean contraseñas propias ni se toman roles desde localStorage, query strings o formularios.
- `/soy-profesional` ahora permite iniciar sesión y completar una cuenta real como profesional o empresa. Los clientes existentes pueden agregar su perfil de prestador sin perder sus pedidos. La cuenta profesional accede sólo a sus archivos y datos.
- El DNI (frente y dorso) y la foto de la cara se guardan en R2 privado. Cargar los archivos deja la identidad pendiente. Sólo una cuenta con permisos internos puede aprobar o pedir nueva carga; nadie puede aprobar su propia identidad. Es revisión manual, sin consulta a registros oficiales ni prueba biométrica.
- El correo CEO indicado por el usuario se configura como secreto `OFICIOS_CEO_EMAIL`. Ser dueño del hosting no crea ese permiso. El CEO invita superadministradores y éstos administradores mediante códigos de un solo uso, ligados a correo y con vigencia de siete días. No se envía correo automáticamente.
- Los clientes publican solicitudes reales en D1, con fotos opcionales, dirección privada y planificación semanal. Prestadores aprobados del mismo oficio/ciudad pueden presupuestar. Cada revisión se decide por el cliente y las actualizaciones usan una versión para evitar sobrescribir cambios concurrentes.
- Se conectaron seguimiento, mensajes guardados entre participantes, historial de contrataciones, direcciones por cuenta, portafolio con autorización declarada, métodos de cobro visibles al cliente contratado, empresas con invitaciones y turnos por integrante, y métricas calculadas desde solicitudes de la base.
- Los paneles se autorizan en el Worker y en la interfaz. Los endpoints vuelven a comprobar identidad y propiedad; los archivos de documentos no son públicos. Los perfiles publicados muestran sólo prestadores con identidad aprobada.
- El Plan Inicial es gratuito. Los planes de USD 10 y USD 20 están descritos pero su facturación no está conectada. Oficios no procesa pagos; las instrucciones de alias/CBU, billetera o efectivo son para el acuerdo directo con el prestador. No hay cargos automáticos.
- La audiencia del sitio sigue privada para revisión, por instrucción de conservar el acceso existente. Esta entrega no lo convierte en un lanzamiento público ni habilita notificaciones push o emails. La clave del asistente se conserva, sin llamadas pagas durante la validación.
- Los archivos de módulos con sufijo `demo` y los hooks locales anteriores quedan como referencia en el repositorio; los recorridos publicados usan `market-*` y la API de servidor.


## 18. Foto de perfil y DNI obligatorios del profesional

- `/soy-profesional` crea directamente una cuenta de profesional independiente, sin seleccionar ni crear primero una cuenta de cliente. El recorrido continúa por foto de perfil, DNI (número, frente y dorso) y selfie de verificación.
- La foto de perfil es distinta de los archivos privados de identidad. Se carga con su propietario y propósito; no se acepta reutilizar un archivo privado de DNI como foto pública ni usar imágenes de otra cuenta. Sólo se publica después de aprobar el alta.
- El envío a revisión y la aprobación se validan en el servidor. Sin la foto requerida el profesional no aparece en el directorio ni puede presupuestar, incluso si una cuenta antigua conserva un estado aprobado. Puede completar los requisitos faltantes y reenviar el alta.
- La revisión interna incluye la foto de perfil junto con los tres archivos de identidad. Cambiar la foto de un perfil aprobado vuelve a dejar la identidad pendiente. El DNI y la selfie siguen siendo privados.
- Las cuentas profesionales reciben navegación y panel de prestador. A las cuentas de cliente no se les exige foto ni DNI; los clientes existentes conservan la opción explícita de agregar servicios.
- No se modifican los permisos internos, el correo CEO, los secretos de API ni la audiencia privada del sitio.


## 19. Gestión del CEO y mapa de pedidos

- `/ceo` abre por defecto el mapa y permite editar planes, recompensas de referidos y zonas. El Worker exige rol `ceo` en cada endpoint, independientemente de la interfaz; administradores y superadministradores conservan sus funciones previas y no modifican estas condiciones comerciales.
- La nueva migración `0001_ceo_controls.sql` añade configuración versionada, auditoría, códigos de referido, altas referidas y bonos. Las migraciones ya aplicadas no se modifican. Los valores iniciales de configuración se mantienen como defaults de la aplicación hasta que el CEO guarda su primera versión.
- El catálogo público de planes lee precios, beneficios, límites mensuales y métodos de cobro de D1. Los valores iniciales son USD 0 / 10 / 20, con 5 / 30 / propuestas ilimitadas y 1 / 3 / 6 métodos de cobro. El Plan Inicial queda gratuito y publicado. Los planes pagos son informativos mientras no exista facturación; guardar precios no genera cargos ni activa una compra. Los límites del plan gratuito sí se aplican al crear propuestas nuevas mediante una actualización SQL atómica. Las revisiones no consumen otra propuesta.
- Los referidos son entre profesionales y el programa comienza desactivado. Un referente aprobado puede crear un código; el invitado lo indica al registrarse o desde su panel antes de aprobarse. Se bloquean autorreferidos y más de un referente por cuenta. Sólo la aprobación de identidad acredita una recompensa y se usa una clave única para no duplicarla. Las condiciones se guardan al registrar el referido. Los bonos son propuestas, no dinero, y vencen al cerrar el mes de acreditación de Argentina. Si el plan no tiene límite, un bono no aumenta su capacidad.
- Las zonas pueden quedar en preparación, activas o pausadas. Capital Federal (CABA) comienza en preparación. Activar habilita altas, direcciones y nuevos pedidos; pausar conserva trabajos e historial. Los selectores y el directorio usan las zonas activas del servidor. No se permite eliminar una zona ni dejar la plataforma sin ninguna zona activa.
- Cada pedido puede guardar coordenadas seleccionadas por el cliente. El CEO ve hasta los 500 pedidos más recientes, con filtros por zona/estado/dirección y puede ubicar manualmente los que no tienen punto. Cada cambio queda auditado sin alterar dirección, estado ni presupuesto. Los pedidos sin punto se muestran como sin ubicar; no se crean ubicaciones de ejemplo ni se sustituyen por el centro de la ciudad.
- Leaflet y mosaicos de OpenStreetMap muestran el mapa. No se geocodifican direcciones mediante terceros. La ubicación exacta se oculta a profesionales no contratados y el endpoint del mapa sólo permite al CEO acceder a direcciones completas. El cliente puede optar por elegir un punto o usar la geolocalización de su navegador.
- Se conservan la audiencia privada, el correo CEO y todos los secretos. El despliegue aplica únicamente la nueva migración de esquema. No se crean pedidos, referidos ni estadísticas de prueba en producción.


## 20. Entrada del cliente sin gestión interna en la cabecera

- Se retiraron de la cabecera todos los enlaces de CEO y administración, también para la cuenta autorizada. Las cuentas autorizadas encuentran su acceso interno dentro de Mi cuenta, además del enlace directo. La cabecera del cliente prioriza Pedir un servicio; el acceso general a Mi cuenta/Ingresar no expone roles internos. En móvil se muestra sólo la acción principal y Mi cuenta sigue en el pie.
- Las cuentas profesionales conservan la entrada a su propio panel. La opción para darse de alta como profesional sigue disponible para visitantes y en el pie, sin promocionarse en la portada de una cuenta ya identificada como cliente.
- El panel CEO sigue accesible en `/ceo` y cada petición exige el rol que el servidor obtiene del correo verificado configurado. Ocultar el enlace no sustituye ni modifica esa validación. No se cambian el correo CEO, los permisos delegados ni la audiencia del sitio.
