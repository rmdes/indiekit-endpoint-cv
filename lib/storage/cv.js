/**
 * CV data storage
 * Single MongoDB document with five collections:
 * experience, projects, skills, education, languages, interests
 * @module storage/cv
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Get collection reference
 * @param {object} application - Application instance
 * @returns {Collection} MongoDB collection
 */
function getCollection(application) {
  const db = application.getCvDb();
  return db.collection("cvData");
}

/**
 * Get the full CV data
 * @param {object} application - Application instance
 * @returns {Promise<object|null>} CV data or null
 */
export async function getCvData(application) {
  const collection = getCollection(application);
  return collection.findOne({ _id: "cv" });
}

/**
 * Save full CV data
 * @param {object} application - Application instance
 * @param {object} data - CV data object
 * @returns {Promise<object>} Saved document
 */
export async function saveCvData(application, data) {
  const collection = getCollection(application);
  const now = new Date().toISOString();

  const document = {
    _id: "cv",
    experience: data.experience || [],
    projects: data.projects || [],
    skills: data.skills || {},
    skillTypes: data.skillTypes || {},
    education: data.education || [],
    languages: data.languages || [],
    interests: migrateInterests(data.interests, data.interestTypes),
    interestTypes: migrateInterestTypes(data.interests, data.interestTypes),
    lastUpdated: now,
  };

  await collection.replaceOne({ _id: "cv" }, document, { upsert: true });

  // Write JSON file for Eleventy to pick up
  writeCvFile(application, document);

  return document;
}

/**
 * Get default empty CV data
 * @returns {object} Empty CV structure
 */
export function getDefaultCvData() {
  return {
    experience: [],
    projects: [],
    skills: {},
    skillTypes: {},
    education: [],
    languages: [],
    interests: {},
    interestTypes: {},
    lastUpdated: null,
  };
}

// --- Section-level helpers ---

/**
 * Add an item to a CV array section
 * @param {object} application - Application instance
 * @param {string} section - Section name (experience, projects, education, languages)
 * @param {object} item - Item to add
 */
export async function addToSection(application, section, item) {
  const data = (await getCvData(application)) || getDefaultCvData();
  if (!Array.isArray(data[section])) {
    data[section] = [];
  }
  data[section].push(item);
  return saveCvData(application, data);
}

/**
 * Update an item in a CV array section by index
 * @param {object} application - Application instance
 * @param {string} section - Section name
 * @param {number} index - Index to update
 * @param {object} item - Updated item data
 */
export async function updateInSection(application, section, index, item) {
  const data = (await getCvData(application)) || getDefaultCvData();
  if (Array.isArray(data[section]) && index >= 0 && index < data[section].length) {
    data[section][index] = item;
  }
  return saveCvData(application, data);
}

/**
 * Remove an item from a CV array section by index
 * @param {object} application - Application instance
 * @param {string} section - Section name
 * @param {number} index - Index to remove
 */
export async function removeFromSection(application, section, index) {
  const data = (await getCvData(application)) || getDefaultCvData();
  if (Array.isArray(data[section]) && index >= 0 && index < data[section].length) {
    data[section].splice(index, 1);
  }
  return saveCvData(application, data);
}

/**
 * Move an item up or down in a CV array section
 * @param {object} application - Application instance
 * @param {string} section - Section name
 * @param {number} index - Current index
 * @param {string} direction - "up" or "down"
 */
export async function moveInSection(application, section, index, direction) {
  const data = (await getCvData(application)) || getDefaultCvData();
  const arr = data[section];
  if (!Array.isArray(arr)) return data;

  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= arr.length) return data;

  // Swap items
  [arr[index], arr[targetIndex]] = [arr[targetIndex], arr[index]];
  return saveCvData(application, data);
}

/**
 * Add a skill category
 * @param {object} application - Application instance
 * @param {string} category - Category name
 * @param {string[]} items - Skills in this category
 * @param {string} skillType - Type of skill (personal or work)
 */
export async function addSkillCategory(application, category, items, skillType) {
  const data = (await getCvData(application)) || getDefaultCvData();
  if (typeof data.skills !== "object" || Array.isArray(data.skills)) {
    data.skills = {};
  }
  if (typeof data.skillTypes !== "object" || Array.isArray(data.skillTypes)) {
    data.skillTypes = {};
  }
  data.skills[category] = items;
  data.skillTypes[category] = skillType || "personal";
  return saveCvData(application, data);
}

/**
 * Edit a skill category (supports renaming)
 * @param {object} application - Application instance
 * @param {string} oldCategory - Current category name
 * @param {string} newCategory - New category name
 * @param {string[]} items - Updated skills list
 * @param {string} skillType - Type of skill (personal or work)
 */
export async function editSkillCategory(application, oldCategory, newCategory, items, skillType) {
  const data = (await getCvData(application)) || getDefaultCvData();
  if (typeof data.skills !== "object" || Array.isArray(data.skills)) {
    data.skills = {};
  }
  if (typeof data.skillTypes !== "object" || Array.isArray(data.skillTypes)) {
    data.skillTypes = {};
  }
  // If renamed, delete old keys
  if (oldCategory !== newCategory && data.skills[oldCategory]) {
    delete data.skills[oldCategory];
  }
  if (oldCategory !== newCategory && data.skillTypes[oldCategory]) {
    delete data.skillTypes[oldCategory];
  }
  data.skills[newCategory] = items;
  data.skillTypes[newCategory] = skillType || "personal";
  return saveCvData(application, data);
}

