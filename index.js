import express from "express";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { dashboardController } from "./lib/controllers/dashboard.js";
import { apiController } from "./lib/controllers/api.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const protectedRouter = express.Router();
const publicRouter = express.Router();

const defaults = {
  mountPath: "/cv",
};

export default class CvEndpoint {
  name = "CV editor endpoint";

  constructor(options = {}) {
    this.options = { ...defaults, ...options };
    this.mountPath = this.options.mountPath;
  }

  get localesDirectory() {
    return path.join(__dirname, "locales");
  }

  get viewsDirectory() {
    return path.join(__dirname, "views");
  }

  get navigationItems() {
    return {
      href: this.options.mountPath,
      text: "cv.title",
      requiresDatabase: true,
    };
  }

  get shortcutItems() {
    return {
      url: this.options.mountPath,
      name: "cv.title",
      iconName: "briefcase",
      requiresDatabase: true,
    };
  }

  /**
   * Register CV section types for homepage plugin discovery
   */
  get homepageSections() {
    return [
      {
        id: "cv-experience",
        label: "Work Experience",
        description: "Professional experience timeline",
        icon: "briefcase",
        dataEndpoint: "/cv/data.json",
        defaultConfig: {
          maxItems: 10,
          showHighlights: true,
        },
        configSchema: {
          maxItems: {
            type: "number",
            label: "Max items",
            min: 1,
            max: 50,
          },
          showHighlights: {
            type: "boolean",
            label: "Show highlights",
          },
        },
      },
      {
        id: "cv-skills",
        label: "Skills",
        description: "Skills grouped by category",
        icon: "zap",
        dataEndpoint: "/cv/data.json",
        defaultConfig: {},
        configSchema: {},
      },
      {
        id: "cv-education",
        label: "Education & Languages",
        description: "Academic background and languages",
        icon: "book",
        dataEndpoint: "/cv/data.json",
        defaultConfig: {},
        configSchema: {},
      },
      {
        id: "cv-projects",
        label: "Projects",
        description: "Personal and professional projects",
        icon: "folder",
        dataEndpoint: "/cv/data.json",
        defaultConfig: {
          maxItems: 10,
          showTechnologies: true,
        },
        configSchema: {
          maxItems: {
            type: "number",
            label: "Max items",
            min: 1,
            max: 50,
          },
          showTechnologies: {
            type: "boolean",
            label: "Show technologies",
          },
        },
      },
      {
        id: "cv-interests",
        label: "Interests",
        description: "Topics and hobbies",
        icon: "heart",
        dataEndpoint: "/cv/data.json",
        defaultConfig: {},
        configSchema: {},
      },
    ];
  }

  /**
   * Protected routes (require authentication)
   */
  get routes() {
    // Dashboard - main admin UI
    protectedRouter.get("/", dashboardController.get);

    // Save CV data
    protectedRouter.post("/save", dashboardController.save);

    // CRUD for individual sections
    protectedRouter.post("/experience/add", dashboardController.addExperience);
    protectedRouter.post(
      "/experience/:index/delete",
      dashboardController.deleteExperience,
    );

    protectedRouter.post("/projects/add", dashboardController.addProject);
    protectedRouter.post(
      "/projects/:index/delete",
      dashboardController.deleteProject,
    );

    protectedRouter.post("/education/add", dashboardController.addEducation);
    protectedRouter.post(
      "/education/:index/delete",
      dashboardController.deleteEducation,
    );

    protectedRouter.post("/languages/add", dashboardController.addLanguage);
    protectedRouter.post(
      "/languages/:index/delete",
      dashboardController.deleteLanguage,
    );

    protectedRouter.post("/skills/add", dashboardController.addSkillCategory);
    protectedRouter.post(
      "/skills/:category/delete",
      dashboardController.deleteSkillCategory,
    );

    return protectedRouter;
  }

  /**
   * Public routes (no authentication required)
   */
  get routesPublic() {
    // Public JSON API for Eleventy and homepage plugin
    publicRouter.get("/data.json", apiController.getData);

    return publicRouter;
  }

  init(Indiekit) {
    Indiekit.addEndpoint(this);

    // Add MongoDB collection for CV data
    Indiekit.addCollection("cvData");

    // Store config in application for controller access
    Indiekit.config.application.cvConfig = this.options;
    Indiekit.config.application.cvEndpoint = this.mountPath;

    // Store database getter for controller access
    Indiekit.config.application.getCvDb = () => Indiekit.database;
  }
}
