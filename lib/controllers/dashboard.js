/**
 * Dashboard controller
 * Admin UI for CV data management
 */

import {
  getCvData,
  saveCvData,
  getDefaultCvData,
  addToSection,
  updateInSection,
  removeFromSection,
  moveInSection,
  addSkillCategory,
  editSkillCategory,
  removeSkillCategory,
  moveSkillCategoryOrder,
  addInterestCategory,
  editInterestCategory,
  removeInterestCategory,
  moveInterestCategoryOrder,
} from "../storage/cv.js";

export const dashboardController = {
  /**
   * GET / - Main dashboard
   */
  async get(request, response) {
    const { application } = request.app.locals;

    try {
      const data = (await getCvData(application)) || getDefaultCvData();

      response.render("cv-dashboard", {
        title: "CV Editor",
        cv: data,
        cvEndpoint: application.cvEndpoint,
      });
    } catch (error) {
      console.error("[CV] Dashboard error:", error);
      response.status(500).render("error", {
        title: "Error",
        message: "Failed to load CV data",
        error: error.message,
      });
    }
  },

  /**
   * POST /save - Save full CV data (bulk save from form)
   */
  async save(request, response) {
    const { application } = request.app.locals;

    try {
      const body = request.body;

      const data = {
        experience: parseArrayField(body, "experience"),
        projects: parseArrayField(body, "projects"),
        skills: parseSkillsField(body),
        skillTypes: parseSkillTypesField(body),
        education: parseArrayField(body, "education"),
        languages: parseArrayField(body, "languages"),
        interests: parseInterestsField(body),
        interestTypes: parseInterestTypesField(body),
      };

      await saveCvData(application, data);

      response.redirect(application.cvEndpoint + "?saved=1");
    } catch (error) {
      console.error("[CV] Save error:", error);
      response.status(500).render("error", {
        title: "Error",
        message: "Failed to save CV data",
        error: error.message,
      });
    }
  },

  // --- Experience CRUD ---

  async addExperience(request, response) {
    const { application } = request.app.locals;
    try {
      const { title, company, location, startDate, endDate, type, experienceType, description, highlights } =
        request.body;
      await addToSection(application, "experience", {
        title: title || "",
        company: company || "",
        location: location || "",
        startDate: startDate || "",
        endDate: endDate || null,
        type: type || "full-time",
        experienceType: experienceType || "personal",
        description: description || "",
        highlights: parseLines(highlights),
      });
      response.redirect(application.cvEndpoint + "?saved=1#experience");
    } catch (error) {
      console.error("[CV] Add experience error:", error);
      response.redirect(application.cvEndpoint + "?error=1#experience");
    }
  },

  async editExperience(request, response) {
    const { application } = request.app.locals;
    try {
      const index = Number.parseInt(request.params.index, 10);
      const { title, company, location, startDate, endDate, type, experienceType, description, highlights } = request.body;
      await updateInSection(application, "experience", index, {
        title: title || "",
        company: company || "",
        location: location || "",
        startDate: startDate || "",
        endDate: endDate || null,
        type: type || "full-time",
        experienceType: experienceType || "personal",
        description: description || "",
        highlights: parseLines(highlights),
      });
      response.redirect(application.cvEndpoint + "?saved=1#experience");
    } catch (error) {
      console.error("[CV] Edit experience error:", error);
      response.redirect(application.cvEndpoint + "?error=1#experience");
    }
  },

  async deleteExperience(request, response) {
    const { application } = request.app.locals;
    try {
      await removeFromSection(application, "experience", Number.parseInt(request.params.index, 10));
      response.redirect(application.cvEndpoint + "?saved=1#experience");
    } catch (error) {
      console.error("[CV] Delete experience error:", error);
      response.redirect(application.cvEndpoint + "?error=1#experience");
    }
  },

  // --- Projects CRUD ---

  async addProject(request, response) {
    const { application } = request.app.locals;
    try {
      const { name, url, description, tags, technologies, status, projectType, startDate, endDate } = request.body;
      await addToSection(application, "projects", {
        name: name || "",
        url: url || "",
        description: description || "",
        technologies: parseCommaList(tags || technologies),
        status: status || "active",
        projectType: projectType || "personal",
        startDate: startDate || "",
        endDate: endDate || null,
      });
      response.redirect(application.cvEndpoint + "?saved=1#projects");
    } catch (error) {
      console.error("[CV] Add project error:", error);
      response.redirect(application.cvEndpoint + "?error=1#projects");
    }
  },

  async editProject(request, response) {
    const { application } = request.app.locals;
    try {
      const index = Number.parseInt(request.params.index, 10);
      const { name, url, description, tags, status, projectType, startDate, endDate } = request.body;
      await updateInSection(application, "projects", index, {
        name: name || "",
        url: url || "",
        description: description || "",
        technologies: parseCommaList(tags),
        status: status || "active",
        projectType: projectType || "personal",
        startDate: startDate || "",
        endDate: endDate || null,
      });
      response.redirect(application.cvEndpoint + "?saved=1#projects");
    } catch (error) {
      console.error("[CV] Edit project error:", error);
      response.redirect(application.cvEndpoint + "?error=1#projects");
    }
  },

  async deleteProject(request, response) {
    const { application } = request.app.locals;
    try {
      await removeFromSection(application, "projects", Number.parseInt(request.params.index, 10));
      response.redirect(application.cvEndpoint + "?saved=1#projects");
    } catch (error) {
      console.error("[CV] Delete project error:", error);
      response.redirect(application.cvEndpoint + "?error=1#projects");
    }
  },

  // --- Education CRUD ---

  async addEducation(request, response) {
    const { application } = request.app.locals;
    try {
      const { degree, institution, location, startDate, endDate, educationType, description } = request.body;
      await addToSection(application, "education", {
        degree: degree || "",
        institution: institution || "",
        location: location || "",
        startDate: startDate || "",
        endDate: endDate || null,
        educationType: educationType || "personal",
        description: description || "",
      });
      response.redirect(application.cvEndpoint + "?saved=1#education");
    } catch (error) {
      console.error("[CV] Add education error:", error);
      response.redirect(application.cvEndpoint + "?error=1#education");
    }
  },

  async editEducation(request, response) {
    const { application } = request.app.locals;
    try {
      const index = Number.parseInt(request.params.index, 10);
      const { degree, institution, location, startDate, endDate, educationType, description } = request.body;
      await updateInSection(application, "education", index, {
        degree: degree || "",
        institution: institution || "",
        location: location || "",
        startDate: startDate || "",
        endDate: endDate || null,
        educationType: educationType || "personal",
        description: description || "",
      });
      response.redirect(application.cvEndpoint + "?saved=1#education");
    } catch (error) {
      console.error("[CV] Edit education error:", error);
      response.redirect(application.cvEndpoint + "?error=1#education");
    }
  },

  async deleteEducation(request, response) {
    const { application } = request.app.locals;
    try {
      await removeFromSection(application, "education", Number.parseInt(request.params.index, 10));
      response.redirect(application.cvEndpoint + "?saved=1#education");
    } catch (error) {
      console.error("[CV] Delete education error:", error);
      response.redirect(application.cvEndpoint + "?error=1#education");
    }
  },

  // --- Languages CRUD ---

  async addLanguage(request, response) {
    const { application } = request.app.locals;
    try {
      const { name, level } = request.body;
      await addToSection(application, "languages", {
        name: name || "",
        level: level || "intermediate",
      });
      response.redirect(application.cvEndpoint + "?saved=1#languages");
    } catch (error) {
      console.error("[CV] Add language error:", error);
      response.redirect(application.cvEndpoint + "?error=1#languages");
    }
  },

  async editLanguage(request, response) {
    const { application } = request.app.locals;
    try {
      const index = Number.parseInt(request.params.index, 10);
      const { name, level } = request.body;
      await updateInSection(application, "languages", index, {
        name: name || "",
        level: level || "intermediate",
      });
      response.redirect(application.cvEndpoint + "?saved=1#languages");
    } catch (error) {
      console.error("[CV] Edit language error:", error);
      response.redirect(application.cvEndpoint + "?error=1#languages");
    }
  },

  async deleteLanguage(request, response) {
    const { application } = request.app.locals;
    try {
      await removeFromSection(application, "languages", Number.parseInt(request.params.index, 10));
      response.redirect(application.cvEndpoint + "?saved=1#languages");
    } catch (error) {
      console.error("[CV] Delete language error:", error);
      response.redirect(application.cvEndpoint + "?error=1#languages");
    }
  },

  // --- Skills CRUD ---

  async addSkillCategory(request, response) {
    const { application } = request.app.locals;
    try {
      const { category, items, skillType } = request.body;
      await addSkillCategory(application, category || "Uncategorized", parseCommaList(items), skillType);
      response.redirect(application.cvEndpoint + "?saved=1#skills");
    } catch (error) {
      console.error("[CV] Add skill category error:", error);
      response.redirect(application.cvEndpoint + "?error=1#skills");
    }
  },

  async editSkillCategoryHandler(request, response) {
    const { application } = request.app.locals;
    try {
      const oldCategory = decodeURIComponent(request.params.category);
      const { category, items, skillType } = request.body;
      await editSkillCategory(application, oldCategory, category || oldCategory, parseCommaList(items), skillType);
      response.redirect(application.cvEndpoint + "?saved=1#skills");
    } catch (error) {
      console.error("[CV] Edit skill category error:", error);
      response.redirect(application.cvEndpoint + "?error=1#skills");
    }
  },

  async deleteSkillCategory(request, response) {
    const { application } = request.app.locals;
    try {
      await removeSkillCategory(application, decodeURIComponent(request.params.category));
      response.redirect(application.cvEndpoint + "?saved=1#skills");
    } catch (error) {
      console.error("[CV] Delete skill category error:", error);
      response.redirect(application.cvEndpoint + "?error=1#skills");
    }
  },

  // --- Interests CRUD (category-based, mirrors skills) ---

  async addInterestCategory(request, response) {
    const { application } = request.app.locals;
    try {
      const { category, items, interestType } = request.body;
      await addInterestCategory(application, category || "Uncategorized", parseCommaList(items), interestType);
      response.redirect(application.cvEndpoint + "?saved=1#interests");
    } catch (error) {
      console.error("[CV] Add interest category error:", error);
      response.redirect(application.cvEndpoint + "?error=1#interests");
    }
  },

  async editInterestCategoryHandler(request, response) {
    const { application } = request.app.locals;
    try {
      const oldCategory = decodeURIComponent(request.params.category);
      const { category, items, interestType } = request.body;
      await editInterestCategory(application, oldCategory, category || oldCategory, parseCommaList(items), interestType);
      response.redirect(application.cvEndpoint + "?saved=1#interests");
    } catch (error) {
      console.error("[CV] Edit interest category error:", error);
      response.redirect(application.cvEndpoint + "?error=1#interests");
    }
  },

  async deleteInterestCategory(request, response) {
    const { application } = request.app.locals;
    try {
      await removeInterestCategory(application, decodeURIComponent(request.params.category));
      response.redirect(application.cvEndpoint + "?saved=1#interests");
    } catch (error) {
      console.error("[CV] Delete interest category error:", error);
      response.redirect(application.cvEndpoint + "?error=1#interests");
    }
  },

  // --- Skills/Interests category move (reorder) ---

  async moveSkillCategory(request, response) {
    const { application } = request.app.locals;
    const category = decodeURIComponent(request.params.category);
    const direction = request.path.endsWith("/up") ? "up" : "down";
    try {
      await moveSkillCategoryOrder(application, category, direction);
      response.redirect(application.cvEndpoint + "?saved=1#skills");
    } catch (error) {
      console.error("[CV] Move skill category error:", error);
      response.redirect(application.cvEndpoint + "?error=1#skills");
    }
  },

  async moveInterestCategory(request, response) {
    const { application } = request.app.locals;
    const category = decodeURIComponent(request.params.category);
    const direction = request.path.endsWith("/up") ? "up" : "down";
    try {
      await moveInterestCategoryOrder(application, category, direction);
      response.redirect(application.cvEndpoint + "?saved=1#interests");
    } catch (error) {
      console.error("[CV] Move interest category error:", error);
      response.redirect(application.cvEndpoint + "?error=1#interests");
    }
  },

  // --- Generic move (reorder) ---

  async move(request, response) {
    const { application } = request.app.locals;
    const { section, index } = request.params;
    // Direction is the last segment of the URL path (up or down)
    const direction = request.path.endsWith("/up") ? "up" : "down";
    try {
      await moveInSection(application, section, Number.parseInt(index, 10), direction);
      response.redirect(application.cvEndpoint + "?saved=1#" + section);
    } catch (error) {
      console.error(`[CV] Move ${section} error:`, error);
      response.redirect(application.cvEndpoint + "?error=1#" + section);
    }
  },
};

