# CLAUDE.md - CV Endpoint

## Package Overview

`@rmdes/indiekit-endpoint-cv` is an Indiekit plugin that provides a CV/resume management system with an admin UI. It stores structured CV data in MongoDB and exposes it via a public JSON API for consumption by Eleventy templates and the homepage plugin.

**Key Capabilities:**
- Manage work experience, projects, skills, education, languages, and interests
- CRUD operations with reordering support
- Writes JSON file for Eleventy integration (triggers rebuild via file watcher)
- Registers 5 homepage sections for dynamic homepage building
- Public JSON API for frontend consumption

**npm Package:** `@rmdes/indiekit-endpoint-cv`
**Version:** 1.0.12
**Mount Path:** `/cv` (default, configurable)

## Architecture

### Data Flow

```
Admin UI → MongoDB (cvData) → JSON File (/data/content/.indiekit/cv.json) → Eleventy
                            → Public API (/cv/data.json) → Homepage Plugin
```

1. User edits CV data via admin UI
2. Data saved to MongoDB `cvData` collection (single document with ID "cv")
3. On save, plugin writes JSON file to Eleventy content directory
4. Eleventy file watcher detects change and rebuilds site
5. Homepage plugin reads `/cv/data.json` to render CV sections

### MongoDB Schema

**cvData** (Single Document)
```javascript
{
  _id: "cv",                    // Fixed ID - only one CV per instance
  experience: [
    {
      title: String,
      company: String,
      location: String,
      startDate: String,        // "YYYY-MM" format
      endDate: String | null,   // null for current position
      type: String,             // "full-time", "part-time", "contract", etc.
      description: String,
      highlights: String[]      // Bullet points
    }
  ],
  projects: [
    {
      name: String,
      url: String,
      description: String,
      technologies: String[],   // Tech stack
      status: String,           // "active", "completed", "archived"
      projectType: String,      // "personal" or "work"
      startDate: String,        // "YYYY-MM"
      endDate: String | null
    }
  ],
  skills: {
    "Category Name": String[]   // e.g., { "Languages": ["JavaScript", "Python"] }
  },
  education: [
    {
      degree: String,
      institution: String,
      location: String,
      startDate: String,        // "YYYY-MM"
      endDate: String | null,
      description: String
    }
  ],
  languages: [
    {
      name: String,
      level: String             // "native", "fluent", "intermediate", "basic"
    }
  ],
  interests: String[],          // Simple array of interests
  lastUpdated: String           // ISO 8601 timestamp
}
```

## Key Files

### Entry Point
- **index.js** - Plugin class, route registration, homepage section registration

### Controllers
- **lib/controllers/dashboard.js** - Admin UI, CRUD operations for all CV sections
- **lib/controllers/api.js** - Public JSON API endpoint

### Storage
- **lib/storage/cv.js** - MongoDB operations, JSON file writing

## Configuration

### Plugin Options
```javascript
new CvEndpoint({
  mountPath: "/cv"  // Admin UI and API base path
})
```

