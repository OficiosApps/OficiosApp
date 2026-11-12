import assert from "node:assert/strict";
import test from "node:test";
import {
  acceptedRevision,
  activityMetrics,
  addPublishedWork,
  addSavedAddress,
  advanceServiceRequest,
  cancelServiceRequest,
  decideServiceQuote,
  initialServiceOperations,
  proposeServiceQuote,
  publishWork,
  quoteTotal,
  registerServiceRequest,
  removeSavedAddress,
  validateQuote,
} from "../src/lib/service-operations.ts";
import {
  initialCompanyDemo,
  setCompanyResponsible,
  scheduleAndAssignCompanyJob,
  scheduleCompanyJob,
  proposeCompanyPriceChange,
  decideCompanyPriceChange,
} from "../src/lib/company-demo.ts";

const request = (instanceId) => ({
  id: "SOL-1042",
  instanceId,
  categoriaSlug: "plomeria",
  servicio: "Pérdida de agua",
  tipo: "urgente",
  descripcion: "",
  direccion: "Dirección de prueba",
  contacto: "Contacto ficticio",
  cuando: "Hoy",
  schedule: null,
  photoIds: [],
  cityId: "mercedes-ba",
});
const quote = {
  labor: 100,
  materials: 50,
  visit: 10,
  days: 2,
  warrantyMonths: 6,
  notes: "Materiales y terminaciones incluidos",
};

test("saved properties validate city and type, preserve snapshots and maintain preference after removal", () => {
  let state = initialServiceOperations();
  state = addSavedAddress(
    state,
    {
      label: "Casa",
      kind: "casa",
      cityId: "mercedes-ba",
      address: "Calle ficticia 100",
      reference: "Portón verde",
    },
    "a1",
  );
  state = addSavedAddress(
    state,
    {
      label: "Local",
      kind: "comercio",
      cityId: "lujan-ba",
      address: "Otra calle 200",
      reference: "",
    },
    "a2",
  );
  assert.equal(state.addresses[0].preferred, true);
  assert.equal(removeSavedAddress(state, "a1").addresses[0].preferred, true);
  assert.throws(() =>
    addSavedAddress(
      state,
      { label: "Mal", kind: "casa", cityId: "unknown", address: "Calle 1", reference: "" },
      "bad",
    ),
  );
  assert.equal(state.addresses.length, 2);
});

test("request instances preserve their own address and photo snapshot", () => {
  const first = {
    ...request("first"),
    direccion: "Casa de prueba 100",
    photoIds: ["request-photo-one"],
  };
  let state = registerServiceRequest(initialServiceOperations(), first, 1000);
  first.photoIds.push("request-photo-later");
  state = registerServiceRequest(
    state,
    { ...request("second"), direccion: "Comercio de prueba 200" },
    2000,
  );
  assert.equal(state.requests.length, 2);
  assert.equal(state.requests[0].address, "Casa de prueba 100");
  assert.deepEqual(state.requests[0].photoIds, ["request-photo-one"]);
  assert.equal(state.requests[1].address, "Comercio de prueba 200");
  assert.equal(registerServiceRequest(state, request("first")), state);
});

test("a price revision never changes the accepted total until the client accepts the new version", () => {
  let state = registerServiceRequest(initialServiceOperations(), request("one"), 1000);
  state = proposeServiceQuote(state, "SOL-1042:one", "pro-1", quote, "q1", 61000);
  assert.throws(() => proposeServiceQuote(state, "SOL-1042:one", "pro-1", quote, "duplicate"));
  state = decideServiceQuote(state, "q1", 1, true, 62000);
  assert.equal(quoteTotal(acceptedRevision(state.quotes[0])), 160);
  state = proposeServiceQuote(
    state,
    "SOL-1042:one",
    "pro-1",
    { ...quote, labor: 200 },
    "ignored",
    63000,
  );
  assert.equal(quoteTotal(acceptedRevision(state.quotes[0])), 160);
  assert.throws(() => decideServiceQuote(state, "q1", 1, true));
  state = decideServiceQuote(state, "q1", 2, false, 64000);
  assert.equal(quoteTotal(acceptedRevision(state.quotes[0])), 160);
  state = proposeServiceQuote(
    state,
    "SOL-1042:one",
    "pro-1",
    { ...quote, labor: 200 },
    "ignored",
    65000,
  );
  state = decideServiceQuote(state, "q1", 3, true, 66000);
  assert.equal(quoteTotal(acceptedRevision(state.quotes[0])), 260);
  assert.equal(
    state.requests[0].timeline.filter((event) => event.stage === "contratado").length,
    1,
  );
  assert.throws(() => validateQuote({ ...quote, labor: -1 }));
  assert.throws(() => validateQuote({ ...quote, labor: 0.004, materials: 0.004, visit: 0.004 }));
});