// --- Helper functions ---

/**
 * Parse comma-separated string into array
 */
function parseCommaList(value) {
  if (!value) return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Parse newline-separated string into array
 */
function parseLines(value) {
  if (!value) return [];
  return value
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Parse array fields from form body
 * Handles indexed form fields like experience[0][title], experience[1][title]
 */
function parseArrayField(body, fieldName) {
  const field = body[fieldName];
  if (!field) return [];
  if (Array.isArray(field)) return field;
  if (typeof field === "string") {
    try {
      const parsed = JSON.parse(field);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  if (typeof field === "object") {
    // Indexed object form: { "0": {...}, "1": {...} }
    return Object.values(field);
  }
  return [];
}

/**
 * Parse skills from form body
 * Skills come as skills[categoryName] = "skill1, skill2, skill3"
 */
function parseSkillsField(body) {
  const skills = body.skills;
  if (!skills || typeof skills !== "object") return {};

  const result = {};
  for (const [category, items] of Object.entries(skills)) {
    if (typeof items === "string") {
      result[category] = parseCommaList(items);
    } else if (Array.isArray(items)) {
      result[category] = items;
    }
  }
  return result;
}

function parseSkillTypesField(body) {
  const skillTypes = body.skillTypes;
  if (!skillTypes || typeof skillTypes !== "object") return {};
  return skillTypes;
}

/**
 * Parse interests from form body
 * Interests come as interests[categoryName] = "interest1, interest2"
 */
function parseInterestsField(body) {
  const interests = body.interests;
  if (!interests || typeof interests !== "object") return {};

  const result = {};
  for (const [category, items] of Object.entries(interests)) {
    if (typeof items === "string") {
      result[category] = parseCommaList(items);
    } else if (Array.isArray(items)) {
      result[category] = items;
    }
  }
  return result;
}

function parseInterestTypesField(body) {
  const interestTypes = body.interestTypes;
  if (!interestTypes || typeof interestTypes !== "object") return {};
  return interestTypes;
}
