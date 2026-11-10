# Show HN Submission Guide & Draft: install-anything-skill (ias)

> **Hacker News Show HN Guidelines Summary:**
> - Title must begin with `Show HN: `
> - Plain language: state what it is clearly; avoid hype words ("revolutionary", "blazing-fast", "game-changing")
> - It must be something people can immediately try, not just a landing page or sign-up form
> - Submit as a Text Post (Ask/Show HN) or direct Link, and be available in the comments for 2-4 hours to reply thoughtfully.

---

## 📝 Submission Title
```text
Show HN: ias – 1-command skill and repo installer for AI coding agents
```

*Alternative titles:*
- `Show HN: ias – Turn any GitHub repo into an active tool for AI coding agents`
- `Show HN: ias – Package manager and skill discovery for Claude Code, Gemini, and Hermes`

---

## 🔗 Submission URL
`https://github.com/Ayan-Jain-737/install-anything-skill`

---

## 📄 Submission Text (for Text Post or First Comment)

```text
Hi HN,

I built ias (install-anything-skill) because installing tools and skills into AI coding agents (Claude Code, Gemini/Antigravity, Hermes, OpenCode, Codex) is fragmented and often frustrating.

Today, if you want an AI agent to use a GitHub repo or a community skill:
1. If the repo doesn't already have an agent-specific SKILL.md file, most skill installers outright fail.
2. If it does install, traditional tools often dump ghost directories into every agent directory (~/.gemini, ~/.claude, ~/.codex, ~/.zed) regardless of which agent you're actually using.
3. Repositories with custom build steps (npm, cargo, pip, go build) require tedious manual cloning, compiling, and symlinking before your agent can execute them.

ias solves this with a single command:

    npm i -g install-anything-skill
    # or: curl -fsSL https://raw.githubusercontent.com/Ayan-Jain-737/install-anything-skill/main/scripts/install.sh | bash

How to try it:

1. Search for tools & community skills across the open registry:
    $ ias find react
    $ ias find testing

2. Install any GitHub repo (even without SKILL.md):
    $ ias install vercel-labs/agent-skills
    # Or preview without filesystem changes:
    $ ias install user/repo --dry-run

What happens under the hood:
- README-First Analysis: It inspects the repo's README first to follow the author's recommended installation instructions instead of doing blind git clones.
- Auto-Synthesis: If a repository lacks a SKILL.md, ias inspects language/binaries and synthesizes an executable agent wrapper on the fly.
- Active-Agent Scoping: Detects your active agent harness (e.g. Gemini/Antigravity, Claude Code, Hermes) and registers skills specifically for that agent plus a canonical global store, leaving zero ghost folders in unused agent directories.
- Binary Symlinks: Builds binaries (cargo, go, npm, pip) and safely exposes executables to ~/.local/bin/ias.

The code is MIT licensed and has zero native binary dependencies (runs on pure Node.js 18+).

GitHub: https://github.com/Ayan-Jain-737/install-anything-skill
Live Interactive Docs / Web App: https://install-anything-skill.netlify.app

I'd love your feedback on the repo scanner heuristics and what other agent harnesses or package managers you'd like to see supported. I'll be around to answer questions!
```

---

## 💡 Best Practices for Launch Day
1. **Timing**: Post between 7:00 AM – 9:00 AM PT (Tuesday, Wednesday, or Thursday) for optimal HN activity.
2. **Comment Monitoring**: Keep the thread open in a tab and respond within 15–30 minutes to early comments.
3. **Be humble and technical**: Answer technical critiques with code pointers and benchmark details.
4. **Accept bug reports gracefully**: If someone finds an edge case with a specific repo URL, replicate it, fix it, and reply with the commit link.
