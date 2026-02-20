/**
 * Public API controller
 * Serves CV data as JSON for Eleventy and homepage plugin
 */

import { getCvData, getDefaultCvData } from "../storage/cv.js";
import { getConfig } from "../storage/cvPageConfig.js";

export const apiController = {
  /**
   * GET /cv/data.json - Public CV data endpoint
   */
  async getData(request, response) {
    const { application } = request.app.locals;

    try {
      const data = (await getCvData(application)) || getDefaultCvData();

      // Strip MongoDB internal fields
      const { _id, ...cvData } = data;

      response.json(cvData);
    } catch (error) {
      console.error("[CV] API error:", error);
      response.json(getDefaultCvData());
    }
  },

  /**
   * GET /cv/page.json - Public CV page config endpoint
   */
  async getPageConfig(request, response) {
    const { application } = request.app.locals;

    try {
      const config = await getConfig(application);

      // Return null if no config exists (backward compatible)
      if (!config) {
        return response.json(null);
      }

      // Strip MongoDB internal fields
      const { _id, ...pageConfig } = config;

      response.json(pageConfig);
    } catch (error) {
      console.error("[CV Page] API error:", error);
      response.json(null);
    }
  },
};
