# AI Launcher Documentation

This directory contains the Docsify-powered documentation site for AI Launcher.

## Local Development

To preview the documentation locally, run:

```bash
# Using Python 3
cd docs && python3 -m http.server 3000

# Using Bun
cd docs && bunx serve

# Using npx
cd docs && npx serve
```

Then visit: http://localhost:3000

## Deployment

The documentation is automatically deployed to GitHub Pages at: https://ai-cli.itman.fyi

The site uses:
- Docsify for dynamic rendering
- Main README.md as the primary content source
- Vue theme with custom styling
- Search functionality
- Syntax highlighting for code blocks
- Copy-to-clipboard for code snippets

## Configuration

The Docsify configuration is in `index.html` and includes:
- Auto-generated headers with anchor links
- Full-text search
- Code syntax highlighting (Bash, TypeScript, JSON)
- Copy code button
- Image zoom on click
- Responsive design
