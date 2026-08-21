import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync, statSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeCvFile } from "../lib/storage/cv.js";

// writeCvFile must be idempotent. Every container start rehydrates cv.json from
// MongoDB with byte-identical content; because the theme reads it as Eleventy
// GLOBAL DATA, an mtime bump alone makes the watcher do a FULL rebuild
// (measured 2026-08-20 on rmendes: 3420 pages, ~138-180s, zero data change).
// A real save still propagates: saveCvData() stamps `lastUpdated`, so the JSON
// always differs when something actually changed.

const appWith = () => ({ contentDir: mkdtempSync(join(tmpdir(), "cv-test-")) });
const cvPath = (app) => join(app.contentDir, "_data", "cv.json");
const cleanup = (app) => rmSync(app.contentDir, { recursive: true, force: true });

test("writes the file when it does not exist yet", () => {
  const app = appWith();
  try {
    writeCvFile(app, { name: "Ada" });
    assert.equal(JSON.parse(readFileSync(cvPath(app), "utf8")).name, "Ada");
  } finally { cleanup(app); }
});

test("strips MongoDB _id from the written file", () => {
  const app = appWith();
  try {
    writeCvFile(app, { _id: "cv", name: "Ada" });
    const written = JSON.parse(readFileSync(cvPath(app), "utf8"));
    assert.equal(written._id, undefined);
    assert.equal(written.name, "Ada");
  } finally { cleanup(app); }
});

test("identical rewrite does NOT touch the file (the boot-rehydration case)", async () => {
  const app = appWith();
  try {
    writeCvFile(app, { _id: "cv", name: "Ada", lastUpdated: "2026-01-01T00:00:00.000Z" });
    const before = statSync(cvPath(app)).mtimeMs;
    await new Promise((r) => setTimeout(r, 20));
    // Same document again, exactly as the startup gate replays it from Mongo.
    writeCvFile(app, { _id: "cv", name: "Ada", lastUpdated: "2026-01-01T00:00:00.000Z" });
    assert.equal(statSync(cvPath(app)).mtimeMs, before, "mtime moved — would trigger a full rebuild");
  } finally { cleanup(app); }
});

test("a real change still writes and moves mtime", async () => {
  const app = appWith();
  try {
    writeCvFile(app, { name: "Ada", lastUpdated: "2026-01-01T00:00:00.000Z" });
    const before = statSync(cvPath(app)).mtimeMs;
    await new Promise((r) => setTimeout(r, 20));
    writeCvFile(app, { name: "Ada", lastUpdated: "2026-02-02T00:00:00.000Z" });
    assert.notEqual(statSync(cvPath(app)).mtimeMs, before, "a real save must propagate");
    assert.equal(JSON.parse(readFileSync(cvPath(app), "utf8")).lastUpdated, "2026-02-02T00:00:00.000Z");
  } finally { cleanup(app); }
});

test("rewrites when the file was corrupted or truncated externally", () => {
  const app = appWith();
  try {
    writeCvFile(app, { name: "Ada" });
    writeFileSync(cvPath(app), "{ this is not json");
    writeCvFile(app, { name: "Ada" });
    assert.equal(JSON.parse(readFileSync(cvPath(app), "utf8")).name, "Ada");
  } finally { cleanup(app); }
});
