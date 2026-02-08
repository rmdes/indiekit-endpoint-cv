/**
 * Public API controller
 * Serves CV data as JSON for Eleventy and homepage plugin
 */

import { getCvData, getDefaultCvData } from "../storage/cv.js";

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
};
