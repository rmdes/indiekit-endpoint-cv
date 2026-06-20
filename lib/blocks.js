/**
 * CV v2 block declarations (Phase 7 — CV → v2-blocks migration).
 *
 * Replaces the legacy `homepageSections` getter with a real `get blocks()`
 * contract so CV sections are placeable on the `standalone` page surface (a
 * `page:cv` composition), not just the homepage. IDs are UNCHANGED — they are a
 * hard contract with stored `cvPageConfig` docs and the theme's filename-
 * convention partials (`sections/cv-<id>.njk`), which already read the global
 * `cv` data. So these blocks are BESPOKE-template (no generic `render.renderer`):
 * the theme owns the markup; `data.source:"file" cv.json` documents the
 * dependency. Schemas are the frozen JSON-Schema subset enforced by
 * site-config's `block-schema.js` (no `required` — legacy configs omit fields).
 *
 * @module lib/blocks
 */

// Schema per config-kind. maxItems is a count → `integer` (was legacy `number`);
// legacy `label`→`title`, `min/max`→`minimum/maximum`; defaults pulled from the
// legacy defaultConfig.
const SCHEMAS = {
  none: { type: "object", additionalProperties: false, properties: {} },
  itemsHighlights: {
    type: "object",
    additionalProperties: false,
    properties: {
      maxItems: { type: "integer", title: "Max items", minimum: 1, maximum: 50, default: 10 },
      showHighlights: { type: "boolean", title: "Show highlights", default: true },
    },
  },
  itemsTechnologies: {
    type: "object",
    additionalProperties: false,
    properties: {
      maxItems: { type: "integer", title: "Max items", minimum: 1, maximum: 50, default: 10 },
      showTechnologies: { type: "boolean", title: "Show technologies", default: true },
    },
  },
};

const DEFAULT_CONFIGS = {
  none: undefined, // omit defaultConfig for config-less sections
  itemsHighlights: { maxItems: 10, showHighlights: true },
  itemsTechnologies: { maxItems: 10, showTechnologies: true },
};

// The 15 sections, faithful to the legacy `homepageSections` (id/label/desc/icon
// preserved). `config` selects the schema/defaults kind above.
const SECTIONS = [
  { id: "cv-experience", label: "Experience (All)", description: "All experience items (personal and work)", icon: "briefcase", config: "itemsHighlights" },
  { id: "cv-skills", label: "Skills (All)", description: "All skills grouped by category", icon: "zap", config: "none" },
  { id: "cv-education", label: "Education (All)", description: "All education items", icon: "book", config: "none" },
  { id: "cv-projects-personal", label: "Personal Projects", description: "Personal and side projects", icon: "folder", config: "itemsTechnologies" },
  { id: "cv-projects-work", label: "Work Projects", description: "Professional and work-related projects", icon: "briefcase", config: "itemsTechnologies" },
  { id: "cv-interests", label: "Interests (All)", description: "All interests and hobbies", icon: "heart", config: "none" },
  { id: "cv-experience-personal", label: "Personal Experience", description: "Volunteer work and side projects", icon: "heart", config: "itemsHighlights" },
  { id: "cv-experience-work", label: "Work Experience", description: "Professional experience timeline", icon: "briefcase", config: "itemsHighlights" },
  { id: "cv-education-personal", label: "Personal Education", description: "Self-study and online courses", icon: "heart", config: "none" },
  { id: "cv-education-work", label: "Work Education", description: "Degrees and certifications", icon: "book", config: "none" },
  { id: "cv-skills-personal", label: "Personal Skills", description: "Personal and hobby-related skills", icon: "heart", config: "none" },
  { id: "cv-skills-work", label: "Professional Skills", description: "Work-related technical skills", icon: "zap", config: "none" },
  { id: "cv-interests-personal", label: "Personal Interests", description: "Personal hobbies and interests", icon: "heart", config: "none" },
  { id: "cv-interests-work", label: "Professional Interests", description: "Work-related interests and topics", icon: "briefcase", config: "none" },
  { id: "cv-languages", label: "Languages", description: "Language proficiency list", icon: "globe", config: "none" },
];

/**
 * The CV plugin's v2 block catalog entries. Consumed by site-config's
 * `scanPlugins` via the `get blocks()` getter on the endpoint class.
 * @type {Array<object>}
 */
export const CV_BLOCKS = SECTIONS.map((s) => {
  const block = {
    id: s.id,
    version: 1,
    label: s.label,
    description: s.description,
    icon: s.icon,
    category: "content",
    placement: { regions: ["main"], surfaces: ["homepage", "standalone"] },
    multiple: false,
    data: { source: "file", file: "cv.json" },
    schema: SCHEMAS[s.config],
  };
  const defaultConfig = DEFAULT_CONFIGS[s.config];
  if (defaultConfig !== undefined) block.defaultConfig = defaultConfig;
  return block;
});
