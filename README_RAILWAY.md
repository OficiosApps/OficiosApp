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
3. Ingresá con tadeoacua22@gmail.com y abrí /ceo. No hace falta crear antes una cuenta de cliente para entrar a la gestión.
4. Con otra cuenta, comprobá que /ceo queda restringido.
5. Probá alta de cliente con selfie, alta profesional con foto, DNI y selfie, revisión por otra persona autorizada, pedidos, presupuestos y mensajes. Nadie puede aprobar su propia identidad.
6. Reiniciá o desplegá nuevamente y verificá que persistan los registros y las fotos.

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

Esta configuración utiliza una sola instancia con SQLite y archivos privados en el volumen. Para varias réplicas se necesita una base y almacenamiento compartidos. Configurá copias de seguridad del volumen y probá restaurarlas. No expongas /data mediante un servidor de archivos estáticos.

Antes del lanzamiento comercial completá los datos legales del operador y la revisión jurídica de los términos, incluido el compromiso de resolución de reclamos en 60 días. El correo pqroficiosapp@gmail.com requiere atención humana; Ayuda IA no abre esos reclamos.

Las pruebas locales no sustituyen comprobar OAuth real y la instalación en tu iPhone desde el dominio final. Las credenciales, el dominio y el despliegue real se configuran en tus cuentas.
