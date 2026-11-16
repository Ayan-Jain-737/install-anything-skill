---
name: install-anything
description: Universal GitHub repository and skill installer for AI agent harnesses
usage: |
  /install-anything find <query> -- Discover agent skills, packages, and CLI tool repositories
  /install-anything inspect <repo-url> -- Preview archetype, skills, and install plan without modifying disk
  /install-anything install <repo-url> [--agent <name>] [--scope <local|global>] [--skills <glob>] -- Download/install repository and register skills
  /install-anything diagnose <repo-url> -- Analyze repository without installing
  /install-anything list-installed -- Show all managed installations and registered skills
  /install-anything uninstall <id> --force -- Safely remove installation and unregister skills
author: Ayan-Jain-737
version: 3.1.0
---

# install-anything

Universal GitHub repository and skill installer for AI agent harnesses.

```bash
/install-anything find react
/install-anything inspect anil-matcha/open-generative-ai
/install-anything install https://github.com/user/repo
/install-anything install vercel-labs/agent-skills --skills "react-*"
/install-anything install user/repo --scope local
/install-anything diagnose https://github.com/user/repo
/install-anything list-installed
/install-anything uninstall <id> --force
```

Automatically detects repository archetypes (prompt skills, CLI binaries, fullstack web apps, libraries), minimizes git clones through zero-clone tarball streaming and direct release downloads, registers skills cleanly into your active agent's folder (Claude Code, Cursor, Codex, Gemini, Hermes, etc.) or project-local workspace, and synthesizes exhaustive operational skill manuals without creating ghost directories for unused agents.
