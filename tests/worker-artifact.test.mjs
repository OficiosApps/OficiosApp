import assert from "node:assert/strict";
import test from "node:test";
import worker from "../dist/server/index.js";

test("Worker serves customer entry points and the help chat", async () => {
  for (const path of [
    "/",
    "/categorias",
    "/categorias/plomeria",
    "/profesionales/pro-1",
    "/solicitud",
    "/solicitudes/SOL-1042",
    "/mis-solicitudes",
    "/mis-direcciones",
    "/mis-profesionales",
    "/soy-profesional",
  ]) {
    const response = await worker.fetch(new Request(`https://example.com${path}`), {});
    assert.equal(response.status, 200, path);
    assert.ok(response.headers.get("content-type").startsWith("text/html"));
    assert.ok((await response.text()).includes("Ayuda IA"), path);
  }
});

test("Worker serves assets, manifest and service worker without caching chat status", async () => {
  const page = await (await worker.fetch(new Request("https://example.com/"), {})).text();
  const assets = [...page.matchAll(/(?:src|href)="(\/assets\/[^"?#]+)/g)].map((match) => match[1]);
  assert.ok(assets.length);
  for (const path of [...assets, "/icons/icon-192.png", "/manifest.webmanifest", "/sw.js"])
    assert.equal(
      (await worker.fetch(new Request(`https://example.com${path}`), {})).status,
      200,
      path,
    );
  const status = await worker.fetch(new Request("https://example.com/api/chat/status"), {});
  assert.equal(status.status, 200);
  assert.deepEqual(await status.json(), { configured: false });
  assert.equal(status.headers.get("cache-control"), "no-store");
  const sw = await (await worker.fetch(new Request("https://example.com/sw.js"), {})).text();
  assert.ok(sw.includes("/api/"));
  assert.equal((await worker.fetch(new Request("https://example.com/no-existe"), {})).status, 404);
  const head = await worker.fetch(
    new Request("https://example.com/panel-empresa", { method: "HEAD" }),
    {},
  );
  assert.equal(head.status, 403);
  assert.equal(await head.text(), "");
});

test("internal panels return 403 and cannot be opened through workspace role links", async () => {
  for (const path of [
    "/ceo",
    "/admin",
    "/superadmin",
    "/panel-profesional",
    "/panel-empresa",
    "/equipo?vista=ceo",
    "/equipo?vista=superadmin",
    "/metodos-de-pago",
    "/planes-profesionales",
    "/admin/index.html",
    "/%61dmin",
  ]) {
    const response = await worker.fetch(new Request(`https://example.com${path}`), {});
    assert.equal(response.status, 403, path);
    assert.ok((await response.text()).includes("Acceso restringido"), path);
    assert.equal(response.headers.get("cache-control"), "no-store");
  }
});

test("first visit has customer navigation and no fabricated activity or workspace controls", async () => {
  for (const path of [
    "/",
    "/categorias",
    "/categorias/plomeria",
    "/mis-solicitudes",
    "/mis-profesionales",
    "/mis-direcciones",
    "/como-funciona",
    "/solicitud",
    "/solicitudes/nueva",
    "/soy-profesional",
  ]) {
    const response = await worker.fetch(new Request(`https://example.com${path}`), {});
    assert.equal(response.status, 200, path);
    const html = await response.text();
    const visible = html
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "");
    assert.ok(
      !/href="\/(admin|superadmin|equipo|panel-profesional|panel-empresa|metodos-de-pago|planes-profesionales)(?:[/?"])/.test(
        visible,
      ),
      path,
    );
    assert.ok(!visible.includes("9 min"), path);
    assert.ok(!visible.includes("Promedio 4,7"), path);
    assert.ok(!/demostración|solicitud de prueba|Cliente de ejemplo/.test(visible), path);
  }
});

test("old example deep links cannot expose seeded professional or quotation data", async () => {
  for (const path of ["/profesionales/pro-1", "/solicitudes/SOL-1042"]) {
    const response = await worker.fetch(new Request(`https://example.com${path}`), {});
    assert.equal(response.status, 200);
    const visible = (await response.text()).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
    assert.ok(!visible.includes("Gustavo"));
    assert.ok(!visible.includes("Aceptar presupuesto"));
    assert.ok(!visible.includes("profesionales la vieron"));
  }
});

test("team entry is public, separate from customer login, and does not grant internal access", async () => {
  const response = await worker.fetch(
    new Request("https://example.com/gestion?invitacion=00000000-0000-4000-8000-000000000001"),
    {},
  );
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("referrer-policy"), "no-referrer");
  const html = await response.text();
  assert.ok(html.includes("Equipo de Oficios"));
  assert.ok(html.includes("Ingresar a gestión"));
  const page = await (await worker.fetch(new Request("https://example.com/"), {})).text();
  assert.match(page, /href="\/gestion"[^>]*>Acceso al equipo/);
  const restricted = await worker.fetch(new Request("https://example.com/superadmin"), {});
  assert.equal(restricted.status, 403);
  assert.match(await restricted.text(), /href="\/gestion"/);
});
