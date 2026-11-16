---
name: install-anything
description: >-
  Universal GitHub repository and skill installer for AI agent harnesses.
  Use this skill whenever asked to install, download, import, or set up any GitHub repository,
  tool, library, or agent skill. It automatically detects repository archetypes, supports zero-clone
  tarball and binary downloads, handles fullstack apps with operational service manuals,
  registers discovered skills into the active caller agent's skill folder (Claude Code, Cursor, Codex, Gemini, Hermes, etc.)
  and global canonical storage (~/.agents/skills/) or project-local storage (--scope local),
  and executes build/install instructions suggested by the repository.
---

# install-anything - Universal Agent Skill & Repository Installer

`install-anything` allows AI agents and developers to download, inspect, and install any GitHub repository or agent skill in one command.
It automatically classifies repositories into 7 distinct archetypes, minimizes git clones through zero-clone tarball streaming and direct binary release asset downloads, synthesizes exhaustive `SKILL.md` manuals, and cleanly scopes skills to your active agent.

## Capabilities

1. **Archetype Triage & Zero-Clone Architecture (P0)**:
   - **Archetype 1 (`skill-pack`)**: Streams GitHub archive tarballs (`/archive/HEAD.tar.gz`) directly to extract `SKILL.md` files without full git history cloning. Supports glob filtering (`--skills "react-*"`).
   - **Archetype 2 (`cli-binary`)**: Direct binary asset downloader using deterministic regex heuristics (OS, Arch, musl/gnu) and rate-limit-free HTML/CDN redirects. Installs directly to `~/.local/bin/` without cloning source code.
   - **Archetype 3 (`cli-source`)**: Builds from source (`cargo build --release`, `go build`, `npm install -g`, `pip install`) when binaries are unavailable.
   - **Archetype 4 (`web-app`)**: For fullstack web apps and monorepos (e.g. `open-generative-ai`), avoids cloning multi-gigabyte client/server bundles; synthesizes an operational service manual with Docker startup recipes and API endpoints.
   - **Archetype 5 (`mcp-server`)**: Configures Model Context Protocol server definitions.
   - **Archetype 6 (`library`)**: Identifies SDKs and packages for import.
   - **Archetype 7 (`mixed-meta`)**: Handles complex multi-language repositories.
2. **Interactive Human Handoff Report**: For non-AI applications or complex apps requiring Docker daemons, database seeding, or `.env` secrets, generates a clear markdown checklist guiding the agent on what to ask the user.
3. **In-Depth Skill Manual Synthesis**: For repositories without pre-packaged `SKILL.md` files, dynamically extracts `--help` flags, subcommands, usage recipes, configuration options, and troubleshooting steps into an actionable multi-section manual.
4. **Active-Agent & Project-Local Scoping**:
   - **Active Agent**: Only touches your active harness (e.g., Antigravity/Gemini, Claude Code, Cursor) and global canonical storage (`~/.agents/skills/`). Never pollutes unused agent directories.
   - **Project-Local Scoping (`--scope local` / `-p`)**: Scopes skills strictly to the local workspace (`./.agents/skills/`, `./.gemini/skills/`, etc.) with atomic `./.skill-lock.json`.
5. **Rate-Limit Safe & Atomic Writes**:
   - Bypasses GitHub API rate limits using `raw.githubusercontent.com` CDN manifests and direct release asset download redirects.
   - Atomic file writes (`fs.renameSync`) eliminate reader/writer race conditions across multiple agents.

---

## Agent Usage Instructions

When the user asks you to install, import, inspect, or set up a repository or skill, run the following:

### 1. Discover Skills & Tool Repositories (Find)
```bash
install-anything find <query>
```
Searches the open registry (`skills.sh`), curated battle-tested skills, and developer tool repositories.

```bash
# Find skills or tools for React:
install-anything find react

# Machine-readable output for agent consumption:
install-anything find <query> --json
```

### 2. Inspect Repository Archetype & Install Plan (Inspect)
```bash
install-anything inspect <repo-url-or-shorthand>
```
Analyzes the repository archetype, checks for pre-packaged skills, tests for zero-clone binary releases, and previews the installation plan without making any disk modifications.

```bash
# Preview fullstack app strategy without cloning:
install-anything inspect anil-matcha/open-generative-ai

# Preview binary tool release availability:
install-anything inspect BurntSushi/ripgrep
```

### 3. Install Repository & Register Skills
```bash
install-anything install <repo-url-or-shorthand> [options]
```

**Common Examples:**
```bash
# Zero-clone install of prompt skill pack:
install-anything install vercel-labs/agent-skills

# Selective skill extraction using glob patterns:
install-anything install vercel-labs/agent-skills --skills "react-*,tdd*"

# Project-local installation (registers to ./.agents/skills/):
install-anything install user/repo --scope local
# or using shorthand:
install-anything install user/repo -p

# Zero-clone release binary download:
install-anything install BurntSushi/ripgrep

# Fullstack app / service synthesis:
install-anything install anil-matcha/open-generative-ai

# Force a full git clone if source code is explicitly needed:
install-anything install user/repo --force-clone

# Preview without making filesystem changes:
install-anything install user/repo --dry-run

# Output structured JSON for agent pipelines:
install-anything install user/repo --json
```

### 4. Diagnose Repository (Diagnose)
```bash
install-anything diagnose <repo-url>
```
Parses targeted `## Installation` and `## Quickstart` sections of the repository's README to analyze dependencies and build commands.

### 5. List Managed Installations
```bash
install-anything list-installed
```

### 6. Safe Removal (Uninstall)
```bash
install-anything uninstall <identifier> --force
```
Removes repository files and unregisters skills from both the active agent directory and canonical storage.
