# install-anything-skill (ias) - Quick Start Guide

> **Version 3.1.0**: Featuring Zero-Clone Architecture, eget-style binary downloads, 7-Archetype triage, and project-local scoping.

## 🚀 1-Command Installation

Install `ias` in one command:

```bash
# 1-command curl installer (installs CLI to ~/.local/bin and registers skills across all harnesses)
curl -fsSL https://raw.githubusercontent.com/Ayan-Jain-737/install-anything-skill/main/scripts/install.sh | bash
```

Or via `npm`:
```bash
npm install -g install-anything-skill
```

Or via `skills` CLI:
```bash
npx skills add Ayan-Jain-737/install-anything-skill -g -y
```

---

## ⚡ Using `ias` in Agent Harnesses

Once installed, `ias` is registered across all agent harnesses:
- **Claude Code**: `~/.claude/skills/ias` & `/ias` command
- **Open Agents**: `~/.agents/skills/ias` & `~/.agents/.skill-lock.json`
- **Antigravity / Gemini**: `~/.gemini/skills/ias`
- **Cursor**: `~/.cursor/skills/`
- **Codex**: `~/.codex/skills/`
- **Hermes**: `~/.hermes/skills/ias` & `/ias` command
- **OpenCode**: `~/.config/opencode/skills/`
- **Zed & Headless**: canonical global skills

Ask your agent:
> *"Use ias to install https://github.com/vercel-labs/agent-skills"*

Or run directly in terminal:
```bash
ias install vercel-labs/agent-skills
```

---

## 📋 Available Commands

| Command | Description |
|---------|-------------|
| `ias find <query>` | Discover agent skills, packages, and CLI tool repos across the open registry |
| `ias inspect <url>` | Preview repository archetype, detected skills, and install plan without downloading |
| `ias install <url>` | Zero-clone stream or binary download, register skills, compile binaries |
| `ias install <url> -p` | Install in **project-local** scope (`./.agents/skills/`) instead of user home |
| `ias install <url> --skills "glob*"` | Filter and install only specific matching skills |
| `ias diagnose <url>` | Scan repository (language, framework, skills, binaries) |
| `ias list-installed` | List all installed repositories and registered skills |
| `ias update` | Self-update `ias` to latest npm release and sync all registered skills |
| `ias uninstall <id> --force` | Safe removal of repository, binaries, and registered skills |
| `ias --help` | Show command line options (alias: `install-anything`) |

---

## 💡 Quick Examples

```bash
# 1. Discover skills & CLI tools
ias find react
ias find testing

# 2. Inspect a repository before modifying disk
ias inspect anil-matcha/open-generative-ai
ias inspect BurntSushi/ripgrep

# 3. Zero-clone install prompt skills (tarball streaming)
ias install vercel-labs/agent-skills

# 4. Install only matching skills using glob patterns
ias install vercel-labs/agent-skills --skills "react-*,tdd*"

# 5. Project-local installation (registers to ./.agents/skills/ in current workspace)
ias install user/repo --scope local
# or shorthand:
ias install user/repo -p

# 6. Binary release installation (zero-clone direct download to ~/.local/bin)
ias install BurntSushi/ripgrep

# 7. Update ias to latest release
ias update

# 8. View installed repositories
ias list-installed

# 9. Remove an installation
ias uninstall vercel-labs-agent-skills --force
```

---

## 🔍 How it Works in v3.1.0

When an agent runs `ias install <repo-url>`:
1. **Archetype Triage**: Classifies the repository into 1 of 7 archetypes (`skill-pack`, `cli-binary`, `cli-source`, `web-app`, etc.) without full git cloning.
2. **Zero-Clone Streaming**: For skill packs, streams archive tarballs directly; for CLI binaries, downloads pre-compiled release assets directly to `~/.local/bin/`.
3. **Deep Synthesis**: If the repository lacks a `SKILL.md`, synthesizes an operational manual with real CLI flags, recipes, and troubleshooting. For web apps, generates a service manual with Docker run recipes.
4. **Active-Agent Scoping**: Scopes skills strictly to your caller agent (Claude, Cursor, Codex, Gemini, Hermes) or local workspace (`--scope local`), preventing ghost folder pollution.
5. **Atomic Directory Locks**: All lockfile and cache updates use directory spinlocks with exponential backoff to eliminate race conditions.
