import assert from "node:assert/strict";
import test from "node:test";
import { addCollectionMethod, chooseProfessionalPlan, defaultProfessionalAccount, isProfessionalAccount, monthKey, planFor, professionalPlans, recordProfessionalQuote, removeCollectionMethod } from "../src/lib/professional-account.ts";

test("three professional plans have the requested prices and distinct limits", () => {
  assert.deepEqual(professionalPlans.map((plan) => plan.usd), [0, 10, 20]);
  assert.deepEqual(professionalPlans.map((plan) => plan.radius), [10, 25, 50]);
  assert.deepEqual(professionalPlans.map((plan) => plan.methods), [1, 3, 6]);
  assert.equal(isProfessionalAccount({ ...defaultProfessionalAccount(), professionalId: "client-1" }), false);
  assert.ok(isProfessionalAccount(defaultProfessionalAccount()));
});

test("methods validate data, reject duplicates and respect plan and downgrade limits", () => {
  let account = defaultProfessionalAccount();
  const transfer = { type: "transferencia", label: "Banco de prueba", holder: "Persona ficticia", destination: "trabajo.demo" };
  account = addCollectionMethod(account, transfer, "transfer");
  assert.equal(account.methods[0].preferred, true);
  assert.throws(() => addCollectionMethod(account, { type: "efectivo", label: "Efectivo", holder: "", destination: "" }, "cash"), /límite/);
  account = chooseProfessionalPlan(account, "profesional");
  assert.throws(() => addCollectionMethod(account, transfer, "duplicate"), /ya está/);
  account = addCollectionMethod(account, { type: "efectivo", label: "Efectivo", holder: "", destination: "" }, "cash");
  assert.throws(() => chooseProfessionalPlan(account, "inicial"), /máximo/);
  for (const destination of ["javascript:alert(1)", "http://example.com", "https://user:password@example.com"]) assert.throws(() => addCollectionMethod(account, { type: "link", label: "Link", holder: "Persona", destination }, "bad"));
  assert.throws(() => addCollectionMethod(account, { ...transfer, destination: "123" }, "bad"));
  account = removeCollectionMethod(account, "transfer");
  assert.equal(account.methods[0].preferred, true);
  assert.equal(chooseProfessionalPlan(account, "inicial").planId, "inicial");
});

test("monthly quote limits deduplicate requests, persist across upgrades and reset by Argentina month", () => {
  const november = new Date("2026-11-15T15:00:00Z");
  let account = defaultProfessionalAccount();
  for (let index = 0; index < 5; index++) account = recordProfessionalQuote(account, `request-${index}`, november);
  assert.equal(recordProfessionalQuote(account, "request-0", november).quotes[monthKey(november)].length, 5);
  assert.throws(() => recordProfessionalQuote(account, "request-6", november));
  account = chooseProfessionalPlan(account, "profesional");
  account = recordProfessionalQuote(account, "request-6", november);
  assert.equal(account.quotes[monthKey(november)].length, 6);
  account = chooseProfessionalPlan(account, "inicial");
  assert.throws(() => recordProfessionalQuote(account, "request-7", november));
  const december = new Date("2026-12-01T12:00:00Z");
  assert.equal(recordProfessionalQuote(account, "new-month", december).quotes[monthKey(december)].length, 1);
  assert.equal(monthKey(new Date("2026-12-01T01:00:00Z")), monthKey(november));
  account = chooseProfessionalPlan(account, "premium");
  for (let index = 0; index < 40; index++) account = recordProfessionalQuote(account, `premium-${index}`, november);
  assert.equal(planFor(account.planId).quotes, null);
});
