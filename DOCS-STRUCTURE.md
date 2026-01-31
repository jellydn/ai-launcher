# Documentation Site Structure

```
ai-cli-switcher/
├── docs/                          # Documentation site root (served by GitHub Pages)
│   ├── index.html                 # Docsify configuration & entry point
│   ├── README.md                  # Home page / Landing page
│   ├── _sidebar.md                # Navigation sidebar
│   ├── .nojekyll                  # Disable Jekyll processing
│   ├── CNAME                      # Custom domain (ai-cli.itman.fyi)
│   │
│   ├── installation.md            # Installation guide
│   ├── usage.md                   # Usage examples
│   ├── configuration.md           # Configuration reference
│   ├── templates.md               # Template examples
│   ├── development.md             # Development guide
│   ├── contributing.md            # Contributing guidelines
│   │
│   ├── logo.svg                   # Project logo
│   └── logo-icon.svg              # Icon version
│
├── .github/workflows/
│   ├── docs.yml                   # Deploy documentation to GitHub Pages
│   ├── ci.yml                     # (existing) CI workflow
│   └── release.yml                # (existing) Release workflow
│
├── DOCSIFY-SETUP.md              # Setup documentation
├── IMPLEMENTATION-SUMMARY.md      # Implementation summary
└── README.md                      # Main project README (updated with doc link)
```

## Navigation Flow

```
Home (/)
├── Installation
│   ├── One-line Install
│   ├── Homebrew
│   ├── Windows
│   ├── Build from Source
│   └── Manual Install
│
├── Usage
│   ├── Interactive Mode
│   ├── Direct Invocation
│   ├── Passing Arguments
│   ├── Templates
│   └── Git Diff Analysis
│
├── Configuration
│   ├── Tools
│   ├── Templates
│   ├── Git Diff Prompts
│   └── Auto-Detection
│
├── Templates
│   ├── Basic Structure
│   ├── With Arguments
│   ├── With Stdin
│   ├── Without Arguments
│   └── Examples by Category
│
├── Development
│   ├── Getting Started
│   ├── Development Commands
│   ├── Code Style Guidelines
│   ├── Architecture
│   └── Testing
│
└── Contributing
    ├── Ways to Contribute
    ├── Development Workflow
    ├── Code Style
    ├── Testing Guidelines
    └── Pull Request Guidelines
```

## Features Enabled

### Plugins
- ✅ **Search** - Full-text search across all docs
- ✅ **Copy to Clipboard** - One-click code copying
- ✅ **Pagination** - Next/Previous navigation
- ✅ **Zoom Image** - Click to zoom images
- ✅ **External Script** - Load external scripts

### Syntax Highlighting
- ✅ Bash/Shell
- ✅ JSON
- ✅ TypeScript
- ✅ JavaScript (default)

### Theme
- **Base**: Vue theme
- **Primary Color**: #6366f1 (Indigo)
- **Secondary Color**: #8b5cf6 (Purple)
- **Responsive**: Mobile-friendly

## Deployment Flow

```
Push to main branch
        ↓
GitHub Actions triggered
        ↓
Checkout repository
        ↓
Setup GitHub Pages
        ↓
Upload docs/ folder
        ↓
Deploy to GitHub Pages
        ↓
Site live at:
  - https://jellydn.github.io/ai-cli-switcher/
  - https://ai-cli.itman.fyi/
```

## URLs

- **Repository**: https://github.com/jellydn/ai-cli-switcher
- **Documentation**: https://ai-cli.itman.fyi/ (after deployment)
- **Fallback URL**: https://jellydn.github.io/ai-cli-switcher/

## Content Summary

| Page | Purpose | Word Count (approx) |
|------|---------|-------------------|
| Home | Landing page, features, quick start | 1,000 |
| Installation | All installation methods | 300 |
| Usage | Usage examples and patterns | 700 |
| Configuration | Config reference and examples | 600 |
| Templates | Template patterns and examples | 900 |
| Development | Development setup and guidelines | 1,000 |
| Contributing | Contribution guidelines | 800 |
| **Total** | | **~5,300 words** |

## Maintenance

### Adding New Pages
1. Create `.md` file in `docs/`
2. Add link to `_sidebar.md`
3. Commit and push to main
4. Auto-deploys

### Updating Content
1. Edit `.md` file
2. Commit and push to main
3. Auto-deploys (1-2 minutes)

### Customizing Theme
1. Edit `docs/index.html`
2. Modify CSS variables
3. Add/remove plugins
4. Update configuration

## Statistics

- **Total Files Created**: 14
- **Total Lines Added**: 1,670+
- **Documentation Pages**: 7
- **Plugins Enabled**: 5
- **Languages Highlighted**: 3+
- **Deployment Time**: ~1-2 minutes

## Success Metrics

✅ Professional landing page
✅ Comprehensive documentation
✅ Easy navigation
✅ Search functionality
✅ Mobile responsive
✅ Automatic deployment
✅ Custom domain support
✅ Fast loading times
✅ Developer-friendly
✅ Easy to maintain
