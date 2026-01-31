# Docsify Documentation Site

This documentation provides information about the Docsify setup for AI CLI Switcher.

## What is Docsify?

Docsify is a lightweight documentation site generator that:
- Dynamically generates documentation from Markdown files
- Requires no static site build process
- Renders markdown on-the-fly in the browser
- Works seamlessly with GitHub Pages

## Features Implemented

### 🎨 Visual Design
- **Vue Theme**: Clean, modern theme with custom purple accent colors
- **Logo Integration**: Displays the AI CLI Switcher logo at the top
- **Responsive Layout**: Adapts to different screen sizes and devices
- **Custom Styling**: Tailored code blocks, borders, and spacing

### 🔍 Search Functionality
- **Full-text Search**: Search across all documentation content
- **Instant Results**: Real-time search with keyboard navigation
- **Deep Indexing**: Searches through nested headers and content

### 💻 Code Features
- **Syntax Highlighting**: 
  - Bash/Shell commands
  - TypeScript/JavaScript
  - JSON configuration
- **Copy to Clipboard**: One-click copy button for all code blocks
- **Code Block Styling**: Rounded corners and proper formatting

### 📖 Content Features
- **Auto-generated from README**: Uses the main README.md as primary content
- **Anchor Links**: Automatic heading links with # anchors
- **Image Zoom**: Click images to view full-size
- **External Link Icons**: Visual indicators for external links
- **Table of Contents**: Auto-generated navigation

### 🚀 Performance
- **CDN Delivery**: Fast loading via jsdelivr CDN
- **Client-side Rendering**: No build step required
- **Caching**: Browser caching for optimal performance

## File Structure

```
docs/
├── .nojekyll          # Tells GitHub Pages not to use Jekyll
├── CNAME              # Custom domain configuration
├── README.md          # Documentation about the docs site
├── index.html         # Docsify configuration and entry point
├── logo.svg           # Main logo displayed on the site
└── logo-icon.svg      # Icon version of the logo
```

## Configuration Details

### Docsify Settings

The `index.html` configures Docsify with:

```javascript
{
  name: 'AI CLI Switcher',      // Site name with logo
  repo: 'jellydn/ai-cli-switcher', // GitHub repo link
  homepage: '../README.md',     // Uses root README as content
  auto2top: true,               // Scroll to top on navigation
  maxLevel: 4,                  // Show headers up to h4
  subMaxLevel: 3,               // Sidebar depth
  themeColor: '#5865f2'         // Purple accent color
}
```

### Theme Customization

Custom CSS variables:
```css
:root {
  --theme-color: #5865f2;           /* Primary purple */
  --theme-color-secondary: #7289da; /* Secondary purple */
}
```

### Plugin Configuration

1. **Search Plugin**: 1-day cache, searches through 4 levels deep
2. **Copy Code Plugin**: Customized button text and feedback
3. **Pagination Plugin**: Previous/Next navigation between sections
4. **Zoom Image Plugin**: Click-to-zoom for images

## Local Development

### Option 1: Python SimpleHTTPServer
```bash
cd docs
python3 -m http.server 3000
```

### Option 2: Bun
```bash
cd docs
bunx serve
```

### Option 3: Node.js
```bash
cd docs
npx serve
```

Then visit: http://localhost:3000

## Deployment

### GitHub Pages Setup

1. **Enable GitHub Pages**:
   - Go to repository Settings → Pages
   - Source: Deploy from branch
   - Branch: `main`, Folder: `/docs`
   - Save

2. **Custom Domain** (already configured):
   - Domain: `ai-cli.itman.fyi`
   - Configured via `docs/CNAME` file

3. **Automatic Updates**:
   - Any push to `main` branch automatically rebuilds the site
   - Changes to `README.md` or files in `docs/` trigger deployment
   - Typically takes 1-2 minutes to deploy

### First-time Deployment

After enabling GitHub Pages, visit:
- https://ai-cli.itman.fyi (custom domain)
- https://jellydn.github.io/ai-cli-switcher (GitHub domain)

## Content Updates

### Updating Main Documentation
The documentation automatically reflects changes to `README.md` in the repository root:

1. Edit `README.md`
2. Commit and push to `main`
3. GitHub Pages rebuilds automatically
4. Documentation updates within 1-2 minutes

### Adding Additional Pages
To add more documentation pages:

1. Create `.md` files in the `docs/` directory
2. Link to them from the README
3. Docsify will automatically render them

Example:
```markdown
<!-- In README.md -->
See [Advanced Configuration](docs/advanced.md) for more details.
```

## Troubleshooting

### Site Not Loading
- Ensure GitHub Pages is enabled in repository settings
- Verify source is set to `/docs` folder
- Check that `.nojekyll` file exists
- Wait 1-2 minutes after enabling for initial deployment

### Styles Not Appearing
- Check browser console for CDN loading errors
- Verify internet connection
- Try clearing browser cache
- Ensure `index.html` is not modified incorrectly

### Custom Domain Issues
- Verify `CNAME` file contains correct domain
- Check DNS settings point to GitHub Pages
- May take 24-48 hours for DNS propagation

### Search Not Working
- Ensure content has proper heading structure
- Check that markdown files are accessible
- Verify search plugin is loaded in `index.html`

## Best Practices

### Markdown Writing
- Use proper heading hierarchy (h1 → h2 → h3)
- Add descriptive alt text for images
- Use code fences with language identifiers
- Keep lines under 100 characters for readability

### Content Organization
- Group related content under clear headings
- Use details/summary for collapsible sections
- Add anchor links for quick navigation
- Include code examples with explanations

### SEO Optimization
- Meta description is set in `index.html`
- Page title includes project name
- Proper heading structure helps search engines
- GitHub social preview uses README content

## Customization Guide

### Changing Theme Color
Edit `index.html`:
```css
:root {
  --theme-color: #5865f2;  /* Change this hex color */
}
```

### Adding Custom CSS
Add styles within the `<style>` tag in `index.html`:
```css
/* Custom styles */
.markdown-section {
  /* Your custom styles */
}
```

### Adding More Plugins
Add script tags before `</body>` in `index.html`:
```html
<!-- Example: Add emoji plugin -->
<script src="//cdn.jsdelivr.net/npm/docsify/lib/plugins/emoji.min.js"></script>
```

Available plugins:
- Emoji support
- Edit on GitHub button
- Progress bar
- Tabs
- And many more at https://docsify.js.org/#/plugins

## Resources

- **Docsify Documentation**: https://docsify.js.org
- **GitHub Pages Docs**: https://docs.github.com/pages
- **Custom Domains**: https://docs.github.com/pages/configuring-a-custom-domain
- **Markdown Guide**: https://www.markdownguide.org

## Support

For issues with the documentation site:
1. Check this guide's troubleshooting section
2. Review Docsify's official documentation
3. Open an issue in the repository
4. Contact the maintainer

---

**Note**: This Docsify setup requires no build process. All rendering happens in the browser, making it easy to maintain and update.
