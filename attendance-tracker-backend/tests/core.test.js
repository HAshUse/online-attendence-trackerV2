import test from "node:test";
import assert from "node:assert/strict";
import { parseISTDateTime } from "../controllers/classController.js";
import Student from "../models/Student.js";
import collegeRoutes from "../routes/collegeRoutes.js";
import branchRoutes from "../routes/branchRoutes.js";
import classRoutes from "../routes/classRoutes.js";
import attendanceRoutes from "../routes/attendanceRoutes.js";
import teacherRoutes from "../routes/teacherRoutes.js";
import branchAnalyticsRoutes from "../routes/branchAnalyticsRoutes.js";
import adminRoutes from "../routes/adminRoutes.js";

const getRoutePaths = (router) =>
  router.stack
    .filter((layer) => layer.route)
    .flatMap((layer) =>
      Object.keys(layer.route.methods).map((m) => `${m.toUpperCase()} ${layer.route.path}`)
    );

test("parseISTDateTime parses date and time in IST (+05:30)", () => {
  const dt = parseISTDateTime("2026-11-25", "14:30");
  // 14:30 IST = 09:00 UTC
  assert.equal(dt.toISOString(), "2026-11-25T09:00:00.000Z");
});

test("Student email schema enforces lowercase and trim", () => {
  const emailPath = Student.schema.path("email");
  assert.equal(emailPath.options.lowercase, true);
  assert.equal(emailPath.options.trim, true);
});

test("collegeRoutes exposes both RESTful and legacy endpoints", () => {
  const routes = getRoutePaths(collegeRoutes);
  assert.ok(routes.includes("GET /"));
  assert.ok(routes.includes("POST /"));
  assert.ok(routes.includes("POST /create"));
  assert.ok(routes.includes("DELETE /:id"));
  assert.ok(routes.includes("DELETE /delete/:id"));
});

test("branchRoutes exposes both RESTful and legacy endpoints", () => {
  const routes = getRoutePaths(branchRoutes);
  assert.ok(routes.includes("POST /"));
  assert.ok(routes.includes("POST /create"));
  assert.ok(routes.includes("GET /my"));
  assert.ok(routes.includes("PUT /:id"));
  assert.ok(routes.includes("DELETE /:id"));
  assert.ok(routes.includes("DELETE /delete/:id"));
  assert.ok(routes.includes("GET /:id"));
});

test("core routes load without missing controller exports", () => {
  assert.ok(getRoutePaths(classRoutes).includes("POST /create"));
  assert.ok(getRoutePaths(attendanceRoutes).includes("POST /mark"));
  assert.ok(getRoutePaths(attendanceRoutes).includes("GET /overall/export/:branchId"));
  assert.ok(getRoutePaths(teacherRoutes).includes("POST /login"));
  assert.ok(getRoutePaths(branchAnalyticsRoutes).includes("GET /:branchId/analytics"));
  assert.ok(getRoutePaths(adminRoutes).includes("POST /login"));
  assert.ok(getRoutePaths(adminRoutes).includes("GET /overview"));
  assert.ok(getRoutePaths(adminRoutes).includes("GET /branches/:branchId/analytics"));
  assert.ok(getRoutePaths(adminRoutes).includes("GET /classes/:classId"));
  assert.ok(getRoutePaths(adminRoutes).includes("DELETE /facilitators/:id"));
});
