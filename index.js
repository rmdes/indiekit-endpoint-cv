import express from "express";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { dashboardController } from "./lib/controllers/dashboard.js";
import { apiController } from "./lib/controllers/api.js";
import { pageBuilderController } from "./lib/controllers/pageBuilder.js";

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
        label: "Experience (All)",
        description: "All experience items (personal and work)",
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
        label: "Skills (All)",
        description: "All skills grouped by category",
        icon: "zap",
        dataEndpoint: "/cv/data.json",
        defaultConfig: {},
        configSchema: {},
      },
      {
        id: "cv-education",
        label: "Education & Languages (All)",
        description: "All education items and languages",
        icon: "book",
        dataEndpoint: "/cv/data.json",
        defaultConfig: {},
        configSchema: {},
      },
      {
        id: "cv-projects-personal",
        label: "Personal Projects",
        description: "Personal and side projects",
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
        id: "cv-projects-work",
        label: "Work Projects",
        description: "Professional and work-related projects",
        icon: "briefcase",
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
        label: "Interests (All)",
        description: "All interests and hobbies",
        icon: "heart",
        dataEndpoint: "/cv/data.json",
        defaultConfig: {},
        configSchema: {},
      },
      {
        id: "cv-experience-personal",
        label: "Personal Experience",
        description: "Volunteer work and side projects",
        icon: "heart",
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
        id: "cv-experience-work",
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
        id: "cv-education-personal",
        label: "Personal Education",
        description: "Self-study and online courses",
        icon: "heart",
        dataEndpoint: "/cv/data.json",
        defaultConfig: {},
        configSchema: {},
      },
      {
        id: "cv-education-work",
        label: "Work Education",
        description: "Degrees and certifications",
        icon: "book",
        dataEndpoint: "/cv/data.json",
        defaultConfig: {},
        configSchema: {},
      },
      {
        id: "cv-skills-personal",
        label: "Personal Skills",
        description: "Personal and hobby-related skills",
        icon: "heart",
        dataEndpoint: "/cv/data.json",
        defaultConfig: {},
        configSchema: {},
      },
      {
        id: "cv-skills-work",
        label: "Professional Skills",
        description: "Work-related technical skills",
        icon: "zap",
        dataEndpoint: "/cv/data.json",
        defaultConfig: {},
        configSchema: {},
      },
      {
        id: "cv-interests-personal",
        label: "Personal Interests",
        description: "Personal hobbies and interests",
        icon: "heart",
        dataEndpoint: "/cv/data.json",
        defaultConfig: {},
        configSchema: {},
      },
      {
        id: "cv-interests-work",
        label: "Professional Interests",
        description: "Work-related interests and topics",
        icon: "briefcase",
        dataEndpoint: "/cv/data.json",
        defaultConfig: {},
        configSchema: {},
      },
      {
        id: "cv-languages",
        label: "Languages",
        description: "Language proficiency list",
        icon: "globe",
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

    // CV Page Builder
    protectedRouter.get("/page", pageBuilderController.get);
    protectedRouter.post("/page/save", pageBuilderController.save);
    protectedRouter.post("/page/preset", pageBuilderController.applyPreset);

    // CRUD for individual sections
    protectedRouter.post("/experience/add", dashboardController.addExperience);
    protectedRouter.post("/experience/:index/edit", dashboardController.editExperience);
    protectedRouter.post("/experience/:index/delete", dashboardController.deleteExperience);

    protectedRouter.post("/projects/add", dashboardController.addProject);
    protectedRouter.post("/projects/:index/edit", dashboardController.editProject);
    protectedRouter.post("/projects/:index/delete", dashboardController.deleteProject);

    protectedRouter.post("/education/add", dashboardController.addEducation);
    protectedRouter.post("/education/:index/edit", dashboardController.editEducation);
    protectedRouter.post("/education/:index/delete", dashboardController.deleteEducation);

    protectedRouter.post("/languages/add", dashboardController.addLanguage);
    protectedRouter.post("/languages/:index/edit", dashboardController.editLanguage);
    protectedRouter.post("/languages/:index/delete", dashboardController.deleteLanguage);

    protectedRouter.post("/skills/add", dashboardController.addSkillCategory);
    protectedRouter.post("/skills/:category/edit", dashboardController.editSkillCategoryHandler);
    protectedRouter.post("/skills/:category/delete", dashboardController.deleteSkillCategory);

    // Generic move (reorder) for any array section
    protectedRouter.post("/:section/:index/up", dashboardController.move);
    protectedRouter.post("/:section/:index/down", dashboardController.move);

    return protectedRouter;
  }

  /**
   * Public routes (no authentication required)
   */
  get routesPublic() {
    // Public JSON API for Eleventy and homepage plugin
    publicRouter.get("/data.json", apiController.getData);
    publicRouter.get("/page.json", apiController.getPageConfig);

    return publicRouter;
  }

  init(Indiekit) {
    Indiekit.addEndpoint(this);

    // Add MongoDB collections for CV data and page config
    Indiekit.addCollection("cvData");
    Indiekit.addCollection("cvPageConfig");

    // Store config in application for controller access
    Indiekit.config.application.cvConfig = this.options;
    Indiekit.config.application.cvEndpoint = this.mountPath;

    // Store CV sections list for page builder
    Indiekit.config.application.cvSections = this.homepageSections;

    // Store database getter for controller access
    Indiekit.config.application.getCvDb = () => Indiekit.database;

    // Write CV data file for Eleventy on startup
    // Deferred so database connection is established first
    const app = Indiekit.config.application;
    setTimeout(async () => {
      try {
        const { getCvData, getDefaultCvData, writeCvFile } = await import(
          "./lib/storage/cv.js"
        );
        const data = (await getCvData(app)) || getDefaultCvData();
        writeCvFile(app, data);
        console.log("[CV] Initial data file written for Eleventy");
      } catch (error) {
        console.log("[CV] Deferred file write:", error.message);
      }
    }, 2000);

    // Write CV page config file for Eleventy on startup
    setTimeout(async () => {
      try {
        const { getConfig, getDefaultConfig, writeConfigFile } = await import(
          "./lib/storage/cvPageConfig.js"
        );
        const config = (await getConfig(app)) || getDefaultConfig();
        writeConfigFile(app, config);
        console.log("[CV Page] Initial config file written for Eleventy");
      } catch (error) {
        console.log("[CV Page] Deferred file write:", error.message);
      }
    }, 2500);
  }
}
