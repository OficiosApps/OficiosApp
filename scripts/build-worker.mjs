import { readFile, readdir, mkdir, writeFile } from "node:fs/promises";
import { join, extname } from "node:path";

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".woff2": "font/woff2",
};
const files = {};
async function walk(root, relative = "") {
  for (const item of await readdir(join(root, relative), { withFileTypes: true })) {
    const path = join(relative, item.name);
    if (item.isDirectory()) await walk(root, path);
    else if (!["_headers", "_redirects"].includes(item.name) && !item.name.endsWith(".map"))
      files[`/${path}`] = {
        type: types[extname(item.name)] ?? "application/octet-stream",
        base64: (await readFile(join(root, path))).toString("base64"),
      };
  }
}
await walk(".output/public");
if (!files["/index.html"]) throw new Error("Falta compilar la aplicación antes del Worker.");
const customerAccess = await readFile("src/lib/customer-access.js", "utf8");
const domain = await readFile("worker/market-domain.mjs", "utf8");
const settings = (await readFile("worker/market-settings.mjs", "utf8")).replace(
  /^import[\s\S]*?from ["']\.\/market-domain\.mjs["'];\r?\n/m,
  "",
);
const staffMail = await readFile("worker/staff-mail.mjs", "utf8");
const api = (await readFile("worker/market-api.mjs", "utf8"))
  .replace(/^import[\s\S]*?from ["']\.\/market-domain\.mjs["'];\r?\n/m, "")
  .replace(/^import[\s\S]*?from ["']\.\/market-settings\.mjs["'];\r?\n/m, "");
const handler = await readFile("worker/chat-handler.mjs", "utf8");
const wrapper = (await readFile("worker/index.mjs", "utf8"))
  .replace(/^import[\s\S]*?from ["']\.\/chat-handler\.mjs["'];\r?\n/m, "")
  .replace(/^import[\s\S]*?from ["']\.\/market-api\.mjs["'];\r?\n/m, "")
  .replace(/^import[\s\S]*?from ["']\.\.\/src\/lib\/customer-access\.js["'];\r?\n/m, "")
  .replace("/*__STATIC_ASSETS__*/ {}", JSON.stringify(files));
await mkdir("dist/server", { recursive: true });
await writeFile(
  "dist/server/index.js",
  `${customerAccess}\n${domain}\n${settings}\n${staffMail}\n${api}\n${handler}\n${wrapper}`,
);
console.log(`Worker listo: ${Object.keys(files).length} archivos del sitio y API de chat.`);
