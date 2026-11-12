import assert from "node:assert/strict";
import test from "node:test";
import { internalAreas, isInternalPath } from "../src/lib/customer-access.js";
import { customerStorage, emptyCustomerPortfolio } from "../src/lib/customer-state.ts";
import { initialServiceOperations } from "../src/lib/service-operations.ts";
test("customer publication closes all internal URLs including encoded paths and static entry points", () => {
  for (const area of internalAreas) {
    for (const path of [
      `/${area}`,
      `/${area}/`,
      `/${area}/index.html`,
      `/${area}.html`,
      `//${area}`,
      `/${encodeURIComponent(area).replace("a", "%61")}`,
    ])
      assert.equal(isInternalPath(path), true, path);
  }
  assert.equal(isInternalPath("/%61dmin"), true);
  assert.equal(isInternalPath("/SUPERADMIN/"), true);
  assert.equal(isInternalPath("/%invalid"), true);
  for (const path of [
    "/",
    "/categorias",
    "/solicitud",
    "/mis-solicitudes",
    "/mis-profesionales",
    "/mis-direcciones",
    "/como-funciona",
  ])
    assert.equal(isInternalPath(path), false, path);
});
test("new customers have no seeded jobs, messages or requests and do not reuse workspace data", () => {
  const first = emptyCustomerPortfolio();
  assert.deepEqual(first.jobs, []);
  assert.deepEqual(first.conversations, {});
  assert.equal(initialServiceOperations().requests.length, 0);
  assert.ok(Object.values(customerStorage).every((key) => key.startsWith("oficios-customer-v1-")));
  assert.ok(!Object.values(customerStorage).includes("oficios-service-operations-v1"));
  assert.ok(!Object.values(customerStorage).includes("oficios-client-portfolio-cliente-demo-1"));
  first.jobs.push({ id: "unpersisted" });
  assert.equal(emptyCustomerPortfolio().jobs.length, 0);
});
