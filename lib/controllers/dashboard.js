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

      // Parse interests from comma-separated string
      const interests =
        typeof body.interests === "string"
          ? body.interests
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : body.interests || [];

      const data = {
        experience: parseArrayField(body, "experience"),
        projects: parseArrayField(body, "projects"),
        skills: parseSkillsField(body),
        education: parseArrayField(body, "education"),
        languages: parseArrayField(body, "languages"),
        interests,
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
      const { title, company, location, startDate, endDate, type, description, highlights } =
        request.body;
      await addToSection(application, "experience", {
        title: title || "",
        company: company || "",
        location: location || "",
        startDate: startDate || "",
        endDate: endDate || null,
        type: type || "full-time",
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
      const { title, company, location, startDate, endDate, type, description, highlights } = request.body;
      await updateInSection(application, "experience", index, {
        title: title || "",
        company: company || "",
        location: location || "",
        startDate: startDate || "",
        endDate: endDate || null,
        type: type || "full-time",
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
      const { name, url, description, tags, technologies, status, startDate, endDate } = request.body;
      await addToSection(application, "projects", {
        name: name || "",
        url: url || "",
        description: description || "",
        technologies: parseCommaList(tags || technologies),
        status: status || "active",
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
      const { name, url, description, tags, status, startDate, endDate } = request.body;
      await updateInSection(application, "projects", index, {
        name: name || "",
        url: url || "",
        description: description || "",
        technologies: parseCommaList(tags),
        status: status || "active",
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
      const { degree, institution, location, startDate, endDate, description } = request.body;
      await addToSection(application, "education", {
        degree: degree || "",
        institution: institution || "",
        location: location || "",
        startDate: startDate || "",
        endDate: endDate || null,
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
      const { degree, institution, location, startDate, endDate, description } = request.body;
      await updateInSection(application, "education", index, {
        degree: degree || "",
        institution: institution || "",
        location: location || "",
        startDate: startDate || "",
        endDate: endDate || null,
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
      const { category, items } = request.body;
      await addSkillCategory(application, category || "Uncategorized", parseCommaList(items));
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
      const { category, items } = request.body;
      await editSkillCategory(application, oldCategory, category || oldCategory, parseCommaList(items));
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
