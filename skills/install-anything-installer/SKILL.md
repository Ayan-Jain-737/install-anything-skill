---
name: install-anything-installer
description: >-
  Repository scanner, adapter, triage, and installation engine.
  Scans any GitHub repository for programming languages, frameworks, package managers,
  binaries, and agent skills. Classifies into 7 archetypes, performs zero-clone tarball streaming
  and direct release binary downloads, adapts installation steps for the host OS and agent harness,
  and registers skills into the caller agent folder and global storage without polluting unused agent directories.
---

# install-anything Installer Engine

The **install-anything Installer** is the core scanning, archetype triage, zero-clone extraction, and adaptation engine for install-anything.

## Features

- ✅ **7-Archetype Intelligent Triage**: Classifies repos into `skill-pack`, `cli-binary`, `cli-source`, `web-app`, `mcp-server`, `library`, and `mixed-meta`.
- ✅ **Zero-Clone Streaming Architecture**: Extracts skills via archive tarball streams (`/archive/HEAD.tar.gz`) without expensive full git history clones.
- ✅ **Deterministic Binary Matcher**: Downloads pre-compiled release binaries matching OS/Arch directly to `~/.local/bin/`.
- ✅ **Operational Manual Synthesis**: Generates deep multi-section `SKILL.md` manuals with CLI subcommands, usage recipes, and environment troubleshooting.
- ✅ **Human Handoff Reports**: Provides structured checklists for web-apps and complex non-AI software requiring human secrets or setup.
- ✅ **Active Agent & Global Registration**: Registers skills in the active agent (e.g. Antigravity / Gemini) and global Open Agents store, avoiding unwanted folders for other agents.
- ✅ **Project-Local Scoping (`--scope local`)**: Installs skills into `./.agents/skills/` without touching user home directories.
- ✅ **Atomic Concurrency Protection**: Directory spinlocks with exponential backoff prevent race conditions and file corruption.
- ✅ **Package Manager Auto-Detection**: Handles npm, yarn, pnpm, bun, pip, uv, poetry, cargo, go, gradle, maven, cmake, make.
- ✅ **Dry-Run Safe**: Previews installations and skill registrations without changes.

## CLI Commands

```bash
# Inspect repository archetype and plan before installation:
install-anything inspect <repo-url> [--json]

# Direct installer CLI (targets active agent and global):
install-anything install <repo-url> [--agent <name>] [--scope local] [--skills "glob*"] [--dry-run] [--force] [--json]

# Diagnose without installing:
install-anything diagnose <repo-url>
```

## Helper Scripts

- `scripts/scan-repo.js` - Standalone repository scanner
- `scripts/readme-guide.js` - Archetype classifier, raw manifest parser & human handoff reporter
- `scripts/adapt-install.js` - Zero-clone tarball unpacker, release binary downloader & OS adapter
- `scripts/skill-registry.js` - Multi-harness registration manager, in-depth manual synthesizer & atomic locking engine
- `scripts/skill-finder.js` - Open registry search and discovery engine
