/**
 * CV Page Builder controller
 * Admin UI for CV page configuration
 */

import { getConfig, saveConfig, getDefaultConfig } from "../storage/cvPageConfig.js";

/**
 * Detect which preset matches the current config (if any)
 */
function detectActivePreset(config, presets) {
  for (const preset of presets) {
    if (config.layout !== preset.layout) continue;

    const configTypes = (config.sections || []).map((s) => s.type).join(",");
    const presetTypes = preset.sections.map((s) => s.type).join(",");
    if (configTypes !== presetTypes) continue;

    const configWidgets = (config.sidebar || []).map((w) => w.type).join(",");
    const presetWidgets = preset.sidebar.map((w) => w.type).join(",");
    if (configWidgets !== presetWidgets) continue;

    return preset.id;
  }
  return null;
}

/**
 * Get CV-specific presets
 */
function getCvPresets() {
  return [
    {
      id: "professional-cv",
      label: "Professional CV",
      description: "Clean single-column layout with work-only sections for a professional resume",
      layout: "single-column",
      hero: { enabled: true, showSocial: true },
      sections: [
        { type: "cv-experience-work", config: {} },
        { type: "cv-skills-work", config: {} },
        { type: "cv-projects-work", config: {} },
        { type: "cv-education-work", config: {} },
        { type: "cv-languages", config: {} },
        { type: "cv-interests-work", config: {} },
      ],
      sidebar: [],
    },
    {
      id: "full-portfolio",
      label: "Full Portfolio",
      description: "Two-column layout showcasing both work and personal projects with sidebar",
      layout: "two-column",
      hero: { enabled: true, showSocial: true },
      sections: [
        { type: "cv-experience", config: { maxItems: 5 } },
        { type: "cv-skills", config: {} },
        { type: "cv-projects", config: {} },
        { type: "cv-education", config: {} },
        { type: "cv-languages", config: {} },
        { type: "cv-interests", config: {} },
      ],
      sidebar: [
        { type: "author-card", config: {} },
        { type: "social-activity", config: {} },
        { type: "github-repos", config: {} },
      ],
    },
    {
      id: "minimal",
      label: "Minimal",
      description: "Concise single-column layout with essential sections only",
      layout: "single-column",
      hero: { enabled: true, showSocial: true },
      sections: [
        { type: "cv-experience-work", config: { maxItems: 5 } },
        { type: "cv-skills-work", config: {} },
        { type: "cv-education-work", config: {} },
      ],
      sidebar: [],
    },
  ];
}

export const pageBuilderController = {
  /**
   * GET /cv/page - CV Page Builder dashboard
   */
  async get(request, response) {
    const { application } = request.app.locals;

    try {
      // Get current config or defaults
      let config = await getConfig(application);
      if (!config) {
        config = getDefaultConfig();
      }

      // Get available CV sections from application.cvSections
      // Plus custom-html built-in from homepage plugin
      const cvSections = application.cvSections || [];
      const sections = [
        ...cvSections,
        {
          id: "custom-html",
          label: "Custom HTML",
          description: "Add custom HTML content",
          icon: "code",
          sourcePlugin: "Built-in",
        },
      ];

      // Get available widgets from homepage plugin discovery
      // Fallback to empty array if homepage plugin not loaded
      const widgets = application.discoveredWidgets || [];

      // Get CV presets
      const presets = getCvPresets();

      // Detect which preset is active (if any)
      const activePresetId = detectActivePreset(config, presets);

      response.render("cv-page-builder", {
        title: "CV Page Builder",
        cvEndpoint: application.cvEndpoint || "/cv",
        config,
        sections,
        widgets,
        presets,
        activePresetId,
        layouts: [
          { id: "single-column", label: "Single Column" },
          { id: "two-column", label: "Two Column with Sidebar" },
          { id: "full-width-hero", label: "Full-width Hero + Grid" },
        ],
      });
    } catch (error) {
      console.error("[CV Page] Builder error:", error);
      response.status(500).render("error", {
        title: "Error",
        message: "Failed to load CV page configuration",
        error: error.message,
      });
    }
  },

  /**
   * POST /cv/page/save - Save configuration
   */
  async save(request, response) {
    const { application } = request.app.locals;

    try {
      const { layout, hero, sections, sidebar, footer } = request.body;

      // Parse JSON strings if needed
      const parsedHero = typeof hero === "string" ? JSON.parse(hero) : hero;
      const parsedSections = typeof sections === "string" ? JSON.parse(sections) : sections;
      const parsedSidebar = typeof sidebar === "string" ? JSON.parse(sidebar) : sidebar;
      const parsedFooter = typeof footer === "string" ? JSON.parse(footer) : footer;

      // Validate types to prevent data corruption
      const validLayouts = ["single-column", "two-column", "full-width-hero"];
      const config = {
        layout: validLayouts.includes(layout) ? layout : "single-column",
        hero: typeof parsedHero === "object" && parsedHero !== null ? parsedHero : { enabled: true, showSocial: true },
        sections: Array.isArray(parsedSections) ? parsedSections : [],
        sidebar: Array.isArray(parsedSidebar) ? parsedSidebar : [],
        footer: Array.isArray(parsedFooter) ? parsedFooter : [],
      };

      await saveConfig(application, config);

      // Return success with redirect or JSON based on request type
      if (request.headers.accept?.includes("application/json")) {
        response.json({ success: true, message: "Configuration saved" });
      } else {
        response.redirect(`${application.cvEndpoint}/page?saved=1`);
      }
    } catch (error) {
      console.error("[CV Page] Save error:", error);

      if (request.headers.accept?.includes("application/json")) {
        response.status(500).json({ success: false, error: error.message });
      } else {
        response.status(500).render("error", {
          title: "Error",
          message: "Failed to save configuration",
          error: error.message,
        });
      }
    }
  },

  /**
   * POST /cv/page/preset - Apply a layout preset
   */
  async applyPreset(request, response) {
    const { application } = request.app.locals;

    try {
      const { presetId } = request.body;
      const presets = getCvPresets();
      const preset = presets.find((p) => p.id === presetId);

      if (!preset) {
        return response.status(400).redirect(`${application.cvEndpoint}/page?error=unknown-preset`);
      }

      // Get current config to preserve footer (webrings etc.)
      const currentConfig = await getConfig(application);
      const existingFooter = currentConfig?.footer || [];

      const config = {
        layout: preset.layout,
        hero: { ...preset.hero },
        sections: preset.sections.map((s) => ({ ...s })),
        sidebar: preset.sidebar.map((w) => ({ ...w })),
        footer: existingFooter,
      };

      await saveConfig(application, config);

      console.log(`[CV Page] Applied preset: ${preset.label}`);
      response.redirect(`${application.cvEndpoint}/page?saved=1`);
    } catch (error) {
      console.error("[CV Page] Apply preset error:", error);
      response.status(500).render("error", {
        title: "Error",
        message: "Failed to apply preset",
        error: error.message,
      });
    }
  },
};
