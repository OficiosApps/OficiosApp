import assert from "node:assert/strict";
import test from "node:test";
import { addDays, availableHours, localToday, scheduleLabel, validSchedule, weekStart } from "../src/lib/request-planning.ts";

test("weekly calendar starts Monday, crosses month/year boundaries, and uses Argentina timezone", () => {
  assert.equal(weekStart("2026-11-15"), "2026-11-09");
  assert.equal(addDays("2026-12-30", 7), "2027-01-06");
  assert.equal(localToday(new Date("2026-11-12T01:00:00Z")), "2026-11-11");
});

test("past hours and dates are excluded; each shift has its own hours", () => {
  const now = new Date("2026-11-11T18:30:00Z"); // 15:30 in Argentina
  assert.deepEqual(availableHours("2026-11-10", "tarde", now), []);
  assert.deepEqual(availableHours("2026-11-11", "manana", now), []);
  assert.deepEqual(availableHours("2026-11-11", "tarde", now), ["16:00", "17:00"]);
  assert.deepEqual(availableHours("2026-11-12", "noche", now), ["18:00", "19:00", "20:00", "21:00"]);
  assert.deepEqual(availableHours("2027-01-20", "manana", now), []);
});

test("planned requests require a valid shift or a matching exact hour", () => {
  const now = new Date("2026-11-11T15:00:00Z");
  assert.equal(validSchedule(null, now), false);
  const shift = { date: "2026-11-12", period: "manana", hour: "", mode: "turno" };
  assert.equal(validSchedule(shift, now), true);
  assert.equal(validSchedule({ ...shift, mode: "hora" }, now), false);
  assert.equal(validSchedule({ ...shift, mode: "hora", hour: "09:00" }, now), true);
  assert.equal(validSchedule({ ...shift, mode: "hora", hour: "21:00" }, now), false);
  assert.match(scheduleLabel(shift), /Mañana/);
  assert.match(scheduleLabel({ ...shift, mode: "hora", hour: "09:00" }), /09:00/);
});
