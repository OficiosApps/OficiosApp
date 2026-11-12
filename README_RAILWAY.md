# Oficios en Railway

Paquete para desplegar Oficios con Node.js 24, PWA, ingreso con Google, base SQLite y fotos privadas en un volumen persistente. Esta entrega contiene el código y la configuración; no está desplegada en tu cuenta de Railway.

## 1. Subir el proyecto

1. Descomprimí oficios-railway.zip.
2. Creá un repositorio en tu GitHub, preferentemente privado.
3. Subí el contenido de la carpeta oficios-railway. En la raíz del repositorio deben quedar Dockerfile, railway.json y package.json.
4. Incluí .dockerignore y .env.example. No subas un archivo .env real, datos ni claves.

Railway se conecta al repositorio. No recibe este ZIP como un sitio estático. También podés desplegar la carpeta con Railway CLI si ya la utilizás.

## 2. Crear el servicio y un volumen

1. Entrá en https://railway.com y elegí New Project > Deploy from GitHub repo.
2. Conectá el repositorio. Railway detecta el Dockerfile.
3. Agregá un volumen conectado al servicio con punto de montaje /data. Es obligatorio: guarda la base y las fotos.
4. Conservá una sola réplica, como ya indica railway.json.
5. En Settings > Networking > Public Networking elegí Generate Domain. Si solicita puerto, usá 8080; el puerto de destino del dominio debe coincidir con PORT. El servidor muestra su puerto de escucha en los registros de arranque.
6. Copiá la URL HTTPS generada, por ejemplo https://TU-DOMINIO.up.railway.app.

El primer despliegue puede esperar la configuración. Si falta el volumen, el servidor rechaza iniciar. Agregá el volumen y las variables siguientes, y volvé a desplegar. Las migraciones se ejecutan durante el arranque, cuando ya está montado el volumen.

