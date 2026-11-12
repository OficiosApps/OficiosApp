# Cómo seguir con Oficios

La guía de despliegue vigente es [README_RAILWAY.md](README_RAILWAY.md).

- Frontend: src/ con React, TanStack Start, Vite y Tailwind.
- API de negocio y autorización: worker/.
- Servidor Node.js para Railway, OAuth Google y almacenamiento persistente: railway/.
- Tablas y migraciones: drizzle/; se aplican al arrancar.
- PWA: public/manifest.webmanifest, public/sw.js y el botón Instalar Oficios.
- La base y las fotos se guardan en el volumen privado /data. Los documentos no son públicos.
- El CEO se reconoce por el correo verificado configurado en OFICIOS_CEO_EMAIL. No hay selector de roles de demostración.
- El seed prepara configuración comercial con usuarios vacíos y conserva cambios posteriores.
- Los secretos se configuran en Railway; .env.example contiene sólo la plantilla.

Para construir y ejecutar con Node.js 24:

    npm ci
    npm run build:railway
    APP_URL=http://localhost:3000 DATA_DIR=./data npm start

Para verificar cambios de lógica:

    node --test tests/*.test.mjs
    npx tsc --noEmit

El despliegue definitivo debe utilizar el repositorio GitHub y la rama main configurados en Railway. El dominio público apunta al mismo puerto que muestra PORT en el servicio.
