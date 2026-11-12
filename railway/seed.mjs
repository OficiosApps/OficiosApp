import { openStorage } from "./storage.mjs";
const storage = openStorage(process.env.DATA_DIR || "./data");
console.log(
  "Migraciones aplicadas y configuración inicial preparada. No se crean usuarios ni trabajos de ejemplo.",
);
storage.close();
