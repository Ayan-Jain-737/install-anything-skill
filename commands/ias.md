---
name: ias
description: Universal GitHub repository and skill installer for AI agent harnesses (Install Anything Skill)
usage: |
  /ias find <query> -- Discover agent skills, packages, and CLI tool repositories
  /ias inspect <repo-url> -- Preview archetype, skills, and install plan without modifying disk
  /ias install <repo-url> [--agent <name>] [--scope <local|global>] [--skills <glob>] -- Download/install repository and register skills
  /ias diagnose <repo-url> -- Analyze repository without installing
  /ias list-installed -- Show all managed installations and registered skills
  /ias update -- Update ias and sync skills to the latest release
  /ias uninstall <id> --force -- Safely remove installation and unregister skills
author: Ayan-Jain-737
version: 3.1.0
---

# ias (Install Anything Skill)

Universal GitHub repository and skill installer for AI agent harnesses.

```bash
/ias find react
/ias inspect anil-matcha/open-generative-ai
/ias install https://github.com/user/repo
/ias install vercel-labs/agent-skills --skills "react-*"
/ias install user/repo --scope local
/ias diagnose https://github.com/user/repo
/ias list-installed
/ias update
/ias uninstall <id> --force
```

Automatically detects repository archetypes (prompt skills, CLI binaries, fullstack web apps, libraries), minimizes git clones through zero-clone tarball streaming and direct release downloads, registers skills cleanly into your active agent's folder (Claude Code, Cursor, Codex, Gemini, Hermes, etc.) or project-local workspace, and synthesizes exhaustive operational skill manuals without creating ghost directories for unused agents.
