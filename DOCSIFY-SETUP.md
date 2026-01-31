# Docsify Setup Documentation

This document explains the Docsify setup for the AI CLI Switcher project.

## What is Docsify?

Docsify is a documentation site generator that dynamically renders Markdown files. It doesn't generate static HTML files, instead it loads and parses Markdown files in the browser.

## Setup Details

### Files Created

1. **`docs/index.html`** - Main Docsify configuration
   - Sets up the theme (Vue theme)
   - Configures plugins (search, copy-to-clipboard, pagination)
   - Enables syntax highlighting for bash, JSON, and TypeScript
   - Sets the theme color to match the project branding

2. **`docs/README.md`** - Home page content
   - Main landing page with features overview
   - Installation instructions
   - Basic usage examples
   - Links to detailed documentation

3. **`docs/_sidebar.md`** - Navigation sidebar
   - Links to all documentation pages
   - Auto-generated navigation structure

4. **Documentation Pages**:
   - `installation.md` - Installation instructions for all platforms
   - `usage.md` - Usage guide with examples
   - `configuration.md` - Configuration reference
   - `templates.md` - Template examples and patterns
   - `development.md` - Development setup and guidelines
   - `contributing.md` - Contribution guidelines

5. **`docs/.nojekyll`** - Tells GitHub Pages not to process files with Jekyll

6. **`.github/workflows/docs.yml`** - GitHub Actions workflow for automatic deployment

## Features Enabled

- **Search**: Full-text search across all documentation
- **Copy to Clipboard**: One-click code copying
- **Pagination**: Next/Previous navigation at bottom of pages
- **Syntax Highlighting**: Code blocks with proper syntax highlighting
- **Zoom Images**: Click to zoom images
- **Responsive Design**: Mobile-friendly layout
- **Dark Mode Support**: Via Vue theme

## Docsify Configuration

```javascript
window.$docsify = {
  name: 'AI CLI Switcher',
  repo: 'jellydn/ai-cli-switcher',
  logo: 'logo.svg',
  loadSidebar: true,
  subMaxLevel: 2,
  homepage: 'README.md',
  coverpage: false,
  auto2top: true,
  themeColor: '#6366f1'
}
```

## GitHub Pages Deployment

The site is automatically deployed to GitHub Pages when changes are pushed to the `main` branch. The workflow:

1. Checks out the repository
2. Configures GitHub Pages
3. Uploads the `docs` folder as an artifact
4. Deploys to GitHub Pages

## Local Development

To preview the documentation locally:

```bash
# Using Python
cd docs
python3 -m http.server 3000
# Open http://localhost:3000

# Using Node.js
npx serve docs
```

## GitHub Pages Configuration

Ensure GitHub Pages is configured to:
- Source: GitHub Actions (automatic deployment)
- Custom domain: `ai-cli.itman.fyi` (already configured via CNAME file)

## Accessing the Site

Once deployed, the documentation will be available at:
- https://jellydn.github.io/ai-cli-switcher/
- https://ai-cli.itman.fyi/ (if custom domain is configured)

## Customization

### Theme Colors

The theme uses custom colors defined in the `index.html`:

```css
:root {
  --theme-color: #6366f1;        /* Primary color (indigo) */
  --theme-color-secondary: #8b5cf6; /* Secondary color (purple) */
}
```

### Adding New Pages

1. Create a new `.md` file in the `docs/` directory
2. Add a link to `_sidebar.md`
3. Commit and push - the site will update automatically

### Updating Navigation

Edit `docs/_sidebar.md` to change the sidebar navigation structure.

## Plugins Used

- **docsify-search**: Full-text search functionality
- **docsify-copy-code**: Copy button for code blocks
- **docsify-pagination**: Next/Previous navigation
- **docsify-zoom-image**: Image zoom on click
- **Prism.js**: Syntax highlighting for bash, JSON, TypeScript

## Best Practices

1. Keep documentation in sync with code
2. Use clear, concise language
3. Include code examples
4. Add screenshots where helpful
5. Link between related pages
6. Keep navigation structure shallow (2 levels max)

## Troubleshooting

### Site not loading?
- Check GitHub Actions workflow status
- Verify GitHub Pages is enabled in repository settings
- Ensure `.nojekyll` file exists in docs folder

### Styling issues?
- Check browser console for CDN loading errors
- Verify theme CSS is loading correctly
- Check custom styles in `index.html`

### Search not working?
- Ensure search plugin is loaded in `index.html`
- Check for JavaScript errors in browser console

## Future Enhancements

Possible improvements for the documentation:

- [ ] Add a cover page with hero section
- [ ] Include animated demos/GIFs
- [ ] Add dark mode toggle
- [ ] Create a custom theme
- [ ] Add more syntax highlighting languages
- [ ] Include version selector
- [ ] Add edit-on-GitHub links
- [ ] Implement offline support