### Environment/Deployment
- Requires MongoDB (uses Indiekit's database connection)
- Requires `contentDir` set in Indiekit application config (for JSON file writing)
- On plugin init, writes initial CV data file after 2-second delay (ensures DB connection)

## Routes

### Protected Routes (Admin UI)
```
GET    /cv/                         Main dashboard (all sections)
POST   /cv/save                     Save full CV data (bulk save)

POST   /cv/experience/add           Add experience entry
POST   /cv/experience/:index/edit   Edit experience entry
POST   /cv/experience/:index/delete Delete experience entry
POST   /cv/experience/:index/up     Move experience up
POST   /cv/experience/:index/down   Move experience down

POST   /cv/projects/add             Add project
POST   /cv/projects/:index/edit     Edit project
POST   /cv/projects/:index/delete   Delete project
POST   /cv/projects/:index/up       Move project up
POST   /cv/projects/:index/down     Move project down

POST   /cv/education/add            Add education entry
POST   /cv/education/:index/edit    Edit education entry
POST   /cv/education/:index/delete  Delete education entry
POST   /cv/education/:index/up      Move education up
POST   /cv/education/:index/down    Move education down

POST   /cv/languages/add            Add language
POST   /cv/languages/:index/edit    Edit language
POST   /cv/languages/:index/delete  Delete language
POST   /cv/languages/:index/up      Move language up
POST   /cv/languages/:index/down    Move language down

POST   /cv/skills/add               Add skill category
POST   /cv/skills/:category/edit    Edit skill category
POST   /cv/skills/:category/delete  Delete skill category
```

### Public Routes
```
GET    /cv/data.json                Public JSON API (entire CV)
```

## Homepage Plugin Integration

The plugin registers 5 homepage sections that can be added to the homepage via the homepage builder:

### Registered Sections

1. **cv-experience** - Work Experience Timeline
   - ID: `cv-experience`
   - Icon: briefcase
   - Config: `maxItems`, `showHighlights`

2. **cv-skills** - Skills by Category
   - ID: `cv-skills`
   - Icon: zap
   - Config: None

3. **cv-education** - Education & Languages
   - ID: `cv-education`
   - Icon: book
   - Config: None

4. **cv-projects-personal** - Personal Projects
   - ID: `cv-projects-personal`
   - Icon: folder
   - Config: `maxItems`, `showTechnologies`

5. **cv-projects-work** - Work Projects
   - ID: `cv-projects-work`
   - Icon: briefcase
   - Config: `maxItems`, `showTechnologies`

6. **cv-interests** - Interests
   - ID: `cv-interests`
   - Icon: heart
   - Config: None

### Section Configuration

Each section exposes:
```javascript
{
  id: String,              // Unique section ID
  label: String,           // Display name in homepage builder
  description: String,     // Help text
  icon: String,            // Indiekit icon name
  dataEndpoint: "/cv/data.json",  // Where to fetch data
  defaultConfig: Object,   // Default config values
  configSchema: Object     // Config form fields
}
```

### How Homepage Plugin Discovers Sections

The homepage plugin scans all loaded Indiekit plugins for a `homepageSections` getter. The CV plugin exports this getter (see `index.js` lines 53-152), which returns an array of section definitions.

## Data Storage Details

### Single Document Pattern
- All CV data stored in ONE MongoDB document with fixed `_id: "cv"`
- No multi-user support (one CV per Indiekit instance)
- Sections are arrays within the document
- Skills is an object (key = category name, value = array of skills)

### JSON File Writing
On every save, the plugin writes CV data to:
```
{contentDir}/.indiekit/cv.json
```

This triggers Eleventy's file watcher to rebuild the site. Eleventy templates can read this file via `_data/cv.js`:

```javascript
// In Eleventy: _data/cv.js
import { readFileSync } from "fs";
export default JSON.parse(readFileSync("content/.indiekit/cv.json"));
```

## Form Handling Patterns

### POST + Redirect Pattern
All form submissions follow:
1. POST to action endpoint
2. Process data
3. Redirect to dashboard with query param (`?saved=1` or `?error=1`)
4. Use `#anchor` to scroll to relevant section

### Array Field Parsing
The `parseArrayField()` helper handles three formats:
1. **Array:** Already parsed by Express
2. **JSON String:** Hidden input with stringified data (requires `JSON.parse()`)
3. **Indexed Object:** Form submission with `field[0][key]`, `field[1][key]`

This is critical for homepage builder integration where data is passed through hidden inputs.

### Skills Field Parsing
Skills use object format: `skills[categoryName] = "skill1, skill2, skill3"`
The `parseSkillsField()` helper converts comma-separated strings to arrays.

## Known Gotchas

### Hidden Input JSON Strings
When passing existing data through hidden form inputs as JSON strings (e.g., for modals), `parseArrayField()` MUST handle `JSON.parse()` for strings. Without this, submitting a form with existing data returns `[]` and wipes the section.

**Example Bug Pattern:**
```javascript
// WRONG - loses data on submit
function parseArrayField(body, fieldName) {
  const field = body[fieldName];
  if (!field) return [];
  if (Array.isArray(field)) return field;
  if (typeof field === "object") return Object.values(field);
  return [];  // OOPS - string is truthy but doesn't match any case
}

// CORRECT - handles JSON strings
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
  if (typeof field === "object") return Object.values(field);
  return [];
}
```

### Reordering (Move Up/Down)
- Direction is parsed from URL path suffix (`/up` or `/down`)
- Swaps array elements at `index` and `targetIndex`
- Bounds checking prevents errors at array edges

### Skills Category Renaming
The `editSkillCategory()` function supports renaming by:
1. Deleting the old key (`delete data.skills[oldCategory]`)
2. Setting the new key (`data.skills[newCategory] = items`)

URL encoding is required for category names with special characters.

## Inter-Plugin Relationships

### Homepage Plugin
- **Provides:** 5 homepage sections via `homepageSections` getter
- **Data Endpoint:** `/cv/data.json` for homepage plugin to fetch data
- **Discovery:** Homepage plugin scans `plugin.homepageSections` for all loaded plugins

### Eleventy
- **Integration:** Writes JSON file to `{contentDir}/.indiekit/cv.json`
- **Trigger:** Eleventy file watcher detects changes and rebuilds
- **Usage:** Eleventy `_data/cv.js` reads JSON file for template rendering

### Data Dependencies
- **Requires:** MongoDB connection via Indiekit
- **Creates Collection:** `cvData`
- **Writes File:** `{contentDir}/.indiekit/cv.json`

## Dependencies

```json
{
  "@indiekit/error": "^1.0.0-beta.25",
  "@indiekit/frontend": "^1.0.0-beta.25",
  "express": "^5.0.0"
}
```

No external dependencies for parsing - all form handling is native Express.

## Testing Notes

- **No test suite configured** (manual testing only)
- Test CRUD for all sections (add, edit, delete, reorder)
- Test JSON file writing (check `{contentDir}/.indiekit/cv.json`)
- Test public API endpoint (`/cv/data.json`)
- Test homepage plugin integration (sections appear in homepage builder)

## Common Tasks

### Add a New CV Section
1. Add field to schema in `getDefaultCvData()` (`lib/storage/cv.js`)
2. Add CRUD routes in `index.js` (e.g., `POST /newsection/add`)
3. Add controller methods in `lib/controllers/dashboard.js`
4. Add form UI in admin template
5. Optional: Register as homepage section in `index.js` `homepageSections` getter

### Add a Homepage Section
1. Add section definition to `homepageSections` array in `index.js`
2. Include `dataEndpoint: "/cv/data.json"` so homepage plugin knows where to fetch data
3. Define `defaultConfig` and `configSchema` for user configuration

### Change JSON File Location
- Modify `writeCvFile()` in `lib/storage/cv.js`
- Update `contentDir` path construction
- Ensure Eleventy `_data/cv.js` reads from new location

### Debug Form Data Loss
- Check `parseArrayField()` handles JSON strings (see "Hidden Input JSON Strings" gotcha)
- Inspect POST body in logs: `console.log(request.body)`
- Verify hidden inputs use `value="{{ data | dump }}"` (NOT `| dump | safe` - breaks on single quotes)

## Navigation

The plugin adds itself to Indiekit's navigation:

- **Menu Item:** "CV" (requires database)
- **Shortcut:** Briefcase icon in admin dashboard

## Security

- **Protected Routes:** All admin UI and CRUD endpoints require authentication
- **Public Route:** `/cv/data.json` is publicly accessible (read-only)
- **No User Input Sanitization:** Skills/interests are simple strings - consider adding sanitization if displaying unescaped
