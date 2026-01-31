# Post-Merge Verification Checklist

This checklist helps verify that the Docsify documentation site is working correctly after merging to main.

## Immediate Checks (Within 5 minutes of merge)

### 1. GitHub Actions Workflow
- [ ] Go to https://github.com/jellydn/ai-cli-switcher/actions
- [ ] Verify "Deploy Docsify to GitHub Pages" workflow is running/completed
- [ ] Check that the workflow run is green (successful)
- [ ] Review workflow logs if there are any errors

### 2. GitHub Pages Settings
- [ ] Go to Settings → Pages in the repository
- [ ] Verify Source is set to "GitHub Actions"
- [ ] Check that custom domain shows `ai-cli.itman.fyi`
- [ ] Verify HTTPS is enforced (if available)

### 3. Documentation Site Access

#### Primary URL (Custom Domain)
- [ ] Visit https://ai-cli.itman.fyi/
- [ ] Verify the page loads correctly
- [ ] Check that the logo appears
- [ ] Verify custom colors are applied (#6366f1)

#### Fallback URL
- [ ] Visit https://jellydn.github.io/ai-cli-switcher/
- [ ] Verify the page loads correctly
- [ ] Should redirect to custom domain if configured

## Functionality Checks

### Navigation
- [ ] Sidebar navigation is visible
- [ ] All links in sidebar work:
  - [ ] Home
  - [ ] Installation
  - [ ] Usage
  - [ ] Configuration
  - [ ] Templates
  - [ ] Development
  - [ ] Contributing
- [ ] Pagination (Next/Previous) works at bottom of pages
- [ ] GitHub repository link works (top-right corner)

### Search
- [ ] Search box appears in sidebar
- [ ] Type a query (e.g., "install")
- [ ] Results appear in real-time
- [ ] Click a result navigates to correct page

### Code Blocks
- [ ] Code blocks are properly highlighted
- [ ] Copy button appears on code blocks
- [ ] Click copy button and paste to verify it works
- [ ] Syntax highlighting works for:
  - [ ] Bash/Shell commands
  - [ ] JSON configurations
  - [ ] TypeScript code

### Mobile Responsiveness
- [ ] Open site on mobile device or use browser DevTools
- [ ] Sidebar collapses to hamburger menu
- [ ] Content is readable on small screens
- [ ] Navigation works on touch devices

### Performance
- [ ] Page loads within 2-3 seconds
- [ ] Navigation between pages is instant
- [ ] Search is responsive
- [ ] No console errors in browser DevTools

## Content Verification

### Home Page
- [ ] Logo displays correctly
- [ ] Features list is complete
- [ ] Installation section has all methods
- [ ] Links work correctly

### Installation Page
- [ ] All installation methods documented:
  - [ ] One-line install
  - [ ] Homebrew
  - [ ] Windows
  - [ ] Build from source
  - [ ] Manual install
- [ ] Code examples are correct
- [ ] Screenshots (if any) load

### Usage Page
- [ ] Interactive mode documentation
- [ ] Direct invocation examples
- [ ] Template usage examples
- [ ] Git diff analysis section

### Configuration Page
- [ ] Tools configuration section
- [ ] Templates configuration section
- [ ] Auto-detection explanation
- [ ] Example configurations

### Templates Page
- [ ] Template structure explained
- [ ] Multiple template examples
- [ ] Usage examples
- [ ] Best practices

### Development Page
- [ ] Setup instructions
- [ ] Development commands table
- [ ] Code style guidelines
- [ ] Architecture overview
- [ ] Testing instructions

### Contributing Page
- [ ] Contribution guidelines
- [ ] Development workflow
- [ ] Code style requirements
- [ ] PR guidelines
- [ ] Commit message format

## Custom Domain Setup

If the custom domain is not working immediately:

### DNS Configuration
- [ ] Verify DNS A records point to GitHub Pages IPs:
  ```
  185.199.108.153
  185.199.109.153
  185.199.110.153
  185.199.111.153
  ```
- [ ] Or CNAME record points to `jellydn.github.io`
- [ ] Wait 24-48 hours for DNS propagation if just configured

### GitHub Pages Configuration
- [ ] In Settings → Pages, re-enter custom domain if needed
- [ ] Wait for HTTPS certificate to be issued (can take several minutes)
- [ ] Check "Enforce HTTPS" once certificate is ready

## Troubleshooting

### Site Not Loading
1. Check GitHub Actions workflow completed successfully
2. Verify GitHub Pages is enabled in repository settings
3. Clear browser cache and try again
4. Try incognito/private mode
5. Check browser console for errors

### Search Not Working
1. Verify docsify-search plugin is loading (check Network tab)
2. Check browser console for JavaScript errors
3. Try clearing cache and reloading

### Styling Issues
1. Verify CDN resources are loading (check Network tab)
2. Check for ad blockers or privacy extensions blocking CDN
3. Try different browser
4. Check custom styles in index.html

### Custom Domain Issues
1. Verify CNAME file exists in docs/ directory
2. Check DNS configuration with `dig ai-cli.itman.fyi`
3. Wait for DNS propagation (24-48 hours)
4. Verify in Settings → Pages that domain is correct

## Optional Enhancements

After verifying everything works, consider:

- [ ] Add Google Analytics (if desired)
- [ ] Add more screenshots/animated demos
- [ ] Create a cover page for dramatic landing
- [ ] Add version selector for multiple versions
- [ ] Set up edit-on-GitHub links
- [ ] Add more syntax highlighting languages
- [ ] Create custom theme for unique branding
- [ ] Add FAQ section
- [ ] Include video tutorials
- [ ] Set up offline support with service worker

## Success Confirmation

If all checks pass, the Docsify setup is complete and working! 🎉

Document any issues found during verification and create issues in GitHub for future improvements.

---

**Verification Date**: _______________
**Verified By**: _______________
**Status**: _______________
**Notes**: _______________