test("work stages cannot be skipped and metrics exclude seeded examples", () => {
  let state = registerServiceRequest(initialServiceOperations(), request("one"), 1000);
  state = registerServiceRequest(state, request("example"), 1000, "ejemplo");
  assert.throws(() => advanceServiceRequest(state, "SOL-1042:one", "finalizado"));
  state = proposeServiceQuote(state, "SOL-1042:one", "pro-1", quote, "q1", 61000);
  state = decideServiceQuote(state, "q1", 1, true, 62000);
  assert.throws(() => advanceServiceRequest(state, "SOL-1042:one", "en-curso"));
  state = advanceServiceRequest(
    state,
    "SOL-1042:one",
    "visita-confirmada",
    { date: "2099-01-01", time: "10:00" },
    63000,
  );
  state = advanceServiceRequest(state, "SOL-1042:one", "en-curso", undefined, 64000);
  state = proposeServiceQuote(
    state,
    "SOL-1042:one",
    "pro-1",
    { ...quote, labor: 110 },
    "ignored",
    65000,
  );
  assert.throws(() => advanceServiceRequest(state, "SOL-1042:one", "finalizado", undefined, 66000));
  state = decideServiceQuote(state, "q1", 2, false, 67000);
  state = advanceServiceRequest(state, "SOL-1042:one", "finalizado", undefined, 68000);
  assert.throws(() => cancelServiceRequest(state, "SOL-1042:one", "Quiero cancelar"));
  let metrics = activityMetrics(state);
  assert.deepEqual(
    [
      metrics.requests,
      metrics.responded,
      metrics.hired,
      metrics.completed,
      metrics.cancelled,
      metrics.firstResponseMs,
    ],
    [1, 1, 1, 1, 0, 60000],
  );
  state = registerServiceRequest(state, request("two"), 70000);
  state = proposeServiceQuote(state, "SOL-1042:two", "pro-1", quote, "q2", 80000);
  state = decideServiceQuote(state, "q2", 1, true, 81000);
  assert.equal(activityMetrics(state).repeatClients, 1);
  state = cancelServiceRequest(state, "SOL-1042:two", "No puedo recibir la visita", 82000);
  metrics = activityMetrics(state);
  assert.equal(metrics.cancelled, 1);
  assert.equal(metrics.repeatClients, 0);
  assert.equal(activityMetrics(initialServiceOperations()).firstResponseMs, null);
});

test("client work photos stay private until publication is authorized", () => {
  const work = {
    id: "w1",
    professionalId: "pro-1",
    title: "Reparación de cocina",
    category: "plomeria",
    date: "2020-01-01",
    description: "Se reparó la instalación y se reemplazó la grifería.",
    beforeId: "work-photo-before",
    afterId: "work-photo-after",
    clientWork: true,
    clientConsent: false,
    consentDeclaredAt: null,
    published: false,
  };
  let state = addPublishedWork(initialServiceOperations(), work);
  assert.equal(state.works[0].published, false);
  assert.throws(() => publishWork(state, "w1"));
  assert.throws(() => addPublishedWork(initialServiceOperations(), { ...work, published: true }));
  assert.throws(() =>
    addPublishedWork(initialServiceOperations(), { ...work, beforeId: "identity-front" }),
  );
  state = addPublishedWork(initialServiceOperations(), { ...work, clientConsent: true });
  assert.equal(publishWork(state, "w1").works[0].published, true);
});

test("company agenda rejects overlapping turns, accepts separate turns and holds price changes for client decision", () => {
  let company = initialCompanyDemo();
  company = setCompanyResponsible(company, "EMP-1001", "empresa-pro-2");
  assert.equal(company.jobs[0].responsibleId, "empresa-pro-2");
  assert.throws(() => setCompanyResponsible(company, "EMP-1001", "outsider"));
  company = scheduleCompanyJob(company, "EMP-1001", {
    date: "2099-01-01",
    time: "10:00",
    minutes: 60,
  });
  company = {
    ...company,
    jobs: company.jobs.map((job) =>
      job.id === "EMP-1009" ? { ...job, status: "confirmada", amount: 100 } : job,
    ),
  };
  assert.throws(() =>
    scheduleAndAssignCompanyJob(
      company,
      "EMP-1009",
      "empresa-pro-1",
      { date: "2099-01-01", time: "10:30", minutes: 60 },
      ["empresa-pro-1"],
    ),
  );
  company = scheduleAndAssignCompanyJob(
    company,
    "EMP-1009",
    "empresa-pro-1",
    { date: "2099-01-01", time: "11:00", minutes: 60 },
    ["empresa-pro-1"],
  );
  const before = company.jobs[0].amount;
  company = proposeCompanyPriceChange(company, "EMP-1001", quote);
  assert.equal(company.jobs[0].amount, before);
  company = decideCompanyPriceChange(company, "EMP-1001", false);
  assert.equal(company.jobs[0].amount, before);
  company = proposeCompanyPriceChange(company, "EMP-1001", quote);
  company = decideCompanyPriceChange(company, "EMP-1001", true);
  assert.equal(company.jobs[0].amount, 160);
});
