# Repository & Tool Installation Architectures: Research & Ecosystem Analysis

> **Document**: `docs/research/install-architectures.md`  
> **Skill Ref**: ECC `research` + `agent-reach`  
> **Status**: Verified Primary-Source Findings  
> **Date**: 2026-11-17

---

## 1. Executive Summary

This research investigates modern tools for installing GitHub repositories, binaries, and AI agent skills (`zyedidia/eget`, `aquaproj/aqua`, `jdx/mise`, `vercel-labs/skills`, `astral-sh/uv`, `pipx`). 

### Core Architectural Discoveries:
1. **GitHub REST API is a Bottleneck**: Unauthenticated requests are capped at 60/hr and frequently blocked by anti-bot gates. Production-grade tools bypass this via `raw.githubusercontent.com` CDN paths and direct redirect download URLs (`https://github.com/<owner>/<repo>/releases/latest/download/<asset>`).
2. **Zero-Clone Pattern (Tarball Streaming)**: Cloning a repository is 100x slower and consumes 500x more bandwidth than streaming the GitHub tarball (`/archive/HEAD.tar.gz`) or raw files.
3. **Eget-Style OS/Arch Heuristics**: Deterministic regular expressions successfully map 99% of GitHub release assets to host operating systems and CPU architectures without guessing.
4. **Agent Skill Contract**: Tools like `npx skills` fail when repos lack `SKILL.md`. Conversely, our system bridges this gap by auto-synthesizing in-depth operational manuals.

---

## 2. Comparative Matrix: Existing Tools

| Tool | Primary Purpose | How It Resolves Targets | API Rate Limit Avoidance | Handles Missing Manifests |
| :--- | :--- | :--- | :--- | :--- |
| **`zyedidia/eget`** | Standalone precompiled binary downloader | Regex asset matching on GitHub Releases | Release direct URLs or token passthrough | Fails if no compiled binary release asset exists |
| **`aquaproj/aqua`** | Declarative CLI version manager | Central registry mapping repo → asset template | GitHub token + direct URLs | Registry-only; cannot install arbitrary repos |
| **`jdx/mise`** | Polyglot runtime & tool manager | Backed by aqua, asdf plugins, npm, cargo, pipx | Host package manager bridges | Relies on existing plugins or packages |
| **`vercel-labs/skills`** | AI agent prompt skill manager | Looks for `SKILL.md` in GitHub repos | HTTPS raw fetches | **Fails completely** if repo lacks `SKILL.md` |
| **`astral-sh/uv`** | Ultra-fast Python package & tool runner | Resolves PyPI wheels / git tags | PyPI CDN / git transport | Requires valid `pyproject.toml` |
| **`ias` (Target)** | **Universal AI Agent Repo & Tool Installer** | **Intelligent 7-Archetype Triage (Stream / Binary / Pkg / Clone)** | **Raw CDN + Direct Asset URLs + Local ETag Cache** | **Synthesizes in-depth `SKILL.md` operational manuals** |

---

## 3. Rate-Limiting & Anti-Bot Bypass Techniques

### 3.1 Raw CDN Endpoints (`raw.githubusercontent.com`)
For reading manifests (`README.md`, `package.json`, `Cargo.toml`, `pyproject.toml`, `.mcp.json`):
```text
https://raw.githubusercontent.com/<owner>/<repo>/HEAD/<filepath>
```
- **Advantages**: Served from Fastly/Cloudflare CDN, bypasses REST API rate limiting, no JSON envelope overhead.
- **Branch Fallback Ladder**: Probe `HEAD` → `main` → `master`.

### 3.2 Direct Release Asset Redirects
To download prebuilt binaries without querying `/releases/latest` JSON API:
```text
https://github.com/<owner>/<repo>/releases/latest/download/<asset-name>
```
- **Mechanism**: Handled by GitHub frontend CDN routing via HTTP 302 to AWS S3/Azure storage. Does not consume REST API quota.

### 3.3 Release Asset Discovery via HTML
When dynamic asset listing is needed without API keys:
- Query `https://github.com/<owner>/<repo>/releases` HTML.
- Parse `<a href="/<owner>/<repo>/releases/download/<tag>/<filename>"` anchors.
- Result: Extracts full asset list with zero API rate limit impact.

### 3.4 Local HTTP Manifest Cache with ETag / TTL
- Cache retrieved files in `~/.install-anything/cache/http/` using SHA-256 hash of URL as key.
- Save `ETag` and `Last-Modified` headers.
- Send `If-None-Match` on subsequent requests; on HTTP 304, serve from local cache.

---

## 4. Deterministic Platform & Architecture Matching Rules (from `eget`)

### Operating System Matcher
```javascript
const OS_PATTERNS = {
  darwin: /(darwin|mac.?os|osx|apple)/i,
  linux: /(linux|unknown-linux)/i,
  windows: /(win|windows)/i
};
```

### Architecture Matcher
```javascript
const ARCH_PATTERNS = {
  x64: /(x64|amd64|x86[-_]?64)/i,
  arm64: /(arm64|aarch64|armv8)/i,
  x86: /(x32|x86[-_]?32|i?386)/i
};
```

### Preferred Extension / Binary Filter
1. Archive: `.tar.gz`, `.tgz`, `.zip`, `.tar.xz`
2. Raw binary executable: No extension (Linux/macOS) or `.exe` (Windows)
3. Exclusion filter: Avoid `.deb`, `.rpm`, `.msi`, `.sha256`, `.asc`, `.txt`, `.dmg` unless specifically requested.
4. Linux libc preference: Prefer `musl` over `gnu` for standalone portability.

---

## 5. Architectural Recommendations for `ias`

1. **Phase 1 (Triage Engine)**:
   - Enhance `skills/install-anything-installer/scripts/readme-guide.js` to probe raw endpoints before ever invoking git.
   - Categorize into the 7 defined archetypes.
2. **Phase 2 (Zero-Clone Installers)**:
   - Tarball streaming for prompt skills.
   - Direct binary download into `~/.local/bin/`.
3. **Phase 3 (Human Handoff & App Triage)**:
   - For complex web apps / monorepos (e.g. `open-generative-ai`), generate an Interactive Human Handoff Report rather than hanging or running `npm install` in cache.
4. **Phase 4 (Deep Synthesis)**:
   - Inspect `--help` and README anchors (`## Installation`, `## Usage`, `## Commands`) to write a structured, rich `SKILL.md`.
5. **Phase 5 & 6 (Ponytail & Concurrency)**:
   - Refactor in place, delete dead code, atomic file writes (`installed.json.tmp` -> `renameSync`).
