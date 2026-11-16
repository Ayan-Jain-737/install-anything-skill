# Show HN Submission Guide & Draft: install-anything-skill (ias) v3.1

> **Hacker News Show HN Guidelines Summary:**
> - Title must begin with `Show HN: `
> - Plain language: state what it is clearly; avoid hype words ("revolutionary", "blazing-fast", "game-changing")
> - It must be something people can immediately try, not just a landing page or sign-up form
> - Submit as a Text Post (Ask/Show HN) or direct Link, and be available in the comments for 2-4 hours to reply thoughtfully.

---

## 📝 Submission Title
```text
Show HN: ias – Zero-clone skill and repo installer for AI coding agents
```

*Alternative titles:*
- `Show HN: ias – Turn any GitHub repo into an active tool for Claude, Gemini, and Hermes`
- `Show HN: ias – Package manager with 7-archetype triage for AI coding agents`

---

## 🔗 Submission URL
`https://github.com/Ayan-Jain-737/install-anything-skill`

---

## 📄 Submission Text (for Text Post or First Comment)

```text
Hi HN,

I built ias (install-anything-skill) because installing tools and skills into AI coding agents (Claude Code, Gemini/Antigravity, Hermes, Cursor, OpenCode, Codex) is fragmented and often frustrating.

Today, if you want an AI agent to use a GitHub repo or a community skill:
1. If the repo doesn't already have an agent-specific SKILL.md file, most skill installers outright fail.
2. If it does install, traditional tools clone the entire repository (often gigabytes of git history, frontend code, or docs) just to use a small prompt file or a compiled binary.
3. Complex web apps (like fullstack Next.js or Python apps) cause agents to blindly clone monorepos instead of launching services or handing off interactive setup to the developer.
4. Traditional tools dump ghost directories into every agent directory (~/.gemini, ~/.claude, ~/.codex, ~/.zed) regardless of which agent you're actually using.

In v3.1, ias solves this with an intelligent zero-clone architecture:

    npm i -g install-anything-skill
    # or: curl -fsSL https://raw.githubusercontent.com/Ayan-Jain-737/install-anything-skill/main/scripts/install.sh | bash

How to try it:

1. Preview what a repo is before touching your disk:
    $ ias inspect anil-matcha/open-generative-ai
    $ ias inspect BurntSushi/ripgrep

2. Install any GitHub repo or skill (zero git clone):
    # Streams only the prompt skills from the tarball:
    $ ias install vercel-labs/agent-skills --skills "react-*"

    # Downloads the pre-compiled binary release directly to ~/.local/bin:
    $ ias install BurntSushi/ripgrep

3. Search for tools & community skills across the open registry:
    $ ias find react
    $ ias find testing

4. Keep updated with one command:
    $ ias update

What happens under the hood:
- 7-Archetype Triage: Classifies repositories into skill packs, CLI binaries, source builds, web apps, MCP servers, libraries, or mixed repos before downloading.
- Zero-Clone Tarball Streaming: Downloads archive tarballs and extracts skills in memory, bypassing full git history cloning.
- Deterministic eget-Style Downloader: Matches release binaries for your OS, architecture, and libc, downloading directly to ~/.local/bin/ without cloning source.
- Deep Manual Synthesis: For repos lacking a SKILL.md, ias runs `--help` and inspects the binary to synthesize an in-depth operational manual (synopsis, common flags, environment variables, troubleshooting).
- Human Handoff Reports: When a fullstack app needs Docker daemons, database seeding, or API keys, ias generates a step-by-step checklist telling the agent exactly what to ask the user.
- Active-Agent Scoping: Detects your active caller (Claude, Cursor, Codex, Gemini, Hermes) and registers skills specifically for that agent plus a canonical global store, leaving zero ghost folders in unused agent directories. Also supports project-local scoping (`--scope local` / `-p`).
- Rate-Limit Safe: Fetches manifests via raw CDN and direct release redirects, immune to GitHub's 60 req/hr unauthenticated API limit.

The project is MIT licensed and completely open source:
https://github.com/Ayan-Jain-737/install-anything-skill

I would love to hear your feedback on how your agents handle installing tools and skills!
```