/**
 * Remove a skill category
 * @param {object} application - Application instance
 * @param {string} category - Category name to remove
 */
export async function removeSkillCategory(application, category) {
  const data = (await getCvData(application)) || getDefaultCvData();
  if (data.skills && data.skills[category]) {
    delete data.skills[category];
  }
  if (data.skillTypes && data.skillTypes[category]) {
    delete data.skillTypes[category];
  }
  return saveCvData(application, data);
}

// --- Interest category helpers (mirrors skills) ---

/**
 * Migrate flat interests array to category-based object
 * Old format: ["Docker", "Books"] + { "Docker": "work", "Books": "personal" }
 * New format: { "Work": ["Docker"], "Personal": ["Books"] }
 * @param {Array|object} interests - Interests data (array = old, object = new)
 * @param {object} interestTypes - Interest type mapping
 * @returns {object} Category-based interests object
 */
function migrateInterests(interests, interestTypes) {
  if (!interests) return {};

  // Already migrated — object with category keys
  if (!Array.isArray(interests)) {
    return typeof interests === "object" ? interests : {};
  }

  // Old format — flat array, group by type into categories
  if (interests.length === 0) return {};

  const types = interestTypes || {};
  const groups = {};
  for (const interest of interests) {
    const type = types[interest] || "personal";
    const category = type === "work" ? "Work" : "Personal";
    if (!groups[category]) groups[category] = [];
    groups[category].push(interest);
  }
  return groups;
}

/**
 * Migrate flat interestTypes map to category-based map
 * Old format: { "Docker": "work", "Books": "personal" }
 * New format: { "Work": "work", "Personal": "personal" }
 * @param {Array|object} interests - Interests data
 * @param {object} interestTypes - Interest type mapping
 * @returns {object} Category-based type mapping
 */
function migrateInterestTypes(interests, interestTypes) {
  if (!interests) return {};

  // Already migrated — interests is an object, types should be too
  if (!Array.isArray(interests)) {
    return typeof interestTypes === "object" ? interestTypes : {};
  }

  // Old format — derive category types from grouped interests
  if (interests.length === 0) return {};

  const types = interestTypes || {};
  const categoryTypes = {};
  for (const interest of interests) {
    const type = types[interest] || "personal";
    const category = type === "work" ? "Work" : "Personal";
    categoryTypes[category] = type;
  }
  return categoryTypes;
}

/**
 * Add an interest category
 * @param {object} application - Application instance
 * @param {string} category - Category name
 * @param {string[]} items - Interests in this category
 * @param {string} interestType - Type of interest (personal or work)
 */
export async function addInterestCategory(application, category, items, interestType) {
  const data = (await getCvData(application)) || getDefaultCvData();
  if (typeof data.interests !== "object" || Array.isArray(data.interests)) {
    data.interests = {};
  }
  if (typeof data.interestTypes !== "object" || Array.isArray(data.interestTypes)) {
    data.interestTypes = {};
  }
  data.interests[category] = items;
  data.interestTypes[category] = interestType || "personal";
  return saveCvData(application, data);
}

/**
 * Edit an interest category (supports renaming)
 * @param {object} application - Application instance
 * @param {string} oldCategory - Current category name
 * @param {string} newCategory - New category name
 * @param {string[]} items - Updated interests list
 * @param {string} interestType - Type of interest (personal or work)
 */
export async function editInterestCategory(application, oldCategory, newCategory, items, interestType) {
  const data = (await getCvData(application)) || getDefaultCvData();
  if (typeof data.interests !== "object" || Array.isArray(data.interests)) {
    data.interests = {};
  }
  if (typeof data.interestTypes !== "object" || Array.isArray(data.interestTypes)) {
    data.interestTypes = {};
  }
  // If renamed, delete old keys
  if (oldCategory !== newCategory && data.interests[oldCategory]) {
    delete data.interests[oldCategory];
  }
  if (oldCategory !== newCategory && data.interestTypes[oldCategory]) {
    delete data.interestTypes[oldCategory];
  }
  data.interests[newCategory] = items;
  data.interestTypes[newCategory] = interestType || "personal";
  return saveCvData(application, data);
}

/**
 * Remove an interest category
 * @param {object} application - Application instance
 * @param {string} category - Category name to remove
 */
export async function removeInterestCategory(application, category) {
  const data = (await getCvData(application)) || getDefaultCvData();
  if (data.interests && data.interests[category]) {
    delete data.interests[category];
  }
  if (data.interestTypes && data.interestTypes[category]) {
    delete data.interestTypes[category];
  }
  return saveCvData(application, data);
}

/**
 * Write CV data to JSON file in content directory
 * This triggers Eleventy rebuild via file watcher
 * @param {object} application - Application instance
 * @param {object} data - CV data object
 */
export function writeCvFile(application, data) {
  const contentDir = application.contentDir || "/app/data/content";
  const configDir = join(contentDir, ".indiekit");
  const filePath = join(configDir, "cv.json");

  try {
    mkdirSync(configDir, { recursive: true });
  } catch {
    // Directory may already exist
  }

  // Write data (excluding MongoDB-specific fields)
  const { _id, ...fileData } = data;
  writeFileSync(filePath, JSON.stringify(fileData, null, 2));
  console.log(`[CV] Wrote data to ${filePath}`);
}
