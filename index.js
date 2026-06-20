import express from "express";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { waitForReady } from "@rmdes/indiekit-startup-gate";

import { dashboardController } from "./lib/controllers/dashboard.js";
import { apiController } from "./lib/controllers/api.js";
import { CV_BLOCKS } from "./lib/blocks.js";

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
   * v2 block declarations (Phase 7). Real `get blocks()` contract — makes CV
   * sections placeable on the `standalone` surface (page:cv) as well as the
   * homepage. Ids are the same as the (now-removed) legacy `homepageSections`,
   * preserving the contract with stored compositions + theme `sections/cv-*.njk`
   * partials. This is now CV's SOLE plugin-discovery contract.
   */
  get blocks() {
    return CV_BLOCKS;
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
    protectedRouter.post("/skills/:category/up", dashboardController.moveSkillCategory);
    protectedRouter.post("/skills/:category/down", dashboardController.moveSkillCategory);

    protectedRouter.post("/interests/add", dashboardController.addInterestCategory);
    protectedRouter.post("/interests/:category/edit", dashboardController.editInterestCategoryHandler);
    protectedRouter.post("/interests/:category/delete", dashboardController.deleteInterestCategory);
    protectedRouter.post("/interests/:category/up", dashboardController.moveInterestCategory);
    protectedRouter.post("/interests/:category/down", dashboardController.moveInterestCategory);

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

    return publicRouter;
  }

  init(Indiekit) {
    Indiekit.addEndpoint(this);

    // Add MongoDB collection for CV data. (cvPageConfig is no longer written by
    // this plugin — Phase 7 retired the bespoke page-builder; /cv now renders via
    // a site-config page:cv composition. The legacy cvPageConfig Mongo data
    // persists for the one-time site-config migration that seeds page:cv.)
    Indiekit.addCollection("cvData");

    // Store config in application for controller access
    Indiekit.config.application.cvConfig = this.options;
    Indiekit.config.application.cvEndpoint = this.mountPath;

    // Store database getter for controller access
    Indiekit.config.application.getCvDb = () => Indiekit.database;

    // Write the CV data file for Eleventy on startup (deferred so the database
    // connection is established first).
    const app = Indiekit.config.application;
    this._stopGate = waitForReady(
      async () => {
        // Write CV data file
        try {
          const { getCvData, getDefaultCvData, saveCvData, writeCvFile } = await import(
            "./lib/storage/cv.js"
          );
          const data = (await getCvData(app)) || getDefaultCvData();
          // Migrate old flat interests array to category-based format on startup
          if (Array.isArray(data.interests)) {
            console.log("[CV] Migrating interests from flat array to categories");
            await saveCvData(app, data);
          } else {
            writeCvFile(app, data);
          }
          console.log("[CV] Initial data file written for Eleventy");
        } catch (error) {
          console.log("[CV] Deferred file write:", error.message);
        }
      },
      { label: "CV" },
    );
  }

  destroy() {
    this._stopGate?.();
  }
}
