/**
 * CV Page Builder controller
 * Admin UI for CV page configuration
 */

import { getConfig, saveConfig, getDefaultConfig } from "../storage/cvPageConfig.js";

/**
 * Parse social links from form body.
 * Express parses social[0][name], social[0][url] etc. into nested objects.
 */
function parseSocialLinks(body) {
  const social = [];
  if (!body.social) return social;
  const entries = Array.isArray(body.social) ? body.social : Object.values(body.social);
  for (const entry of entries) {
    if (!entry || (!entry.name && !entry.url)) continue;
    social.push({
      name: entry.name || "",
      url: entry.url || "",
      rel: entry.rel || "me",
      icon: entry.icon || "",
    });
  }
  return social;
}

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
        activeTab: "builder",
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
      // Get current config to preserve identity from other tab
      const currentConfig = await getConfig(application);

      const config = {
        layout: validLayouts.includes(layout) ? layout : "single-column",
        hero: typeof parsedHero === "object" && parsedHero !== null ? parsedHero : { enabled: true, showSocial: true },
        sections: Array.isArray(parsedSections) ? parsedSections : [],
        sidebar: Array.isArray(parsedSidebar) ? parsedSidebar : [],
        footer: Array.isArray(parsedFooter) ? parsedFooter : [],
        identity: currentConfig?.identity || null,
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

      // Get current config to preserve footer and identity
      const currentConfig = await getConfig(application);

      const config = {
        layout: preset.layout,
        hero: { ...preset.hero },
        sections: preset.sections.map((s) => ({ ...s })),
        sidebar: preset.sidebar.map((w) => ({ ...w })),
        footer: currentConfig?.footer || [],
        identity: currentConfig?.identity || null,
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

  /**
   * GET /cv/page/identity - CV Identity editor
   */
  async getIdentity(request, response) {
    const { application } = request.app.locals;

    try {
      let config = await getConfig(application);
      if (!config) {
        config = getDefaultConfig();
      }

      const identity = config.identity || {};

      response.render("cv-page-identity", {
        title: "CV Page Builder",
        activeTab: "identity",
        identity,
        cvEndpoint: application.cvEndpoint || "/cv",
      });
    } catch (error) {
      console.error("[CV Page] Identity error:", error);
      response.status(500).render("error", {
        title: "Error",
        message: "Failed to load CV identity configuration",
        error: error.message,
      });
    }
  },

  /**
   * POST /cv/page/save-identity - Save CV identity configuration
   */
  async saveIdentity(request, response) {
    const { application } = request.app.locals;

    try {
      const body = request.body;

      // Build identity object from form fields
      const identity = {
        name: body["identity-name"] || "",
        avatar: body["identity-avatar"] || "",
        title: body["identity-title"] || "",
        pronoun: body["identity-pronoun"] || "",
        bio: body["identity-bio"] || "",
        description: body["identity-description"] || "",
        locality: body["identity-locality"] || "",
        country: body["identity-country"] || "",
        org: body["identity-org"] || "",
        url: body["identity-url"] || "",
        email: body["identity-email"] || "",
        keyUrl: body["identity-keyUrl"] || "",
        social: parseSocialLinks(body),
      };

      // Get current config to preserve fields from other tab
      const currentConfig = await getConfig(application);

      const config = {
        layout: currentConfig?.layout || "single-column",
        hero: currentConfig?.hero || { enabled: true, showSocial: true },
        sections: currentConfig?.sections || [],
        sidebar: currentConfig?.sidebar || [],
        footer: currentConfig?.footer || [],
        identity,
      };

      await saveConfig(application, config);

      if (request.headers.accept?.includes("application/json")) {
        response.json({ success: true, message: "CV identity saved" });
      } else {
        response.redirect(`${application.cvEndpoint}/page/identity?saved=1`);
      }
    } catch (error) {
      console.error("[CV Page] Save identity error:", error);

      if (request.headers.accept?.includes("application/json")) {
        response.status(500).json({ success: false, error: error.message });
      } else {
        response.status(500).render("error", {
          title: "Error",
          message: "Failed to save CV identity",
          error: error.message,
        });
      }
    }
  },
};