Fuentes: [Dockerfile](https://docs.railway.com/builds/dockerfiles), [volumen](https://docs.railway.com/volumes), [dominio público](https://docs.railway.com/networking/public-networking).

## 3. Crear las credenciales Google

El ingreso en esta versión funciona con Google, sin exigir una cuenta de ChatGPT. Las credenciales se crean en tu propio proyecto:

1. Entrá en https://console.cloud.google.com y creá o elegí un proyecto.
2. Configurá Google Auth Platform / la pantalla de consentimiento con el nombre Oficios, el correo de soporte y la audiencia adecuada.
3. Si el proyecto está en modo de prueba, agregá como usuarios de prueba al Gmail del CEO y las demás cuentas de validación. Para abrirlo a todos, completá los requisitos de publicación que Google muestre.
4. Creá un cliente OAuth de tipo Aplicación web.
5. Agregá esta URI de redireccionamiento autorizada, reemplazando el dominio:

   https://TU-DOMINIO.up.railway.app/auth/google/callback

6. Si configurás orígenes JavaScript autorizados, usá https://TU-DOMINIO.up.railway.app.
7. Copiá el ID de cliente y el secreto a las variables privadas de Railway; no los envíes por chat ni los incluyas en GitHub.
8. Para las páginas públicas usá /privacidad y /condiciones del nuevo dominio y como soporte pqroficiosapp@gmail.com. Si Google solicita acreditar la propiedad de un dominio para publicar la marca, completá ese trámite con un dominio que controles.

Se verifican firma, emisor, audiencia, vencimiento, nonce y correo verificado. Hay state y PKCE para el flujo OAuth y cookies HttpOnly para las sesiones. Un visitante no obtiene permisos enviando una cabecera de identidad.

Fuente: [OpenID Connect de Google](https://developers.google.com/identity/openid-connect/openid-connect).

## 4. Variables del servicio

En Railway > servicio > Variables cargá:

| Variable | Valor |
| --- | --- |
| APP_URL | Tu URL HTTPS completa, sin rutas: https://TU-DOMINIO.up.railway.app |
| DATA_DIR | /data |
| GOOGLE_CLIENT_ID | El ID de cliente de Google Cloud |
| GOOGLE_CLIENT_SECRET | El secreto del cliente, privado |
| OFICIOS_CEO_EMAIL | tadeoacua22@gmail.com |
| OPENAI_API_KEY | Opcional, sólo para activar Ayuda IA; secreto del servidor |
| BREVO_API_KEY | Clave API privada de Brevo para enviar invitaciones |
| MAIL_FROM | pqroficiosapp@gmail.com, verificado como remitente en Brevo |
| OPENAI_MODEL | gpt-4.1-mini, o un modelo compatible al que tengas acceso |

Railway gestiona PORT. RAILWAY_PUBLIC_DOMAIN se usa como alternativa si no definís APP_URL. No uses VITE_ para secretos. Sin la clave de OpenAI funcionan la aplicación y los mensajes entre usuarios; Ayuda IA informa que necesita activación. La facturación automática de los planes profesionales sigue deshabilitada.

Aplicá los cambios / Redeploy después de configurar.

## 5. Migraciones y seed

El arranque aplica las migraciones de drizzle/ y railway/auth.sql y prepara la configuración inicial si todavía no existe. Es idempotente: no borra información ni reemplaza ajustes del CEO.

Se incluyen los planes iniciales de USD 0, 10 y 20. Mercedes, Buenos Aires, comienza habilitada; las demás zonas están en preparación. Referidos comienza desactivado. Todo eso puede editarlo el CEO.

No se crean usuarios, administradores, pedidos, reseñas, fotos o sesiones de ejemplo. El correo de CEO sólo obtiene el rol al ingresar mediante una identidad verificada de Google. No es una contraseña.

Para ejecutar el seed manualmente en el servicio que tiene el volumen montado:

    npm run db:seed

No lo agregues como pre-deploy command: el arranque ya lo ejecuta en el momento correcto. Un comando local con variables de Railway no accede por sí solo al volumen remoto.

Esta entrega arranca con una base nueva. No importa automáticamente los registros, documentos e historial de la vista alojada en ChatGPT. Conservarlos requiere una migración de datos y de identidades por separado.

## 6. Validar la aplicación

1. Abrí /healthz: debe responder {"ok":true}.
2. Abrí Mi cuenta: debe mostrar Continuar con Google.
3. En el pie del sitio elegí **Acceso al equipo** e ingresá con tadeoacua22@gmail.com. Se abre el panel CEO automáticamente. No hace falta crear antes una cuenta de cliente para entrar a la gestión.
4. Con otra cuenta, comprobá que /ceo queda restringido.
5. Probá alta de cliente con selfie, alta profesional con foto, DNI y selfie, revisión por otra persona autorizada, pedidos, presupuestos y mensajes. Nadie puede aprobar su propia identidad.
6. Reiniciá o desplegá nuevamente y verificá que persistan los registros y las fotos.

### Invitaciones y correo

El acceso del equipo está en `/gestion`, separado del alta de clientes y profesionales. La cuenta CEO ve dirección, configuración comercial, mapa, auditoría, operación y su equipo. Los superadministradores tienen un panel de supervisión y pueden invitar administradores. Los administradores tienen su centro de operaciones y revisiones, sin invitaciones ni ajustes comerciales.

1. Creá una cuenta en Brevo, activá el servicio transaccional y verificá el remitente `pqroficiosapp@gmail.com` con el código que Brevo envía a esa casilla.
2. Creá una **clave API** (no una clave SMTP) y guardala en Railway como `BREVO_API_KEY`. Configurá `MAIL_FROM` con el correo verificado. Nunca cargues claves en el chat, GitHub o variables VITE_.
3. Desplegá los cambios. En CEO → Equipo e invitaciones → Correo de la plataforma, pulsá **Comprobar conexión**. La consulta sale desde Railway y valida el remitente y la activación transaccional sin enviar mensajes. Si Brevo rechaza la IP, el panel muestra la dirección cuando el proveedor la informa: revisá ese acceso en las IP autorizadas de Brevo. No autorices una IP de otra sesión de desarrollo para resolver un bloqueo del servidor. Después, creá o enviá una invitación pendiente.
4. El panel diferencia pendiente, procesando, envío aceptado, rechazo y envío sin confirmar. La aceptación de Brevo **no confirma entrega**: consultá su registro transaccional para rebotes o recepción. Los rechazos y tiempos de espera no se muestran como enviados.
5. El destinatario abre el enlace del correo, ingresa con el mismo Gmail y pulsa Aceptar invitación. La invitación se valida antes de abrir cualquier panel, aunque el navegador ya tenga una sesión CEO o de otro integrante. Si elige un Gmail equivocado, puede usar **Salir y elegir otra cuenta de Google**: se cierra esa sesión y vuelve al selector conservando el enlace. No se transfiere la invitación a otro correo. No necesita un perfil de cliente ni una selfie. El enlace dura 7 días y se usa una sola vez.
6. Tras aceptar, se abre el panel del rol asignado por el servidor. El creador lo ve en su lista de equipo al volver a la pestaña, durante la actualización automática o con **Actualizar equipo**. Reabrir un enlace aceptado muestra el acceso al panel y no duplica integrantes.

Las invitaciones anteriores quedan pendientes de envío. No se reenvían automáticamente. El botón Enviar correo permite enviarlas conservando su vigencia. Si vencen, creá otra. Cada intento usa una reserva atómica; los reintentos tienen una espera mínima de un minuto. Ante un envío sin confirmar, comprobá el registro antes de reenviar: puede haberse recibido. No hay cola automática ni confirmación de entrega por webhook.

El remitente puede ser temporalmente sustituido por Brevo al usar Gmail; el Reply-To apunta al correo configurado. Para una dirección de envío de tu marca, usá un dominio propio autenticado. Las credenciales de Google para iniciar sesión son independientes de las de correo.

Referencias: [API transaccional de Brevo](https://developers.brevo.com/reference/send-transac-email), [verificar remitentes](https://help.brevo.com/hc/en-us/articles/208836149-Create-a-new-sender-From-name-and-From-email), [salida de correo en Railway](https://docs.railway.com/networking/outbound-networking).

### Operación ampliada por rol

Los paneles retoman la organización del ZIP original y usan registros persistidos. La migración `0004_staff_operations.sql` agrega casos, notas, auditoría, controles de acceso/publicación y reglas operativas. No agrega personas, trabajos ni incidentes de muestra.

| Rol | Herramientas |
| --- | --- |
| Administrador | Jornada con métricas y embudo, mesa de solicitudes, directorio de profesionales/empresas y clientes, verificaciones, ciudades y casos propios o sin asignar. Puede tomar casos, registrar notas, resolver casos ordinarios y escalar a supervisión. |
| Superadministrador | Panorama global, equipo y accesos, asignación de casos a administradores de su equipo, prioridades, resolución de críticos/escalados, moderación de perfiles, zonas y liquidez, auditoría, reglas de atención y estado del sistema. |
| CEO | Dirección comercial y acceso completo a operación desde la pestaña Operación; gestiona sus superadministradores y conserva los ajustes de precios, planes y apertura de zonas. |

Los casos son registros internos: el equipo carga los reclamos recibidos por los canales de atención o los abre desde una cuenta o una solicitud. No se importan correos automáticamente. El cierre documenta la resolución y no cambia por sí solo el estado del trabajo, su presupuesto ni un pago. Las notas permanecen dentro del equipo autorizado; los administradores no pueden abrir casos asignados a otro administrador.

Las asignaciones, notas, escalados, cierres, reaperturas, prioridades, decisiones de identidad y cambios de acceso/publicación se registran con actor y fecha. Las escrituras usan versiones para evitar que dos integrantes se sobrescriban. El historial de notas muestra las últimas 200 entradas de cada caso; auditoría, directorios y colas tienen paginación. La exportación CSV descarga la página visible, sin documentos de identidad ni conversaciones privadas.

Pausar un acceso requiere reasignar primero los casos abiertos. El servidor deja de reconocer su rol de gestión y la reactivación conserva su cuenta e historial. Un superadministrador sólo administra accesos de administradores invitados por él; el CEO puede supervisar los accesos del equipo. Las invitaciones pendientes de un superadministrador pausado no pueden activarse hasta que se restablezca su acceso.

La revisión operativa de un profesional o empresa oculta su perfil público y bloquea los nuevos presupuestos; permite continuar los contratos y conversaciones existentes. El motivo se muestra al titular. Restablecer la publicación no reemplaza la verificación de identidad ni la habilitación de la ciudad.

Las métricas de contrataciones se calculan sobre solicitudes creadas en el período seleccionado. Los importes usan la versión aceptada del presupuesto, excluyen canceladas y no confirman cobro. Los plazos internos de resolución se fijan al crear el caso; cambiar las reglas no modifica vencimientos existentes. Los indicadores de archivos, correo e IA distinguen configuración de disponibilidad comprobada.

## 7. PWA en iPhone desde Railway

1. Abrí tu dominio HTTPS directamente en Safari.
2. Ingresá con Google si lo solicita.
3. Tocá Compartir > Agregar a pantalla de inicio.
4. Activá Abrir como app web si aparece y tocá Agregar.
5. Abrí Oficios desde su ícono. Si vuelve a pedir ingreso, usá la misma cuenta de Google.

El botón Instalar Oficios al pie también muestra instrucciones. El manifiesto, el service worker y los íconos usan rutas relativas del nuevo dominio. Para pedidos, mensajes y fotos se necesita conexión.

Fuente: [PWA en iPhone](https://support.apple.com/es-mx/guide/iphone/iphea86e5236/ios).

## Desarrollo

Requisitos: Node.js 24 y npm.

    npm ci
    npm run build:railway
    APP_URL=http://localhost:3000 DATA_DIR=./data npm start

HTTP se permite sólo para localhost. Para probar Google en local, registrá http://localhost:3000/auth/google/callback y cargá sus variables en el entorno. npm start no carga .env automáticamente.

    npm run test:railway
    node --test tests/*.test.mjs
    npx tsc --noEmit

Las pruebas OAuth usan claves locales y respuestas simuladas. No llaman a Google ni hacen consultas pagas a OpenAI.

## Operación y límites

La cobertura inicial incluye los 135 partidos de la provincia de Buenos Aires, con nombres y centros de GeoRef oficial. En registro, pedidos y direcciones se elige el partido; la localidad se indica junto con la dirección. CABA conserva su estado propio.

La migración `0005_buenos_aires_coverage.sql` habilita esta cobertura una sola vez en instalaciones existentes. Conserva los IDs y centros anteriores, los planes, los referidos y las demás provincias, y deja constancia en el historial comercial. Las bajas posteriores mediante los switches del CEO se respetan al reiniciar o volver a desplegar. No editar migraciones ya aplicadas.

Esta configuración utiliza una sola instancia con SQLite y archivos privados en el volumen. Para varias réplicas se necesita una base y almacenamiento compartidos. Configurá copias de seguridad del volumen y probá restaurarlas. No expongas /data mediante un servidor de archivos estáticos.

Antes del lanzamiento comercial completá los datos legales del operador y la revisión jurídica de los términos, incluido el compromiso de resolución de reclamos en 60 días. El correo pqroficiosapp@gmail.com requiere atención humana; Ayuda IA no abre esos reclamos.

Las pruebas locales no sustituyen comprobar OAuth real y la instalación en tu iPhone desde el dominio final. Las credenciales, el dominio y el despliegue real se configuran en tus cuentas.
