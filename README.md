# CV Endpoint for Indiekit

An Indiekit plugin that provides a CV/resume editor with admin UI, homepage integration, and public JSON API.

## Features

- **Structured CV Management:** Work experience, projects, skills, education, languages, interests
- **Admin UI:** Add, edit, delete, and reorder entries for all CV sections
- **Homepage Integration:** Registers 5 homepage sections for dynamic homepage building
- **Eleventy Integration:** Writes JSON file that triggers Eleventy rebuilds
- **Public JSON API:** Read-only endpoint for frontend consumption

## Installation

```bash
npm install @rmdes/indiekit-endpoint-cv
```

## Configuration

Add to your `indiekit.config.js`:

```javascript
import CvEndpoint from "@rmdes/indiekit-endpoint-cv";

export default {
  plugins: [
    new CvEndpoint({
      mountPath: "/cv"  // Default, can be changed
    })
  ]
};
```

## Requirements

- **Indiekit:** `>=1.0.0-beta.25`
- **MongoDB:** Required for data storage
- **Optional:** `@rmdes/indiekit-endpoint-homepage` for homepage builder integration

## Usage

### Admin UI

Navigate to `/cv` in your Indiekit instance to access the CV editor. The dashboard shows all sections with inline add/edit/delete/reorder controls.

#### Sections

1. **Work Experience**
   - Title, company, location
   - Start/end dates (YYYY-MM format)
   - Employment type (full-time, part-time, contract, etc.)
   - Description and highlights (bullet points)

2. **Projects**
   - Name, URL, description
   - Technologies (comma-separated)
   - Status (active, completed, archived)
   - Project type (personal or work)
   - Start/end dates

3. **Skills**
   - Grouped by category
   - Add categories (e.g., "Languages", "Frameworks", "Tools")
   - Each category contains comma-separated skills

4. **Education**
   - Degree, institution, location
   - Start/end dates
   - Description

5. **Languages**
   - Language name
   - Proficiency level (native, fluent, intermediate, basic)

6. **Interests**
   - Simple comma-separated list

### Public API

**Get Full CV Data**
```
GET /cv/data.json
```

Returns:
```json
{
  "experience": [...],
  "projects": [...],
  "skills": {
    "Languages": ["JavaScript", "Python"],
    "Frameworks": ["React", "Express"]
  },
  "education": [...],
  "languages": [...],
  "interests": ["Photography", "Hiking"],
  "lastUpdated": "2026-02-13T10:30:00.000Z"
}
```

### Homepage Integration

If you have `@rmdes/indiekit-endpoint-homepage` installed, the CV plugin registers 5 homepage sections:

1. **Work Experience** (`cv-experience`)
   - Config: Max items, show highlights toggle

2. **Skills** (`cv-skills`)
   - Displays all skill categories

3. **Education & Languages** (`cv-education`)
   - Combined section

4. **Personal Projects** (`cv-projects-personal`)
   - Filters projects where `projectType === "personal"`
   - Config: Max items, show technologies toggle

5. **Work Projects** (`cv-projects-work`)
   - Filters projects where `projectType === "work"`
   - Config: Max items, show technologies toggle

6. **Interests** (`cv-interests`)
   - Simple list display

These sections can be added to your homepage via the homepage builder UI and will automatically fetch data from `/cv/data.json`.

### Eleventy Integration

On every save, the plugin writes CV data to:
```
{contentDir}/.indiekit/cv.json
```

Your Eleventy site can read this file via `_data/cv.js`:

```javascript
import { readFileSync } from "fs";
import { join } from "path";

const cvPath = join(process.cwd(), "content/.indiekit/cv.json");

export default JSON.parse(readFileSync(cvPath, "utf-8"));
```

Then use in templates:
```nunjucks
{% for exp in cv.experience %}
  <h3>{{ exp.title }} at {{ exp.company }}</h3>
  <p>{{ exp.startDate }} - {{ exp.endDate or "Present" }}</p>
  <p>{{ exp.description }}</p>
{% endfor %}
```

## Data Structure

### Experience Entry
```javascript
{
  title: "Senior Developer",
  company: "Acme Inc",
  location: "San Francisco, CA",
  startDate: "2020-01",
  endDate: null,  // null = current
  type: "full-time",
  description: "Building awesome things",
  highlights: [
    "Led team of 5 developers",
    "Reduced build time by 50%"
  ]
}
```

### Project Entry
```javascript
{
  name: "My Awesome Project",
  url: "https://github.com/user/project",
  description: "A cool open source project",
  technologies: ["Node.js", "React", "MongoDB"],
  status: "active",
  projectType: "personal",
  startDate: "2023-06",
  endDate: null
}
```

### Skills
```javascript
{
  "Languages": ["JavaScript", "Python", "Go"],
  "Frameworks": ["React", "Express", "Django"],
  "Tools": ["Git", "Docker", "VS Code"]
}
```

### Education Entry
```javascript
{
  degree: "Bachelor of Science in Computer Science",
  institution: "University of Example",
  location: "Boston, MA",
  startDate: "2016-09",
  endDate: "2020-05",
  description: "Focus on distributed systems"
}
```

### Language Entry
```javascript
{
  name: "English",
  level: "native"
}
```

## Operations

### Adding Entries
- Use the "Add" buttons in each section
- Fill out the form
- Submit to save

### Editing Entries
- Click the "Edit" button next to any entry
- Modify fields in the form
- Submit to save changes

### Deleting Entries
- Click the "Delete" button next to any entry
- Confirm deletion (if prompt exists)

### Reordering Entries
- Use "Move Up" / "Move Down" buttons
- Changes save immediately

### Skills Management
- Add new skill categories with the "Add Category" button
- Edit categories to rename or modify skills
- Delete entire categories

## File Writing

The plugin writes CV data to a JSON file for Eleventy integration:

**Location:** `{contentDir}/.indiekit/cv.json`

**When:** After every save operation

**Purpose:** Triggers Eleventy's file watcher to rebuild the site with updated CV data

## Navigation

The plugin adds itself to Indiekit's admin navigation:

- **Menu Item:** "CV" (requires database)
- **Shortcut Icon:** Briefcase in admin dashboard

## Security

- **Admin UI:** All CRUD operations require authentication
- **Public API:** `/cv/data.json` is publicly accessible (read-only)
- **No User Accounts:** One CV per Indiekit instance (not multi-tenant)

## Common Use Cases

### Portfolio Site
Display your work experience and projects on your personal site using the public API and Eleventy integration.

### Dynamic Homepage
Use the homepage plugin to add CV sections to your homepage. Configure which sections to show and in what order.

### JSON Resume Format
Use the public API endpoint to generate a JSON Resume compatible format (may require transformation).

## Troubleshooting

### CV Data Not Appearing in Eleventy

1. Check that `{contentDir}/.indiekit/cv.json` exists and has data
2. Verify Eleventy's `_data/cv.js` is reading from the correct path
3. Restart Eleventy's dev server if file watcher didn't trigger

### Form Submission Loses Data

- Ensure you're using the latest version
- Check that hidden inputs don't use `| dump | safe` filter (causes issues with single quotes)
- Verify `parseArrayField()` handles JSON strings

### Homepage Sections Not Appearing

- Confirm `@rmdes/indiekit-endpoint-homepage` is installed and loaded
- Check plugin load order (CV plugin should load before homepage plugin uses it)
- Verify `/cv/data.json` is accessible

## Contributing

Report issues at: https://github.com/rmdes/indiekit-endpoint-cv/issues

## License

MIT
