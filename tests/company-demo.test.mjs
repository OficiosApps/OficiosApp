import assert from "node:assert/strict";
import test from "node:test";
import {
  addCompanyMember,
  advanceCompanyJob,
  assignCompanyJob,
  initialCompanyDemo,
  isCompanyDemo,
  memberIsBusy,
  newCompanyDemo,
  quoteCompanyJob,
  scheduleCompanyJob,
  validateCompanyProfile,
} from "../src/lib/company-demo.ts";

test("companies support each oficio, multiple trades, and a configurable city", () => {
  const original = initialCompanyDemo();
  for (const category of [
    "plomeria",
    "electricidad",
    "cerrajeria",
    "albanileria",
    "pintura",
    "jardineria",
    "limpieza",
    "gas",
  ]) {
    const company = newCompanyDemo({
      ...original.profile,
      name: " Mi empresa ",
      email: " EMPRESA@EJEMPLO.COM ",
      categories: [category],
      cityId: "lujan-ba",
    });
    assert.equal(company.profile.name, "Mi empresa");
    assert.equal(company.profile.email, "empresa@ejemplo.com");
    assert.ok(company.jobs.some((job) => job.category === category));
    assert.ok(company.jobs.every((job) => job.cityId === "lujan-ba"));
    assert.equal(company.members.length, 0);
  }
  for (const changes of [
    { categories: [] },
    { categories: ["otro"] },
    { cityId: "desconocida" },
    { radiusKm: 51 },
    { radiusKm: NaN },
    { email: "invalido" },
  ]) {
    assert.throws(() => validateCompanyProfile({ ...original.profile, ...changes }));
  }
});

test("professional membership validates active trades and duplicate emails", () => {
  let company = initialCompanyDemo();
  const member = { name: " Persona Nueva ", email: " NUEVA@EJEMPLO.COM ", category: "plomeria" };
  company = addCompanyMember(company, member, "nuevo");
  assert.equal(company.members.at(-1).name, "Persona Nueva");
  assert.equal(company.members.at(-1).email, "nueva@ejemplo.com");
  assert.throws(() => addCompanyMember(company, member, "duplicado"), /ya pertenece/);
  assert.throws(() => addCompanyMember(company, { ...member, category: "pintura" }, "otro"));
});

test("quote requires a matching city and service, a new request, and valid amount", () => {
  const company = initialCompanyDemo();
  for (const amount of [0, 0.001, -1, Infinity, NaN, 1_000_000_001]) {
    assert.throws(() => quoteCompanyJob(company, "EMP-1009", amount));
  }
  assert.throws(() => quoteCompanyJob(company, "EMP-1003", 45000));
  assert.throws(() =>
    quoteCompanyJob(
      { ...company, profile: { ...company.profile, cityId: "lujan-ba" } },
      "EMP-1009",
      45000,
    ),
  );
  const quoted = quoteCompanyJob(company, "EMP-1009", 45000.125);
  assert.equal(quoted.jobs.find((job) => job.id === "EMP-1009").amount, 45000.13);
  assert.equal(quoted.jobs.find((job) => job.id === "EMP-1009").status, "presupuestada");
  assert.throws(() => quoteCompanyJob(quoted, "EMP-1009", 47000));
});

test("client acceptance precedes assignment; professional must match trade and be available", () => {
  let company = quoteCompanyJob(initialCompanyDemo(), "EMP-1009", 45000);
  assert.throws(() => assignCompanyJob(company, "EMP-1009", "empresa-pro-3"));
  company = advanceCompanyJob(company, "EMP-1009");
  assert.throws(() => advanceCompanyJob(company, "EMP-1009"), /Asigná/);
  assert.throws(() => assignCompanyJob(company, "EMP-1009", "empresa-pro-2"), /oficio/);
  assert.throws(() => assignCompanyJob(company, "EMP-1009", "empresa-pro-3"), /disponible/);
  assert.throws(() => assignCompanyJob(company, "EMP-1009", "empresa-pro-1"), /ya tiene/);
  company = addCompanyMember(
    company,
    { name: "Nueva Persona", email: "nueva@ejemplo.com", category: "plomeria" },
    "nuevo",
  );
  assert.throws(() => assignCompanyJob(company, "EMP-1009", "nuevo"), /DNI y selfie/);
  company = assignCompanyJob(company, "EMP-1009", "nuevo", ["nuevo"]);
  assert.throws(() => advanceCompanyJob(company, "EMP-1009"), /identidad/);
  assert.equal(memberIsBusy(company, "nuevo"), true);
  assert.throws(() => advanceCompanyJob(company, "EMP-1009", ["nuevo"]), /horario/);
  company = scheduleCompanyJob(company, "EMP-1009", { date: "2099-01-01", time: "10:00", minutes: 60 });
  company = advanceCompanyJob(company, "EMP-1009", ["nuevo"]);
  assert.equal(company.jobs.find((job) => job.id === "EMP-1009").status, "en-curso");
  assert.throws(() => assignCompanyJob(company, "EMP-1009", "nuevo"));
  company = advanceCompanyJob(company, "EMP-1009");
  assert.equal(company.jobs.find((job) => job.id === "EMP-1009").status, "finalizada");
  assert.equal(memberIsBusy(company, "nuevo"), false);
  assert.throws(() => advanceCompanyJob(company, "EMP-1009"));
});

test("pausing a service preserves contracted work and stored state rejects malformed data", () => {
  const company = initialCompanyDemo();
  const changed = {
    ...company,
    profile: validateCompanyProfile({ ...company.profile, categories: ["electricidad"] }),
  };
  assert.equal(changed.jobs.find((job) => job.id === "EMP-1001").memberId, "empresa-pro-1");
  assert.ok(isCompanyDemo(JSON.parse(JSON.stringify(company))));
  assert.ok(isCompanyDemo(changed));
  for (const data of [
    null,
    {},
    { ...company, members: [{}] },
    { ...company, jobs: [{ ...company.jobs[0], status: "invalido" }] },
    { ...company, jobs: [{ ...company.jobs[0], memberId: "otro" }] },
  ]) {
    assert.equal(isCompanyDemo(data), false);
  }
});
