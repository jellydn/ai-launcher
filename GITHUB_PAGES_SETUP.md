# GitHub Pages Setup Instructions

## Enable GitHub Pages

To enable the Docsify documentation site:

1. Go to your GitHub repository settings
2. Navigate to **Pages** section (under "Code and automation")
3. Under **Source**, select:
   - Branch: `main` (or your default branch)
   - Folder: `/docs`
4. Click **Save**

GitHub Pages will automatically deploy the site to: https://ai-cli.itman.fyi

## Automatic Deployment

Any changes pushed to the `docs/` directory or `README.md` will automatically trigger a GitHub Pages rebuild and deployment (usually within 1-2 minutes).

## Custom Domain

The custom domain `ai-cli.itman.fyi` is already configured via the `CNAME` file in the docs directory.

## Local Preview

To preview the documentation locally before pushing:

```bash
cd docs
python3 -m http.server 3000
# Visit: http://localhost:3000
```

## Troubleshooting

- If the site doesn't load, ensure GitHub Pages is enabled in repository settings
- Check that the `docs/` folder is being served (not root or `gh-pages` branch)
- Verify the CNAME file exists in the `docs/` directory
- Wait 1-2 minutes for GitHub Pages to rebuild after pushing changes
