import { test } from "node:test";
import assert from "node:assert/strict";
import { CV_BLOCKS } from "../lib/blocks.js";

// Phase 7 — CV v2 `get blocks()`. These assertions replicate the invariants of
// site-config's `validBlockEntry` (lib/discovery/block-entry.js) + the schema
// meta-validator (lib/validators/block-schema.js). The canonical validator lives
// in site-config (not a CV dependency), so we encode the contract here.

const KEBAB_ID = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const REGIONS = new Set(["main", "sidebar", "footer", "hero"]);
const SURFACES = new Set(["homepage", "collection", "postType", "standalone"]);
const DATA_SOURCES = new Set(["file", "collections", "config", "api"]);
const SCHEMA_PROP_TYPES = new Set(["string", "integer", "number", "boolean", "array"]);

// The 15 existing homepageSections ids — a HARD contract (stored cvPageConfig
// docs + theme filename-convention partials). The migration must preserve them.
const EXPECTED_IDS = [
  "cv-experience", "cv-skills", "cv-education",
  "cv-projects-personal", "cv-projects-work",
  "cv-interests",
  "cv-experience-personal", "cv-experience-work",
  "cv-education-personal", "cv-education-work",
  "cv-skills-personal", "cv-skills-work",
  "cv-interests-personal", "cv-interests-work",
  "cv-languages",
];

test("CV_BLOCKS: exactly the 15 section ids, unchanged", () => {
  assert.equal(CV_BLOCKS.length, 15);
  assert.deepEqual(CV_BLOCKS.map((b) => b.id).sort(), [...EXPECTED_IDS].sort());
});

test("CV_BLOCKS: every entry satisfies the v2 block contract", () => {
  for (const b of CV_BLOCKS) {
    assert.ok(KEBAB_ID.test(b.id), `${b.id}: id must be kebab`);
    assert.ok(Number.isInteger(b.version) && b.version >= 1, `${b.id}: version >= 1`);
    assert.ok(typeof b.label === "string" && b.label.length > 0, `${b.id}: label`);
    // placement
    assert.ok(Array.isArray(b.placement.regions) && b.placement.regions.length > 0, `${b.id}: regions`);
    assert.ok(b.placement.regions.every((r) => REGIONS.has(r)), `${b.id}: regions vocab`);
    assert.ok(Array.isArray(b.placement.surfaces), `${b.id}: surfaces array`);
    assert.ok(b.placement.surfaces.every((s) => SURFACES.has(s)), `${b.id}: surfaces vocab`);
    // data
    assert.ok(DATA_SOURCES.has(b.data.source), `${b.id}: data.source`);
    if (b.data.source === "file") assert.ok(typeof b.data.file === "string" && b.data.file, `${b.id}: data.file`);
    // multiple
    assert.equal(typeof b.multiple, "boolean", `${b.id}: multiple boolean`);
    // schema (frozen subset)
    assert.equal(b.schema.type, "object", `${b.id}: schema.type object`);
    assert.equal(b.schema.additionalProperties, false, `${b.id}: additionalProperties false`);
    assert.ok(b.schema.properties && typeof b.schema.properties === "object", `${b.id}: properties`);
    assert.ok(!("required" in b.schema), `${b.id}: NO required (legacy configs omit fields)`);
    for (const [key, prop] of Object.entries(b.schema.properties)) {
      assert.ok(SCHEMA_PROP_TYPES.has(prop.type), `${b.id}.${key}: prop type`);
    }
    // defaultConfig (if present) must validate against schema (keys subset of properties)
    if (b.defaultConfig !== undefined) {
      assert.equal(typeof b.defaultConfig, "object", `${b.id}: defaultConfig object`);
      for (const k of Object.keys(b.defaultConfig)) {
        assert.ok(k in b.schema.properties, `${b.id}: defaultConfig.${k} in schema`);
      }
    }
  }
});

test("CV_BLOCKS: all placeable on homepage AND standalone (the migration's point)", () => {
  for (const b of CV_BLOCKS) {
    assert.ok(b.placement.surfaces.includes("homepage"), `${b.id}: homepage`);
    assert.ok(b.placement.surfaces.includes("standalone"), `${b.id}: standalone`);
  }
});

test("CV_BLOCKS: data contract points at cv.json; bespoke (no generic renderer)", () => {
  for (const b of CV_BLOCKS) {
    assert.deepEqual(b.data, { source: "file", file: "cv.json" }, `${b.id}: data`);
    assert.ok(!b.render, `${b.id}: no render.renderer (bespoke theme partial)`);
    assert.equal(b.multiple, false, `${b.id}: single instance per page`);
  }
});

test("CV_BLOCKS: config-bearing sections carry the right schema + defaults", () => {
  const byId = Object.fromEntries(CV_BLOCKS.map((b) => [b.id, b]));
  // experience variants → maxItems + showHighlights
  for (const id of ["cv-experience", "cv-experience-personal", "cv-experience-work"]) {
    const p = byId[id].schema.properties;
    assert.equal(p.maxItems.type, "integer", `${id}.maxItems integer`);
    assert.equal(p.maxItems.minimum, 1);
    assert.equal(p.maxItems.maximum, 50);
    assert.equal(p.maxItems.default, 10);
    assert.equal(p.showHighlights.type, "boolean");
    assert.deepEqual(byId[id].defaultConfig, { maxItems: 10, showHighlights: true });
  }
  // project variants → maxItems + showTechnologies
  for (const id of ["cv-projects-personal", "cv-projects-work"]) {
    const p = byId[id].schema.properties;
    assert.equal(p.maxItems.type, "integer");
    assert.equal(p.showTechnologies.type, "boolean");
    assert.deepEqual(byId[id].defaultConfig, { maxItems: 10, showTechnologies: true });
  }
  // config-less section → empty properties, no defaultConfig
  assert.deepEqual(byId["cv-skills"].schema.properties, {});
  assert.equal(byId["cv-skills"].defaultConfig, undefined);
});
