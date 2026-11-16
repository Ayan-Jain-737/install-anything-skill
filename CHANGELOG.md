# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.1.0] - 2026-11-17

### Added
- ⚡ **Zero-Clone Architecture & Tarball Streaming**:
  - Direct repository tarball streaming via GitHub archive URLs (`/archive/HEAD.tar.gz`) without cloning gigabytes of git history.
  - Selective extraction of discovered `SKILL.md` files while ignoring non-skill bloat.
  - Granular glob filtering support (`--skills "react-*,tdd*"`) to install only targeted skills from large prompt pack monorepos.
- 🎯 **7-Archetype Intelligent Triage Engine (`ias inspect`)**:
  - Classifies repositories before touching disk into 7 distinct archetypes: `skill-pack`, `cli-binary`, `cli-source`, `web-app`, `mcp-server`, `library`, and `mixed-meta`.
  - Rate-limit-immune manifest extraction via `raw.githubusercontent.com` CDN with 24-hr local HTTP caching.
  - Added `ias inspect <url> [--json]` command to preview archetype, suggested build command, and skill manifests.
- 📦 **Deterministic `eget`-Style Binary Downloader**:
  - Direct binary release asset matching using OS, Architecture (`x86_64`, `arm64`), and libc (`musl`, `gnu`) heuristics.
  - Automatically matches and extracts `.tar.gz`, `.tar.bz2`, `.tar.xz`, `.zip`, and Linux `.AppImage` release assets.
  - Downloads binaries straight to `~/.local/bin/` with zero git cloning.
- 📘 **Exhaustive Multi-Section Operational Manual Synthesis**:
  - Deep auto-synthesis of `SKILL.md` for repositories lacking pre-packaged agent skills.
  - Inspects real binary `--help` and CLI flags to generate structured recipes: Quick Commands, Common Flags, Environment Variables, and Troubleshooting.
  - Special service manual generator for fullstack web applications (e.g. `open-generative-ai`) providing Docker startup recipes and API interaction guides without cloning bloated frontend bundles.
- 🤝 **Interactive Human Handoff Reports**:
  - Generates clear, structured markdown reports whenever non-AI applications require human secrets, external database initialization, or manual port configuration.
- 🔒 **Project-Local Scoping (`--scope local` / `-p`)**:
  - Support for local workspace skill registration (`./.agents/skills/`, `./.gemini/skills/`, `./.claude/skills/`).
  - Atomic workspace-isolated lockfile (`./.skill-lock.json`).
- 🔄 **Built-In Self-Updater (`ias update`) & 24-Hour Update Checker**:
  - `ias update` command updates global npm package with automatic fallback to curl installer and re-synchronizes all agent skills.
  - Non-blocking, cached 24-hour update notifier alerts users when newer versions are available on the npm registry.
- 🛡️ **Atomic Directory Spinlocks & Security Hardening**:
  - Directory-based lockfiles (`.lock`) with exponential backoff and stale lock auto-eviction prevent parallel agent race conditions.
  - ZipSlip/TarSlip path traversal validation ensures files are strictly unpacked within destination root.
  - Token isolation and safe child process execution.

---

## [2.0.0] - 2026-11-05

### Changed
- 🚀 **Full Project Rename & Refactor**:
  - Renamed package to **`install-anything-skill`** (deprecated legacy `enlighten-agent-tool`).
  - Renamed primary CLI executable to `install-anything` (with backward-compatible aliases).
  - Renamed skills to `install-anything`, `install-anything-installer`, and `install-anything-uninstaller`.
  - Renamed slash command to `/install-anything`.
  - Renamed state directory to `~/.install-anything` with seamless migration fallback from `~/.enlighten`.
  - Refactored core classes to `InstallAnythingCLI` and `InstallAnythingScanner` (aliasing legacy classes for compatibility).
  - Cleaned up all environment variable checks to prefer `INSTALL_ANYTHING_*` prefixes.

---

## [1.1.0] - 2026-11-04

### Added
- 🔍 **Skill & CLI Tool Discovery Engine** (`enlighten find <query>`):
  - Real-time search across `skills.sh` open agent skills registry.
  - Built-in curated index of top-tier skills, packages, and CLI tool repositories (React, Next.js, Playwright, Vitest, Ripgrep, Biome, Lazygit, Ruff).
  - Offline resilience with local cached fallbacks.
  - Local installed detection: identifies whether found skills are already installed in `~/.agents/.skill-lock.json`.
  - Machine-readable `--json` envelope for programmatic agent tool calling.
- 🎯 **Active-Agent Scoping & Filesystem Discipline**:
  - Automatically detects the active agent harness (e.g. Antigravity / Gemini via `ANTIGRAVITY_AGENT`, Claude Code, Hermes).
  - Installs skills only for the calling agent (e.g., `~/.gemini/skills/`) and canonical global storage (`~/.agents/skills/`).
  - **Zero Ghost Directory Pollution**: No longer creates unused directories for Codex, Zed, Cursor, etc. when running in AGY.
  - Support for explicit target flags: `--agent <name>` (or `--harness <name>`) and opt-in `--all-agents`.
- 📊 **Head-to-Head Comparison Matrix**:
  - Full architectural comparison in README and website between Enlighten and traditional `npx skills` / `find-skills`.
- 🌐 **Website Redesign (`assets/index.html`)**:
  - Added discovery showcase, comparison matrix, active-agent terminal walkthrough, and command ledger.
- 🧪 **Discovery Unit Tests (`tests/test-finder.js`)**:
  - Comprehensive test suite for search, keyword relevance scoring, CLI tool discovery, and installed status detection.

---

## [1.0.0] - 2024-11-03

### Added
- ✅ Initial release with universal GitHub repository installer
- ✅ Multi-platform support: Claude Code, Hermes, Opencode, Codex
- ✅ Intelligent language/framework detection (TypeScript, Python, Go, Rust, Java, C#)
- ✅ Auto-generated profile mapping for detected technologies
- ✅ OS adaptation layer for cross-platform installation
- ✅ Full install/uninstall lifecycle management
- ✅ Dry-run mode for safe previewing
- ✅ Installation registry with status tracking
- ✅ CLI interface with help system
- ✅ Comprehensive test suite
- ✅ Professional documentation and contributing guide

### Features
- **enlighten install** - Install any GitHub repository automatically
- **enlighten uninstall** - Clean removal of installations
- **enlighten list-installed** - View all managed repositories
- **enlighten diagnose** - Analyze repositories without installing

### Supported Languages
- TypeScript/JavaScript (React, Vue, Next.js, Svelte)
- Python (Django, FastAPI, Flask)
- Go (Gin, Echo)
- Rust (Actix, Rocket)
- Java (Spring Boot)
- C# (ASP.NET)

---

## [0.1.0] - 2024-11-02

### Added
- Project initialization
- Basic CLI scaffold
- Repository scanning logic
- Profile mapping system
- Initial README documentation

[1.0.0]: https://github.com/Ayan-Jain-737/install-anything-skill/compare/v0.1.0...v1.0.0
[0.1.0]: https://github.com/Ayan-Jain-737/install-anything-skill/tree/v0.1.0