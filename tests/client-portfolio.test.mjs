import assert from "node:assert/strict";
import test from "node:test";
import { cancelPortfolioJob, completePortfolioJob, contactIds, initialClientPortfolio, isClientPortfolio, markContactMessagesRead, registerContract, sendContactMessage, unreadContactMessages } from "../src/lib/client-portfolio.ts";

const contract = { requestKey: "SOL-1042:instance-1", requestId: "SOL-1042", professionalId: "pro-4", quoteId: "budget-1", service: "Pintura del living" };

test("cancellation preserves the professional contact but cannot be completed as a worked job", () => {
  const hired = registerContract(initialClientPortfolio(), contract, "cancelled-job");
  const cancelled = cancelPortfolioJob(hired, contract.requestKey);
  assert.ok(contactIds(cancelled).includes("pro-4"));
  assert.equal(cancelled.jobs.find((job) => job.id === "cancelled-job").status, "cancelado");
  assert.throws(() => completePortfolioJob(cancelled, contract.requestKey));
  assert.ok(isClientPortfolio(cancelled));
});

test("portfolio contains the client's prior contractors, with one contact per professional", () => {
  const p = initialClientPortfolio();
  assert.equal(contactIds(p).length, 3);
  assert.equal(p.jobs.filter((job) => job.professionalId === "pro-1").length, 2);
  assert.ok(isClientPortfolio(JSON.parse(JSON.stringify(p))));
  assert.equal(isClientPortfolio({ ...p, clientId: "another-client" }), false);
});

test("hiring adds a contact and finishing preserves its history; retries are idempotent", () => {
  const first = registerContract(initialClientPortfolio(), contract, "job-1", 1000);
  assert.ok(contactIds(first).includes("pro-4"));
  assert.equal(registerContract(first, contract, "retry", 1100), first);
  assert.throws(() => registerContract(first, { ...contract, professionalId: "pro-5", quoteId: "different" }, "bad"));
  assert.throws(() => registerContract(first, { ...contract, professionalId: "unknown" }, "bad"));
  const completed = completePortfolioJob(first, contract.requestKey, 2000);
  assert.equal(completed.jobs.find((job) => job.id === "job-1").status, "finalizado");
  assert.equal(completePortfolioJob(completed, contract.requestKey, 3000), completed);
  assert.equal(registerContract(completed, contract, "retry", 3000), completed);
  assert.throws(() => completePortfolioJob(completed, "not-hired"));
  const again = registerContract(completed, { ...contract, requestKey: "SOL-1042:instance-2" }, "job-2", 4000);
  assert.equal(again.jobs.filter((job) => job.professionalId === "pro-4").length, 2);
  assert.equal(contactIds(again).filter((id) => id === "pro-4").length, 1);
});

test("messaging requires a prior contract and stays in its own professional conversation", () => {
  let p = initialClientPortfolio();
  assert.throws(() => sendContactMessage(p, "pro-8", "cliente", "Hola", "m1"));
  assert.throws(() => sendContactMessage(p, "pro-1", "cliente", " ", "m1"));
  assert.throws(() => sendContactMessage(p, "pro-1", "cliente", "x".repeat(2001), "m1"));
  assert.throws(() => sendContactMessage(p, "pro-1", "admin", "Hola", "m1"));
  p = sendContactMessage(p, "pro-2", "cliente", " ¿Podés venir de nuevo? ", "client-message", 1000);
  assert.equal(p.conversations["pro-2"][0].text, "¿Podés venir de nuevo?");
  assert.equal(p.conversations["pro-1"].length, 2);
  assert.equal(unreadContactMessages(p, "pro-2", "profesional"), 1);
  assert.equal(unreadContactMessages(p, "pro-2", "cliente"), 0);
  assert.equal(sendContactMessage(p, "pro-2", "cliente", "retry", "client-message"), p);
  p = markContactMessagesRead(p, "pro-2", "profesional");
  assert.equal(unreadContactMessages(p, "pro-2", "profesional"), 0);
  p = sendContactMessage(p, "pro-2", "profesional", "Sí, coordinemos una nueva visita.", "pro-message", 2000);
  assert.equal(unreadContactMessages(p, "pro-2", "cliente"), 1);
  const restored = JSON.parse(JSON.stringify(p));
  assert.ok(isClientPortfolio(restored));
  assert.equal(restored.conversations["pro-2"].length, 2);
  assert.equal(unreadContactMessages(markContactMessagesRead(restored, "pro-2", "cliente"), "pro-2", "cliente"), 0);
});

test("stored conversations cannot reference a professional outside the client's history", () => {
  const p = initialClientPortfolio();
  assert.equal(isClientPortfolio({ ...p, conversations: { ...p.conversations, "pro-8": [] } }), false);
  assert.equal(isClientPortfolio({ ...p, jobs: [{ ...p.jobs[0], professionalId: "unknown" }] }), false);
});
