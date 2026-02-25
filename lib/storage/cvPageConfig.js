/**
 * CV page configuration storage
 * @module storage/cvPageConfig
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

/**
 * Get collection reference
 * @param {object} application - Application instance
 * @returns {Collection} MongoDB collection
 */
function getCollection(application) {
  const db = application.getCvDb();
  return db.collection("cvPageConfig");
}

/**
 * Get the current CV page configuration
 * @param {object} application - Application instance
 * @returns {Promise<object|null>} Config or null
 */
export async function getConfig(application) {
  const collection = getCollection(application);
  return collection.findOne({ _id: "cv-page" });
}

/**
 * Save CV page configuration
 * @param {object} application - Application instance
 * @param {object} config - Configuration data
 * @returns {Promise<object>} Saved config
 */
export async function saveConfig(application, config) {
  const collection = getCollection(application);
  const now = new Date().toISOString();

  const document = {
    _id: "cv-page",
    layout: config.layout || "single-column",
    hero: config.hero || { enabled: true, showSocial: true },
    sections: config.sections || [],
    sidebar: config.sidebar || [],
    footer: config.footer || [],
    identity: config.identity || null,
    updatedAt: now,
  };

  await collection.replaceOne({ _id: "cv-page" }, document, { upsert: true });

  // Write JSON file for Eleventy to pick up
  await writeConfigFile(application, document);

  return document;
}

/**
 * Write configuration to JSON file in content directory
 * This triggers Eleventy rebuild via file watcher
 * @param {object} application - Application instance
 * @param {object} config - Configuration data
 */
export async function writeConfigFile(application, config) {
  const contentDir = application.contentDir || "/app/data/content";
  const configDir = join(contentDir, ".indiekit");
  const configPath = join(configDir, "cv-page.json");

  // Ensure directory exists
  try {
    mkdirSync(configDir, { recursive: true });
  } catch {
    // Directory may already exist
  }

  // Write config (excluding MongoDB-specific fields)
  const fileConfig = {
    layout: config.layout,
    hero: config.hero,
    sections: config.sections,
    sidebar: config.sidebar,
    footer: config.footer,
    identity: config.identity,
    updatedAt: config.updatedAt,
  };

  writeFileSync(configPath, JSON.stringify(fileConfig, null, 2));
  console.log(`[CV Page] Wrote config to ${configPath}`);
}

/**
 * Get default configuration (replicates current hardcoded cv.njk)
 * @returns {object} Default config
 */
export function getDefaultConfig() {
  return {
    layout: "single-column",
    hero: {
      enabled: true,
      showSocial: true,
    },
    sections: [
      { type: "cv-experience-work", config: {} },
      { type: "cv-skills-work", config: {} },
      { type: "cv-projects-work", config: {} },
      { type: "cv-education-work", config: {} },
      { type: "cv-languages", config: {} },
      { type: "cv-interests-work", config: {} },
    ],
    sidebar: [],
    footer: [],
  };
}
