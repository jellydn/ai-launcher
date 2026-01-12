# PRD: CI/CD Pipeline and Cross-Platform Release

## Introduction

Set up automated CI/CD pipeline with GitHub Actions that builds cross-platform binaries on every push to main, publishes to GitHub Releases, and provides one-line installers (curl script + Homebrew) for easy installation.

## Goals

- Automate builds and releases on every push to main
- Build native binaries for all major platforms (Linux x64/ARM64, macOS x64/ARM64, Windows x64)
- Publish binaries to GitHub Releases with automatic semantic versioning
- Provide curl-based one-line installer for Unix systems
- Create Homebrew formula/tap for macOS/Linux users
- Zero manual intervention for releases

## User Stories

### US-001: CI workflow for type checking and tests
**Description:** As a developer, I want automated checks on every push so that I catch issues early.

**Acceptance Criteria:**
- [ ] GitHub Actions workflow runs on push/PR to main
- [ ] Runs `bun run typecheck`
- [ ] Runs `bun test`
- [ ] Fails fast on errors

### US-002: Cross-platform binary builds
**Description:** As a developer, I want the CI to build binaries for all platforms so users can run the tool natively.

**Acceptance Criteria:**
- [ ] Builds for Linux x64 (`linux-x64`)
- [ ] Builds for Linux ARM64 (`linux-arm64`)
- [ ] Builds for macOS x64 (`darwin-x64`)
- [ ] Builds for macOS ARM64 (`darwin-arm64`)
- [ ] Builds for Windows x64 (`windows-x64`)
- [ ] Binaries are standalone executables (no runtime needed)

### US-003: Automatic versioning and releases
**Description:** As a developer, I want automatic version bumps and GitHub Releases on every main push.

**Acceptance Criteria:**
- [ ] Auto-increment patch version on each push to main
- [ ] Create GitHub Release with version tag
- [ ] Upload all platform binaries as release assets
- [ ] Generate changelog from commit messages

### US-004: Curl-based installer script
**Description:** As a user, I want to install with a single curl command so setup is instant.

**Acceptance Criteria:**
- [ ] Script detects OS and architecture automatically
- [ ] Downloads correct binary from latest GitHub Release
- [ ] Installs to `~/.local/bin` or `/usr/local/bin`
- [ ] Adds to PATH if needed (with instructions)
- [ ] Works on Linux and macOS
- [ ] Usage: `curl -fsSL https://raw.githubusercontent.com/<owner>/ai-cli-router/main/install.sh | sh`

### US-005: Homebrew formula
**Description:** As a macOS/Linux user, I want to install via Homebrew for familiar package management.

**Acceptance Criteria:**
- [ ] Create Homebrew tap repository or formula file
- [ ] Formula downloads correct binary for platform
- [ ] Supports `brew install <tap>/ai` or similar
- [ ] Auto-updates formula on new releases

## Functional Requirements

- FR-1: Create `.github/workflows/ci.yml` for typecheck and tests on push/PR
- FR-2: Create `.github/workflows/release.yml` for building and releasing on push to main
- FR-3: Use Bun's cross-compilation: `bun build --compile --target=<platform>`
- FR-4: Use semantic versioning with auto-increment (0.1.x patch bumps)
- FR-5: Create `install.sh` at repository root for curl installer
- FR-6: Create `HomebrewFormula/ai.rb` or separate tap repository
- FR-7: Binary naming convention: `ai-<os>-<arch>` (e.g., `ai-linux-x64`, `ai-darwin-arm64`)
- FR-8: Windows binary: `ai-windows-x64.exe`

## Non-Goals

- No npm registry publishing (GitHub Releases only)
- No Windows installer (.msi or .exe installer wizard)
- No Docker image
- No code signing for macOS (gatekeeper bypass via `xattr` in docs)

## Technical Considerations

- Bun supports cross-compilation via `--target` flag:
  - `bun-linux-x64`, `bun-linux-arm64`
  - `bun-darwin-x64`, `bun-darwin-arm64`
  - `bun-windows-x64`
- GitHub Actions matrix strategy for parallel builds
- Use `softprops/action-gh-release` for creating releases
- Version stored in `package.json`, bumped via script or action

## Success Metrics

- Every push to main produces a new release within 5 minutes
- Users can install on any supported platform with one command
- Zero manual steps required for releases

## Open Questions

- GitHub repository URL/owner for the install script URLs?
- Homebrew tap name (e.g., `homebrew-ai-cli-router`)?
